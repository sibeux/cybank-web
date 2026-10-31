<?php
// api/lib/categories/color.php
// Pewarisan warna kategori: subkategori selalu memakai warna induknya.

// Warna default bila kategori belum punya warna tersimpan.
function defaultCategoryColor($type) {
    $t = strtoupper((string) $type);
    if ($t === 'INCOME') return '#10b981';
    if ($t === 'TRANSFER') return '#3b82f6';
    return '#f43f5e';
}

// Warna subkategori selalu mengikuti warna kategori induknya.
// Mengembalikan warna induk (fallback ke warna default tipe) atau null bila induk tidak ada.
function resolveCategoryParentColor($pdo, $userId, $parentId) {
    $parentId = intval($parentId);
    if ($parentId <= 0) return null;

    $stmt = $pdo->prepare("SELECT type, color FROM `cybank_categories` WHERE id = ? AND user_id = ?");
    $stmt->execute([$parentId, $userId]);
    $parent = $stmt->fetch();
    if (!$parent) return null;

    return !empty($parent['color']) ? $parent['color'] : defaultCategoryColor($parent['type']);
}

// Samakan warna seluruh subkategori dengan warna induknya (dipakai saat induk diubah/dipindah).
function syncCategoryChildrenColor($pdo, $userId, $parentId) {
    $parentId = intval($parentId);
    if ($parentId <= 0) return;

    $color = resolveCategoryParentColor($pdo, $userId, $parentId);
    if ($color === null) return;

    $stmt = $pdo->prepare("UPDATE `cybank_categories` SET color = ?, updated_at = NOW() WHERE parent_id = ? AND user_id = ?");
    $stmt->execute([$color, $parentId, $userId]);
}

// Terapkan pewarisan warna pada daftar kategori (dipakai endpoint GET).
// Baris subkategori selalu memakai warna induknya, walau di DB masih menyimpan warna lama.
function applyInheritedCategoryColors($pdo, $userId, array $rows) {
    if (empty($rows)) return $rows;

    $stmt = $pdo->prepare("SELECT id, type, color FROM `cybank_categories` WHERE user_id = ?");
    $stmt->execute([$userId]);
    $colorById = [];
    foreach ($stmt->fetchAll() as $row) {
        $colorById[intval($row['id'])] = $row;
    }

    foreach ($rows as &$row) {
        $parentId = !empty($row['parent_id'] ?? null) ? intval($row['parent_id']) : 0;
        if ($parentId <= 0 || !isset($colorById[$parentId])) continue;

        $parent = $colorById[$parentId];
        $row['color'] = !empty($parent['color']) ? $parent['color'] : defaultCategoryColor($parent['type']);
    }
    unset($row);

    return $rows;
}
