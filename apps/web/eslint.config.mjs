import config from '@my-startup-template/eslint-config/next';

export default [
  ...config,
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
];
