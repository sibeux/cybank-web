<?php
// api/endpoints/accounts/create.php
// POST /accounts - buat akun baru dengan saldo awal.
$pdo = getDbConnection();
$user = requireAuth();
$userId = $user['userId'];

$input = getJsonInput();
$name = trim($input['name'] ?? '');
$type = trim($input['type'] ?? 'CASH');
$currency = trim($input['currency'] ?? 'IDR');
$balance = floatval($input['initialBalance'] ?? 0);

if (!$name) {
    jsonResponse(['success' => false, 'message' => 'Account name is required'], 400);
}

$investedAmount = strtoupper($type) === 'INVESTMENT' ? $balance : 0;
$stmt = $pdo->prepare("INSERT INTO cybank_accounts (user_id, name, type, currency, balance, invested_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())");
$stmt->execute([$userId, $name, $type, $currency, $balance, $investedAmount]);
$newId = $pdo->lastInsertId();

$stmt = $pdo->prepare("SELECT * FROM cybank_accounts WHERE id = ?");
$stmt->execute([$newId]);
$account = $stmt->fetch();
$account['balance'] = floatval($account['balance']);
$account['investedAmount'] = floatval($account['invested_amount'] ?? 0);

jsonResponse(['success' => true, 'data' => $account], 201);
