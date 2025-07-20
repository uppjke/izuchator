import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.1.19', 
    'localhost',
    '127.0.0.1'
  ],
};

export default nextConfig;
