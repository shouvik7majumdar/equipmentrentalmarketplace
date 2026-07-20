import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: {
    appIsrStatus: false,
  },
  experimental: {
    allowedDevOrigins: ["localhost", "10.166.42.139"],
  },
};

export default nextConfig;
