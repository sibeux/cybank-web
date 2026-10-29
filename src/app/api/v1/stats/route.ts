import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") || String(now.getFullYear()));
  const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));

  // Current month boundaries
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  // 1. Total Balance across all accounts
  const accounts = await prisma.cybankAccount.findMany({
    where: { userId: user.userId },
  });
  const totalBalance = accounts.reduce(
    (sum, acc) => sum.add(acc.balance),
    new Decimal(0)
  );

  // 2. Month's Income & Expense
  const [incomeResult, expenseResult] = await Promise.all([
    prisma.cybankTransaction.aggregate({
      where: {
        userId: user.userId,
        type: "INCOME",
        transactionDate: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.cybankTransaction.aggregate({
      where: {
        userId: user.userId,
        type: "EXPENSE",
        transactionDate: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    }),
  ]);

  const monthlyIncome = incomeResult._sum.amount ?? new Decimal(0);
  const monthlyExpense = expenseResult._sum.amount ?? new Decimal(0);
  const netSavings = monthlyIncome.minus(monthlyExpense);

  // 3. Top Expense Categories this month
  const categoryExpenses = await prisma.cybankTransaction.groupBy({
    by: ["categoryId"],
    where: {
      userId: user.userId,
      type: "EXPENSE",
      transactionDate: { gte: startOfMonth, lte: endOfMonth },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 6,
  });

  const categoryIds = categoryExpenses
    .map((c) => c.categoryId)
    .filter((id): id is number => id !== null);

  const categories = await prisma.cybankCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, color: true, icon: true },
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const topCategories = categoryExpenses.map((c) => ({
    categoryId: c.categoryId,
    categoryName: c.categoryId ? categoryMap.get(c.categoryId) || "Uncategorized" : "Uncategorized",
    total: c._sum.amount ?? new Decimal(0),
  }));

  return NextResponse.json({
    success: true,
    data: {
      period: { year, month },
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      netSavings,
      topCategories,
      accounts,
    },
  });
}
