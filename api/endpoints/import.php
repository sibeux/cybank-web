<?php
// api/endpoints/import.php
// POST /import - impor transaksi dari file CSV (upload multipart atau csvContent JSON).
$pdo = getDbConnection();
$user = requireAuth();
$userId = $user['userId'];

$csvContent = '';
if (isset($_FILES['file']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
    $csvContent = file_get_contents($_FILES['file']['tmp_name']);
} else {
    $input = getJsonInput();
    $csvContent = $input['csvContent'] ?? '';
}

if (empty(trim($csvContent))) {
    jsonResponse(['success' => false, 'message' => 'CSV content cannot be empty'], 400);
}

// Parse CSV
$lines = preg_split('/\r\n|\r|\n/', trim($csvContent));
if (count($lines) < 2) {
    jsonResponse(['success' => false, 'message' => 'CSV file contains no data rows'], 400);
}

// Delimiter detection (semicolon or comma)
$firstLine = $lines[0];
$delimiter = strpos($firstLine, ';') !== false ? ';' : ',';
$headers = array_map(function($h) { return strtolower(trim($h, " \t\n\r\0\x0B\"'")); }, str_getcsv($firstLine, $delimiter));

// Preload accounts & categories map
$stmt = $pdo->prepare("SELECT id, LOWER(name) as name_key FROM cybank_accounts WHERE user_id = ?");
$stmt->execute([$userId]);
$accountMap = [];
foreach ($stmt->fetchAll() as $a) $accountMap[$a['name_key']] = intval($a['id']);

$stmt = $pdo->prepare("SELECT id, LOWER(name) as name_key FROM cybank_categories WHERE user_id = ?");
$stmt->execute([$userId]);
$categoryMap = [];
foreach ($stmt->fetchAll() as $c) $categoryMap[$c['name_key']] = intval($c['id']);

$importedCount = 0;
$skippedCount = 0;
$accountsCreated = 0;
$categoriesCreated = 0;
$errors = [];

$pdo->beginTransaction();
try {
    for ($i = 1; $i < count($lines); $i++) {
        $line = trim($lines[$i]);
        if (empty($line)) continue;
        $row = str_getcsv($line, $delimiter);
        if (count($row) < count($headers)) continue;

        $data = array_combine($headers, $row);
        $accName = trim($data['account'] ?? 'My Cash');
        $accKey = strtolower($accName);

        // Auto create account if not exists
        if ($accName && !isset($accountMap[$accKey])) {
            $stmt = $pdo->prepare("INSERT INTO cybank_accounts (user_id, name, type, currency, balance, created_at, updated_at) VALUES (?, ?, 'CASH', 'IDR', 0, NOW(), NOW())");
            $stmt->execute([$userId, $accName]);
            $newAccId = intval($pdo->lastInsertId());
            $accountMap[$accKey] = $newAccId;
            $accountsCreated++;
        }
        $accountId = $accountMap[$accKey] ?? null;

        // Auto create category if not exists
        $catName = trim($data['category'] ?? '');
        $catKey = strtolower($catName);
        $categoryId = null;
        if ($catName) {
            if (!isset($categoryMap[$catKey])) {
                $stmt = $pdo->prepare("INSERT INTO cybank_categories (user_id, name, type, created_at, updated_at) VALUES (?, ?, 'EXPENSE', NOW(), NOW())");
                $stmt->execute([$userId, $catName]);
                $newCatId = intval($pdo->lastInsertId());
                $categoryMap[$catKey] = $newCatId;
                $categoriesCreated++;
            }
            $categoryId = $categoryMap[$catKey];
        }

        $amount = abs(floatval(str_replace(['.', ','], ['', '.'], $data['amount'] ?? '0')));
        $rawType = strtoupper(trim($data['type'] ?? 'EXPENSE'));
        $type = in_array($rawType, ['EXPENSE', 'INCOME', 'TRANSFER']) ? $rawType : 'EXPENSE';
        $note = $data['note'] ?? null;
        $payee = $data['payee'] ?? null;
        $paymentType = $data['payment_type'] ?? 'CASH';

        $rawDate = $data['date'] ?? ($data['transaction_date'] ?? date('Y-m-d H:i:s'));
        $txDate = date('Y-m-d H:i:s', strtotime($rawDate));

        if ($accountId && $amount > 0) {
            $stmt = $pdo->prepare("
                INSERT INTO cybank_transactions 
                (user_id, account_id, category_id, amount, type, payment_type, note, payee, transaction_date, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            $stmt->execute([$userId, $accountId, $categoryId, $amount, $type, $paymentType, $note, $payee, $txDate]);

            // Adjust balance
            if ($type === 'EXPENSE') {
                $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance - ? WHERE id = ?");
                $stmt->execute([$amount, $accountId]);
            } elseif ($type === 'INCOME') {
                $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance + ? WHERE id = ?");
                $stmt->execute([$amount, $accountId]);
            }
            $importedCount++;
        } else {
            $skippedCount++;
        }
    }
    $pdo->commit();

    jsonResponse([
        'success' => true,
        'message' => "Successfully imported {$importedCount} transactions.",
        'result' => [
            'totalRows' => count($lines) - 1,
            'importedCount' => $importedCount,
            'skippedCount' => $skippedCount,
            'accountsCreated' => $accountsCreated,
            'categoriesCreated' => $categoriesCreated,
            'errors' => $errors
        ]
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
}
