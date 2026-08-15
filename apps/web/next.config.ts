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
  // Opt out of Vercel's immutable static file upload on Vercel only.
  //
  // Vercel's deploy step cannot patch preview comments onto immutable
  // (content-hash-deduped) static uploads, and its version gate for the
  // build-time-injection fix rejects stable 16.3.x even though 16.3.1 carries
  // the required adapter API — the error fires after "Build Completed":
  //   Cannot patch preview comments when immutable static file upload is
  //   enabled. Upgrade to next@v16.3.0-canary.32 or newer to resolve this.
  // Setting this to false is the documented opt-out; it restores the older
  // upload path so the deploy succeeds. Scoped to Vercel because that is the
  // only platform with the patching step; Amplify/local builds are unaffected.
  // Remove once Vercel fixes the version comparison (see issue #29).
  ...(isVercel ? { supportsImmutableAssets: false } : {}),
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
