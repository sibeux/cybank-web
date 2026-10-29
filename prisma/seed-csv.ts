import fs from "fs";
import path from "path";
import { importWalletCsv } from "../src/lib/csv-importer";
import { prisma } from "../src/lib/db";

async function run() {
  const userId = 1; // Nasrul Wahabi (SSO sub: 1)
  const csvFile = path.resolve(process.cwd(), "report_2026-10-29_181858.csv");

  if (!fs.existsSync(csvFile)) {
    console.error("CSV file not found:", csvFile);
    return;
  }

  console.log(`Starting import of ${csvFile} for userId = ${userId}...`);
  const content = fs.readFileSync(csvFile, "utf-8");

  const startTime = Date.now();
  const result = await importWalletCsv(content, userId);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\nImport complete in ${elapsed}s!`);
  console.log(`Total rows in CSV: ${result.totalRows}`);
  console.log(`Transactions imported: ${result.importedCount}`);
  console.log(`Accounts created: ${result.accountsCreated}`);
  console.log(`Categories created: ${result.categoriesCreated}`);
  if (result.errors.length > 0) {
    console.log(`Errors encountered (${result.errors.length}):`, result.errors.slice(0, 5));
  }

  const accounts = await prisma.cybankAccount.findMany({ where: { userId } });
  console.log("\nCurrent Account Balances:");
  for (const acc of accounts) {
    console.log(`- ${acc.name}: ${acc.currency} ${Number(acc.balance).toLocaleString("id-ID")}`);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
