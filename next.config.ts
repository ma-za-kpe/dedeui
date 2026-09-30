import type { NextConfig } from "next";
const pages = process.env.DEDE_PAGES_BUILD === 'true';
const nextConfig: NextConfig = { output: pages ? "export" : "standalone", basePath: process.env.NEXT_PUBLIC_BASE_PATH || '', images: { unoptimized: true }, ...(pages ? {} : { async headers() { return [
  { source: "/:path*", headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  ] }, { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
]; } }) };
export default nextConfig;
