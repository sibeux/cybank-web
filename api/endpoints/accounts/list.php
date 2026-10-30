<?php
// api/endpoints/accounts/list.php
// GET /accounts - daftar akun milik user.
$pdo = getDbConnection();
$user = requireAuth();
$userId = $user['userId'];

$stmt = $pdo->prepare("SELECT * FROM cybank_accounts WHERE user_id = ? ORDER BY created_at ASC");
$stmt->execute([$userId]);
$accounts = array_map(function($a) {
    $a['balance'] = floatval($a['balance']);
    return $a;
}, $stmt->fetchAll());
jsonResponse(['success' => true, 'data' => $accounts]);
