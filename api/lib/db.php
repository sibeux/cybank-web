<?php
// api/lib/db.php
// Konfigurasi dan koneksi database (PDO singleton).

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
