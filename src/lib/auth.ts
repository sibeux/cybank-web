import { jwtVerify, decodeJwt } from "jose";

export interface UserSession {
  userId: number;
  email: string;
  name: string;
  role: string;
}

/**
 * Mendapatkan token dari header Authorization: Bearer <token>
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7).trim();
}

/**
 * Verifikasi & ekstrak data user dari SSO JWT token
 */
export async function getAuthUser(request: Request): Promise<UserSession | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  try {
    const jwtSecret = process.env.JWT_SECRET;
    
    // Jika JWT_SECRET disetel, kita verifikasi signature secara penuh
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
      // Token kadaluarsa
      return null;
    }

    const sub = Number(payload.sub);
    const data = payload.data as { email?: string; name?: string; role?: string } | undefined;

    if (!sub) return null;

    return {
      userId: sub,
      email: data?.email || "",
      name: data?.name || "",
      role: data?.role || "user",
    };
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}
