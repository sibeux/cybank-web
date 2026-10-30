<?php
// api/endpoints/auth/logout.php
// POST /auth/logout - hapus cookie sesi.
setcookie('cybank_token', '', [
    'expires' => time() - 3600,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax'
]);
setcookie('cybank_refresh_token', '', [
    'expires' => time() - 3600,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax'
]);
jsonResponse(['success' => true, 'message' => 'Logout berhasil']);
