<?php
// api/endpoints/categories/update.php
// PUT|PATCH /categories - perbarui kategori, termasuk pemindahan induk.
$pdo = getDbConnection();
$user = requireAuth();
$userId = $user['userId'];
$hasHierarchy = ensureCategoryParentColumn($pdo);

$input = getJsonInput();
$id = intval($input['id'] ?? ($_GET['id'] ?? 0));
if (!$id) {
    jsonResponse(['success' => false, 'message' => 'ID kategori wajib disertakan'], 400);
}

$stmt = $pdo->prepare("SELECT * FROM cybank_categories WHERE id = ? AND user_id = ?");
$stmt->execute([$id, $userId]);
$cat = $stmt->fetch();
if (!$cat) {
    jsonResponse(['success' => false, 'message' => 'Kategori tidak ditemukan'], 404);
}

$name = isset($input['name']) ? trim($input['name']) : $cat['name'];
$type = isset($input['type']) ? strtoupper(trim($input['type'])) : $cat['type'];
$icon = array_key_exists('icon', $input) ? (!empty($input['icon']) ? trim($input['icon']) : null) : $cat['icon'];
$color = array_key_exists('color', $input) ? (!empty($input['color']) ? trim($input['color']) : null) : $cat['color'];
$envelopeId = array_key_exists('envelopeId', $input) ? (!empty($input['envelopeId']) ? strval($input['envelopeId']) : null) : $cat['envelope_id'];

if (empty($name)) {
    jsonResponse(['success' => false, 'message' => 'Nama kategori tidak boleh kosong'], 400);
}

$parentProvided = array_key_exists('parentId', $input) || array_key_exists('parent_id', $input);
$rawParentId = array_key_exists('parentId', $input) ? $input['parentId'] : ($input['parent_id'] ?? null);

$parentId = null;
if ($hasHierarchy) {
    $effectiveParentId = $parentProvided ? $rawParentId : ($cat['parent_id'] ?? null);
    try {
        $parentId = resolveCategoryParentId($pdo, $userId, $effectiveParentId, $id, $type);
    } catch (InvalidArgumentException $e) {
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 400);
    }
} elseif ($parentProvided && $rawParentId !== null && $rawParentId !== '') {
    jsonResponse(['success' => false, 'message' => 'Fitur grup kategori belum aktif di database. Jalankan migrasi: npm run db:migrate'], 400);
}

// Subkategori selalu mengikuti warna induknya (warna manual diabaikan)
if ($parentId !== null) {
    $parentColor = resolveCategoryParentColor($pdo, $userId, $parentId);
    if ($parentColor !== null) {
        $color = $parentColor;
    }
} elseif ($color === null) {
    $color = defaultCategoryColor($type);
}

$updateStmt = $pdo->prepare("UPDATE cybank_categories SET name = ?, type = ?, icon = ?, color = ?, envelope_id = ?, updated_at = NOW() WHERE id = ? AND user_id = ?");
$updateStmt->execute([$name, $type, $icon, $color, $envelopeId, $id, $userId]);

if ($hasHierarchy) {
    $pdo->prepare("UPDATE cybank_categories SET parent_id = ? WHERE id = ? AND user_id = ?")->execute([$parentId, $id, $userId]);
    if ($parentId === null) {
        // Kategori utama: turunkan warnanya ke seluruh subkategori
        syncCategoryChildrenColor($pdo, $userId, $id);
    }
}

$stmt = $pdo->prepare("SELECT * FROM cybank_categories WHERE id = ?");
$stmt->execute([$id]);
jsonResponse([
    'success' => true,
    'data' => formatCategoryRow($stmt->fetch(), $hasHierarchy, getCategoryChildCountMap($pdo, $userId, $hasHierarchy)),
    'message' => 'Kategori berhasil diperbarui'
]);
