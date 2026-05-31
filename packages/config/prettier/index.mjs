/** @type {import("prettier").Config} */
export default {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  semi: true,
  arrowParens: 'always',
  bracketSpacing: true,
  plugins: ['prettier-plugin-organize-imports', 'prettier-plugin-tailwindcss'],
};
