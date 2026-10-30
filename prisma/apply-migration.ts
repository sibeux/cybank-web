import { prisma } from "../src/lib/db";

async function applyMigration() {
  console.log("Applying Cybank tables to MariaDB...");

  try {
    // 1. Create cybank_accounts
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`cybank_accounts\` (
        \`id\` INTEGER NOT NULL AUTO_INCREMENT,
        \`user_id\` INTEGER NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`type\` VARCHAR(50) NOT NULL DEFAULT 'CASH',
        \`currency\` VARCHAR(10) NOT NULL DEFAULT 'IDR',
        \`balance\` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX \`cybank_accounts_user_id_idx\`(\`user_id\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("✓ cybank_accounts table verified/created.");

    // 2. Create cybank_categories (dengan hierarki self-referencing: parent_id)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`cybank_categories\` (
        \`id\` INTEGER NOT NULL AUTO_INCREMENT,
        \`user_id\` INTEGER NOT NULL,
        \`parent_id\` INTEGER NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`type\` VARCHAR(20) NOT NULL DEFAULT 'EXPENSE',
        \`icon\` VARCHAR(50) NULL,
        \`color\` VARCHAR(20) NULL,
        \`envelope_id\` VARCHAR(50) NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX \`cybank_categories_user_id_idx\`(\`user_id\`),
        INDEX \`cybank_categories_parent_id_idx\`(\`parent_id\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("✓ cybank_categories table verified/created.");

    // 2b. Pastikan kolom parent_id ada pada tabel lama (upgrade in-place)
    const parentColumns = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'cybank_categories'
        AND COLUMN_NAME = 'parent_id';
    `);
    if (parentColumns.length === 0) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`cybank_categories\` ADD COLUMN \`parent_id\` INTEGER NULL AFTER \`user_id\`;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`cybank_categories\` ADD INDEX \`cybank_categories_parent_id_idx\`(\`parent_id\`);
      `);
      console.log("✓ Added column: cybank_categories.parent_id (category grouping)");
    }

    // 2c. Foreign key self-referencing untuk grouping kategori
    const categoryFks = await prisma.$queryRawUnsafe<any[]>(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'cybank_categories'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY';
    `);
    const categoryFkNames = categoryFks.map((f: any) => f.CONSTRAINT_NAME);

    if (!categoryFkNames.includes("cybank_categories_parent_id_fkey")) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`cybank_categories\`
        ADD CONSTRAINT \`cybank_categories_parent_id_fkey\`
        FOREIGN KEY (\`parent_id\`) REFERENCES \`cybank_categories\`(\`id\`)
        ON DELETE SET NULL ON UPDATE CASCADE;
      `);
      console.log("✓ Added foreign key: parent_id -> cybank_categories(id)");
    }

    // 3. Create cybank_transactions
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`cybank_transactions\` (
        \`id\` INTEGER NOT NULL AUTO_INCREMENT,
        \`user_id\` INTEGER NOT NULL,
        \`account_id\` INTEGER NOT NULL,
        \`category_id\` INTEGER NULL,
        \`transfer_to_account_id\` INTEGER NULL,
        \`amount\` DECIMAL(15, 2) NOT NULL,
        \`type\` VARCHAR(20) NOT NULL,
        \`payment_type\` VARCHAR(50) NULL DEFAULT 'CASH',
        \`note\` TEXT NULL,
        \`payee\` VARCHAR(150) NULL,
        \`labels\` VARCHAR(255) NULL,
        \`transaction_date\` DATETIME(3) NOT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX \`cybank_transactions_user_id_idx\`(\`user_id\`),
        INDEX \`cybank_transactions_account_id_idx\`(\`account_id\`),
        INDEX \`cybank_transactions_category_id_idx\`(\`category_id\`),
        INDEX \`cybank_transactions_transaction_date_idx\`(\`transaction_date\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("✓ cybank_transactions table verified/created.");

    // Check existing foreign keys
    const fks = await prisma.$queryRawUnsafe<any[]>(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'cybank_transactions' 
        AND CONSTRAINT_TYPE = 'FOREIGN KEY';
    `);
    const fkNames = fks.map((f: any) => f.CONSTRAINT_NAME);

    if (!fkNames.includes("cybank_transactions_account_id_fkey")) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`cybank_transactions\` 
        ADD CONSTRAINT \`cybank_transactions_account_id_fkey\` 
        FOREIGN KEY (\`account_id\`) REFERENCES \`cybank_accounts\`(\`id\`) 
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      console.log("✓ Added foreign key: account_id -> cybank_accounts(id)");
    }

    if (!fkNames.includes("cybank_transactions_transfer_to_account_id_fkey")) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`cybank_transactions\` 
        ADD CONSTRAINT \`cybank_transactions_transfer_to_account_id_fkey\` 
        FOREIGN KEY (\`transfer_to_account_id\`) REFERENCES \`cybank_accounts\`(\`id\`) 
        ON DELETE SET NULL ON UPDATE CASCADE;
      `);
      console.log("✓ Added foreign key: transfer_to_account_id -> cybank_accounts(id)");
    }

    if (!fkNames.includes("cybank_transactions_category_id_fkey")) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`cybank_transactions\` 
        ADD CONSTRAINT \`cybank_transactions_category_id_fkey\` 
        FOREIGN KEY (\`category_id\`) REFERENCES \`cybank_categories\`(\`id\`) 
        ON DELETE SET NULL ON UPDATE CASCADE;
      `);
      console.log("✓ Added foreign key: category_id -> cybank_categories(id)");
    }

    console.log("🎉 All Cybank tables safely created in MariaDB!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
