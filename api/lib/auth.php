<?php
// api/lib/auth.php
// Ekstraksi dan verifikasi JWT dari header Bearer atau cookie.

// Base64URL decoder
function base64UrlDecode($input) {
    $remainder = strlen($input) % 4;
    if ($remainder) {
        $padlen = 4 - $remainder;
        $input .= str_repeat('=', $padlen);
    }
    return base64_decode(strtr($input, '-_', '+/'));
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
