<?php
// api/endpoints/categories/create.php
// POST /categories - buat kategori atau subkategori baru.
$pdo = getDbConnection();
$user = requireAuth();
$userId = $user['userId'];
$hasHierarchy = ensureCategoryParentColumn($pdo);

$input = getJsonInput();
$name = trim($input['name'] ?? '');
$type = strtoupper(trim($input['type'] ?? 'EXPENSE'));
$icon = !empty($input['icon']) ? trim($input['icon']) : null;
$color = !empty($input['color']) ? trim($input['color']) : defaultCategoryColor($type);
$envelopeId = isset($input['envelopeId']) && $input['envelopeId'] !== '' ? strval($input['envelopeId']) : null;
$parentInput = $input['parentId'] ?? ($input['parent_id'] ?? null);

if (!$name) {
    jsonResponse(['success' => false, 'message' => 'Nama kategori wajib diisi'], 400);
}

if (!$hasHierarchy && $parentInput !== null && $parentInput !== '') {
    jsonResponse(['success' => false, 'message' => 'Fitur grup kategori belum aktif di database. Jalankan migrasi: npm run db:migrate'], 400);
}

$stmt = $pdo->prepare("INSERT INTO cybank_categories (user_id, name, type, icon, color, envelope_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())");
$stmt->execute([$userId, $name, $type, $icon, $color, $envelopeId]);
$newId = intval($pdo->lastInsertId());

if ($hasHierarchy && $parentInput !== null && $parentInput !== '') {
    try {
        $parentId = resolveCategoryParentId($pdo, $userId, $parentInput, $newId, $type);
    } catch (InvalidArgumentException $e) {
        // Batalkan pembuatan kategori agar tidak tersisa tanpa induk yang valid
        $pdo->prepare("DELETE FROM cybank_categories WHERE id = ? AND user_id = ?")->execute([$newId, $userId]);
        jsonResponse(['success' => false, 'message' => $e->getMessage()], 400);
    }
    if ($parentId !== null) {
        // Subkategori tidak menyimpan warna sendiri: selalu ikut warna induk
        $parentColor = resolveCategoryParentColor($pdo, $userId, $parentId);
        if ($parentColor !== null) {
            $pdo->prepare("UPDATE cybank_categories SET parent_id = ?, color = ? WHERE id = ? AND user_id = ?")->execute([$parentId, $parentColor, $newId, $userId]);
        } else {
            $pdo->prepare("UPDATE cybank_categories SET parent_id = ? WHERE id = ? AND user_id = ?")->execute([$parentId, $newId, $userId]);
        }
    }
}

$stmt = $pdo->prepare("SELECT * FROM cybank_categories WHERE id = ?");
$stmt->execute([$newId]);
jsonResponse([
    'success' => true,
    'data' => formatCategoryRow($stmt->fetch(), $hasHierarchy, getCategoryChildCountMap($pdo, $userId, $hasHierarchy)),
    'message' => 'Kategori berhasil dibuat'
], 201);
