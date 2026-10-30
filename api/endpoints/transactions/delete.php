<?php
// api/endpoints/transactions/delete.php
// DELETE /transactions?id= - hapus transaksi dan kembalikan efek saldonya.
$pdo = getDbConnection();
$user = requireAuth();
$userId = $user['userId'];

$id = intval($_GET['id'] ?? 0);
if (!$id) jsonResponse(['success' => false, 'message' => 'Transaction ID is required'], 400);

$stmt = $pdo->prepare("SELECT * FROM cybank_transactions WHERE id = ? AND user_id = ?");
$stmt->execute([$id, $userId]);
$tx = $stmt->fetch();

if (!$tx) jsonResponse(['success' => false, 'message' => 'Transaction not found'], 404);

$pdo->beginTransaction();
try {
    $amount = floatval($tx['amount']);
    if ($tx['type'] === 'EXPENSE') {
        $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance + ? WHERE id = ?");
        $stmt->execute([$amount, $tx['account_id']]);
    } elseif ($tx['type'] === 'INCOME') {
        $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance - ? WHERE id = ?");
        $stmt->execute([$amount, $tx['account_id']]);
    } elseif ($tx['type'] === 'TRANSFER') {
        $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance + ? WHERE id = ?");
        $stmt->execute([$amount, $tx['account_id']]);
        if (!empty($tx['transfer_to_account_id'])) {
            $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance - ? WHERE id = ?");
            $stmt->execute([$amount, $tx['transfer_to_account_id']]);
        }
    }

    $stmt = $pdo->prepare("DELETE FROM cybank_transactions WHERE id = ?");
    $stmt->execute([$id]);

    $pdo->commit();
    jsonResponse(['success' => true, 'message' => 'Transaksi berhasil dihapus']);
} catch (Exception $e) {
    $pdo->rollBack();
    jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
}
