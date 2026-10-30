<?php
// api/endpoints/categories/list.php
// GET /categories - daftar kategori (opsional filter type/parentId dan hitung transaksi).
$pdo = getDbConnection();
$user = requireAuth();
$userId = $user['userId'];
// Kolom parent_id mungkin belum ada di DB lama; endpoint tetap berjalan tanpa hierarki
$hasHierarchy = ensureCategoryParentColumn($pdo);

// Jumlah subkategori per kategori induk
$childCountMap = getCategoryChildCountMap($pdo, $userId, $hasHierarchy);

$type = isset($_GET['type']) ? strtoupper(trim($_GET['type'])) : null;
$withCount = isset($_GET['withCount']);
// parentId=0 -> hanya kategori utama, parentId=<id> -> subkategori dari induk tersebut
$parentFilter = $hasHierarchy && isset($_GET['parentId']) && $_GET['parentId'] !== '' ? intval($_GET['parentId']) : null;

$where = "c.user_id = ?";
$params = [$userId];
if ($type) {
    $where .= " AND c.type = ?";
    $params[] = $type;
}
if ($parentFilter !== null) {
    if ($parentFilter > 0) {
        $where .= " AND c.parent_id = ?";
        $params[] = $parentFilter;
    } else {
        $where .= " AND c.parent_id IS NULL";
    }
}

$orderSql = $hasHierarchy ? "c.parent_id IS NOT NULL ASC, c.name ASC" : "c.name ASC";

if ($withCount) {
    $sql = "SELECT c.*, COUNT(t.id) as transaction_count
            FROM cybank_categories c
            LEFT JOIN cybank_transactions t ON c.id = t.category_id AND t.user_id = c.user_id
            WHERE {$where}
            GROUP BY c.id
            ORDER BY {$orderSql}";
} else {
    $sql = "SELECT c.* FROM cybank_categories c WHERE {$where} ORDER BY {$orderSql}";
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();
if ($hasHierarchy) {
    // Warna subkategori selalu mewarisi warna kategori induk
    $rows = applyInheritedCategoryColors($pdo, $userId, $rows);
}
jsonResponse(['success' => true, 'data' => array_map(function($row) use ($hasHierarchy, $childCountMap) {
    return formatCategoryRow($row, $hasHierarchy, $childCountMap);
}, $rows)]);
