import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  assetPrefix: '/personal-workbench',
  basePath: '/personal-workbench',
};

export default nextConfig;
