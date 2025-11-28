import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // This will create a standalone build for Docker
};

export default nextConfig;
