<?php
// api/endpoints/analytics.php
// GET /analytics - tren arus kas dan breakdown kategori untuk sebuah periode.
$pdo = getDbConnection();
$user = requireAuth();
$userId = $user['userId'];

$timeframe = $_GET['timeframe'] ?? '1d';
$customStart = $_GET['startDate'] ?? null;
$customEnd = $_GET['endDate'] ?? null;

$now = new DateTime();
$groupByFormat = '%Y-%m-%d';

if ($customStart && $customEnd) {
    $startDate = new DateTime($customStart);
    $endDate = new DateTime($customEnd);
    $endDate->setTime(23, 59, 59);
    $diffDays = $startDate->diff($endDate)->days;
    $groupByFormat = $diffDays > 60 ? '%Y-%m' : '%Y-%m-%d';
} else {
    switch ($timeframe) {
        case '1d':
        case 'daily':
            $startDate = (clone $now)->setTime(0, 0, 0);
            $endDate = (clone $now)->setTime(23, 59, 59);
            $groupByFormat = '%Y-%m-%d';
            break;
        case '7d':
            $startDate = (clone $now)->modify('-6 days')->setTime(0, 0, 0);
            $endDate = (clone $now)->setTime(23, 59, 59);
            $groupByFormat = '%Y-%m-%d';
            break;
        case '30d':
            $startDate = (clone $now)->modify('-29 days')->setTime(0, 0, 0);
            $endDate = (clone $now)->setTime(23, 59, 59);
            $groupByFormat = '%Y-%m-%d';
            break;
        case '6m':
            $startDate = (clone $now)->modify('-5 months')->modify('first day of this month')->setTime(0, 0, 0);
            $endDate = (clone $now)->setTime(23, 59, 59);
            $groupByFormat = '%Y-%m';
            break;
        case '1y':
            $startDate = (clone $now)->modify('-11 months')->modify('first day of this month')->setTime(0, 0, 0);
            $endDate = (clone $now)->setTime(23, 59, 59);
            $groupByFormat = '%Y-%m';
            break;
        case 'all':
            $startDate = new DateTime('2020-01-01 00:00:00');
            $endDate = (clone $now)->setTime(23, 59, 59);
            $groupByFormat = '%Y-%m';
            break;
        default:
            $startDate = (clone $now)->modify('-29 days')->setTime(0, 0, 0);
            $endDate = (clone $now)->setTime(23, 59, 59);
            $groupByFormat = '%Y-%m-%d';
    }
}

$sDateStr = $startDate->format('Y-m-d H:i:s');
$eDateStr = $endDate->format('Y-m-d H:i:s');

// Fetch Grouped Trend
$stmt = $pdo->prepare("
    SELECT 
        DATE_FORMAT(transaction_date, '{$groupByFormat}') as period,
        type,
        SUM(amount) as total
    FROM cybank_transactions
    WHERE user_id = ? AND transaction_date BETWEEN ? AND ?
    GROUP BY period, type
    ORDER BY period ASC
");
$stmt->execute([$userId, $sDateStr, $eDateStr]);
$rows = $stmt->fetchAll();

// Build continuous interval map so any periode (daily/weekly/monthly/
// yearly/custom range) renders a gap-free axis. The axis starts at the
// earliest period that actually has data, which keeps long ranges from
// being padded with leading empty buckets.
$trendMap = [];
if (!empty($rows)) {
    $axisStart = clone $startDate;
    $firstPeriod = min(array_column($rows, 'period'));
    $firstDate = $groupByFormat === '%Y-%m'
        ? new DateTime($firstPeriod . '-01')
        : new DateTime($firstPeriod);
    if ($firstDate > $axisStart) $axisStart = $firstDate;

    if ($groupByFormat === '%Y-%m-%d') {
        $cur = clone $axisStart;
        while ($cur <= $endDate) {
            $trendMap[$cur->format('Y-m-d')] = ['income' => 0, 'expense' => 0];
            $cur->modify('+1 day');
        }
    } else {
        $cur = clone $axisStart;
        $cur->modify('first day of this month');
        $endM = clone $endDate;
        $endM->modify('first day of this month');
        while ($cur <= $endM) {
            $trendMap[$cur->format('Y-m')] = ['income' => 0, 'expense' => 0];
            $cur->modify('+1 month');
        }
    }
}

$totalIncome = 0;
$totalExpense = 0;
foreach ($rows as $r) {
    $p = $r['period'];
    $amt = floatval($r['total']);
    if (!isset($trendMap[$p])) {
        $trendMap[$p] = ['income' => 0, 'expense' => 0];
    }
    if ($r['type'] === 'INCOME') {
        $trendMap[$p]['income'] += $amt;
        $totalIncome += $amt;
    } elseif ($r['type'] === 'EXPENSE') {
        $trendMap[$p]['expense'] += $amt;
        $totalExpense += $amt;
    }
}

ksort($trendMap);
$monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
$trend = [];
foreach ($trendMap as $period => $data) {
    $label = $period;
    if (strlen($period) === 10) {
        list($y, $m, $d) = explode('-', $period);
        $label = intval($d) . ' ' . $monthNames[intval($m) - 1];
    } elseif (strlen($period) === 7) {
        list($y, $m) = explode('-', $period);
        $label = $monthNames[intval($m) - 1] . " '" . substr($y, 2);
    }
    $trend[] = [
        'period' => $period,
        'label' => $label,
        'income' => $data['income'],
        'expense' => $data['expense'],
        'net' => $data['income'] - $data['expense']
    ];
}

// Category breakdown
$stmt = $pdo->prepare("
    SELECT 
        t.category_id,
        COALESCE(c.name, 'Lain-lain') as cat_name,
        COALESCE(pc.color, c.color) as cat_color,
        SUM(t.amount) as total
    FROM cybank_transactions t
    LEFT JOIN cybank_categories c ON t.category_id = c.id
    LEFT JOIN cybank_categories pc ON c.parent_id = pc.id
    WHERE t.user_id = ? AND t.type = 'EXPENSE' AND t.transaction_date BETWEEN ? AND ?
    GROUP BY t.category_id, c.name, c.color, pc.color
    ORDER BY total DESC
");
$stmt->execute([$userId, $sDateStr, $eDateStr]);
$catRows = $stmt->fetchAll();

$colorPalette = ["#10b981", "#f43f5e", "#6366f1", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#3b82f6", "#14b8a6", "#f97316"];
$categories = [];
foreach ($catRows as $idx => $cr) {
    $amt = floatval($cr['total']);
    $pct = $totalExpense > 0 ? round(($amt / $totalExpense) * 100, 1) : 0;
    $categories[] = [
        'id' => $cr['category_id'] ? intval($cr['category_id']) : null,
        'name' => $cr['cat_name'],
        'color' => $cr['cat_color'] ?: $colorPalette[$idx % count($colorPalette)],
        'total' => $amt,
        'percentage' => $pct
    ];
}

jsonResponse([
    'success' => true,
    'data' => [
        'timeframe' => $timeframe,
        'range' => [
            'startDate' => $startDate->format('c'),
            'endDate' => $endDate->format('c')
        ],
        'summary' => [
            'totalIncome' => $totalIncome,
            'totalExpense' => $totalExpense,
            'net' => $totalIncome - $totalExpense,
            'savingsRate' => $totalIncome > 0 ? round((($totalIncome - $totalExpense) / $totalIncome) * 100, 1) : 0
        ],
        'trend' => $trend,
        'categories' => $categories
    ]
]);
