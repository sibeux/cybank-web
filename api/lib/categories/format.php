<?php
// api/lib/categories/format.php
// Output kategori: dipakai bersama oleh endpoint list/create/update.

// Jumlah subkategori per kategori induk milik satu user.
function getCategoryChildCountMap($pdo, $userId, $hasHierarchy) {
    $map = [];
    if (!$hasHierarchy) return $map;

    $stmt = $pdo->prepare("SELECT parent_id, COUNT(*) as total FROM `cybank_categories` WHERE user_id = ? AND parent_id IS NOT NULL GROUP BY parent_id");
    $stmt->execute([$userId]);
    foreach ($stmt->fetchAll() as $row) {
        $map[intval($row['parent_id'])] = intval($row['total']);
    }

    return $map;
}

// Normalisasi satu baris kategori menjadi bentuk response API
// (id numerik + info hierarki + jumlah subkategori).
function formatCategoryRow($row, $hasHierarchy, array $childCountMap = []) {
    $row['id'] = intval($row['id']);
    $row['user_id'] = intval($row['user_id']);
    $row['parent_id'] = $hasHierarchy && !empty($row['parent_id'] ?? null) ? intval($row['parent_id']) : null;
    $row['parentId'] = $row['parent_id'];
    $row['children_count'] = $childCountMap[$row['id']] ?? 0;
    if (array_key_exists('transaction_count', $row)) {
        $row['transaction_count'] = intval($row['transaction_count']);
    }
    return $row;
}
