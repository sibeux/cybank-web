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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const skip = (page - 1) * limit;

  const accountId = searchParams.get("accountId");
  const categoryId = searchParams.get("categoryId");
  const type = searchParams.get("type"); // EXPENSE, INCOME, TRANSFER
  const search = searchParams.get("search"); // search in note or payee
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const where: any = {
    userId: user.userId,
    ...(accountId ? { accountId: parseInt(accountId) } : {}),
    ...(categoryId ? { categoryId: parseInt(categoryId) } : {}),
    ...(type ? { type: type.toUpperCase() } : {}),
    ...(startDate || endDate
      ? {
          transactionDate: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { note: { contains: search } },
            { payee: { contains: search } },
          ],
        }
      : {}),
  };

  const [total, transactions] = await Promise.all([
    prisma.cybankTransaction.count({ where }),
    prisma.cybankTransaction.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, currency: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
        transferToAccount: { select: { id: true, name: true } },
      },
      orderBy: { transactionDate: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      accountId,
      categoryId,
      transferToAccountId,
      amount,
      type = "EXPENSE",
      paymentType = "CASH",
      note,
      payee,
      labels,
      transactionDate = new Date().toISOString(),
    } = body;

    if (!accountId || !amount) {
      return NextResponse.json(
        { success: false, message: "accountId and amount are required" },
        { status: 400 }
      );
    }

    const numAmount = new Decimal(Math.abs(parseFloat(amount)));

    // Create transaction in database
    const transaction = await prisma.cybankTransaction.create({
      data: {
        userId: user.userId,
        accountId: parseInt(accountId),
        categoryId: categoryId ? parseInt(categoryId) : null,
        transferToAccountId: transferToAccountId ? parseInt(transferToAccountId) : null,
        amount: numAmount,
        type: type.toUpperCase(),
        paymentType,
        note,
        payee,
        labels,
        transactionDate: new Date(transactionDate),
      },
      include: {
        account: true,
        category: true,
      },
    });

    // Adjust account balances
    if (type.toUpperCase() === "EXPENSE") {
      await prisma.cybankAccount.update({
        where: { id: parseInt(accountId) },
        data: { balance: { decrement: numAmount } },
      });
    } else if (type.toUpperCase() === "INCOME") {
      await prisma.cybankAccount.update({
        where: { id: parseInt(accountId) },
        data: { balance: { increment: numAmount } },
      });
    } else if (type.toUpperCase() === "TRANSFER" && transferToAccountId) {
      await prisma.$transaction([
        prisma.cybankAccount.update({
          where: { id: parseInt(accountId) },
          data: { balance: { decrement: numAmount } },
        }),
        prisma.cybankAccount.update({
          where: { id: parseInt(transferToAccountId) },
          data: { balance: { increment: numAmount } },
        }),
      ]);
    }

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
