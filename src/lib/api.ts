// src/lib/api.ts
export const BASE_PATH = "/cybank";

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${cleanPath}`;
}

// ---------------------------------------------------------------------------
// Pembacaan response
// ---------------------------------------------------------------------------

/**
 * Baca body response sebagai JSON tanpa melempar `SyntaxError`.
 *
 * Body non-JSON tetap mungkin terjadi walau kontrak API selalu JSON: proxy dev,
 * halaman error hosting, atau backend yang mati/timeout. Pemanggil menerima
 * `null` sehingga bisa menampilkan pesan yang jelas.
 */
export async function readJson<T>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => "");
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Penyimpanan token (localStorage) + util JWT
// ---------------------------------------------------------------------------

const ACCESS_TOKEN_KEY = "cybank_token";
const REFRESH_TOKEN_KEY = "cybank_refresh_token";
const USER_KEY = "cybank_user";

const REFRESH_ENDPOINT = "/api/v1/auth/refresh";
const LOGIN_PAGE = `${BASE_PATH}/login`;
const AUTH_ENDPOINT_PATTERN = /\/api\/v1\/auth\/(login|refresh|logout)/;

// Refresh sedikit lebih awal agar request tidak sempat ditolak server
const EXPIRY_SKEW_SECONDS = 30;

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveTokens(accessToken?: string | null, refreshToken?: string | null) {
  if (typeof window === "undefined") return;
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/** Waktu kedaluwarsa token (epoch detik) atau null bila tidak terbaca. */
export function getTokenExpiry(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  return typeof exp === "number" ? exp : null;
}

export function isTokenExpired(token: string, skewSeconds = EXPIRY_SKEW_SECONDS): boolean {
  const exp = getTokenExpiry(token);
  if (exp === null) return false;
  return exp * 1000 <= Date.now() + skewSeconds * 1000;
}

// ---------------------------------------------------------------------------
// Refresh token (single-flight agar banyak request bersamaan hanya
// memicu satu panggilan ke SSO)
// ---------------------------------------------------------------------------

let refreshInFlight: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const refreshToken = getRefreshToken();

      const res = await fetch(apiUrl(REFRESH_ENDPOINT), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(refreshToken ? { Authorization: `Bearer ${refreshToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json?.access_token) return null;

      saveTokens(json.access_token, json.refresh_token ?? refreshToken);
      if (json.user && typeof window !== "undefined") {
        localStorage.setItem(USER_KEY, JSON.stringify(json.user));
      }

      return json.access_token as string;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// ---------------------------------------------------------------------------
// Fetch interceptor
// ---------------------------------------------------------------------------

export interface ApiFetchOptions extends RequestInit {
  /** Lewati mekanisme refresh (dipakai untuk endpoint auth tertentu). */
  skipAuthRefresh?: boolean;
}

function buildInit(init: RequestInit, token: string | null): RequestInit {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers, credentials: init.credentials ?? "include" };
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  // Hindari loop redirect ketika sudah berada di halaman login
  if (window.location.pathname.startsWith(LOGIN_PAGE)) return;
  window.location.replace(LOGIN_PAGE);
}

/**
 * Pengganti `fetch` untuk seluruh pemanggilan API Cybank.
 *
 * - Menyisipkan header Authorization dari access token tersimpan.
 * - Bila access token sudah kedaluwarsa, token diperbarui lebih dulu
 *   (tanpa request yang pasti gagal).
 * - Bila server tetap membalas 401/403 (mis. token baru saja habis saat
 *   request berjalan), refresh token dipakai sekali lalu request diulang,
 *   sehingga user yang masih di dashboard tidak langsung terlempar ke login.
 * - Bila refresh gagal (refresh token habis/dicabut), sesi dibersihkan dan
 *   user diarahkan ke halaman login.
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { skipAuthRefresh = false, ...init } = options;
  const url = apiUrl(path);

  // Endpoint auth tidak boleh memicu refresh (mencegah rekursi)
  if (skipAuthRefresh || AUTH_ENDPOINT_PATTERN.test(url)) {
    return fetch(url, buildInit(init, getAccessToken()));
  }

  let token = getAccessToken();
  let alreadyRefreshed = false;

  // Refresh proaktif bila token sudah lewat/akan lewat masa berlaku.
  // Jika gagal, header token dilepas agar cookie httpOnly tetap dipakai.
  if (token && isTokenExpired(token)) {
    alreadyRefreshed = true;
    token = await refreshAccessToken();
  }

  let res = await fetch(url, buildInit(init, token));
  if (res.status !== 401 && res.status !== 403) return res;

  if (alreadyRefreshed) {
    // Refresh sudah dicoba sebelum request: sesi memang sudah berakhir
    clearSession();
    redirectToLogin();
    return res;
  }

  // Token ternyata ditolak server: coba perpanjang sekali, lalu ulangi request
  const renewed = await refreshAccessToken();
  if (!renewed) {
    clearSession();
    redirectToLogin();
    return res;
  }

  void res.text().catch(() => { });

  res = await fetch(url, buildInit(init, renewed));
  if (res.status === 401 || res.status === 403) {
    clearSession();
    redirectToLogin();
  }

  return res;
}
