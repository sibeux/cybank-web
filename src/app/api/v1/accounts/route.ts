import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.cybankAccount.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ success: true, data: accounts });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, type = "CASH", currency = "IDR", initialBalance = 0 } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: "Account name is required" }, { status: 400 });
    }

    const account = await prisma.cybankAccount.create({
      data: {
        userId: user.userId,
        name: name.trim(),
        type,
        currency,
        balance: initialBalance,
      },
    });

    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
