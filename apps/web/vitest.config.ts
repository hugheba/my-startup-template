import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Vitest runs the components in this app, so it needs three things Next
// normally provides and Vitest does not. Each block below is one of them, and
// each fails in a way that looks like a broken component rather than a missing
// config — which is why they are commented rather than left to be rediscovered.
export default defineConfig({
  // Next compiles JSX itself, so the shared tsconfig sets `jsx: "preserve"`
  // (see packages/config/tsconfig/nextjs.json) and hands untransformed JSX to
  // the bundler. Vitest's transformer reads that same tsconfig, sees
  // "preserve", and emits the JSX verbatim — the test then dies at import time
  // with "content contains invalid JS syntax", pointing at the component's
  // first tag as though the component itself were malformed.
  //
  // `oxc`, NOT `esbuild`. Vitest 4 / Vite 7 transform with oxc, and setting the
  // esbuild key instead is not an error — it warns "esbuild options will be
  // ignored" on stderr and then fails exactly as if nothing had been set. If
  // this ever silently stops applying, that rename is the first thing to check.
  //
  // "automatic" is the React 17+ runtime, which is what React 19 here wants: it
  // injects the jsx-runtime import itself, so components need no `import React`
  // to render. This overrides ONLY Vitest's transform; `next build` still uses
  // the tsconfig value, so the two toolchains stay independent.
  // The object form, not the bare string `'automatic'`. Both transform
  // correctly at runtime, but the typed signature is `"preserve" | JsxOptions`,
  // so the string fails `tsc --noEmit` (TS2769) while the tests still pass —
  // a split that would only surface in CI's typecheck job.
  oxc: { jsx: { runtime: 'automatic' } },

  resolve: {
    // `@/*` is a tsconfig `paths` entry (apps/web/tsconfig.json). TypeScript
    // resolves it for type-checking, but Vite does not read tsconfig paths, so
    // every `import { cn } from '@/lib/utils'` inside a component would fail to
    // resolve at test time. Mirrored here by hand rather than adding
    // vite-tsconfig-paths — one alias is not worth a dependency, but it IS a
    // second place the mapping lives, so change both together.
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },

  test: {
    // jsdom, not the default `node`: rendering a component touches document,
    // window and the DOM APIs, none of which exist in the node environment.
    // Without it every render() throws "document is not defined".
    environment: 'jsdom',
    // Registers the jest-dom matchers and the between-test DOM cleanup. See
    // vitest.setup.ts for why cleanup is explicit here.
    setupFiles: ['./vitest.setup.ts'],
    // `globals` stays false (the default). The existing tests import describe /
    // it / expect from 'vitest' explicitly and that is worth keeping: it is what
    // makes a test file's dependencies visible, and it keeps ESLint's
    // no-undef honest. The cost is that Testing Library's automatic cleanup
    // does not self-register, which vitest.setup.ts handles.
    globals: false,
  },
});
