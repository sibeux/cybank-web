<?php
// api/endpoints/auth/login.php
// POST /auth/login - autentikasi lewat SSO Cybeat lalu simpan token di cookie.
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
