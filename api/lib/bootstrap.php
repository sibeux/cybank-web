<?php
// api/lib/bootstrap.php
// Titik muat tunggal seluruh modul API. Dipanggil sekali oleh config.php.

require_once __DIR__ . '/http.php';
require_once __DIR__ . '/env.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/categories/hierarchy.php';
require_once __DIR__ . '/categories/color.php';
require_once __DIR__ . '/categories/format.php';

// Urutan pemanggilan penting: header dulu, lalu env, baru Modul lain memakai keduanya.
sendApiHeaders();
handlePreflightRequest();
loadEnv();
