<?php
// api/lib/categories/hierarchy.php
// Hierarki kategori self-referencing (kategori utama -> subkategori).

// Pastikan kolom parent_id tersedia. Aman dijalankan berulang (sekali per request).
// Mengembalikan true bila hierarki kategori siap dipakai.
function ensureCategoryParentColumn($pdo) {
    static $available = null;
    if ($available !== null) return $available;

    $available = false;
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `cybank_categories` LIKE 'parent_id'");
        $exists = $stmt ? (bool) $stmt->fetch() : false;

        if (!$exists) {
            $pdo->exec("ALTER TABLE `cybank_categories` ADD COLUMN `parent_id` INTEGER NULL AFTER `user_id`");
        }

        $idx = $pdo->query("SHOW INDEX FROM `cybank_categories` WHERE Key_name = 'cybank_categories_parent_id_idx'");
        if ($idx && !$idx->fetch()) {
            $pdo->exec("ALTER TABLE `cybank_categories` ADD INDEX `cybank_categories_parent_id_idx` (`parent_id`)");
        }

        $fk = $pdo->query("
            SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'cybank_categories'
              AND CONSTRAINT_NAME = 'cybank_categories_parent_id_fkey'
        ");
        if ($fk && !$fk->fetch()) {
            $pdo->exec("ALTER TABLE `cybank_categories` ADD CONSTRAINT `cybank_categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `cybank_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE");
        }
    } catch (Throwable $e) {
        // Abaikan: sebagian hosting tidak mengizinkan ALTER.
        // Jalankan migrasi manual: npm run db:migrate
    }

    try {
        $verify = $pdo->query("SHOW COLUMNS FROM `cybank_categories` LIKE 'parent_id'");
        $available = $verify ? (bool) $verify->fetch() : false;
    } catch (Throwable $e) {
        $available = false;
    }

    return $available;
}

// Ambil id kategori beserta seluruh turunannya (untuk filter transaksi).
function getCategoryDescendantIds($pdo, $userId, $categoryId) {
    $ids = [intval($categoryId)];
    $frontier = [intval($categoryId)];

    while (!empty($frontier)) {
        $placeholders = implode(',', array_fill(0, count($frontier), '?'));
        $stmt = $pdo->prepare("SELECT id FROM `cybank_categories` WHERE user_id = ? AND parent_id IN ($placeholders)");
        $stmt->execute(array_merge([$userId], $frontier));

        $frontier = [];
        foreach ($stmt->fetchAll() as $row) {
            $childId = intval($row['id']);
            if (!in_array($childId, $ids, true)) {
                $ids[] = $childId;
                $frontier[] = $childId;
            }
        }
    }

    return $ids;
}

// Validasi induk kategori. Mengembalikan parent_id yang valid atau null.
// Melempar InvalidArgumentException bila tidak valid.
function resolveCategoryParentId($pdo, $userId, $rawParentId, $childId, $type) {
    if ($rawParentId === null || $rawParentId === '' || intval($rawParentId) <= 0) {
        return null;
    }

    $parentId = intval($rawParentId);
    $childId = intval($childId);

    if ($parentId === $childId) {
        throw new InvalidArgumentException('Kategori tidak dapat menjadi induk bagi dirinya sendiri');
    }

    $stmt = $pdo->prepare("SELECT id, type, parent_id FROM `cybank_categories` WHERE id = ? AND user_id = ?");
    $stmt->execute([$parentId, $userId]);
    $parent = $stmt->fetch();

    if (!$parent) {
        throw new InvalidArgumentException('Kategori induk tidak ditemukan');
    }
    if ($parent['parent_id'] !== null) {
        throw new InvalidArgumentException('Hierarki maksimal 2 tingkat, pilih kategori utama sebagai induk');
    }
    if (strtoupper($parent['type']) !== strtoupper($type)) {
        throw new InvalidArgumentException('Tipe subkategori harus sama dengan tipe kategori induknya');
    }

    if ($childId > 0) {
        // Hindari siklus: induk baru tidak boleh turunan dari kategori ini
        if (in_array($parentId, getCategoryDescendantIds($pdo, $userId, $childId), true)) {
            throw new InvalidArgumentException('Kategori induk tidak boleh berasal dari subkategori kategori ini');
        }

        // Kategori yang sudah memiliki subkategori harus tetap di tingkat utama
        $stmt = $pdo->prepare("SELECT id FROM `cybank_categories` WHERE user_id = ? AND parent_id = ? LIMIT 1");
        $stmt->execute([$userId, $childId]);
        if ($stmt->fetch()) {
            throw new InvalidArgumentException('Kategori yang memiliki subkategori harus tetap di tingkat utama');
        }
    }

    return $parentId;
}
