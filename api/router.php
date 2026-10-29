<?php
// api/router.php - Router untuk testing PHP server lokal
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Arahkan semua request /api/* ke api/index.php
if (strpos($uri, '/api') === 0) {
    require __DIR__ . '/index.php';
    exit;
}

return false;
