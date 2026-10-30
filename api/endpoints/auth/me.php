<?php
// api/endpoints/auth/me.php
// GET /auth/me - profil user dari payload JWT.
$user = requireAuth();
jsonResponse(['success' => true, 'user' => $user]);
