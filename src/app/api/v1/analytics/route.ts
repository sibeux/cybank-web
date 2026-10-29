import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get("timeframe") || "30d";
  const customStart = searchParams.get("startDate");
  const customEnd = searchParams.get("endDate");

  const now = new Date();
  let startDate = new Date();
  let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let groupByFormat = "%Y-%m-%d"; // default daily

  if (customStart && customEnd) {
    startDate = new Date(customStart.includes("T") ? customStart : `${customStart}T00:00:00.000Z`);
    endDate = new Date(customEnd.includes("T") ? customEnd : `${customEnd}T23:59:59.999Z`);
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    groupByFormat = diffDays > 60 ? "%Y-%m" : "%Y-%m-%d";
  } else {
    switch (timeframe) {
      case "7d":
        startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        groupByFormat = "%Y-%m-%d";
        break;
      case "30d":
        startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        groupByFormat = "%Y-%m-%d";
        break;
      case "6m":
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        startDate.setHours(0, 0, 0, 0);
        groupByFormat = "%Y-%m";
        break;
      case "1y":
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        startDate.setHours(0, 0, 0, 0);
        groupByFormat = "%Y-%m";
        break;
      case "all":
        startDate = new Date(2020, 0, 1);
        groupByFormat = "%Y-%m";
        break;
      default:
        startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        groupByFormat = "%Y-%m-%d";
    }
  }

  // 1. Fetch grouped cashflow trend using raw query for optimal performance
  const rows: Array<{ period: string; type: string; total: any }> = await prisma.$queryRaw`
    SELECT 
      DATE_FORMAT(transaction_date, ${groupByFormat}) as period,
      type,
      SUM(amount) as total
    FROM cybank_transactions
    WHERE user_id = ${user.userId}
      AND transaction_date >= ${startDate}
      AND transaction_date <= ${endDate}
    GROUP BY period, type
    ORDER BY period ASC;
  `;

  // Process trend map
  const trendMap = new Map<string, { income: number; expense: number }>();

  // If daily 7d or 30d, ensure continuous intervals
  if (groupByFormat === "%Y-%m-%d" && (timeframe === "7d" || timeframe === "30d")) {
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const p = cur.toISOString().slice(0, 10);
      trendMap.set(p, { income: 0, expense: 0 });
      cur.setDate(cur.getDate() + 1);
    }
  }

  // If monthly 6m or 1y, ensure continuous intervals
  if (groupByFormat === "%Y-%m" && (timeframe === "6m" || timeframe === "1y")) {
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endM = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    while (cur <= endM) {
      const yearStr = cur.getFullYear();
      const monthStr = String(cur.getMonth() + 1).padStart(2, "0");
      const p = `${yearStr}-${monthStr}`;
      trendMap.set(p, { income: 0, expense: 0 });
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  let totalIncome = 0;
  let totalExpense = 0;

  for (const r of rows) {
    const p = String(r.period);
    const amt = Number(r.total || 0);
    const item = trendMap.get(p) || { income: 0, expense: 0 };
    if (r.type === "INCOME") {
      item.income += amt;
      totalIncome += amt;
    } else if (r.type === "EXPENSE") {
      item.expense += amt;
      totalExpense += amt;
    }
    trendMap.set(p, item);
  }

  const sortedPeriods = Array.from(trendMap.keys()).sort();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  const trend = sortedPeriods.map((period) => {
    const data = trendMap.get(period)!;
    let label = period;

    if (period.length === 10) {
      // YYYY-MM-DD
      const [y, m, d] = period.split("-");
      label = `${parseInt(d)} ${monthNames[parseInt(m) - 1]}`;
    } else if (period.length === 7) {
      // YYYY-MM
      const [y, m] = period.split("-");
      label = `${monthNames[parseInt(m) - 1]} '${y.slice(2)}`;
    }

    return {
      period,
      label,
      income: data.income,
      expense: data.expense,
      net: data.income - data.expense,
    };
  });

  // 2. Fetch category breakdown for this period
  const categoryRows: Array<{ category_id: number | null; total: any }> = await prisma.$queryRaw`
    SELECT 
      category_id,
      SUM(amount) as total
    FROM cybank_transactions
    WHERE user_id = ${user.userId}
      AND type = 'EXPENSE'
      AND transaction_date >= ${startDate}
      AND transaction_date <= ${endDate}
    GROUP BY category_id
    ORDER BY total DESC;
  `;

  const allCategories = await prisma.cybankCategory.findMany({
    where: { userId: user.userId },
    select: { id: true, name: true, color: true, icon: true },
  });
  const catMap = new Map(allCategories.map((c) => [c.id, c]));

  const colorPalette = [
    "#10b981", // emerald
    "#f43f5e", // rose
    "#6366f1", // indigo
    "#f59e0b", // amber
    "#8b5cf6", // purple
    "#06b6d4", // cyan
    "#ec4899", // pink
    "#3b82f6", // blue
    "#14b8a6", // teal
    "#f97316", // orange
  ];

  const categories = categoryRows.map((cr, idx) => {
    const cat = cr.category_id ? catMap.get(cr.category_id) : null;
    const amount = Number(cr.total || 0);
    const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
    return {
      id: cr.category_id,
      name: cat ? cat.name : "Lain-lain",
      color: cat?.color || colorPalette[idx % colorPalette.length],
      total: amount,
      percentage: Number(percentage.toFixed(1)),
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      timeframe,
      range: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalIncome,
        totalExpense,
        net: totalIncome - totalExpense,
        savingsRate: totalIncome > 0 ? Number((((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1)) : 0,
      },
      trend,
      categories,
    },
  });
}
