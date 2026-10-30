<?php
// api/endpoints/transactions/list.php
// GET /transactions - daftar transaksi berhalaman beserta ringkasan dan filter.
$pdo = getDbConnection();
$user = requireAuth();
$userId = $user['userId'];
$hasHierarchy = ensureCategoryParentColumn($pdo);

$page = max(1, intval($_GET['page'] ?? 1));
$limit = min(100, max(1, intval($_GET['limit'] ?? 20)));
$offset = ($page - 1) * $limit;

$accountId = isset($_GET['accountId']) && $_GET['accountId'] !== '' ? intval($_GET['accountId']) : null;
$categoryId = isset($_GET['categoryId']) && $_GET['categoryId'] !== '' ? intval($_GET['categoryId']) : null;
$type = isset($_GET['type']) && $_GET['type'] !== '' ? strtoupper(trim($_GET['type'])) : null;
$search = isset($_GET['search']) && $_GET['search'] !== '' ? trim($_GET['search']) : null;
$startDate = $_GET['startDate'] ?? null;
$endDate = $_GET['endDate'] ?? null;

$whereSql = ["t.user_id = ?"];
$params = [$userId];

if ($accountId) {
    $whereSql[] = "t.account_id = ?";
    $params[] = $accountId;
}
if ($categoryId) {
    // Sertakan subkategori saat memfilter berdasarkan kategori induk
    $categoryIds = $hasHierarchy
        ? getCategoryDescendantIds($pdo, $userId, $categoryId)
        : [$categoryId];
    $whereSql[] = "t.category_id IN (" . implode(',', array_fill(0, count($categoryIds), '?')) . ")";
    foreach ($categoryIds as $cid) {
        $params[] = $cid;
    }
}
if ($type) {
    $whereSql[] = "t.type = ?";
    $params[] = $type;
}
if ($startDate) {
    $whereSql[] = "t.transaction_date >= ?";
    $params[] = strpos($startDate, ' ') === false && strpos($startDate, 'T') === false ? "{$startDate} 00:00:00" : date('Y-m-d H:i:s', strtotime($startDate));
}
if ($endDate) {
    $whereSql[] = "t.transaction_date <= ?";
    $params[] = strpos($endDate, ' ') === false && strpos($endDate, 'T') === false ? "{$endDate} 23:59:59" : date('Y-m-d H:i:s', strtotime($endDate));
}
if ($search) {
    $whereSql[] = "(t.note LIKE ? OR t.payee LIKE ?)";
    $params[] = "%{$search}%";
    $params[] = "%{$search}%";
}

$whereClause = implode(" AND ", $whereSql);

// Count total
$stmt = $pdo->prepare("SELECT COUNT(*) FROM cybank_transactions t WHERE {$whereClause}");
$stmt->execute($params);
$total = intval($stmt->fetchColumn());

// Aggregates for summary
$stmt = $pdo->prepare("SELECT SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) as total_expense, SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) as total_income FROM cybank_transactions t WHERE {$whereClause}");
$stmt->execute($params);
$agg = $stmt->fetch();
$totalExpense = floatval($agg['total_expense'] ?: 0);
$totalIncome = floatval($agg['total_income'] ?: 0);

// Sort
$sortBy = ($_GET['sortBy'] ?? 'date') === 'amount' ? 't.amount' : 't.transaction_date';
$sortOrder = strtolower($_GET['sortOrder'] ?? 'desc') === 'asc' ? 'ASC' : 'DESC';

// Query Data
$query = "
    SELECT 
        t.id, t.user_id, t.account_id, t.category_id, t.transfer_to_account_id,
        t.amount, t.type, t.payment_type as paymentType, t.note, t.payee, t.labels,
        t.transaction_date as transactionDate, t.created_at, t.updated_at,
        a.id as acc_id, a.name as acc_name, a.currency as acc_currency,
        c.id as cat_id, c.name as cat_name, c.icon as cat_icon, COALESCE(pc.color, c.color) as cat_color,
        tta.id as tta_id, tta.name as tta_name
    FROM cybank_transactions t
    JOIN cybank_accounts a ON t.account_id = a.id
    LEFT JOIN cybank_categories c ON t.category_id = c.id
    LEFT JOIN cybank_categories pc ON c.parent_id = pc.id
    LEFT JOIN cybank_accounts tta ON t.transfer_to_account_id = tta.id
    WHERE {$whereClause}
    ORDER BY {$sortBy} {$sortOrder}
    LIMIT {$limit} OFFSET {$offset}
";
$stmt = $pdo->prepare($query);
$stmt->execute($params);
$rawList = $stmt->fetchAll();

$transactions = array_map(function($row) {
    return [
        'id' => intval($row['id']),
        'userId' => intval($row['user_id']),
        'accountId' => intval($row['account_id']),
        'categoryId' => $row['category_id'] ? intval($row['category_id']) : null,
        'transferToAccountId' => $row['transfer_to_account_id'] ? intval($row['transfer_to_account_id']) : null,
        'amount' => floatval($row['amount']),
        'type' => $row['type'],
        'paymentType' => $row['paymentType'],
        'note' => $row['note'],
        'payee' => $row['payee'],
        'labels' => $row['labels'],
        'transactionDate' => date('c', strtotime($row['transactionDate'])),
        'accountName' => $row['acc_name'],
        'transferToAccountName' => $row['tta_name'] ?? null,
        'account' => [
            'id' => intval($row['acc_id']),
            'name' => $row['acc_name'],
            'currency' => $row['acc_currency'],
        ],
        'category' => $row['cat_id'] ? [
            'id' => intval($row['cat_id']),
            'name' => $row['cat_name'],
            'icon' => $row['cat_icon'],
            'color' => $row['cat_color'],
        ] : null,
        'transferToAccount' => $row['tta_id'] ? [
            'id' => intval($row['tta_id']),
            'name' => $row['tta_name'],
        ] : null,
    ];
}, $rawList);

jsonResponse([
    'success' => true,
    'data' => $transactions,
    'summary' => [
        'totalExpense' => $totalExpense,
        'totalIncome' => $totalIncome,
        'net' => $totalIncome - $totalExpense
    ],
    'pagination' => [
        'page' => $page,
        'limit' => $limit,
        'total' => $total,
        'totalPages' => ceil($total / $limit)
    ]
]);
