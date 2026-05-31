import reactLibConfig from '@my-startup-template/eslint-config/react-lib';
import nextPlugin from '@next/eslint-plugin-next';

/**
 * Root ESLint config for lint-staged (pre-commit hook).
 *
 * ESLint 9 flat config does NOT cascade per-directory — when invoked from the
 * repo root (as lint-staged does), only this file is consulted. To match the
 * coverage of `pnpm -F web lint` and `pnpm -F @my-startup-template/ui lint`,
 * we apply react-lib globally and Next-specific rules scoped to apps/web.
 *
 * Individual workspace `eslint.config.mjs` files still exist — they're used by
 * the per-workspace `lint` script (run from inside the workspace dir).
 */
export default [
  ...reactLibConfig,
  {
    files: ['apps/web/**/*.{ts,tsx,js,jsx}'],
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
];
