<?php
// api/config.php
// Bootstrap API. Seluruh helper tinggal di api/lib/ agar file ini tetap ringkas:
//   lib/http.php                 header JSON + CORS, preflight, pembacaan header
//   lib/env.php                  pembaca .env
//   lib/response.php             jsonResponse(), getJsonInput()
//   lib/db.php                   getDbConnection()
//   lib/auth.php                 token & user dari JWT
//   lib/categories/hierarchy.php hierarki kategori (parent_id)
//   lib/categories/color.php     pewarisan warna induk -> subkategori
//   lib/categories/format.php    normalisasi row kategori untuk response
//
// Endpoint cukup mengandalkan require_once config.php ini (via index.php).

require_once __DIR__ . '/lib/bootstrap.php';
