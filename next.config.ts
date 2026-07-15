import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // Allows all HTTPS image sources (useful for dev/R2). Adjust later for production.
      },
    ],
  },
};

export default nextConfig;
