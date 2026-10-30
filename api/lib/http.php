<?php
// api/lib/http.php
// Lapisan HTTP: header JSON + CORS, preflight OPTIONS, dan pembacaan header request.

// Kirim header standar untuk semua response API.
function sendApiHeaders() {
    header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
}

// Preflight CORS: balas 200 tanpa menjalankan endpoint.
function handlePreflightRequest() {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'OPTIONS') return;

    http_response_code(200);
    exit;
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
