<?php
// api/endpoints/stats.php
// GET /stats - ringkasan saldo, arus kas, dan kategori teratas untuk satu bulan.
$pdo = getDbConnection();
$user = requireAuth();
$userId = $user['userId'];

$year = intval($_GET['year'] ?? date('Y'));
$month = intval($_GET['month'] ?? date('n'));

$startOfMonth = sprintf('%04d-%02d-01 00:00:00', $year, $month);
$daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);
$endOfMonth = sprintf('%04d-%02d-%02d 23:59:59', $year, $month, $daysInMonth);

// 1. Total Balance
$stmt = $pdo->prepare("SELECT id, name, type, currency, balance FROM cybank_accounts WHERE user_id = ?");
$stmt->execute([$userId]);
$accounts = array_map(function($acc) {
    $acc['balance'] = floatval($acc['balance']);
    return $acc;
}, $stmt->fetchAll());
$totalBalance = array_sum(array_column($accounts, 'balance'));

// 2. Month's income & expense
$stmt = $pdo->prepare("SELECT SUM(amount) FROM cybank_transactions WHERE user_id = ? AND type = 'INCOME' AND transaction_date BETWEEN ? AND ?");
$stmt->execute([$userId, $startOfMonth, $endOfMonth]);
$monthlyIncome = floatval($stmt->fetchColumn() ?: 0);

$stmt = $pdo->prepare("SELECT SUM(amount) FROM cybank_transactions WHERE user_id = ? AND type = 'EXPENSE' AND transaction_date BETWEEN ? AND ?");
$stmt->execute([$userId, $startOfMonth, $endOfMonth]);
$monthlyExpense = floatval($stmt->fetchColumn() ?: 0);
$netSavings = $monthlyIncome - $monthlyExpense;

// 3. Top categories
$stmt = $pdo->prepare("
    SELECT t.category_id, COALESCE(c.name, 'Uncategorized') as categoryName, SUM(t.amount) as total
    FROM cybank_transactions t
    LEFT JOIN cybank_categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.type = 'EXPENSE' AND t.transaction_date BETWEEN ? AND ?
    GROUP BY t.category_id, c.name
    ORDER BY total DESC
    LIMIT 6
");
$stmt->execute([$userId, $startOfMonth, $endOfMonth]);
$topCategories = array_map(function($c) {
    return [
        'categoryId' => $c['category_id'] ? intval($c['category_id']) : null,
        'categoryName' => $c['categoryName'],
        'total' => floatval($c['total']),
    ];
}, $stmt->fetchAll());

jsonResponse([
    'success' => true,
    'data' => [
        'period' => ['year' => $year, 'month' => $month],
        'totalBalance' => $totalBalance,
        'monthlyIncome' => $monthlyIncome,
        'monthlyExpense' => $monthlyExpense,
        'netSavings' => $netSavings,
        'topCategories' => $topCategories,
        'accounts' => $accounts
    ]
]);
