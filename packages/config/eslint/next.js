import reactLib from './react-lib.js';
import nextPlugin from '@next/eslint-plugin-next';

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
