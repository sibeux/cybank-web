import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { importWalletCsv } from "@/lib/csv-importer";

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let csvContent = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { success: false, message: "No CSV file provided in 'file' field" },
          { status: 400 }
        );
      }
      csvContent = await file.text();
    } else {
      const body = await request.json();
      csvContent = body.csvContent || "";
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "CSV content cannot be empty" },
        { status: 400 }
      );
    }

    const result = await importWalletCsv(csvContent, user.userId);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.importedCount} transactions.`,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
