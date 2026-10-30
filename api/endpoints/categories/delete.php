<?php
// api/endpoints/categories/delete.php
// DELETE /categories - hapus kategori; subkategori naik satu tingkat.
$pdo = getDbConnection();
$user = requireAuth();
$userId = $user['userId'];
$hasHierarchy = ensureCategoryParentColumn($pdo);

$input = getJsonInput();
$id = intval($_GET['id'] ?? ($input['id'] ?? 0));
if (!$id) {
    jsonResponse(['success' => false, 'message' => 'ID kategori wajib disertakan'], 400);
}

$stmt = $pdo->prepare("SELECT * FROM cybank_categories WHERE id = ? AND user_id = ?");
$stmt->execute([$id, $userId]);
$cat = $stmt->fetch();
if (!$cat) {
    jsonResponse(['success' => false, 'message' => 'Kategori tidak ditemukan'], 404);
}

// Subkategori dipindahkan ke induk dari kategori yang dihapus (naik satu tingkat)
if ($hasHierarchy) {
    $grandParentId = !empty($cat['parent_id'] ?? null) ? intval($cat['parent_id']) : null;
    $reparentStmt = $pdo->prepare("UPDATE cybank_categories SET parent_id = ?, updated_at = NOW() WHERE parent_id = ? AND user_id = ?");
    $reparentStmt->execute([$grandParentId, $id, $userId]);
    if ($grandParentId !== null) {
        // Subkategori yang naik satu tingkat ikut warna induk barunya
        syncCategoryChildrenColor($pdo, $userId, $grandParentId);
    }
}

// Set transactions to NULL for this category
$unlinkStmt = $pdo->prepare("UPDATE cybank_transactions SET category_id = NULL WHERE category_id = ? AND user_id = ?");
$unlinkStmt->execute([$id, $userId]);

$delStmt = $pdo->prepare("DELETE FROM cybank_categories WHERE id = ? AND user_id = ?");
$delStmt->execute([$id, $userId]);

jsonResponse(['success' => true, 'message' => 'Kategori berhasil dihapus']);
