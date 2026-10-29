import { jwtVerify, decodeJwt } from "jose";
import { cookies } from "next/headers";

export interface UserSession {
  userId: number;
  email: string;
  name: string;
  role: string;
}

/**
 * Mendapatkan token dari header Authorization: Bearer <token> atau dari Cookie cybank_token
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  // Cek cookie dari request header
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/cybank_token=([^;]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1].trim());
    }
  }

  return null;
}

/**
 * Verifikasi token string dan kembalikan UserSession jika valid
 */
export async function verifyTokenString(token: string): Promise<UserSession | null> {
  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (jwtSecret) {
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jwtVerify(token, secret);
      const sub = Number(payload.sub);
      const data = payload.data as { email?: string; name?: string; role?: string } | undefined;

      if (!sub) return null;

      return {
        userId: sub,
        email: data?.email || "",
        name: data?.name || "",
        role: data?.role || "user",
      };
    }

    // Jika JWT_SECRET belum disetel, decode payload dengan pengecekan expiry
    const payload = decodeJwt(token);
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null;
    }

    const sub = Number(payload.sub);
    const data = payload.data as { email?: string; name?: string; role?: string } | undefined;

    if (!sub) return null;

    return {
      userId: sub,
      email: data?.email || "",
      name: (data?.name || "").trim(),
      role: data?.role || "user",
    };
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

/**
 * Verifikasi & ekstrak data user dari request (untuk Route Handlers)
 */
export async function getAuthUser(request: Request): Promise<UserSession | null> {
  const token = extractBearerToken(request);
  if (!token) return null;
  return verifyTokenString(token);
}

/**
 * Mendapatkan user dari Server Component cookies
 */
export async function getServerUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("cybank_token")?.value;
  if (!token) return null;
  return verifyTokenString(token);
}
