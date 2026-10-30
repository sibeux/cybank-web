<?php
// api/index.php
// Front controller: memetakan setiap endpoint ke satu file aksi di folder endpoints/.
require_once __DIR__ . '/config.php';

// Normalize path request
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// Hapus prefix /api/v1 atau /api
$endpoint = preg_replace('#^.*?/api(/v1)?/#', '', $uri);
$endpoint = trim($endpoint, '/');
$method = $_SERVER['REQUEST_METHOD'];

// Inisialisasi koneksi DB secara lazy/hanya untuk endpoint non-auth.
// Koneksi ini dipakai bersama oleh file endpoint yang di-require di bawah;
// getDbConnection() menyimpan instance PDO sehingga pemanggilan ulang gratis.
$authEndpoints = ['auth/login', 'auth/refresh', 'auth/me', 'auth/logout'];
$pdo = in_array($endpoint, $authEndpoints, true) ? null : getDbConnection();

$endpoints = __DIR__ . '/endpoints';

function methodNotAllowed() {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

// POST /accounts dipakai untuk membuat akun baru sekaligus untuk penyesuaian saldo.
// Bentuk payload menentukan aksi mana yang dijalankan.
function isAccountRecountPayload() {
    $input = getJsonInput();
    return !empty($input['action'])
        || isset($input['accounts'])
        || (isset($input['balance']) && !isset($input['initialBalance']));
}

switch ($endpoint) {
    // ------------------------------------------------------------------------
    // AUTH
    // ------------------------------------------------------------------------
    case 'auth/login':
        if ($method !== 'POST') methodNotAllowed();
        require $endpoints . '/auth/login.php';
        break;

    case 'auth/refresh':
        if ($method !== 'POST') methodNotAllowed();
        require $endpoints . '/auth/refresh.php';
        break;

    case 'auth/me':
        if ($method !== 'GET') methodNotAllowed();
        require $endpoints . '/auth/me.php';
        break;

    case 'auth/logout':
        if ($method !== 'POST') methodNotAllowed();
        require $endpoints . '/auth/logout.php';
        break;

    // ------------------------------------------------------------------------
    // DASHBOARD (Initial Data Fetch)
    // ------------------------------------------------------------------------
    case 'dashboard':
        if ($method !== 'GET') methodNotAllowed();
        require $endpoints . '/dashboard.php';
        break;

    // ------------------------------------------------------------------------
    // ACCOUNTS
    // ------------------------------------------------------------------------
    case 'accounts':
    case 'accounts/recount':
        if ($method === 'GET') {
            require $endpoints . '/accounts/list.php';
        } elseif ($method === 'PUT' || $method === 'PATCH' || ($method === 'POST' && ($endpoint === 'accounts/recount' || isAccountRecountPayload()))) {
            require $endpoints . '/accounts/recount.php';
        } elseif ($method === 'POST') {
            require $endpoints . '/accounts/create.php';
        }
        break;

    // ------------------------------------------------------------------------
    // CATEGORIES
    // ------------------------------------------------------------------------
    case 'categories':
        if ($method === 'GET') {
            require $endpoints . '/categories/list.php';
        } elseif ($method === 'POST') {
            require $endpoints . '/categories/create.php';
        } elseif ($method === 'PUT' || $method === 'PATCH') {
            require $endpoints . '/categories/update.php';
        } elseif ($method === 'DELETE') {
            require $endpoints . '/categories/delete.php';
        }
        break;

    // ------------------------------------------------------------------------
    // TRANSACTIONS
    // ------------------------------------------------------------------------
    case 'transactions':
        if ($method === 'GET') {
            require $endpoints . '/transactions/list.php';
        } elseif ($method === 'POST') {
            require $endpoints . '/transactions/create.php';
        } elseif ($method === 'PUT' || $method === 'PATCH') {
            require $endpoints . '/transactions/update.php';
        } elseif ($method === 'DELETE') {
            require $endpoints . '/transactions/delete.php';
        }
        break;

    // ------------------------------------------------------------------------
    // STATS
    // ------------------------------------------------------------------------
    case 'stats':
        if ($method !== 'GET') methodNotAllowed();
        require $endpoints . '/stats.php';
        break;

    // ------------------------------------------------------------------------
    // ANALYTICS
    // ------------------------------------------------------------------------
    case 'analytics':
        if ($method !== 'GET') methodNotAllowed();
        require $endpoints . '/analytics.php';
        break;

    // ------------------------------------------------------------------------
    // IMPORT CSV
    // ------------------------------------------------------------------------
    case 'import':
        if ($method !== 'POST') methodNotAllowed();
        require $endpoints . '/import.php';
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Endpoint not found: ' . $endpoint], 404);
        break;
}
