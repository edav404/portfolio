import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  allowedDevOrigins: [
    "127.0.0.1",
    "breakfast-alberta-favourites-munich.trycloudflare.com",
  ],
  turbopack: { root: process.cwd() },
};

export default nextConfig;
