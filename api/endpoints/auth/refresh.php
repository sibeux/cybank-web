<?php
// api/endpoints/auth/refresh.php
// POST /auth/refresh - perbarui access token memakai refresh token dari body, header, atau cookie.
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
