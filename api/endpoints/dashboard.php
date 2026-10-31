<?php
// api/endpoints/dashboard.php
// GET /dashboard - data awal dashboard dalam satu request.
$pdo = getDbConnection();
$user = requireAuth();
$userId = $user['userId'];
$hasHierarchy = ensureCategoryParentColumn($pdo);

// 1. Accounts
$stmt = $pdo->prepare("SELECT id, name, type, currency, balance FROM cybank_accounts WHERE user_id = ? ORDER BY created_at ASC");
$stmt->execute([$userId]);
$accounts = array_map(function($acc) {
    $acc['balance'] = floatval($acc['balance']);
    return $acc;
}, $stmt->fetchAll());

$totalBalance = array_sum(array_column($accounts, 'balance'));

// 2. Categories (beserta info grup/induk)
$catSql = $hasHierarchy
    ? "SELECT id, name, type, icon, color, parent_id FROM cybank_categories WHERE user_id = ? ORDER BY parent_id IS NOT NULL ASC, name ASC"
    : "SELECT id, name, type, icon, color FROM cybank_categories WHERE user_id = ? ORDER BY name ASC";
$stmt = $pdo->prepare($catSql);
$stmt->execute([$userId]);
$catRows = $stmt->fetchAll();
if ($hasHierarchy) {
    // Warna subkategori mengikuti warna induknya
    $catRows = applyInheritedCategoryColors($pdo, $userId, $catRows);
}
$categories = array_map(function($cat) use ($hasHierarchy) {
    $cat['id'] = intval($cat['id']);
    $cat['parent_id'] = $hasHierarchy && !empty($cat['parent_id'] ?? null) ? intval($cat['parent_id']) : null;
    $cat['parentId'] = $cat['parent_id'];
    return $cat;
}, $catRows);

// 3. Month's stats
$startOfMonth = date('Y-m-01 00:00:00');
$endOfMonth = date('Y-m-t 23:59:59');

$stmt = $pdo->prepare("SELECT SUM(amount) FROM cybank_transactions WHERE user_id = ? AND type = 'EXPENSE' AND transaction_date BETWEEN ? AND ?");
$stmt->execute([$userId, $startOfMonth, $endOfMonth]);
$monthlyExpense = floatval($stmt->fetchColumn() ?: 0);

$stmt = $pdo->prepare("SELECT SUM(amount) FROM cybank_transactions WHERE user_id = ? AND type = 'INCOME' AND transaction_date BETWEEN ? AND ?");
$stmt->execute([$userId, $startOfMonth, $endOfMonth]);
$monthlyIncome = floatval($stmt->fetchColumn() ?: 0);

$stmt = $pdo->prepare("SELECT SUM(amount) FROM cybank_transactions WHERE user_id = ? AND type = 'TRANSFER' AND transaction_date BETWEEN ? AND ?");
$stmt->execute([$userId, $startOfMonth, $endOfMonth]);
$monthlyTransfer = floatval($stmt->fetchColumn() ?: 0);

$stmt = $pdo->prepare("SELECT COUNT(*) FROM cybank_transactions WHERE user_id = ?");
$stmt->execute([$userId]);
$totalTxCount = intval($stmt->fetchColumn() ?: 0);

// 4. Top 5 Categories this month
$stmt = $pdo->prepare("
    SELECT t.category_id, COALESCE(c.name, 'Lain-lain') as name, SUM(t.amount) as total
    FROM cybank_transactions t
    LEFT JOIN cybank_categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.type = 'EXPENSE' AND t.transaction_date BETWEEN ? AND ?
    GROUP BY t.category_id, c.name
    ORDER BY total DESC
    LIMIT 5
");
$stmt->execute([$userId, $startOfMonth, $endOfMonth]);
$topCategories = array_map(function($tc) {
    return [
        'name' => $tc['name'],
        'total' => floatval($tc['total'])
    ];
}, $stmt->fetchAll());

// 5. Recent Transactions
$stmt = $pdo->prepare("
    SELECT 
        t.id, t.amount, t.type, t.payment_type as paymentType, t.note, t.payee, 
        t.transaction_date as transactionDate,
        t.account_id as accountId,
        t.category_id as categoryId,
        t.transfer_to_account_id as transferToAccountId,
        a.name as accountName,
        COALESCE(tta.name, '') as transferToAccountName,
        COALESCE(c.name, 'General') as categoryName
    FROM cybank_transactions t
    JOIN cybank_accounts a ON t.account_id = a.id
    LEFT JOIN cybank_categories c ON t.category_id = c.id
    LEFT JOIN cybank_accounts tta ON t.transfer_to_account_id = tta.id
    WHERE t.user_id = ?
    ORDER BY t.transaction_date DESC
    LIMIT 10
");
$stmt->execute([$userId]);
$recentTx = array_map(function($tx) {
    $tx['id'] = intval($tx['id']);
    $tx['amount'] = floatval($tx['amount']);
    $tx['accountId'] = intval($tx['accountId']);
    $tx['categoryId'] = !empty($tx['categoryId']) ? intval($tx['categoryId']) : null;
    $tx['transferToAccountId'] = !empty($tx['transferToAccountId']) ? intval($tx['transferToAccountId']) : null;
    $tx['transferToAccountName'] = !empty($tx['transferToAccountName']) ? $tx['transferToAccountName'] : null;
    $tx['transactionDate'] = date('c', strtotime($tx['transactionDate']));
    return $tx;
}, $stmt->fetchAll());

jsonResponse([
    'success' => true,
    'data' => [
        'user' => [
            'id' => $user['userId'],
            'name' => $user['name'] ?: 'User',
            'email' => $user['email']
        ],
        'stats' => [
            'totalBalance' => $totalBalance,
            'monthlyExpense' => $monthlyExpense,
            'monthlyIncome' => $monthlyIncome,
            'monthlyTransfer' => $monthlyTransfer,
            'netSavings' => $monthlyIncome - $monthlyExpense - $monthlyTransfer,
            'totalTxCount' => $totalTxCount,
            'topCategories' => $topCategories,
        ],
        'accounts' => $accounts,
        'categories' => $categories,
        'transactions' => $recentTx,
        'recentTransactions' => $recentTx
    ]
]);
