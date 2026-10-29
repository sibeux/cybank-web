import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardClient from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getServerUser();

  // If not logged in, redirect to login page
  if (!user) {
    redirect("/login");
  }

  const userId = user.userId;

  // 1. Fetch Accounts
  const accounts = await prisma.cybankAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

  // 2. Fetch Categories
  const categories = await prisma.cybankCategory.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  // 3. Current month statistics
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [monthlyExpenseAgg, monthlyIncomeAgg, totalTxCount] = await Promise.all([
    prisma.cybankTransaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        transactionDate: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.cybankTransaction.aggregate({
      where: {
        userId,
        type: "INCOME",
        transactionDate: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.cybankTransaction.count({ where: { userId } }),
  ]);

  const monthlyExpense = Number(monthlyExpenseAgg._sum.amount ?? 0);
  const monthlyIncome = Number(monthlyIncomeAgg._sum.amount ?? 0);

  // 4. Initial 50 recent transactions
  const initialTransactions = await prisma.cybankTransaction.findMany({
    where: { userId },
    include: {
      account: { select: { id: true, name: true, currency: true } },
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
    orderBy: { transactionDate: "desc" },
    take: 50,
  });

  // 5. Top 5 Categories this month
  const topCategoriesRaw = await prisma.cybankTransaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      transactionDate: { gte: startOfMonth, lte: endOfMonth },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 5,
  });

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const topCategories = topCategoriesRaw.map((tc) => ({
    name: tc.categoryId ? catMap.get(tc.categoryId) || "Lain-lain" : "Lain-lain",
    total: Number(tc._sum.amount ?? 0),
  }));

  const initialData = {
    user: {
      id: user.userId,
      name: user.name || "Nasrul Wahabi",
      email: user.email,
    },
    stats: {
      totalBalance,
      monthlyExpense,
      monthlyIncome,
      netSavings: monthlyIncome - monthlyExpense,
      totalTxCount,
      topCategories,
    },
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      currency: a.currency,
      type: a.type,
      balance: Number(a.balance),
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
    })),
    transactions: initialTransactions.map((tx) => ({
      id: tx.id,
      amount: Number(tx.amount),
      type: tx.type,
      paymentType: tx.paymentType,
      note: tx.note,
      payee: tx.payee,
      transactionDate: tx.transactionDate.toISOString(),
      accountName: tx.account.name,
      categoryName: tx.category?.name || "General",
    })),
  };

  return <DashboardClient initialData={initialData} />;
}
