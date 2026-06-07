import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@my-startup-template/ui'],
  typedRoutes: true,
  // Bundle the server + traced runtime deps into .next/standalone so AWS
  // Amplify's WEB_COMPUTE deploy has `next` available at runtime (paired with
  // node-linker=hoisted in .npmrc for the pnpm monorepo).
  output: 'standalone',
  // In a monorepo the standalone tracer must walk up to the workspace root to
  // collect hoisted dependencies; pin the root so it doesn't infer the app dir.
  outputFileTracingRoot: path.join(dirname, '../../'),
};

export default nextConfig;
