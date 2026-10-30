<?php
// api/lib/env.php
// Pembaca .env sederhana (tanpa dependency eksternal).

// Helper untuk membaca .env sederhana
function loadEnv() {
    $possiblePaths = [
        __DIR__ . '/../../.env',
        __DIR__ . '/../.env',
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
