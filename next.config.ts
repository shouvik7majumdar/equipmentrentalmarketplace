import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["localhost", "10.166.42.139"],
  devIndicators: {
    appIsrStatus: false,
  },
};

export default nextConfig;
