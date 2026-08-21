import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.modules = [
      path.resolve(process.cwd(), "node_modules"),
      "node_modules",
    ];
    config.resolve.alias = {
      ...config.resolve.alias,
      "framer-motion": path.resolve(process.cwd(), "node_modules/framer-motion"),
      "motion-dom": path.resolve(process.cwd(), "node_modules/motion-dom"),
    };
    return config;
  },
};

export default nextConfig;
