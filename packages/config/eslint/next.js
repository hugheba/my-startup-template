import nextPlugin from '@next/eslint-plugin-next';

import reactLib from './react-lib.js';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...reactLib,
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
];
