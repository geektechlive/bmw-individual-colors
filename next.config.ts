import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["recharts", "react-simple-maps"],
  },
};

export default nextConfig;
