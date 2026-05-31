import type { Config } from 'tailwindcss';
import preset from '@my-startup-template/tailwind-config';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  presets: [preset as Config],
  darkMode: 'class',
};

export default config;
