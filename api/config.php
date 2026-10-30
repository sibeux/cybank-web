<?php
// api/config.php

// Set headers for JSON & CORS
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Helper untuk membaca .env sederhana
function loadEnv() {
    $possiblePaths = [
        __DIR__ . '/../.env',
        __DIR__ . '/.env',
        (!empty($_SERVER['DOCUMENT_ROOT']) ? $_SERVER['DOCUMENT_ROOT'] . '/.env' : ''),
        getcwd() . '/.env',
    ];
    $envPath = null;
    foreach ($possiblePaths as $p) {
        if (!empty($p) && file_exists($p)) {
            $envPath = $p;
            break;
        }
    }
    if (!$envPath) return;

    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value, " \t\n\r\0\x0B\"'");
            if (!getenv($key)) {
                putenv("$key=$value");
                $_ENV[$key] = $value;
            }
        }
    }
}
loadEnv();

// Konfigurasi Database
function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $databaseUrl = getenv('DATABASE_URL');
    $dbHost = getenv('DB_HOST') ?: 'localhost';
    $dbPort = getenv('DB_PORT') ?: '3306';
    $dbName = getenv('DB_DATABASE') ?: (getenv('DB_NAME') ?: '');
    $dbUser = getenv('DB_USERNAME') ?: (getenv('DB_USER') ?: '');
    $dbPass = getenv('DB_PASSWORD') ?: (getenv('DB_PASS') ?: '');

    if ($databaseUrl && preg_match('/mysql:\/\/([^:]+):([^@]+)@([^:\/]+)(?::(\d+))?\/(.+)/', $databaseUrl, $m)) {
        $dbUser = urldecode($m[1]);
        $dbPass = urldecode($m[2]);
        $dbHost = urldecode($m[3]);
        $dbPort = !empty($m[4]) ? $m[4] : '3306';
        $dbName = urldecode($m[5]);
    }

    if (empty($dbName) || empty($dbUser)) {
        jsonResponse([
            'success' => false,
            'message' => 'Database configuration is missing. Pastikan DATABASE_URL atau DB_* disetel di .env'
        ], 500);
        exit;
    }

    try {
        $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
        $pdo = new PDO($dsn, $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        return $pdo;
    } catch (PDOException $e) {
        // Coba fallback host ke localhost jika koneksi remote host gagal di server lokal
        if ($dbHost !== 'localhost' && $dbHost !== '127.0.0.1') {
            try {
                $dsn = "mysql:host=localhost;port={$dbPort};dbname={$dbName};charset=utf8mb4";
                $pdo = new PDO($dsn, $dbUser, $dbPass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
                return $pdo;
            } catch (PDOException $ex) {
                // Ignore and throw original
            }
        }
        jsonResponse([
            'success' => false,
            'message' => 'Database connection failed: ' . $e->getMessage()
        ], 500);
        exit;
    }
}

// Response Helper
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Base64URL decoder
function base64UrlDecode($input) {
    $remainder = strlen($input) % 4;
    if ($remainder) {
        $padlen = 4 - $remainder;
        $input .= str_repeat('=', $padlen);
    }
    return base64_decode(strtr($input, '-_', '+/'));
}

// Dapatkan header secara aman untuk semua web server
function getRequestHeaders() {
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if ($headers !== false) return $headers;
    }
    $headers = [];
    foreach ($_SERVER as $name => $value) {
        if (substr($name, 0, 5) === 'HTTP_') {
            $key = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
            $headers[$key] = $value;
        }
    }
    if (isset($_SERVER['PHP_AUTH_DIGEST'])) {
        $headers['Authorization'] = $_SERVER['PHP_AUTH_DIGEST'];
    } elseif (isset($_SERVER['PHP_AUTH_USER']) && isset($_SERVER['PHP_AUTH_PW'])) {
        $headers['Authorization'] = base64_encode($_SERVER['PHP_AUTH_USER'] . ':' . $_SERVER['PHP_AUTH_PW']);
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers['Authorization'] = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $headers['Authorization'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    return $headers;
}

// Dapatkan token dari Header Bearer atau Cookie
function getAuthToken() {
    $headers = getRequestHeaders();
    $authHeader = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
    
    if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return trim($matches[1]);
    }

    if (isset($_COOKIE['cybank_token']) && !empty($_COOKIE['cybank_token'])) {
        return trim($_COOKIE['cybank_token']);
    }

    return null;
}

// Verifikasi dan ekstrak data User dari JWT
function getAuthUser() {
    $token = getAuthToken();
    if (!$token) {
        return null;
    }

    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }

    $payloadJson = base64UrlDecode($parts[1]);
    $payload = json_decode($payloadJson, true);

    if (!$payload) {
        return null;
    }

    // Periksa expired jika ada
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return null;
    }

    $sub = isset($payload['sub']) ? intval($payload['sub']) : null;
    if (!$sub) {
        return null;
    }

    $data = isset($payload['data']) ? $payload['data'] : [];

    return [
        'userId' => $sub,
        'email' => isset($data['email']) ? $data['email'] : (isset($payload['email']) ? $payload['email'] : ''),
        'name' => isset($data['name']) ? trim($data['name']) : (isset($payload['name']) ? trim($payload['name']) : 'User'),
        'role' => isset($data['role']) ? $data['role'] : 'user',
    ];
}

// Wajib Auth Middleware
function requireAuth() {
    $user = getAuthUser();
    if (!$user) {
        jsonResponse([
            'success' => false,
            'message' => 'Unauthorized'
        ], 401);
    }
    return $user;
}

// Ambil input JSON
function getJsonInput() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}

// ----------------------------------------------------------------------------
// Kategori: hierarki self-referencing (kategori utama -> subkategori)
// ----------------------------------------------------------------------------

// Pastikan kolom parent_id tersedia. Aman dijalankan berulang (sekali per request).
// Mengembalikan true bila hierarki kategori siap dipakai.
function ensureCategoryParentColumn($pdo) {
    static $available = null;
    if ($available !== null) return $available;

    $available = false;
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `cybank_categories` LIKE 'parent_id'");
        $exists = $stmt ? (bool) $stmt->fetch() : false;

        if (!$exists) {
            $pdo->exec("ALTER TABLE `cybank_categories` ADD COLUMN `parent_id` INTEGER NULL AFTER `user_id`");
        }

        $idx = $pdo->query("SHOW INDEX FROM `cybank_categories` WHERE Key_name = 'cybank_categories_parent_id_idx'");
        if ($idx && !$idx->fetch()) {
            $pdo->exec("ALTER TABLE `cybank_categories` ADD INDEX `cybank_categories_parent_id_idx` (`parent_id`)");
        }

        $fk = $pdo->query("
            SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'cybank_categories'
              AND CONSTRAINT_NAME = 'cybank_categories_parent_id_fkey'
        ");
        if ($fk && !$fk->fetch()) {
            $pdo->exec("ALTER TABLE `cybank_categories` ADD CONSTRAINT `cybank_categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `cybank_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE");
        }
    } catch (Throwable $e) {
        // Abaikan: sebagian hosting tidak mengizinkan ALTER.
        // Jalankan migrasi manual: npm run db:migrate
    }

    try {
        $verify = $pdo->query("SHOW COLUMNS FROM `cybank_categories` LIKE 'parent_id'");
        $available = $verify ? (bool) $verify->fetch() : false;
    } catch (Throwable $e) {
        $available = false;
    }

    return $available;
}

// Ambil id kategori beserta seluruh turunannya (untuk filter transaksi).
function getCategoryDescendantIds($pdo, $userId, $categoryId) {
    $ids = [intval($categoryId)];
    $frontier = [intval($categoryId)];

    while (!empty($frontier)) {
        $placeholders = implode(',', array_fill(0, count($frontier), '?'));
        $stmt = $pdo->prepare("SELECT id FROM `cybank_categories` WHERE user_id = ? AND parent_id IN ($placeholders)");
        $stmt->execute(array_merge([$userId], $frontier));

        $frontier = [];
        foreach ($stmt->fetchAll() as $row) {
            $childId = intval($row['id']);
            if (!in_array($childId, $ids, true)) {
                $ids[] = $childId;
                $frontier[] = $childId;
            }
        }
    }

    return $ids;
}

// Validasi induk kategori. Mengembalikan parent_id yang valid atau null.
// Melempar InvalidArgumentException bila tidak valid.
function resolveCategoryParentId($pdo, $userId, $rawParentId, $childId, $type) {
    if ($rawParentId === null || $rawParentId === '' || intval($rawParentId) <= 0) {
        return null;
    }

    $parentId = intval($rawParentId);
    $childId = intval($childId);

    if ($parentId === $childId) {
        throw new InvalidArgumentException('Kategori tidak dapat menjadi induk bagi dirinya sendiri');
    }

    $stmt = $pdo->prepare("SELECT id, type, parent_id FROM `cybank_categories` WHERE id = ? AND user_id = ?");
    $stmt->execute([$parentId, $userId]);
    $parent = $stmt->fetch();

    if (!$parent) {
        throw new InvalidArgumentException('Kategori induk tidak ditemukan');
    }
    if ($parent['parent_id'] !== null) {
        throw new InvalidArgumentException('Hierarki maksimal 2 tingkat, pilih kategori utama sebagai induk');
    }
    if (strtoupper($parent['type']) !== strtoupper($type)) {
        throw new InvalidArgumentException('Tipe subkategori harus sama dengan tipe kategori induknya');
    }

    if ($childId > 0) {
        // Hindari siklus: induk baru tidak boleh turunan dari kategori ini
        if (in_array($parentId, getCategoryDescendantIds($pdo, $userId, $childId), true)) {
            throw new InvalidArgumentException('Kategori induk tidak boleh berasal dari subkategori kategori ini');
        }

        // Kategori yang sudah memiliki subkategori harus tetap di tingkat utama
        $stmt = $pdo->prepare("SELECT id FROM `cybank_categories` WHERE user_id = ? AND parent_id = ? LIMIT 1");
        $stmt->execute([$userId, $childId]);
        if ($stmt->fetch()) {
            throw new InvalidArgumentException('Kategori yang memiliki subkategori harus tetap di tingkat utama');
        }
    }

    return $parentId;
}
