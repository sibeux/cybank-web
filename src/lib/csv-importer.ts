import Papa from "papaparse";
import { prisma } from "./db";
import { Decimal } from "@prisma/client/runtime/library";

export interface ImportResult {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  accountsCreated: number;
  categoriesCreated: number;
  errors: string[];
}

export async function importWalletCsv(
  csvContent: string,
  userId: number
): Promise<ImportResult> {
  const result: ImportResult = {
    totalRows: 0,
    importedCount: 0,
    skippedCount: 0,
    accountsCreated: 0,
    categoriesCreated: 0,
    errors: [],
  };

  const parsed = Papa.parse(csvContent, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
  });

  result.totalRows = parsed.data.length;
  if (result.totalRows === 0) {
    return result;
  }

  // 1. Preload existing accounts & categories for this user
  const existingAccounts = await prisma.cybankAccount.findMany({
    where: { userId },
  });
  const accountMap = new Map<string, number>(
    existingAccounts.map((a) => [a.name.toLowerCase().trim(), a.id])
  );

  const existingCategories = await prisma.cybankCategory.findMany({
    where: { userId },
  });
  const categoryMap = new Map<string, number>(
    existingCategories.map((c) => [c.name.toLowerCase().trim(), c.id])
  );

  // 2. Identify missing accounts and categories to create in bulk
  const rows = parsed.data as any[];

  for (const row of rows) {
    const accName = (row.account || "My Cash").trim();
    const accKey = accName.toLowerCase();
    if (accName && !accountMap.has(accKey)) {
      const created = await prisma.cybankAccount.create({
        data: {
          userId,
          name: accName,
          currency: row.currency?.trim() || "IDR",
          type: "CASH",
          balance: new Decimal(0),
        },
      });
      accountMap.set(accKey, created.id);
      result.accountsCreated++;
    }

    const catName = (row.category || "General").trim();
    const catKey = catName.toLowerCase();
    const rawType = (row.type || "Expenses").trim().toUpperCase();
    const type = rawType.startsWith("INC") ? "INCOME" : "EXPENSE";

    if (catName && !categoryMap.has(catKey)) {
      const created = await prisma.cybankCategory.create({
        data: {
          userId,
          name: catName,
          type,
          envelopeId: row.envelope_id ? String(row.envelope_id).trim() : null,
        },
      });
      categoryMap.set(catKey, created.id);
      result.categoriesCreated++;
    }
  }

  // 3. Batch process transactions
  const transactionsToCreate: any[] = [];

  for (const row of rows) {
    try {
      const accName = (row.account || "My Cash").trim().toLowerCase();
      const accountId = accountMap.get(accName);
      if (!accountId) {
        result.skippedCount++;
        continue;
      }

      const catName = (row.category || "General").trim().toLowerCase();
      const categoryId = categoryMap.get(catName) || null;

      const rawAmount = parseFloat(row.amount || "0");
      const absAmount = Math.abs(rawAmount);

      const rawType = (row.type || "Expenses").trim().toUpperCase();
      let type = "EXPENSE";
      if (rawType.startsWith("INC") || rawAmount > 0) {
        type = "INCOME";
      }
      if (row.transfer === "true" || rawType.startsWith("TRANS")) {
        type = "TRANSFER";
      }

      // Date parsing
      let transactionDate = new Date();
      if (row.date) {
        const parsedDate = new Date(row.date.replace(" ", "T"));
        if (!isNaN(parsedDate.getTime())) {
          transactionDate = parsedDate;
        }
      }

      transactionsToCreate.push({
        userId,
        accountId,
        categoryId,
        amount: new Decimal(absAmount),
        type,
        paymentType: row.payment_type?.trim() || "CASH",
        note: row.note ? String(row.note).trim() : null,
        payee: row.payee ? String(row.payee).trim() : null,
        labels: row.labels ? String(row.labels).trim() : null,
        transactionDate,
      });
    } catch (err: any) {
      result.errors.push(err.message);
      result.skippedCount++;
    }
  }

  // Insert in chunks of 500
  const CHUNK_SIZE = 500;
  for (let i = 0; i < transactionsToCreate.length; i += CHUNK_SIZE) {
    const chunk = transactionsToCreate.slice(i, i + CHUNK_SIZE);
    await prisma.cybankTransaction.createMany({
      data: chunk,
    });
    result.importedCount += chunk.length;
  }

  // 4. Update account balances based on imported transactions
  for (const [_, accountId] of accountMap.entries()) {
    const expenses = await prisma.cybankTransaction.aggregate({
      where: { accountId, type: "EXPENSE" },
      _sum: { amount: true },
    });
    const income = await prisma.cybankTransaction.aggregate({
      where: { accountId, type: "INCOME" },
      _sum: { amount: true },
    });

    const totalIncome = income._sum.amount ?? new Decimal(0);
    const totalExpense = expenses._sum.amount ?? new Decimal(0);
    const currentBalance = totalIncome.minus(totalExpense);

    await prisma.cybankAccount.update({
      where: { id: accountId },
      data: { balance: currentBalance },
    });
  }

  return result;
}
