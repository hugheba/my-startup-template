import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Vercel sets VERCEL=1 in every build environment.
//
// The two options below exist ONLY for AWS Amplify, and applying them on Vercel
// breaks the deploy outright. Vercel builds Next.js itself: it traces the app,
// builds its own serverless output, and — per its Turborepo docs — "handles all
// aspects of configuring your monorepo, including ... the correct directory for
// workspaces". `output: 'standalone'` is redundant there, and a hand-set
// `outputFileTracingRoot` actively conflicts.
//
// The failure it causes is not a build error. `next build` SUCCEEDS, and then
// Vercel's own onBuildComplete hook dies with
//   ENOENT: ... open '/vercel/path0/apps/web/.next/next-server.js.nft.json'
// because under Turbopack the explicit tracing root makes the trace files land
// at a path Vercel does not look in — it re-roots traced paths against the root
// it inferred, and the two disagree. It reproduces only under `vercel build`;
// a local `next build` writes the file exactly where you would expect, which is
// what makes it so slow to diagnose. Upstream: vercel/next.js#88579 (open).
//
// So: keep them for Amplify, drop them on Vercel, and let each platform do what
// it already knows how to do.
const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@my-startup-template/ui'],
  typedRoutes: true,
  ...(isVercel
    ? {}
    : {
        // Bundle the server + traced runtime deps into .next/standalone so AWS
        // Amplify's WEB_COMPUTE deploy has `next` available at runtime (paired
        // with nodeLinker: hoisted in pnpm-workspace.yaml for the monorepo).
        output: 'standalone' as const,
        // In a monorepo the standalone tracer must walk up to the workspace
        // root to collect hoisted dependencies; pin the root so it doesn't
        // infer the app dir.
        outputFileTracingRoot: path.join(dirname, '../../'),
      }),
};

export default nextConfig;
