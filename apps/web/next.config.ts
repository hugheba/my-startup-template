import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@my-startup-template/ui'],
  typedRoutes: true,
};

export default nextConfig;
