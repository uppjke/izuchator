import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
  '192.168.1.19', 
  // Added current machine IP observed in dev warnings
  '192.168.1.14',
    'localhost',
    '127.0.0.1'
  ],
};

export default nextConfig;
