import { NextResponse } from "next/server";
import { decodeJwt } from "jose";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const ssoUrl = process.env.SSO_LOGIN_URL || "https://cybeat.sibeux.my.id/api/auth/login";

    const ssoResponse = await fetch(ssoUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const ssoData = await ssoResponse.json();

    if (!ssoResponse.ok || ssoData.status !== "success" || !ssoData.access_token) {
      return NextResponse.json(
        {
          success: false,
          message: ssoData.message || "Login gagal. Periksa kembali email dan password Anda.",
        },
        { status: ssoResponse.status || 401 }
      );
    }

    // Decode token to get user info
    const token = ssoData.access_token;
    const payload = decodeJwt(token);
    const sub = Number(payload.sub);
    const data = payload.data as { email?: string; name?: string; role?: string } | undefined;

    const user = {
      userId: sub,
      email: data?.email || email,
      name: (data?.name || "User").trim(),
      role: data?.role || "user",
    };

    const response = NextResponse.json({
      success: true,
      message: "Login berhasil",
      user,
      access_token: token,
      refresh_token: ssoData.refresh_token,
    });

    // Set secure HTTP-only cookie for session persistence in browser
    response.cookies.set("cybank_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
