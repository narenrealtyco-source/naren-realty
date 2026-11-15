import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
