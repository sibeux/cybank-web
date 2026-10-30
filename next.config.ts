import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  basePath: "/cybank",
  ...(isProd ? { output: "export" } : {}),
  // Static export: emit /login/index.html instead of /login.html so the
  // route directory also created by the RSC segment cache still resolves.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    // Proxy rewrites di dev berhenti setelah 30 detik dan membatalkan socket ke
    // backend, yang tercetak sebagai "Failed to proxy ... socket hang up".
    // Naikkan batasnya agar respons JSON dari API (termasuk error lambat seperti
    // DB tidak terjangkau) tetap sampai ke browser apa adanya.
    proxyTimeout: 120000,
  },
  async rewrites() {
    if (!isProd) {
      return [
        {
          source: "/cybank/api/:path*",
          destination: "http://127.0.0.1:8000/api/:path*",
        },
        {
          source: "/api/:path*",
          destination: "http://127.0.0.1:8000/api/:path*",
        },
      ];
    }
    return [];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
