<?php
// api/endpoints/transactions/update.php
// PUT|PATCH /transactions - perbarui transaksi lalu hitung ulang efek saldonya.
$pdo = getDbConnection();
$user = requireAuth();
$userId = $user['userId'];

$input = getJsonInput();
$id = intval($input['id'] ?? ($_GET['id'] ?? 0));
if (!$id) {
    jsonResponse(['success' => false, 'message' => 'Transaction ID is required'], 400);
}

$stmt = $pdo->prepare("SELECT * FROM cybank_transactions WHERE id = ? AND user_id = ?");
$stmt->execute([$id, $userId]);
$oldTx = $stmt->fetch();

if (!$oldTx) {
    jsonResponse(['success' => false, 'message' => 'Transaksi tidak ditemukan'], 404);
}

$accountId = isset($input['accountId']) ? intval($input['accountId']) : intval($oldTx['account_id']);
$categoryId = array_key_exists('categoryId', $input) 
    ? (!empty($input['categoryId']) ? intval($input['categoryId']) : null) 
    : ($oldTx['category_id'] ? intval($oldTx['category_id']) : null);
$transferToAccountId = array_key_exists('transferToAccountId', $input) 
    ? (!empty($input['transferToAccountId']) ? intval($input['transferToAccountId']) : null) 
    : ($oldTx['transfer_to_account_id'] ? intval($oldTx['transfer_to_account_id']) : null);
$amount = isset($input['amount']) ? abs(floatval($input['amount'])) : floatval($oldTx['amount']);
$type = isset($input['type']) ? strtoupper(trim($input['type'])) : $oldTx['type'];
$paymentType = isset($input['paymentType']) ? trim($input['paymentType']) : ($oldTx['payment_type'] ?? 'CASH');
$note = array_key_exists('note', $input) ? $input['note'] : $oldTx['note'];
$payee = array_key_exists('payee', $input) ? $input['payee'] : $oldTx['payee'];
$labels = array_key_exists('labels', $input) ? $input['labels'] : $oldTx['labels'];
$date = !empty($input['transactionDate']) 
    ? (strpos($input['transactionDate'], ' ') === false && strpos($input['transactionDate'], 'T') === false 
        ? "{$input['transactionDate']} 00:00:00" 
        : date('Y-m-d H:i:s', strtotime($input['transactionDate'])))
    : $oldTx['transaction_date'];

if (!$accountId || $amount <= 0) {
    jsonResponse(['success' => false, 'message' => 'accountId and amount are required'], 400);
}

if ($type === 'TRANSFER' && (!$transferToAccountId || $transferToAccountId === $accountId)) {
    jsonResponse(['success' => false, 'message' => 'Pilih rekening tujuan transfer yang berbeda dengan rekening asal'], 400);
}

if ($type !== 'TRANSFER') {
    $transferToAccountId = null;
}

$pdo->beginTransaction();
try {
    // 1. Revert Old Transaction Balance Effect
    $oldAmount = floatval($oldTx['amount']);
    $oldAccId = intval($oldTx['account_id']);
    $oldTransferId = !empty($oldTx['transfer_to_account_id']) ? intval($oldTx['transfer_to_account_id']) : null;

    if ($oldTx['type'] === 'EXPENSE') {
        $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance + ? WHERE id = ?");
        $stmt->execute([$oldAmount, $oldAccId]);
    } elseif ($oldTx['type'] === 'INCOME') {
        $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance - ? WHERE id = ?");
        $stmt->execute([$oldAmount, $oldAccId]);
    } elseif ($oldTx['type'] === 'TRANSFER') {
        $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance + ? WHERE id = ?");
        $stmt->execute([$oldAmount, $oldAccId]);
        if ($oldTransferId) {
            $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance - ? WHERE id = ?");
            $stmt->execute([$oldAmount, $oldTransferId]);
        }
    }

    // 2. Apply New Transaction Balance Effect
    if ($type === 'EXPENSE') {
        $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance - ? WHERE id = ?");
        $stmt->execute([$amount, $accountId]);
    } elseif ($type === 'INCOME') {
        $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance + ? WHERE id = ?");
        $stmt->execute([$amount, $accountId]);
    } elseif ($type === 'TRANSFER' && $transferToAccountId) {
        $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance - ? WHERE id = ?");
        $stmt->execute([$amount, $accountId]);
        $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance + ? WHERE id = ?");
        $stmt->execute([$amount, $transferToAccountId]);
    }

    // 3. Update Transaction Record
    $stmt = $pdo->prepare("
        UPDATE cybank_transactions 
        SET account_id = ?, category_id = ?, transfer_to_account_id = ?, amount = ?, type = ?, payment_type = ?, note = ?, payee = ?, labels = ?, transaction_date = ?, updated_at = NOW()
        WHERE id = ? AND user_id = ?
    ");
    $stmt->execute([$accountId, $categoryId, $transferToAccountId, $amount, $type, $paymentType, $note, $payee, $labels, $date, $id, $userId]);

    // 4. Fetch Updated Transaction Record
    $stmt = $pdo->prepare("
        SELECT 
            t.id, t.user_id, t.account_id, t.category_id, t.transfer_to_account_id,
            t.amount, t.type, t.payment_type as paymentType, t.note, t.payee, t.labels,
            t.transaction_date as transactionDate, t.created_at, t.updated_at,
            a.id as acc_id, a.name as acc_name, a.currency as acc_currency,
            c.id as cat_id, c.name as cat_name, c.icon as cat_icon, COALESCE(pc.color, c.color) as cat_color,
            tta.id as tta_id, tta.name as tta_name
        FROM cybank_transactions t
        JOIN cybank_accounts a ON t.account_id = a.id
        LEFT JOIN cybank_categories c ON t.category_id = c.id
        LEFT JOIN cybank_categories pc ON c.parent_id = pc.id
        LEFT JOIN cybank_accounts tta ON t.transfer_to_account_id = tta.id
        WHERE t.id = ? AND t.user_id = ?
    ");
    $stmt->execute([$id, $userId]);
    $row = $stmt->fetch();

    $updatedItem = [
        'id' => intval($row['id']),
        'userId' => intval($row['user_id']),
        'accountId' => intval($row['account_id']),
        'categoryId' => $row['category_id'] ? intval($row['category_id']) : null,
        'transferToAccountId' => $row['transfer_to_account_id'] ? intval($row['transfer_to_account_id']) : null,
        'amount' => floatval($row['amount']),
        'type' => $row['type'],
        'paymentType' => $row['paymentType'],
        'note' => $row['note'],
        'payee' => $row['payee'],
        'labels' => $row['labels'],
        'transactionDate' => date('c', strtotime($row['transactionDate'])),
        'accountName' => $row['acc_name'],
        'transferToAccountName' => $row['tta_name'] ?? null,
        'categoryName' => $row['cat_name'] ?? ($row['type'] === 'TRANSFER' ? 'Transfer' : 'General'),
        'account' => [
            'id' => intval($row['acc_id']),
            'name' => $row['acc_name'],
            'currency' => $row['acc_currency'],
        ],
        'category' => $row['cat_id'] ? [
            'id' => intval($row['cat_id']),
            'name' => $row['cat_name'],
            'icon' => $row['cat_icon'],
            'color' => $row['cat_color'],
        ] : null,
        'transferToAccount' => $row['tta_id'] ? [
            'id' => intval($row['tta_id']),
            'name' => $row['tta_name'],
        ] : null,
    ];

    // Fresh accounts
    $stmt = $pdo->prepare("SELECT * FROM cybank_accounts WHERE user_id = ? ORDER BY created_at ASC");
    $stmt->execute([$userId]);
    $freshAccounts = array_map(function($a) {
        $a['balance'] = floatval($a['balance']);
        return $a;
    }, $stmt->fetchAll());
    $newTotalBalance = array_sum(array_column($freshAccounts, 'balance'));

    $pdo->commit();

    jsonResponse([
        'success' => true,
        'message' => 'Transaksi berhasil diperbarui',
        'data' => $updatedItem,
        'accounts' => $freshAccounts,
        'totalBalance' => $newTotalBalance,
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
}
