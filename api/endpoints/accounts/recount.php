<?php
// api/endpoints/accounts/recount.php
// POST|PUT|PATCH /accounts/recount - sesuaikan saldo akun (opsional catat transaksi penyesuaian).
$pdo = getDbConnection();
$user = requireAuth();
$userId = $user['userId'];

$input = getJsonInput();
$recordAdjustment = !empty($input['recordAdjustment']);
$note = trim($input['note'] ?? 'Penyesuaian Saldo (Recount)');

// Prepare list of account updates
$updates = [];
if (!empty($input['accounts']) && is_array($input['accounts'])) {
    $updates = $input['accounts'];
} elseif (isset($input['id']) && isset($input['balance'])) {
    $updates[] = [
        'id' => intval($input['id']),
        'balance' => floatval($input['balance']),
        'name' => isset($input['name']) ? trim($input['name']) : null,
    ];
} else {
    jsonResponse(['success' => false, 'message' => 'Data akun atau saldo tidak valid'], 400);
}

$pdo->beginTransaction();
try {
    // Fetch user accounts for security and diff checking
    $stmt = $pdo->prepare("SELECT id, name, balance FROM cybank_accounts WHERE user_id = ?");
    $stmt->execute([$userId]);
    $existing = [];
    foreach ($stmt->fetchAll() as $row) {
        $existing[intval($row['id'])] = [
            'name' => $row['name'],
            'balance' => floatval($row['balance']),
        ];
    }

    $adjustCategoryId = null;
    if ($recordAdjustment) {
        $catStmt = $pdo->prepare("SELECT id FROM cybank_categories WHERE user_id = ? AND (name LIKE '%Penyesuaian%' OR name LIKE '%Adjustment%') LIMIT 1");
        $catStmt->execute([$userId]);
        $foundCat = $catStmt->fetch();
        if ($foundCat) {
            $adjustCategoryId = intval($foundCat['id']);
        } else {
            $catStmt = $pdo->prepare("INSERT INTO cybank_categories (user_id, name, type, icon, color, created_at, updated_at) VALUES (?, 'Penyesuaian Saldo', 'EXPENSE', 'sliders', '#64748b', NOW(), NOW())");
            $catStmt->execute([$userId]);
            $adjustCategoryId = intval($pdo->lastInsertId());
        }
    }

    foreach ($updates as $item) {
        $accId = intval($item['id'] ?? 0);
        if (!isset($existing[$accId])) continue;

        $newBalance = floatval($item['balance'] ?? 0);
        $oldBalance = $existing[$accId]['balance'];
        $diff = $newBalance - $oldBalance;

        if ($recordAdjustment && abs($diff) > 0.001) {
            $txType = $diff > 0 ? 'INCOME' : 'EXPENSE';
            $txAmount = abs($diff);
            $txStmt = $pdo->prepare("
                INSERT INTO cybank_transactions 
                (user_id, account_id, category_id, amount, type, payment_type, note, payee, transaction_date, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'CASH', ?, 'Recount Saldo', NOW(), NOW(), NOW())
            ");
            $txStmt->execute([$userId, $accId, $adjustCategoryId, $txAmount, $txType, $note]);
        }

        $accName = !empty($item['name']) ? trim($item['name']) : null;
        $accType = !empty($item['type']) ? strtoupper(trim($item['type'])) : null;

        if ($accName && $accType) {
            $upStmt = $pdo->prepare("UPDATE cybank_accounts SET balance = ?, name = ?, type = ?, updated_at = NOW() WHERE id = ? AND user_id = ?");
            $upStmt->execute([$newBalance, $accName, $accType, $accId, $userId]);
        } elseif ($accName) {
            $upStmt = $pdo->prepare("UPDATE cybank_accounts SET balance = ?, name = ?, updated_at = NOW() WHERE id = ? AND user_id = ?");
            $upStmt->execute([$newBalance, $accName, $accId, $userId]);
        } elseif ($accType) {
            $upStmt = $pdo->prepare("UPDATE cybank_accounts SET balance = ?, type = ?, updated_at = NOW() WHERE id = ? AND user_id = ?");
            $upStmt->execute([$newBalance, $accType, $accId, $userId]);
        } else {
            $upStmt = $pdo->prepare("UPDATE cybank_accounts SET balance = ?, updated_at = NOW() WHERE id = ? AND user_id = ?");
            $upStmt->execute([$newBalance, $accId, $userId]);
        }
    }

    $pdo->commit();

    // Fetch fresh accounts and stats
    $stmt = $pdo->prepare("SELECT * FROM cybank_accounts WHERE user_id = ? ORDER BY created_at ASC");
    $stmt->execute([$userId]);
    $freshAccounts = array_map(function($a) {
        $a['balance'] = floatval($a['balance']);
        return $a;
    }, $stmt->fetchAll());
    $newTotalBalance = array_sum(array_column($freshAccounts, 'balance'));

    jsonResponse([
        'success' => true,
        'message' => 'Saldo berhasil disesuaikan',
        'data' => [
            'accounts' => $freshAccounts,
            'totalBalance' => $newTotalBalance,
        ]
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
}
