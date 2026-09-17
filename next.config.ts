import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin output: "standalone" — usamos next start que incluye todos los node_modules
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
