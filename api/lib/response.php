<?php
// api/lib/response.php
// Helper output JSON dan pembacaan body request.

// Response Helper
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Ambil input JSON (dibaca sekali per request, dipakai bersama oleh router dan endpoint)
function getJsonInput() {
    static $data = null;
    if ($data !== null) return $data;

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true) ?: [];
    return $data;
}
