import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // wagmi + viem are ESM; let Next.js transpile as needed
  experimental: {
    // reserved for future use
  },
};

export default nextConfig;
