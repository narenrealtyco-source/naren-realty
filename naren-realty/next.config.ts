import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "eyvyszvvujvytdvppaoj.supabase.co",
        pathname: "/storage/v1/object/public/property-photos/**",
      },
    ],
  },
  devIndicators: false,
  /* config options here */
  experimental: {
    agentFeedback: true,
    serverActions: { bodySizeLimit: "26mb" },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
