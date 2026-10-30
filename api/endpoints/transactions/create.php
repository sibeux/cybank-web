<?php
// api/endpoints/transactions/create.php
// POST /transactions - catat transaksi baru dan sesuaikan saldo akun terkait.
$pdo = getDbConnection();
$user = requireAuth();
$userId = $user['userId'];

$input = getJsonInput();
$accountId = intval($input['accountId'] ?? 0);
$categoryId = !empty($input['categoryId']) ? intval($input['categoryId']) : null;
$transferToAccountId = !empty($input['transferToAccountId']) ? intval($input['transferToAccountId']) : null;
$amount = abs(floatval($input['amount'] ?? 0));
$type = strtoupper(trim($input['type'] ?? 'EXPENSE'));
$paymentType = trim($input['paymentType'] ?? 'CASH');
$note = $input['note'] ?? null;
$payee = $input['payee'] ?? null;
$labels = $input['labels'] ?? null;
$date = !empty($input['transactionDate']) ? date('Y-m-d H:i:s', strtotime($input['transactionDate'])) : date('Y-m-d H:i:s');

if (!$accountId || $amount <= 0) {
    jsonResponse(['success' => false, 'message' => 'accountId and amount are required'], 400);
}

if ($type === 'TRANSFER' && (!$transferToAccountId || $transferToAccountId === $accountId)) {
    jsonResponse(['success' => false, 'message' => 'Pilih rekening tujuan transfer yang berbeda'], 400);
}

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare("
        INSERT INTO cybank_transactions 
        (user_id, account_id, category_id, transfer_to_account_id, amount, type, payment_type, note, payee, labels, transaction_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");
    $stmt->execute([$userId, $accountId, $categoryId, $transferToAccountId, $amount, $type, $paymentType, $note, $payee, $labels, $date]);
    $txId = $pdo->lastInsertId();

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

    $pdo->commit();
    jsonResponse(['success' => true, 'data' => ['id' => $txId]], 201);
} catch (Exception $e) {
    $pdo->rollBack();
    jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
}
