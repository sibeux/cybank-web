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
