<?php
// api/index.php
require_once __DIR__ . '/config.php';

// Normalize path request
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// Hapus prefix /api/v1 atau /api
$endpoint = preg_replace('#^.*?/api(/v1)?/#', '', $uri);
$endpoint = trim($endpoint, '/');
$method = $_SERVER['REQUEST_METHOD'];

// Inisialisasi koneksi DB secara lazy/hanya untuk endpoint non-auth
$authEndpoints = ['auth/login', 'auth/refresh', 'auth/me', 'auth/logout'];
$pdo = in_array($endpoint, $authEndpoints) ? null : getDbConnection();

switch ($endpoint) {
    // ------------------------------------------------------------------------
    // 1. AUTH: LOGIN
    // ------------------------------------------------------------------------
    case 'auth/login':
        if ($method !== 'POST') jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        $input = getJsonInput();
        $email = trim($input['email'] ?? '');
        $password = trim($input['password'] ?? '');

        if (!$email || !$password) {
            jsonResponse(['success' => false, 'message' => 'Email dan password wajib diisi.'], 400);
        }

        $ssoUrl = getenv('SSO_LOGIN_URL') ?: 'https://cybeat.sibeux.my.id/api/auth/login';

        // Panggil SSO Cybeat
        $ch = curl_init($ssoUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['email' => $email, 'password' => $password]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        $ssoRaw = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $ssoData = json_decode($ssoRaw, true);
        if (!$ssoData || empty($ssoData['access_token']) || ($ssoData['status'] ?? '') !== 'success') {
            jsonResponse([
                'success' => false,
                'message' => $ssoData['message'] ?? 'Login gagal. Periksa kembali email dan password Anda.'
            ], $httpCode ?: 401);
        }

        $token = $ssoData['access_token'];
        $parts = explode('.', $token);
        $user = ['userId' => 0, 'email' => $email, 'name' => 'User', 'role' => 'user'];
        if (count($parts) === 3) {
            $payload = json_decode(base64UrlDecode($parts[1]), true);
            if ($payload) {
                $user['userId'] = intval($payload['sub'] ?? 0);
                $userData = $payload['data'] ?? [];
                $user['name'] = trim($userData['name'] ?? ($payload['name'] ?? 'User'));
                $user['email'] = $userData['email'] ?? ($payload['email'] ?? $email);
                $user['role'] = $userData['role'] ?? ($payload['role'] ?? 'user');
            }
        }

        // Set secure cookie
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? 80) == 443;
        setcookie('cybank_token', $token, [
            'expires' => time() + (86400 * 7),
            'path' => '/',
            'secure' => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        if (!empty($ssoData['refresh_token'])) {
            setcookie('cybank_refresh_token', $ssoData['refresh_token'], [
                'expires' => time() + (86400 * 30),
                'path' => '/',
                'secure' => $isHttps,
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
        }

        jsonResponse([
            'success' => true,
            'message' => 'Login berhasil',
            'user' => $user,
            'access_token' => $token,
            'refresh_token' => $ssoData['refresh_token'] ?? null
        ]);
        break;

    // ------------------------------------------------------------------------
    // 2. AUTH: REFRESH
    // ------------------------------------------------------------------------
    case 'auth/refresh':
        if ($method !== 'POST') jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        $input = getJsonInput();

        // Cari refresh token dari input JSON (refresh_token atau refreshToken), Header Bearer, atau Cookie
        $refreshToken = trim($input['refresh_token'] ?? ($input['refreshToken'] ?? ''));

        if (!$refreshToken) {
            $headers = getRequestHeaders();
            $authHeader = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
            if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $refreshToken = trim($matches[1]);
            }
        }

        if (!$refreshToken && !empty($_COOKIE['cybank_refresh_token'])) {
            $refreshToken = trim($_COOKIE['cybank_refresh_token']);
        }

        if (!$refreshToken) {
            jsonResponse(['success' => false, 'message' => 'Refresh token wajib diisi.'], 400);
        }

        $ssoRefreshUrl = getenv('SSO_REFRESH_URL');
        if (!$ssoRefreshUrl) {
            $ssoLoginUrl = getenv('SSO_LOGIN_URL') ?: 'https://cybeat.sibeux.my.id/api/auth/login';
            $ssoRefreshUrl = preg_replace('#/auth/login/?$#', '/auth/refresh', $ssoLoginUrl);
            if ($ssoRefreshUrl === $ssoLoginUrl) {
                $ssoRefreshUrl = 'https://cybeat.sibeux.my.id/api/auth/refresh';
            }
        }

        // Panggil SSO Cybeat Refresh
        $ch = curl_init($ssoRefreshUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['refresh_token' => $refreshToken]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $refreshToken
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        $ssoRaw = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $ssoData = json_decode($ssoRaw, true);
        if (!$ssoData || empty($ssoData['access_token']) || ($ssoData['status'] ?? '') !== 'success') {
            jsonResponse([
                'success' => false,
                'message' => $ssoData['message'] ?? 'Gagal memperbarui token. Sesi mungkin telah berakhir.'
            ], $httpCode ?: 401);
        }

        $newToken = $ssoData['access_token'];
        $newRefreshToken = $ssoData['refresh_token'] ?? $refreshToken;
        $parts = explode('.', $newToken);
        $user = ['userId' => 0, 'email' => '', 'name' => 'User', 'role' => 'user'];
        if (count($parts) === 3) {
            $payload = json_decode(base64UrlDecode($parts[1]), true);
            if ($payload) {
                $user['userId'] = intval($payload['sub'] ?? 0);
                $userData = $payload['data'] ?? [];
                $user['name'] = trim($userData['name'] ?? ($payload['name'] ?? 'User'));
                $user['email'] = $userData['email'] ?? ($payload['email'] ?? '');
                $user['role'] = $userData['role'] ?? ($payload['role'] ?? 'user');
            }
        }

        // Update cookie
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? 80) == 443;
        setcookie('cybank_token', $newToken, [
            'expires' => time() + (86400 * 7),
            'path' => '/',
            'secure' => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        if (!empty($newRefreshToken)) {
            setcookie('cybank_refresh_token', $newRefreshToken, [
                'expires' => time() + (86400 * 30),
                'path' => '/',
                'secure' => $isHttps,
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
        }

        jsonResponse([
            'success' => true,
            'message' => 'Token berhasil diperbarui',
            'user' => $user,
            'access_token' => $newToken,
            'refresh_token' => $newRefreshToken
        ]);
        break;

    // ------------------------------------------------------------------------
    // 3. AUTH: ME
    // ------------------------------------------------------------------------
    case 'auth/me':
        if ($method !== 'GET') jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        $user = requireAuth();
        jsonResponse(['success' => true, 'user' => $user]);
        break;

    // ------------------------------------------------------------------------
    // 4. AUTH: LOGOUT
    // ------------------------------------------------------------------------
    case 'auth/logout':
        if ($method !== 'POST') jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        setcookie('cybank_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        setcookie('cybank_refresh_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        jsonResponse(['success' => true, 'message' => 'Logout berhasil']);
        break;

    // ------------------------------------------------------------------------
    // 4. DASHBOARD (Initial Data Fetch)
    // ------------------------------------------------------------------------
    case 'dashboard':
        if ($method !== 'GET') jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
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
        $categories = array_map(function($cat) use ($hasHierarchy) {
            $cat['id'] = intval($cat['id']);
            $cat['parent_id'] = $hasHierarchy && !empty($cat['parent_id'] ?? null) ? intval($cat['parent_id']) : null;
            $cat['parentId'] = $cat['parent_id'];
            return $cat;
        }, $stmt->fetchAll());

        // 3. Month's stats
        $startOfMonth = date('Y-m-01 00:00:00');
        $endOfMonth = date('Y-m-t 23:59:59');

        $stmt = $pdo->prepare("SELECT SUM(amount) FROM cybank_transactions WHERE user_id = ? AND type = 'EXPENSE' AND transaction_date BETWEEN ? AND ?");
        $stmt->execute([$userId, $startOfMonth, $endOfMonth]);
        $monthlyExpense = floatval($stmt->fetchColumn() ?: 0);

        $stmt = $pdo->prepare("SELECT SUM(amount) FROM cybank_transactions WHERE user_id = ? AND type = 'INCOME' AND transaction_date BETWEEN ? AND ?");
        $stmt->execute([$userId, $startOfMonth, $endOfMonth]);
        $monthlyIncome = floatval($stmt->fetchColumn() ?: 0);

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
                    'netSavings' => $monthlyIncome - $monthlyExpense,
                    'totalTxCount' => $totalTxCount,
                    'topCategories' => $topCategories,
                ],
                'accounts' => $accounts,
                'categories' => $categories,
                'transactions' => $recentTx,
                'recentTransactions' => $recentTx
            ]
        ]);
        break;

    // ------------------------------------------------------------------------
    // 5. ACCOUNTS
    // ------------------------------------------------------------------------
    case 'accounts':
    case 'accounts/recount':
        $user = requireAuth();
        $userId = $user['userId'];

        if ($method === 'GET') {
            $stmt = $pdo->prepare("SELECT * FROM cybank_accounts WHERE user_id = ? ORDER BY created_at ASC");
            $stmt->execute([$userId]);
            $accounts = array_map(function($a) {
                $a['balance'] = floatval($a['balance']);
                return $a;
            }, $stmt->fetchAll());
            jsonResponse(['success' => true, 'data' => $accounts]);
        } elseif ($method === 'PUT' || $method === 'PATCH' || ($method === 'POST' && ($endpoint === 'accounts/recount' || !empty(getJsonInput()['action']) || isset(getJsonInput()['accounts']) || (isset(getJsonInput()['balance']) && !isset(getJsonInput()['initialBalance']))))) {
            $input = getJsonInput();
            $recordAdjustment = !empty($input['recordAdjustment']);
            $note = trim($input['note'] ?? 'Penyesuaian Saldo (Recount)');

            // Prepare list of account updates
            $updates = [];
            if (!empty($input['accounts']) && is_array($input['accounts'])) {
                $updates = $input['accounts'];
            } elseif (isset($input['id']) && isset($input['balance'])) {
                $updates[] = [
                    'id' => intval($input['id']),
                    'balance' => floatval($input['balance']),
                    'name' => isset($input['name']) ? trim($input['name']) : null,
                ];
            } else {
                jsonResponse(['success' => false, 'message' => 'Data akun atau saldo tidak valid'], 400);
            }

            $pdo->beginTransaction();
            try {
                // Fetch user accounts for security and diff checking
                $stmt = $pdo->prepare("SELECT id, name, balance FROM cybank_accounts WHERE user_id = ?");
                $stmt->execute([$userId]);
                $existing = [];
                foreach ($stmt->fetchAll() as $row) {
                    $existing[intval($row['id'])] = [
                        'name' => $row['name'],
                        'balance' => floatval($row['balance']),
                    ];
                }

                $adjustCategoryId = null;
                if ($recordAdjustment) {
                    $catStmt = $pdo->prepare("SELECT id FROM cybank_categories WHERE user_id = ? AND (name LIKE '%Penyesuaian%' OR name LIKE '%Adjustment%') LIMIT 1");
                    $catStmt->execute([$userId]);
                    $foundCat = $catStmt->fetch();
                    if ($foundCat) {
                        $adjustCategoryId = intval($foundCat['id']);
                    } else {
                        $catStmt = $pdo->prepare("INSERT INTO cybank_categories (user_id, name, type, icon, color, created_at, updated_at) VALUES (?, 'Penyesuaian Saldo', 'EXPENSE', 'sliders', '#64748b', NOW(), NOW())");
                        $catStmt->execute([$userId]);
                        $adjustCategoryId = intval($pdo->lastInsertId());
                    }
                }

                foreach ($updates as $item) {
                    $accId = intval($item['id'] ?? 0);
                    if (!isset($existing[$accId])) continue;

                    $newBalance = floatval($item['balance'] ?? 0);
                    $oldBalance = $existing[$accId]['balance'];
                    $diff = $newBalance - $oldBalance;

                    if ($recordAdjustment && abs($diff) > 0.001) {
                        $txType = $diff > 0 ? 'INCOME' : 'EXPENSE';
                        $txAmount = abs($diff);
                        $txStmt = $pdo->prepare("
                            INSERT INTO cybank_transactions 
                            (user_id, account_id, category_id, amount, type, payment_type, note, payee, transaction_date, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, 'CASH', ?, 'Recount Saldo', NOW(), NOW(), NOW())
                        ");
                        $txStmt->execute([$userId, $accId, $adjustCategoryId, $txAmount, $txType, $note]);
                    }

                    $accName = !empty($item['name']) ? trim($item['name']) : null;
                    $accType = !empty($item['type']) ? strtoupper(trim($item['type'])) : null;

                    if ($accName && $accType) {
                        $upStmt = $pdo->prepare("UPDATE cybank_accounts SET balance = ?, name = ?, type = ?, updated_at = NOW() WHERE id = ? AND user_id = ?");
                        $upStmt->execute([$newBalance, $accName, $accType, $accId, $userId]);
                    } elseif ($accName) {
                        $upStmt = $pdo->prepare("UPDATE cybank_accounts SET balance = ?, name = ?, updated_at = NOW() WHERE id = ? AND user_id = ?");
                        $upStmt->execute([$newBalance, $accName, $accId, $userId]);
                    } elseif ($accType) {
                        $upStmt = $pdo->prepare("UPDATE cybank_accounts SET balance = ?, type = ?, updated_at = NOW() WHERE id = ? AND user_id = ?");
                        $upStmt->execute([$newBalance, $accType, $accId, $userId]);
                    } else {
                        $upStmt = $pdo->prepare("UPDATE cybank_accounts SET balance = ?, updated_at = NOW() WHERE id = ? AND user_id = ?");
                        $upStmt->execute([$newBalance, $accId, $userId]);
                    }
                }

                $pdo->commit();

                // Fetch fresh accounts and stats
                $stmt = $pdo->prepare("SELECT * FROM cybank_accounts WHERE user_id = ? ORDER BY created_at ASC");
                $stmt->execute([$userId]);
                $freshAccounts = array_map(function($a) {
                    $a['balance'] = floatval($a['balance']);
                    return $a;
                }, $stmt->fetchAll());
                $newTotalBalance = array_sum(array_column($freshAccounts, 'balance'));

                jsonResponse([
                    'success' => true,
                    'message' => 'Saldo berhasil disesuaikan',
                    'data' => [
                        'accounts' => $freshAccounts,
                        'totalBalance' => $newTotalBalance,
                    ]
                ]);
            } catch (Exception $e) {
                $pdo->rollBack();
                jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
            }
        } elseif ($method === 'POST') {
            $input = getJsonInput();
            $name = trim($input['name'] ?? '');
            $type = trim($input['type'] ?? 'CASH');
            $currency = trim($input['currency'] ?? 'IDR');
            $balance = floatval($input['initialBalance'] ?? 0);

            if (!$name) {
                jsonResponse(['success' => false, 'message' => 'Account name is required'], 400);
            }

            $stmt = $pdo->prepare("INSERT INTO cybank_accounts (user_id, name, type, currency, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
            $stmt->execute([$userId, $name, $type, $currency, $balance]);
            $newId = $pdo->lastInsertId();

            $stmt = $pdo->prepare("SELECT * FROM cybank_accounts WHERE id = ?");
            $stmt->execute([$newId]);
            $account = $stmt->fetch();
            $account['balance'] = floatval($account['balance']);

            jsonResponse(['success' => true, 'data' => $account], 201);
        }
        break;

    // ------------------------------------------------------------------------
    // 6. CATEGORIES
    // ------------------------------------------------------------------------
    case 'categories':
        $user = requireAuth();
        $userId = $user['userId'];
        // Kolom parent_id mungkin belum ada di DB lama; endpoint tetap berjalan tanpa hierarki
        $hasHierarchy = ensureCategoryParentColumn($pdo);

        // Jumlah subkategori per kategori induk
        $childCountMap = [];
        if ($hasHierarchy) {
            $stmt = $pdo->prepare("SELECT parent_id, COUNT(*) as total FROM cybank_categories WHERE user_id = ? AND parent_id IS NOT NULL GROUP BY parent_id");
            $stmt->execute([$userId]);
            foreach ($stmt->fetchAll() as $row) {
                $childCountMap[intval($row['parent_id'])] = intval($row['total']);
            }
        }

        // Normalisasi output kategori (id numerik + info hierarki)
        $formatCategory = function ($row) use ($childCountMap, $hasHierarchy) {
            $row['id'] = intval($row['id']);
            $row['user_id'] = intval($row['user_id']);
            $row['parent_id'] = $hasHierarchy && !empty($row['parent_id'] ?? null) ? intval($row['parent_id']) : null;
            $row['parentId'] = $row['parent_id'];
            $row['children_count'] = $childCountMap[$row['id']] ?? 0;
            if (array_key_exists('transaction_count', $row)) {
                $row['transaction_count'] = intval($row['transaction_count']);
            }
            return $row;
        };

        if ($method === 'GET') {
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
            jsonResponse(['success' => true, 'data' => array_map($formatCategory, $stmt->fetchAll())]);
        } elseif ($method === 'POST') {
            $input = getJsonInput();
            $name = trim($input['name'] ?? '');
            $type = strtoupper(trim($input['type'] ?? 'EXPENSE'));
            $icon = !empty($input['icon']) ? trim($input['icon']) : null;
            $color = !empty($input['color']) ? trim($input['color']) : null;
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
                    $pdo->prepare("UPDATE cybank_categories SET parent_id = ? WHERE id = ? AND user_id = ?")->execute([$parentId, $newId, $userId]);
                }
            }

            $stmt = $pdo->prepare("SELECT * FROM cybank_categories WHERE id = ?");
            $stmt->execute([$newId]);
            jsonResponse(['success' => true, 'data' => $formatCategory($stmt->fetch()), 'message' => 'Kategori berhasil dibuat'], 201);
        } elseif ($method === 'PUT' || $method === 'PATCH') {
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

            $updateStmt = $pdo->prepare("UPDATE cybank_categories SET name = ?, type = ?, icon = ?, color = ?, envelope_id = ?, updated_at = NOW() WHERE id = ? AND user_id = ?");
            $updateStmt->execute([$name, $type, $icon, $color, $envelopeId, $id, $userId]);

            if ($hasHierarchy) {
                $pdo->prepare("UPDATE cybank_categories SET parent_id = ? WHERE id = ? AND user_id = ?")->execute([$parentId, $id, $userId]);
            }

            $stmt = $pdo->prepare("SELECT * FROM cybank_categories WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse(['success' => true, 'data' => $formatCategory($stmt->fetch()), 'message' => 'Kategori berhasil diperbarui']);
        } elseif ($method === 'DELETE') {
            $input = getJsonInput();
            $id = intval($_GET['id'] ?? ($input['id'] ?? 0));
            if (!$id) {
                jsonResponse(['success' => false, 'message' => 'ID kategori wajib disertakan'], 400);
            }

            $stmt = $pdo->prepare("SELECT * FROM cybank_categories WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $userId]);
            $cat = $stmt->fetch();
            if (!$cat) {
                jsonResponse(['success' => false, 'message' => 'Kategori tidak ditemukan'], 404);
            }

            // Subkategori dipindahkan ke induk dari kategori yang dihapus (naik satu tingkat)
            if ($hasHierarchy) {
                $grandParentId = !empty($cat['parent_id'] ?? null) ? intval($cat['parent_id']) : null;
                $reparentStmt = $pdo->prepare("UPDATE cybank_categories SET parent_id = ?, updated_at = NOW() WHERE parent_id = ? AND user_id = ?");
                $reparentStmt->execute([$grandParentId, $id, $userId]);
            }

            // Set transactions to NULL for this category
            $unlinkStmt = $pdo->prepare("UPDATE cybank_transactions SET category_id = NULL WHERE category_id = ? AND user_id = ?");
            $unlinkStmt->execute([$id, $userId]);

            $delStmt = $pdo->prepare("DELETE FROM cybank_categories WHERE id = ? AND user_id = ?");
            $delStmt->execute([$id, $userId]);

            jsonResponse(['success' => true, 'message' => 'Kategori berhasil dihapus']);
        }
        break;

    // ------------------------------------------------------------------------
    // 7. TRANSACTIONS
    // ------------------------------------------------------------------------
    case 'transactions':
        $user = requireAuth();
        $userId = $user['userId'];
        $hasHierarchy = ensureCategoryParentColumn($pdo);

        if ($method === 'GET') {
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
                    c.id as cat_id, c.name as cat_name, c.icon as cat_icon, c.color as cat_color,
                    tta.id as tta_id, tta.name as tta_name
                FROM cybank_transactions t
                JOIN cybank_accounts a ON t.account_id = a.id
                LEFT JOIN cybank_categories c ON t.category_id = c.id
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
        } elseif ($method === 'POST') {
            $input = getJsonInput();
            $accountId = intval($input['accountId'] ?? 0);
            $categoryId = !empty($input['categoryId']) ? intval($input['categoryId']) : null;
            $transferToAccountId = !empty($input['transferToAccountId']) ? intval($input['transferToAccountId']) : null;
            $amount = abs(floatval($input['amount'] ?? 0));
            $type = strtoupper(trim($input['type'] ?? 'EXPENSE'));
            $paymentType = trim($input['paymentType'] ?? 'CASH');
            $note = $input['note'] ?? null;
            $payee = $input['payee'] ?? null;
            $labels = $input['labels'] ?? null;
            $date = !empty($input['transactionDate']) ? date('Y-m-d H:i:s', strtotime($input['transactionDate'])) : date('Y-m-d H:i:s');

            if (!$accountId || $amount <= 0) {
                jsonResponse(['success' => false, 'message' => 'accountId and amount are required'], 400);
            }

            if ($type === 'TRANSFER' && (!$transferToAccountId || $transferToAccountId === $accountId)) {
                jsonResponse(['success' => false, 'message' => 'Pilih rekening tujuan transfer yang berbeda'], 400);
            }

            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO cybank_transactions 
                    (user_id, account_id, category_id, transfer_to_account_id, amount, type, payment_type, note, payee, labels, transaction_date, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                ");
                $stmt->execute([$userId, $accountId, $categoryId, $transferToAccountId, $amount, $type, $paymentType, $note, $payee, $labels, $date]);
                $txId = $pdo->lastInsertId();

                if ($type === 'EXPENSE') {
                    $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance - ? WHERE id = ?");
                    $stmt->execute([$amount, $accountId]);
                } elseif ($type === 'INCOME') {
                    $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance + ? WHERE id = ?");
                    $stmt->execute([$amount, $accountId]);
                } elseif ($type === 'TRANSFER' && $transferToAccountId) {
                    $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance - ? WHERE id = ?");
                    $stmt->execute([$amount, $accountId]);
                    $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance + ? WHERE id = ?");
                    $stmt->execute([$amount, $transferToAccountId]);
                }

                $pdo->commit();
                jsonResponse(['success' => true, 'data' => ['id' => $txId]], 201);
            } catch (Exception $e) {
                $pdo->rollBack();
                jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
            }
        } elseif ($method === 'PUT' || $method === 'PATCH') {
            $input = getJsonInput();
            $id = intval($input['id'] ?? ($_GET['id'] ?? 0));
            if (!$id) {
                jsonResponse(['success' => false, 'message' => 'Transaction ID is required'], 400);
            }

            $stmt = $pdo->prepare("SELECT * FROM cybank_transactions WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $userId]);
            $oldTx = $stmt->fetch();

            if (!$oldTx) {
                jsonResponse(['success' => false, 'message' => 'Transaksi tidak ditemukan'], 404);
            }

            $accountId = isset($input['accountId']) ? intval($input['accountId']) : intval($oldTx['account_id']);
            $categoryId = array_key_exists('categoryId', $input) 
                ? (!empty($input['categoryId']) ? intval($input['categoryId']) : null) 
                : ($oldTx['category_id'] ? intval($oldTx['category_id']) : null);
            $transferToAccountId = array_key_exists('transferToAccountId', $input) 
                ? (!empty($input['transferToAccountId']) ? intval($input['transferToAccountId']) : null) 
                : ($oldTx['transfer_to_account_id'] ? intval($oldTx['transfer_to_account_id']) : null);
            $amount = isset($input['amount']) ? abs(floatval($input['amount'])) : floatval($oldTx['amount']);
            $type = isset($input['type']) ? strtoupper(trim($input['type'])) : $oldTx['type'];
            $paymentType = isset($input['paymentType']) ? trim($input['paymentType']) : ($oldTx['payment_type'] ?? 'CASH');
            $note = array_key_exists('note', $input) ? $input['note'] : $oldTx['note'];
            $payee = array_key_exists('payee', $input) ? $input['payee'] : $oldTx['payee'];
            $labels = array_key_exists('labels', $input) ? $input['labels'] : $oldTx['labels'];
            $date = !empty($input['transactionDate']) 
                ? (strpos($input['transactionDate'], ' ') === false && strpos($input['transactionDate'], 'T') === false 
                    ? "{$input['transactionDate']} 00:00:00" 
                    : date('Y-m-d H:i:s', strtotime($input['transactionDate'])))
                : $oldTx['transaction_date'];

            if (!$accountId || $amount <= 0) {
                jsonResponse(['success' => false, 'message' => 'accountId and amount are required'], 400);
            }

            if ($type === 'TRANSFER' && (!$transferToAccountId || $transferToAccountId === $accountId)) {
                jsonResponse(['success' => false, 'message' => 'Pilih rekening tujuan transfer yang berbeda dengan rekening asal'], 400);
            }

            if ($type !== 'TRANSFER') {
                $transferToAccountId = null;
            }

            $pdo->beginTransaction();
            try {
                // 1. Revert Old Transaction Balance Effect
                $oldAmount = floatval($oldTx['amount']);
                $oldAccId = intval($oldTx['account_id']);
                $oldTransferId = !empty($oldTx['transfer_to_account_id']) ? intval($oldTx['transfer_to_account_id']) : null;

                if ($oldTx['type'] === 'EXPENSE') {
                    $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance + ? WHERE id = ?");
                    $stmt->execute([$oldAmount, $oldAccId]);
                } elseif ($oldTx['type'] === 'INCOME') {
                    $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance - ? WHERE id = ?");
                    $stmt->execute([$oldAmount, $oldAccId]);
                } elseif ($oldTx['type'] === 'TRANSFER') {
                    $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance + ? WHERE id = ?");
                    $stmt->execute([$oldAmount, $oldAccId]);
                    if ($oldTransferId) {
                        $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance - ? WHERE id = ?");
                        $stmt->execute([$oldAmount, $oldTransferId]);
                    }
                }

                // 2. Apply New Transaction Balance Effect
                if ($type === 'EXPENSE') {
                    $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance - ? WHERE id = ?");
                    $stmt->execute([$amount, $accountId]);
                } elseif ($type === 'INCOME') {
                    $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance + ? WHERE id = ?");
                    $stmt->execute([$amount, $accountId]);
                } elseif ($type === 'TRANSFER' && $transferToAccountId) {
                    $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance - ? WHERE id = ?");
                    $stmt->execute([$amount, $accountId]);
                    $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance + ? WHERE id = ?");
                    $stmt->execute([$amount, $transferToAccountId]);
                }

                // 3. Update Transaction Record
                $stmt = $pdo->prepare("
                    UPDATE cybank_transactions 
                    SET account_id = ?, category_id = ?, transfer_to_account_id = ?, amount = ?, type = ?, payment_type = ?, note = ?, payee = ?, labels = ?, transaction_date = ?, updated_at = NOW()
                    WHERE id = ? AND user_id = ?
                ");
                $stmt->execute([$accountId, $categoryId, $transferToAccountId, $amount, $type, $paymentType, $note, $payee, $labels, $date, $id, $userId]);

                // 4. Fetch Updated Transaction Record
                $stmt = $pdo->prepare("
                    SELECT 
                        t.id, t.user_id, t.account_id, t.category_id, t.transfer_to_account_id,
                        t.amount, t.type, t.payment_type as paymentType, t.note, t.payee, t.labels,
                        t.transaction_date as transactionDate, t.created_at, t.updated_at,
                        a.id as acc_id, a.name as acc_name, a.currency as acc_currency,
                        c.id as cat_id, c.name as cat_name, c.icon as cat_icon, c.color as cat_color,
                        tta.id as tta_id, tta.name as tta_name
                    FROM cybank_transactions t
                    JOIN cybank_accounts a ON t.account_id = a.id
                    LEFT JOIN cybank_categories c ON t.category_id = c.id
                    LEFT JOIN cybank_accounts tta ON t.transfer_to_account_id = tta.id
                    WHERE t.id = ? AND t.user_id = ?
                ");
                $stmt->execute([$id, $userId]);
                $row = $stmt->fetch();

                $updatedItem = [
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
                    'categoryName' => $row['cat_name'] ?? ($row['type'] === 'TRANSFER' ? 'Transfer' : 'General'),
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

                // Fresh accounts
                $stmt = $pdo->prepare("SELECT * FROM cybank_accounts WHERE user_id = ? ORDER BY created_at ASC");
                $stmt->execute([$userId]);
                $freshAccounts = array_map(function($a) {
                    $a['balance'] = floatval($a['balance']);
                    return $a;
                }, $stmt->fetchAll());
                $newTotalBalance = array_sum(array_column($freshAccounts, 'balance'));

                $pdo->commit();

                jsonResponse([
                    'success' => true,
                    'message' => 'Transaksi berhasil diperbarui',
                    'data' => $updatedItem,
                    'accounts' => $freshAccounts,
                    'totalBalance' => $newTotalBalance,
                ]);
            } catch (Exception $e) {
                $pdo->rollBack();
                jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
            }
        } elseif ($method === 'DELETE') {
            $id = intval($_GET['id'] ?? 0);
            if (!$id) jsonResponse(['success' => false, 'message' => 'Transaction ID is required'], 400);

            $stmt = $pdo->prepare("SELECT * FROM cybank_transactions WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $userId]);
            $tx = $stmt->fetch();

            if (!$tx) jsonResponse(['success' => false, 'message' => 'Transaction not found'], 404);

            $pdo->beginTransaction();
            try {
                $amount = floatval($tx['amount']);
                if ($tx['type'] === 'EXPENSE') {
                    $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance + ? WHERE id = ?");
                    $stmt->execute([$amount, $tx['account_id']]);
                } elseif ($tx['type'] === 'INCOME') {
                    $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance - ? WHERE id = ?");
                    $stmt->execute([$amount, $tx['account_id']]);
                } elseif ($tx['type'] === 'TRANSFER') {
                    $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance + ? WHERE id = ?");
                    $stmt->execute([$amount, $tx['account_id']]);
                    if (!empty($tx['transfer_to_account_id'])) {
                        $stmt = $pdo->prepare("UPDATE cybank_accounts SET balance = balance - ? WHERE id = ?");
                        $stmt->execute([$amount, $tx['transfer_to_account_id']]);
                    }
                }

                $stmt = $pdo->prepare("DELETE FROM cybank_transactions WHERE id = ?");
                $stmt->execute([$id]);

                $pdo->commit();
                jsonResponse(['success' => true, 'message' => 'Transaksi berhasil dihapus']);
            } catch (Exception $e) {
                $pdo->rollBack();
                jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
            }
        }
        break;

    // ------------------------------------------------------------------------
    // 8. STATS
    // ------------------------------------------------------------------------
    case 'stats':
        if ($method !== 'GET') jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
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
        break;

    // ------------------------------------------------------------------------
    // 9. ANALYTICS
    // ------------------------------------------------------------------------
    case 'analytics':
        if ($method !== 'GET') jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
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

        // Build continuous interval map
        $trendMap = [];
        if ($groupByFormat === '%Y-%m-%d' && in_array($timeframe, ['1d', 'daily', '7d', '30d'])) {
            $cur = clone $startDate;
            while ($cur <= $endDate) {
                $trendMap[$cur->format('Y-m-d')] = ['income' => 0, 'expense' => 0];
                $cur->modify('+1 day');
            }
        } elseif ($groupByFormat === '%Y-%m' && in_array($timeframe, ['6m', '1y'])) {
            $cur = clone $startDate;
            $cur->modify('first day of this month');
            $endM = clone $endDate;
            $endM->modify('first day of this month');
            while ($cur <= $endM) {
                $trendMap[$cur->format('Y-m')] = ['income' => 0, 'expense' => 0];
                $cur->modify('+1 month');
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
                c.color as cat_color,
                SUM(t.amount) as total
            FROM cybank_transactions t
            LEFT JOIN cybank_categories c ON t.category_id = c.id
            WHERE t.user_id = ? AND t.type = 'EXPENSE' AND t.transaction_date BETWEEN ? AND ?
            GROUP BY t.category_id, c.name, c.color
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
        break;

    // ------------------------------------------------------------------------
    // 10. IMPORT CSV
    // ------------------------------------------------------------------------
    case 'import':
        if ($method !== 'POST') jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
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
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Endpoint not found: ' . $endpoint], 404);
        break;
}
