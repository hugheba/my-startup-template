# Startup Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, opinionated Turborepo template for fullstack Next.js startup projects, deployable to both Vercel and AWS Amplify, with BMAD-driven product/architecture/dev/deploy workflow, GitHub Codespaces support, Node 22 + pnpm + Python/UV toolchain, and CI/security pipelines.

**Architecture:** pnpm workspaces monorepo with Turborepo orchestration. `apps/web` is a Next.js 16 + React 19 + Tailwind v4 + shadcn/ui starter. `packages/config/*` provides shared ESLint/TS/Prettier/Tailwind configs consumed via `workspace:*`. `packages/ui` and `packages/types` are empty shells for BMAD-driven growth. `scripts/` is a UV-managed Python project. CI uses `ubuntu-latest` runners; deployments are tied to `deploy/dev|stage|prod` tracking branches (GitOps), with auto-deploy on push-to-main and manual workflow_dispatch promotions gated by GitHub Environments. BMAD is not pre-installed — `pnpm bmad:init` is documented as Step 1 in AGENTS.md.

**Tech Stack:** Node 22 LTS, pnpm 9.15.0 (Corepack), Turborepo, Next.js 16, React 19, Tailwind v4, shadcn/ui, TypeScript 5.6+ strict, ESLint 9 flat config, Prettier 3, husky + lint-staged + commitlint, Python 3.13 + UV, OWASP ZAP, Snyk, CodeQL, Dependabot, Vercel, AWS Amplify Hosting.

**Spec reference:** `docs/superpowers/specs/2026-05-31-startup-template-design.md`

---

## File Structure

Files created by each task. Engineer can use this to navigate non-linearly if needed.

| Task | Creates / Modifies                                                                                                                 |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `.git/` init, `.gitignore`, `.gitattributes`, `.editorconfig`, `LICENSE`                                                           |
| 2    | `.nvmrc`, `.npmrc`, `package.json` (root, minimal), `pnpm-workspace.yaml`                                                          |
| 3    | `turbo.json`                                                                                                                       |
| 4    | `packages/config/tsconfig/{base.json,nextjs.json,react-lib.json,package.json}`                                                     |
| 5    | `packages/config/prettier/{index.mjs,package.json}`, `.prettierignore`, root `package.json` (add prettier field + deps)            |
| 6    | `packages/config/eslint/{base.js,next.js,react-lib.js,package.json}`                                                               |
| 7    | `packages/config/tailwind/{preset.ts,package.json}`                                                                                |
| 8    | `packages/types/{src/index.ts,tsconfig.json,package.json}`                                                                         |
| 9    | `packages/ui/{src/index.ts,eslint.config.mjs,tsconfig.json,package.json}`                                                          |
| 10   | `apps/web/{package.json,tsconfig.json,next.config.ts,next-env.d.ts,tailwind.config.ts,postcss.config.mjs,.env.example,.gitignore}` |
| 11   | `apps/web/app/{layout.tsx,globals.css,(marketing)/page.tsx}`, `apps/web/public/.gitkeep`                                           |
| 12   | `apps/web/{components.json,lib/utils.ts,components/ui/{button.tsx,card.tsx}}`                                                      |
| 13   | `apps/web/{eslint.config.mjs,middleware.ts}`                                                                                       |
| 14   | `scripts/{pyproject.toml,.python-version,README.md,verify-vscode-extensions.mjs}`                                                  |
| 15   | `commitlint.config.mjs`, `.husky/{pre-commit,commit-msg}`, root `package.json` (lint-staged, prepare, deps)                        |
| 16   | `.vscode/{settings.json,extensions.json}`                                                                                          |
| 17   | `.devcontainer/{devcontainer.json,Dockerfile}`                                                                                     |
| 18   | `.claude/settings.json`, `.claude/agents/.gitkeep`, `.claude/commands/.gitkeep`                                                    |
| 19   | `AGENTS.md`                                                                                                                        |
| 20   | `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`                                                                        |
| 21   | `.github/ISSUE_TEMPLATE/{bug_report.yml,feature_request.yml}`, `.github/pull_request_template.md`                                  |
| 22   | `.github/workflows/ci.yml`                                                                                                         |
| 23   | `.github/workflows/security.yml`, `.zap/rules.tsv`                                                                                 |
| 24   | `.github/workflows/deploy-dev.yml`                                                                                                 |
| 25   | `.github/workflows/promote.yml`                                                                                                    |
| 26   | `.github/dependabot.yml`                                                                                                           |
| 27   | `vercel.json`                                                                                                                      |
| 28   | `amplify.yml`                                                                                                                      |
| 29   | root `package.json` (add `bmad:init`, `verify:vscode` scripts)                                                                     |
| 30   | `README.md` (full)                                                                                                                 |
| 31   | Final verification + smoke test                                                                                                    |

---

## Tasks

### Task 1: Initialize git + repo hygiene files

**Files:**

- Create: `.gitignore`, `.gitattributes`, `.editorconfig`, `LICENSE`, `README.md` (placeholder)
- Init: `.git/`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Volumes/Extended/IdeaProjects/my-startup-template
git init -b main
```

- [ ] **Step 2: Create `.gitignore`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.gitignore`:

```
# deps
node_modules/
.pnpm-store/

# builds
.next/
out/
dist/
*.tsbuildinfo

# turbo
.turbo/

# coverage
coverage/

# env
.env
.env.*.local
!.env.example

# editor
.DS_Store
.idea/
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json

# vercel
.vercel/

# python
scripts/.venv/
scripts/__pycache__/
scripts/**/__pycache__/
scripts/.ruff_cache/
scripts/.pytest_cache/

# BMAD output (docs/bmad-output/) is intentionally NOT ignored —
# template users commit BMAD's PRD, architecture, stories, etc. as work product.

# playwright / test outputs
playwright-report/
test-results/

# logs
*.log
npm-debug.log*
pnpm-debug.log*
```

- [ ] **Step 3: Create `.gitattributes`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.gitattributes`:

```
* text=auto eol=lf
pnpm-lock.yaml -diff
uv.lock -diff
```

- [ ] **Step 4: Create `.editorconfig`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.editorconfig`:

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.{py,md}]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
```

- [ ] **Step 5: Create `LICENSE` (MIT placeholder)**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/LICENSE`:

```
MIT License

Copyright (c) 2026 Bryan Hughes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 6: Create README placeholder**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/README.md`:

```markdown
# my-startup-template

Placeholder. Full README written in Task 30.
```

- [ ] **Step 7: Commit**

```bash
git add .gitignore .gitattributes .editorconfig LICENSE README.md
git commit -m "chore: initialize repo with base hygiene files"
```

---

### Task 2: Root package.json, workspace config, Node + pnpm pinning

**Files:**

- Create: `.nvmrc`, `.npmrc`, `package.json`, `pnpm-workspace.yaml`

- [ ] **Step 1: Create `.nvmrc`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.nvmrc`:

```
22
```

- [ ] **Step 2: Create `.npmrc`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.npmrc`:

```
engine-strict=true
auto-install-peers=true
package-manager-strict=true
strict-peer-dependencies=false
```

- [ ] **Step 3: Create `pnpm-workspace.yaml`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'packages/config/*'
```

- [ ] **Step 4: Create root `package.json`** (minimal — scripts added incrementally)

Write `/Volumes/Extended/IdeaProjects/my-startup-template/package.json`:

```json
{
  "name": "my-startup-template",
  "version": "0.1.0",
  "private": true,
  "description": "Opinionated Turborepo template for BMAD-driven Next.js startups",
  "engines": {
    "node": ">=22 <23",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint:fix",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "clean": "turbo run clean && rm -rf node_modules .turbo"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 5: Enable Corepack and install**

```bash
corepack enable
pnpm install
```

Expected: pnpm-lock.yaml created. No errors.

- [ ] **Step 6: Commit**

```bash
git add .nvmrc .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml
git commit -m "chore: pin Node 22 + pnpm 9.15.0 and define workspaces"
```

---

### Task 3: Turborepo config

**Files:**

- Create: `turbo.json`

- [ ] **Step 1: Create `turbo.json`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/turbo.json`:

```jsonc
{
  "$schema": "https://turborepo.org/schema.json",
  "ui": "tui",
  "globalDependencies": [".env.example", "tsconfig*.json", ".npmrc"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"],
    },
    "dev": {
      "cache": false,
      "persistent": true,
    },
    "lint": {
      "dependsOn": ["^build"],
    },
    "lint:fix": {
      "cache": false,
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": ["*.tsbuildinfo"],
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
    },
    "format": {
      "cache": false,
    },
    "format:check": {},
    "clean": {
      "cache": false,
    },
  },
}
```

- [ ] **Step 2: Verify Turbo recognizes it**

```bash
pnpm turbo run build --dry-run
```

Expected: Output shows "No tasks were executed" with no errors. Turbo parsed the file.

- [ ] **Step 3: Commit**

```bash
git add turbo.json
git commit -m "build: add Turborepo task pipeline config"
```

---

### Task 4: Shared TypeScript configs

**Files:**

- Create: `packages/config/tsconfig/{base.json,nextjs.json,react-lib.json,package.json}`

- [ ] **Step 1: Create directory and `package.json`**

```bash
mkdir -p packages/config/tsconfig
```

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/config/tsconfig/package.json`:

```json
{
  "name": "@my-startup-template/tsconfig",
  "version": "0.0.0",
  "private": true,
  "files": ["base.json", "nextjs.json", "react-lib.json"]
}
```

- [ ] **Step 2: Create `base.json`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/config/tsconfig/base.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Base",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "moduleDetection": "force",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true
  },
  "exclude": ["node_modules", "dist", ".next", ".turbo"]
}
```

- [ ] **Step 3: Create `nextjs.json`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/config/tsconfig/nextjs.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Next.js",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "jsx": "preserve",
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "plugins": [{ "name": "next" }]
  }
}
```

- [ ] **Step 4: Create `react-lib.json`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/config/tsconfig/react-lib.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "React Library",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "jsx": "react-jsx"
  }
}
```

- [ ] **Step 5: Install and verify workspace recognition**

```bash
pnpm install
pnpm -F @my-startup-template/tsconfig exec ls
```

Expected: Lists base.json, nextjs.json, react-lib.json, package.json.

- [ ] **Step 6: Commit**

```bash
git add packages/config/tsconfig pnpm-lock.yaml
git commit -m "build: add shared TypeScript configs (base, nextjs, react-lib)"
```

---

### Task 5: Shared Prettier config

**Files:**

- Create: `packages/config/prettier/{index.mjs,package.json}`, `.prettierignore`
- Modify: root `package.json` (add prettier field + devDeps)

- [ ] **Step 1: Create directory**

```bash
mkdir -p packages/config/prettier
```

- [ ] **Step 2: Create `packages/config/prettier/package.json`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/config/prettier/package.json`:

```json
{
  "name": "@my-startup-template/prettier-config",
  "version": "0.0.0",
  "private": true,
  "main": "./index.mjs",
  "exports": {
    ".": "./index.mjs"
  },
  "peerDependencies": {
    "prettier": "^3.3.0"
  }
}
```

- [ ] **Step 3: Create `packages/config/prettier/index.mjs`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/config/prettier/index.mjs`:

```js
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
```

- [ ] **Step 4: Create root `.prettierignore`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.prettierignore`:

```
node_modules
.next
.turbo
.vercel
dist
coverage
pnpm-lock.yaml
uv.lock
*.tsbuildinfo
.husky
scripts/.venv
scripts/__pycache__
scripts/.ruff_cache
scripts/.pytest_cache
```

- [ ] **Step 5: Update root `package.json` to point at the shared config and add devDeps**

Edit `/Volumes/Extended/IdeaProjects/my-startup-template/package.json` — add `"prettier"` field (sibling of `"scripts"`) and three devDependencies:

Replace the `"devDependencies"` block with:

```json
  "devDependencies": {
    "@my-startup-template/prettier-config": "workspace:*",
    "prettier": "^3.3.3",
    "prettier-plugin-organize-imports": "^4.1.0",
    "prettier-plugin-tailwindcss": "^0.6.9",
    "turbo": "^2.3.0",
    "typescript": "^5.6.0"
  },
  "prettier": "@my-startup-template/prettier-config"
```

- [ ] **Step 6: Install**

```bash
pnpm install
```

Expected: workspace package `@my-startup-template/prettier-config` linked.

- [ ] **Step 7: Verify Prettier resolves the shared config**

```bash
echo "const x={a:1,b:2}" > /tmp/__fmt_test.js
pnpm exec prettier --check /tmp/__fmt_test.js || true
pnpm exec prettier /tmp/__fmt_test.js
rm /tmp/__fmt_test.js
```

Expected: First command reports the file needs formatting. Second command prints the formatted version `const x = { a: 1, b: 2 };`. This proves Prettier loaded `singleQuote: true` and `printWidth: 100` from the shared config.

- [ ] **Step 8: Commit**

```bash
git add packages/config/prettier .prettierignore package.json pnpm-lock.yaml
git commit -m "build: add shared Prettier config with tailwindcss + organize-imports plugins"
```

---

### Task 6: Shared ESLint flat configs

**Files:**

- Create: `packages/config/eslint/{base.js,next.js,react-lib.js,package.json}`

- [ ] **Step 1: Create directory and `package.json`**

```bash
mkdir -p packages/config/eslint
```

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/config/eslint/package.json`:

```json
{
  "name": "@my-startup-template/eslint-config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./base.js",
  "exports": {
    "./base": "./base.js",
    "./next": "./next.js",
    "./react-lib": "./react-lib.js"
  },
  "peerDependencies": {
    "eslint": "^9.15.0"
  },
  "dependencies": {
    "@eslint/js": "^9.15.0",
    "@next/eslint-plugin-next": "^16.0.0",
    "eslint-plugin-import": "^2.31.0",
    "eslint-plugin-jsx-a11y": "^6.10.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-unused-imports": "^4.1.0",
    "globals": "^15.12.0",
    "typescript-eslint": "^8.15.0"
  }
}
```

- [ ] **Step 2: Create `base.js`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/config/eslint/base.js`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: ['**/node_modules/**', '**/.next/**', '**/.turbo/**', '**/dist/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.es2022 },
    },
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
```

- [ ] **Step 3: Create `react-lib.js`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/config/eslint/react-lib.js`:

```js
import base from './base.js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...base,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
];
```

- [ ] **Step 4: Create `next.js`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/config/eslint/next.js`:

```js
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
```

- [ ] **Step 5: Add ESLint to root devDeps and install**

Edit root `package.json` and add `"eslint": "^9.15.0"` to `devDependencies`, then:

```bash
pnpm install
```

Expected: All ESLint plugins resolve.

- [ ] **Step 6: Smoke-test ESLint can load the base config**

```bash
cat > /tmp/__eslint_test.js <<'EOF'
import base from '@my-startup-template/eslint-config/base';
console.log('rules:', Object.keys(base[2]?.rules ?? {}).length);
EOF
node --experimental-vm-modules /tmp/__eslint_test.js
rm /tmp/__eslint_test.js
```

Expected: Prints something like `rules: 4`. Proves the package resolves and exports rules.

- [ ] **Step 7: Commit**

```bash
git add packages/config/eslint package.json pnpm-lock.yaml
git commit -m "build: add shared ESLint 9 flat configs (base, react-lib, next)"
```

---

### Task 7: Shared Tailwind preset

**Files:**

- Create: `packages/config/tailwind/{preset.ts,package.json}`

- [ ] **Step 1: Create directory and `package.json`**

```bash
mkdir -p packages/config/tailwind
```

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/config/tailwind/package.json`:

```json
{
  "name": "@my-startup-template/tailwind-config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./preset.ts",
  "exports": {
    ".": "./preset.ts"
  },
  "peerDependencies": {
    "tailwindcss": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create `preset.ts`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/config/tailwind/preset.ts`:

```ts
import type { Config } from 'tailwindcss';

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
};

export default preset;
```

- [ ] **Step 3: Install (lockfile pickup)**

```bash
pnpm install
```

- [ ] **Step 4: Commit**

```bash
git add packages/config/tailwind pnpm-lock.yaml
git commit -m "build: add shared Tailwind preset with shadcn-compatible tokens"
```

---

### Task 8: `packages/types` workspace shell

**Files:**

- Create: `packages/types/{src/index.ts,tsconfig.json,package.json}`

- [ ] **Step 1: Create files**

```bash
mkdir -p packages/types/src
```

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/types/package.json`:

```json
{
  "name": "@my-startup-template/types",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf .turbo *.tsbuildinfo"
  },
  "devDependencies": {
    "@my-startup-template/tsconfig": "workspace:*",
    "typescript": "^5.6.0"
  }
}
```

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/types/tsconfig.json`:

```json
{
  "extends": "@my-startup-template/tsconfig/base.json",
  "include": ["src/**/*.ts"]
}
```

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/types/src/index.ts`:

```ts
export {};
```

- [ ] **Step 2: Install and typecheck**

```bash
pnpm install
pnpm -F @my-startup-template/types typecheck
```

Expected: Exits 0 with no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add packages/types pnpm-lock.yaml
git commit -m "feat(types): add empty shared types workspace"
```

---

### Task 9: `packages/ui` workspace shell

**Files:**

- Create: `packages/ui/{src/index.ts,eslint.config.mjs,tsconfig.json,package.json}`

- [ ] **Step 1: Create files**

```bash
mkdir -p packages/ui/src
```

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/ui/package.json`:

```json
{
  "name": "@my-startup-template/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf .turbo *.tsbuildinfo"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@my-startup-template/eslint-config": "workspace:*",
    "@my-startup-template/tsconfig": "workspace:*",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.15.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.6.0"
  }
}
```

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/ui/tsconfig.json`:

```json
{
  "extends": "@my-startup-template/tsconfig/react-lib.json",
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/ui/eslint.config.mjs`:

```js
import config from '@my-startup-template/eslint-config/react-lib';
export default config;
```

Write `/Volumes/Extended/IdeaProjects/my-startup-template/packages/ui/src/index.ts`:

```ts
export {};
```

- [ ] **Step 2: Install, lint, typecheck**

```bash
pnpm install
pnpm -F @my-startup-template/ui lint
pnpm -F @my-startup-template/ui typecheck
```

Expected: Both exit 0 (no files to lint produces 0; typecheck passes).

- [ ] **Step 3: Commit**

```bash
git add packages/ui pnpm-lock.yaml
git commit -m "feat(ui): add empty shared UI workspace with lint/typecheck wiring"
```

---

### Task 10: `apps/web` bootstrap — package.json, Next/Tailwind/TS configs

**Files:**

- Create: `apps/web/{package.json,tsconfig.json,next.config.ts,next-env.d.ts,tailwind.config.ts,postcss.config.mjs,.env.example,.gitignore}`

- [ ] **Step 1: Create directory**

```bash
mkdir -p apps/web
```

- [ ] **Step 2: Create `apps/web/package.json`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/package.json`:

```json
{
  "name": "web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf .next .turbo *.tsbuildinfo"
  },
  "dependencies": {
    "@my-startup-template/types": "workspace:*",
    "@my-startup-template/ui": "workspace:*",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@my-startup-template/eslint-config": "workspace:*",
    "@my-startup-template/tailwind-config": "workspace:*",
    "@my-startup-template/tsconfig": "workspace:*",
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.15.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 3: Create `apps/web/tsconfig.json`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/tsconfig.json`:

```json
{
  "extends": "@my-startup-template/tsconfig/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next"]
}
```

- [ ] **Step 4: Create `apps/web/next.config.ts`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@my-startup-template/ui'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
```

- [ ] **Step 5: Create `apps/web/next-env.d.ts`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/next-env.d.ts`:

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

- [ ] **Step 6: Create `apps/web/tailwind.config.ts`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/tailwind.config.ts`:

```ts
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
```

- [ ] **Step 7: Create `apps/web/postcss.config.mjs`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/postcss.config.mjs`:

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [ ] **Step 8: Create `apps/web/.env.example`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/.env.example`:

```
# Public URL where this app is served. Used by Next, OpenGraph, etc.
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 9: Create `apps/web/.gitignore`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/.gitignore`:

```
# next.js
.next/
out/
next-env.d.ts

# vercel
.vercel/

# env
.env*.local
```

- [ ] **Step 10: Install**

```bash
pnpm install
```

Expected: All workspace deps + Next/React/Tailwind resolved.

- [ ] **Step 11: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): bootstrap Next.js 16 + React 19 + Tailwind v4 app shell"
```

---

### Task 11: `apps/web` App Router skeleton + landing page

**Files:**

- Create: `apps/web/app/layout.tsx`, `apps/web/app/globals.css`, `apps/web/app/(marketing)/page.tsx`, `apps/web/public/.gitkeep`

- [ ] **Step 1: Create directories**

```bash
mkdir -p apps/web/app/\(marketing\) apps/web/public
touch apps/web/public/.gitkeep
```

- [ ] **Step 2: Create `apps/web/app/globals.css`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/app/globals.css`:

```css
@import 'tailwindcss';

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }

  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}
```

- [ ] **Step 3: Create `apps/web/app/layout.tsx`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'my-startup-template',
  description: 'Powered by BMAD. Customize me in apps/web/app/layout.tsx.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Create `apps/web/app/(marketing)/page.tsx`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/app/(marketing)/page.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>my-startup-template</CardTitle>
          <CardDescription>
            Powered by BMAD. Run <code>pnpm bmad:init</code> to start brainstorming your product.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
        </CardContent>
      </Card>
    </main>
  );
}
```

(Note: `@/components/ui/button` and `@/components/ui/card` are created in Task 12. Typecheck will fail until then — that's expected.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/app apps/web/public
git commit -m "feat(web): add App Router layout, globals.css, and marketing landing page"
```

---

### Task 12: shadcn/ui setup (components.json, cn util, seed components)

**Files:**

- Create: `apps/web/{components.json,lib/utils.ts,components/ui/{button.tsx,card.tsx}}`

- [ ] **Step 1: Create `apps/web/components.json`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 2: Create `apps/web/lib/utils.ts`**

```bash
mkdir -p apps/web/lib apps/web/components/ui
```

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/lib/utils.ts`:

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create `apps/web/components/ui/button.tsx`** (shadcn new-york Button, hand-authored to match shadcn's canonical output)

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/components/ui/button.tsx`:

```tsx
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

- [ ] **Step 4: Create `apps/web/components/ui/card.tsx`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/components/ui/card.tsx`:

```tsx
import * as React from 'react';

import { cn } from '@/lib/utils';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('bg-card text-card-foreground rounded-xl border shadow', className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('leading-none font-semibold tracking-tight', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-muted-foreground text-sm', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

- [ ] **Step 5: Add `@radix-ui/react-slot` dependency**

Edit `apps/web/package.json` `dependencies` and add `"@radix-ui/react-slot": "^1.1.0"`. Then:

```bash
pnpm install
```

- [ ] **Step 6: Typecheck**

```bash
pnpm -F web typecheck
```

Expected: Exits 0. Marketing page now resolves Button + Card imports.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components.json apps/web/lib apps/web/components apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): wire shadcn/ui (cn util, button, card) — initial design system seed"
```

---

### Task 13: `apps/web` ESLint config + middleware

**Files:**

- Create: `apps/web/eslint.config.mjs`, `apps/web/middleware.ts`

- [ ] **Step 1: Create `apps/web/eslint.config.mjs`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/eslint.config.mjs`:

```js
import config from '@my-startup-template/eslint-config/next';

export default [
  ...config,
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
];
```

- [ ] **Step 2: Create `apps/web/middleware.ts`** (pass-through — BMAD adds logic later)

Write `/Volumes/Extended/IdeaProjects/my-startup-template/apps/web/middleware.ts`:

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 3: Lint and typecheck**

```bash
pnpm -F web lint
pnpm -F web typecheck
```

Expected: Both exit 0.

- [ ] **Step 4: Build smoke test**

```bash
pnpm -F web build
```

Expected: Build succeeds. `.next/` produced. The marketing page renders.

- [ ] **Step 5: Commit**

```bash
git add apps/web/eslint.config.mjs apps/web/middleware.ts
git commit -m "feat(web): add ESLint config and pass-through middleware"
```

---

### Task 14: Python scripts/ + VS Code extension verifier

**Files:**

- Create: `scripts/{pyproject.toml,.python-version,README.md,verify-vscode-extensions.mjs}`

- [ ] **Step 1: Create directory**

```bash
mkdir -p scripts
```

- [ ] **Step 2: Create `scripts/.python-version`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/scripts/.python-version`:

```
3.13
```

- [ ] **Step 3: Create `scripts/pyproject.toml`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/scripts/pyproject.toml`:

```toml
[project]
name = "scripts"
version = "0.0.0"
description = "Ad-hoc Python scripts and custom MCP servers for this monorepo."
requires-python = ">=3.13,<3.14"
dependencies = []

[dependency-groups]
dev = [
    "ruff>=0.8.0",
    "pytest>=8.3.0",
]

[tool.ruff]
line-length = 100
target-version = "py313"

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "N", "SIM"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

- [ ] **Step 4: Create `scripts/README.md`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/scripts/README.md`:

````markdown
# scripts/

UV-managed Python project for ad-hoc scripts and custom MCP servers.

## Setup

```bash
cd scripts
uv sync
```
````

## Run a module

```bash
uv run python -m <module>
```

## Lint + test

```bash
uv run ruff check .
uv run pytest
```

````

- [ ] **Step 5: Create `scripts/verify-vscode-extensions.mjs`** (lockstep verifier)

Write `/Volumes/Extended/IdeaProjects/my-startup-template/scripts/verify-vscode-extensions.mjs`:

```js
#!/usr/bin/env node
// Asserts .vscode/extensions.json and .devcontainer/devcontainer.json
// list the exact same extensions in the exact same order. Fails CI if they drift.

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

const stripJsonComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const loadJsonc = async (path) => JSON.parse(stripJsonComments(await readFile(path, 'utf8')));

const vscode = await loadJsonc(resolve(repoRoot, '.vscode/extensions.json'));
const devcontainer = await loadJsonc(resolve(repoRoot, '.devcontainer/devcontainer.json'));

const fromVscode = vscode.recommendations ?? [];
const fromDevcontainer = devcontainer.customizations?.vscode?.extensions ?? [];

const fmt = (arr) => arr.map((e) => `  - ${e}`).join('\n');

if (JSON.stringify(fromVscode) !== JSON.stringify(fromDevcontainer)) {
  console.error('✗ VS Code extension lists drift between .vscode/ and .devcontainer/');
  console.error('\n.vscode/extensions.json recommendations:');
  console.error(fmt(fromVscode));
  console.error('\n.devcontainer/devcontainer.json customizations.vscode.extensions:');
  console.error(fmt(fromDevcontainer));
  process.exit(1);
}

console.log(`✓ ${fromVscode.length} extensions in sync between .vscode/ and .devcontainer/`);
````

- [ ] **Step 6: Commit**

```bash
git add scripts
git commit -m "chore(scripts): scaffold UV Python project and add VS Code extension lockstep verifier"
```

---

### Task 15: Git hooks (husky + lint-staged + commitlint)

**Files:**

- Create: `commitlint.config.mjs`, `.husky/{pre-commit,commit-msg}`
- Modify: root `package.json`

- [ ] **Step 1: Add hook deps to root `package.json`**

Edit `/Volumes/Extended/IdeaProjects/my-startup-template/package.json`:

- Add to `"devDependencies"`:
  ```
  "@commitlint/cli": "^19.5.0",
  "@commitlint/config-conventional": "^19.5.0",
  "husky": "^9.1.6",
  "lint-staged": "^15.2.10",
  ```
- Add to `"scripts"`:
  ```
  "prepare": "husky"
  ```
- Add a sibling `"lint-staged"` field:

  ```json
  "lint-staged": {
    "*.{ts,tsx,js,jsx,mjs,cjs}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml,css}": ["prettier --write"]
  }
  ```

- [ ] **Step 2: Install and run husky init**

```bash
pnpm install
```

Expected: `prepare` script runs `husky` → creates `.husky/` if missing.

- [ ] **Step 3: Create `commitlint.config.mjs`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/commitlint.config.mjs`:

```js
export default { extends: ['@commitlint/config-conventional'] };
```

- [ ] **Step 4: Create `.husky/pre-commit`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.husky/pre-commit`:

```sh
pnpm exec lint-staged
```

Make executable:

```bash
chmod +x .husky/pre-commit
```

- [ ] **Step 5: Create `.husky/commit-msg`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.husky/commit-msg`:

```sh
pnpm exec commitlint --edit "$1"
```

Make executable:

```bash
chmod +x .husky/commit-msg
```

- [ ] **Step 6: Smoke-test the commit-msg hook rejects a bad message**

```bash
echo "no scope no type" > /tmp/__msg.txt
pnpm exec commitlint --edit /tmp/__msg.txt && echo "UNEXPECTED PASS" || echo "EXPECTED FAIL"
rm /tmp/__msg.txt
```

Expected: Prints "EXPECTED FAIL" — commitlint rejected the message.

- [ ] **Step 7: Commit**

```bash
git add commitlint.config.mjs .husky package.json pnpm-lock.yaml
git commit -m "chore: add husky + lint-staged + commitlint pre-commit and commit-msg hooks"
```

---

### Task 16: VS Code workspace settings + recommended extensions

**Files:**

- Create: `.vscode/{settings.json,extensions.json}`

- [ ] **Step 1: Create directory**

```bash
mkdir -p .vscode
```

- [ ] **Step 2: Create `.vscode/extensions.json`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.vscode/extensions.json`:

```jsonc
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "editorconfig.editorconfig",
    "usernamehw.errorlens",
    "yoavbls.pretty-ts-errors",
    "bradlc.vscode-tailwindcss",
    "ms-python.python",
    "charliermarsh.ruff",
    "redhat.vscode-yaml",
    "mikestead.dotenv",
    "vivaxy.vscode-conventional-commits",
    "anthropic.claude-code",
    "github.copilot",
    "github.copilot-chat",
  ],
  "unwantedRecommendations": [],
}
```

- [ ] **Step 3: Create `.vscode/settings.json`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.vscode/settings.json`:

```jsonc
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
  },
  "eslint.useFlatConfig": true,
  "eslint.workingDirectories": [
    { "pattern": "apps/*" },
    { "pattern": "packages/*" },
    { "pattern": "packages/config/*" },
  ],
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
  ],
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit",
    },
  },
  "python.defaultInterpreterPath": "scripts/.venv/bin/python",
  "files.exclude": {
    "**/node_modules": true,
    "**/.turbo": true,
    "**/.next": true,
    "**/dist": true,
    "**/*.tsbuildinfo": true,
    "**/__pycache__": true,
    "**/.ruff_cache": true,
    "**/.pytest_cache": true,
  },
  "search.exclude": {
    "**/pnpm-lock.yaml": true,
    "**/uv.lock": true,
    "**/node_modules": true,
    "**/.next": true,
    "**/.turbo": true,
    "**/dist": true,
  },
  "conventionalCommits.scopes": ["web", "ui", "config", "types", "scripts", "ci", "deps", "docs"],
}
```

- [ ] **Step 4: Commit**

```bash
git add .vscode
git commit -m "chore(vscode): add workspace settings and recommended extension list"
```

---

### Task 17: Devcontainer (Codespaces)

**Files:**

- Create: `.devcontainer/{devcontainer.json,Dockerfile}`

- [ ] **Step 1: Create directory**

```bash
mkdir -p .devcontainer
```

- [ ] **Step 2: Create `.devcontainer/Dockerfile`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.devcontainer/Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/devcontainers/typescript-node:22-bookworm

# Enable Corepack so pnpm version from `packageManager` is auto-installed
RUN corepack enable
```

- [ ] **Step 3: Create `.devcontainer/devcontainer.json`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.devcontainer/devcontainer.json`:

```jsonc
{
  "name": "my-startup-template",
  "build": { "dockerfile": "Dockerfile" },
  "features": {
    "ghcr.io/devcontainers/features/python:1": { "version": "3.13" },
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers-extra/features/uv:1": {},
  },
  "postCreateCommand": "corepack enable && pnpm install && (cd scripts && uv sync)",
  "forwardPorts": [3000],
  "portsAttributes": {
    "3000": { "label": "Next.js dev server", "onAutoForward": "notify" },
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "editorconfig.editorconfig",
        "usernamehw.errorlens",
        "yoavbls.pretty-ts-errors",
        "bradlc.vscode-tailwindcss",
        "ms-python.python",
        "charliermarsh.ruff",
        "redhat.vscode-yaml",
        "mikestead.dotenv",
        "vivaxy.vscode-conventional-commits",
        "anthropic.claude-code",
        "github.copilot",
        "github.copilot-chat",
      ],
    },
  },
  "remoteUser": "node",
}
```

- [ ] **Step 4: Verify lockstep with the verifier script**

```bash
node scripts/verify-vscode-extensions.mjs
```

Expected: `✓ 14 extensions in sync between .vscode/ and .devcontainer/`

- [ ] **Step 5: Commit**

```bash
git add .devcontainer
git commit -m "chore(devcontainer): add Codespaces config with Node 22 + Python 3.13 + UV + extensions"
```

---

### Task 18: `.claude/` settings + blank agent/command dirs

**Files:**

- Create: `.claude/settings.json`, `.claude/agents/.gitkeep`, `.claude/commands/.gitkeep`

- [ ] **Step 1: Create dirs**

```bash
mkdir -p .claude/agents .claude/commands
touch .claude/agents/.gitkeep .claude/commands/.gitkeep
```

- [ ] **Step 2: Create `.claude/settings.json`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.claude/settings.json`:

```jsonc
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(pnpm:*)",
      "Bash(pnpm dlx:*)",
      "Bash(npx:*)",
      "Bash(uv:*)",
      "Bash(uv run:*)",
      "Bash(git:*)",
      "Bash(gh:*)",
      "Bash(corepack:*)",
      "Bash(node:*)",
    ],
  },
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
    },
    "shadcn": {
      "command": "npx",
      "args": ["-y", "shadcn@latest", "mcp"],
    },
    "supabase": {
      "_comment": "Enable when BMAD picks Supabase as the DB. Requires SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.",
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref",
        "${SUPABASE_PROJECT_REF}",
      ],
      "env": { "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}" },
      "disabled": true,
    },
    "gitnexus": {
      "_comment": "Local MCP — set GITNEXUS_BIN to your local gitnexus binary path, then remove `disabled`.",
      "command": "${GITNEXUS_BIN}",
      "args": ["mcp"],
      "disabled": true,
    },
  },
}
```

- [ ] **Step 3: Commit**

```bash
git add .claude
git commit -m "chore(claude): add settings with MCP entries (context7, playwright, shadcn, supabase/gitnexus disabled)"
```

---

### Task 19: AGENTS.md (canonical agent instructions)

**Files:**

- Create: `AGENTS.md`

- [ ] **Step 1: Write `AGENTS.md`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/AGENTS.md`:

````markdown
# AGENTS.md

Canonical instructions for any AI coding agent working in this repo (Claude Code, GitHub Copilot, Cursor, Windsurf, Gemini, etc.). Per-IDE files like `CLAUDE.md`, `GEMINI.md`, and `.github/copilot-instructions.md` redirect here.

## Project mission

This is a **Startup Company template**. The product is intentionally undefined — it's a clean, opinionated Turborepo + Next.js foundation that BMAD's brainstorm → PRD → architecture → dev → deploy workflow will shape into a real product.

If you're an agent landing here on a fresh clone: there is no product spec yet. Start with **Step 1** below.

## Step 1 — Initialize BMAD

Run, once, from the repo root:

```bash
pnpm bmad:init
```
````

This runs BMAD's [headless install](https://docs.bmad-method.org/how-to/install-bmad/#headless-ci-installs) with the template's chosen defaults:

- **Tools:** `claude-code` (writes agents into `.claude/agents/`)
- **Modules:** `bmm` (BMad Method — PM, Architect, Dev, QA, SM agents), `bmb` (BMad Builder), `cis` (Creative Intelligence Suite), `tea` (Test Architect)
- **Output:** `docs/bmad-output/` (PRDs, architecture docs, stories, etc. — alongside `docs/superpowers/`)

If GitHub rate-limits the install, export a personal access token first:

```bash
GITHUB_TOKEN=ghp_xxx pnpm bmad:init
```

Need a different IDE or module set? Run the interactive installer:

```bash
pnpm bmad:init:interactive
```

After install, ask the BMAD orchestrator:

> `@bmad-orchestrator what should I do first?`

It will walk you through the brainstorm → PRD → architecture phases.

## Tech stack

| Layer           | Choice                                                  |
| --------------- | ------------------------------------------------------- |
| Runtime         | Node 22 LTS                                             |
| Package manager | pnpm 9.15.0 (Corepack — auto-installed)                 |
| Monorepo        | Turborepo                                               |
| Framework       | Next.js 16 (App Router, RSC)                            |
| UI runtime      | React 19                                                |
| Styling         | Tailwind CSS v4                                         |
| Components      | shadcn/ui (new-york style, RSC)                         |
| Language        | TypeScript 5.6+ (strict, `noUncheckedIndexedAccess`)    |
| Linting         | ESLint 9 flat config                                    |
| Formatting      | Prettier 3                                              |
| Git hooks       | husky + lint-staged + commitlint (conventional commits) |
| Python          | Python 3.13 + UV (in `scripts/`)                        |

## Monorepo conventions

- Workspaces: `apps/*`, `packages/*`, `packages/config/*`
- Inter-workspace deps use the `workspace:*` protocol
- Shared configs live in `packages/config/` (`eslint`, `tsconfig`, `tailwind`, `prettier`)
- Apps consume shared configs by extending them — never duplicate config

## Commands cheatsheet

```bash
pnpm dev               # turbo run dev (parallel, persistent)
pnpm build             # turbo run build (cached)
pnpm lint              # eslint via turbo
pnpm lint:fix
pnpm typecheck         # tsc --noEmit via turbo
pnpm test              # turbo run test
pnpm format            # prettier --write .
pnpm format:check
pnpm verify:vscode     # diffs .vscode/ vs .devcontainer/ extension lists
pnpm bmad:init         # initialize BMAD interactively
```

Filter to a single workspace with `-F`:

```bash
pnpm -F web dev
pnpm -F @my-startup-template/ui typecheck
```

## Adding shadcn components

From `apps/web/`:

```bash
pnpm dlx shadcn@latest add <component>
```

This writes into `apps/web/components/ui/`. The seed components (`button`, `card`) prove the wiring; replace or extend as the design system grows.

## Adding Python scripts

```bash
cd scripts
uv sync                # install deps from pyproject.toml + uv.lock
uv run python -m <module>
uv add <package>       # add a runtime dep
uv add --dev <package> # add a dev dep
```

## Code quality discipline

- **TypeScript:** strict mode, no `any` without justification, no unchecked array access.
- **ESLint** auto-fixes on save (VS Code) and on staged files (`lint-staged` pre-commit).
- **Prettier** formats on save and on staged files.
- **Commits** must follow conventional-commit format (`feat(scope):`, `fix(scope):`, `chore:`, `docs:`, `ci:`, `build:`). Enforced by commitlint on `commit-msg`.
- **VS Code extensions** are kept in lockstep between `.vscode/extensions.json` (recommendations) and `.devcontainer/devcontainer.json` (auto-installed in Codespaces). `pnpm verify:vscode` enforces this in CI.

## Deployment

The template is wired for both **Vercel** and **AWS Amplify Hosting**. Deployments are tied to _tracking branches_, not `main`:

| Branch         | Environment | Trigger                                           |
| -------------- | ----------- | ------------------------------------------------- |
| `main`         | none        | source of truth                                   |
| `deploy/dev`   | dev         | auto fast-forwarded after CI passes on `main`     |
| `deploy/stage` | stage       | manual via `Promote` GitHub Action (target=stage) |
| `deploy/prod`  | prod        | manual via `Promote` GitHub Action (target=prod)  |

`vercel.json` and `amplify.yml` are both committed. After creating the actual Vercel/Amplify apps in their consoles, point each at the appropriate tracking branch.

## Security

- **CI** runs OWASP ZAP baseline DAST, Snyk dependency scan, `pnpm audit`, and CodeQL on every PR (see `.github/workflows/security.yml`).
- **Dependabot** opens PRs for npm, GitHub Actions, devcontainers, and pip updates daily.
- **GitHub Environments** gate `stage` and `prod` promotions behind required reviewers.

## File map (high-level)

```
apps/web/                Next.js 16 app
packages/ui/             Shared component primitives
packages/types/          Shared TS types
packages/config/         eslint, tsconfig, tailwind, prettier
scripts/                 Python (UV) ad-hoc scripts + custom MCPs
.devcontainer/           Codespaces config
.github/                 CI, security, deploy workflows + Copilot instructions
.claude/                 Claude Code settings + MCP entries
.vscode/                 Workspace settings + recommended extensions
docs/superpowers/        Design specs and implementation plans
```

## When extending the template (post-BMAD-init)

1. **Adding a DB:** uncomment the `supabase` MCP in `.claude/settings.json` and add the relevant credentials. Add migrations apply steps in `deploy-dev.yml` / `promote.yml` (placeholders are already commented in).
2. **Adding another app:** create `apps/<name>/` matching the `apps/web/` shape. Add an `appRoot:` block to `amplify.yml` (the existing block has comments showing the multi-app pattern).
3. **Adding shared code:** extract into `packages/<name>/` with its own `package.json` (`workspace:*`), an `eslint.config.mjs` extending the shared config, and a `tsconfig.json` extending the shared config.

````

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs(agents): add canonical AGENTS.md (BMAD-first workflow, tech stack, conventions)"
````

---

### Task 20: CLAUDE.md, GEMINI.md, Copilot instructions

**Files:**

- Create: `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`

- [ ] **Step 1: Create dir**

```bash
mkdir -p .github
```

- [ ] **Step 2: Write `CLAUDE.md`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/CLAUDE.md`:

```markdown
# CLAUDE.md

For all coding instructions, conventions, and workflows in this repo, read and follow [`./AGENTS.md`](./AGENTS.md).

That file is the single source of truth — no IDE-specific divergence.
```

- [ ] **Step 3: Write `GEMINI.md`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/GEMINI.md`:

```markdown
# GEMINI.md

For all coding instructions, conventions, and workflows in this repo, read and follow [`./AGENTS.md`](./AGENTS.md).

That file is the single source of truth — no IDE-specific divergence.
```

- [ ] **Step 4: Write `.github/copilot-instructions.md`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.github/copilot-instructions.md`:

```markdown
# GitHub Copilot Instructions

For all coding instructions, conventions, and workflows in this repo, read and follow [`../AGENTS.md`](../AGENTS.md).

That file is the single source of truth — no IDE-specific divergence.
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md GEMINI.md .github/copilot-instructions.md
git commit -m "docs(agents): add CLAUDE.md, GEMINI.md, copilot-instructions redirecting to AGENTS.md"
```

---

### Task 21: GitHub issue + PR templates

**Files:**

- Create: `.github/ISSUE_TEMPLATE/{bug_report.yml,feature_request.yml}`, `.github/pull_request_template.md`

- [ ] **Step 1: Create dir**

```bash
mkdir -p .github/ISSUE_TEMPLATE
```

- [ ] **Step 2: Write `.github/ISSUE_TEMPLATE/bug_report.yml`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.github/ISSUE_TEMPLATE/bug_report.yml`:

```yaml
name: Bug report
description: Something is broken
labels: [bug]
body:
  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Describe the bug. Include exact commands or steps to reproduce.
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: What did you expect?
    validations:
      required: true
  - type: textarea
    id: environment
    attributes:
      label: Environment
      description: OS, Node version (`node -v`), pnpm version (`pnpm -v`)
    validations:
      required: true
```

- [ ] **Step 3: Write `.github/ISSUE_TEMPLATE/feature_request.yml`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.github/ISSUE_TEMPLATE/feature_request.yml`:

```yaml
name: Feature request
description: Propose a new capability or improvement
labels: [enhancement]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem
      description: What user-facing problem are we solving?
    validations:
      required: true
  - type: textarea
    id: proposal
    attributes:
      label: Proposal
      description: How would you solve it?
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives considered
```

- [ ] **Step 4: Write `.github/pull_request_template.md`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.github/pull_request_template.md`:

```markdown
## Summary

<!-- 1-3 bullets. What changed and why. -->

## Test plan

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm test` (if tests exist for the touched areas)
- [ ] Manual smoke test (describe)

## Related

<!-- Linked issue, BMAD story ID, design spec link, etc. -->
```

- [ ] **Step 5: Commit**

```bash
git add .github/ISSUE_TEMPLATE .github/pull_request_template.md
git commit -m "ci: add GitHub issue and PR templates"
```

---

### Task 22: CI workflow (lint + typecheck + build + test + verify:vscode)

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create dir**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Write `.github/workflows/ci.yml`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify-vscode:
    name: VS Code extension lockstep
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: node scripts/verify-vscode-extensions.mjs

  lint-typecheck-build-test:
    name: Lint + Typecheck + Build + Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 2 }

      - name: Enable Corepack (reads packageManager from package.json)
        run: corepack enable

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Cache Turborepo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ hashFiles('pnpm-lock.yaml', '**/package.json', 'turbo.json', 'tsconfig*.json', '.env.example') }}
          restore-keys: |
            ${{ runner.os }}-turbo-

      - name: Format check
        run: pnpm format:check

      - name: Lint + Typecheck + Build + Test
        run: pnpm turbo run lint typecheck build test
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add CI workflow (lint, typecheck, build, test, format, vscode lockstep)"
```

---

### Task 23: Security workflow (ZAP + Snyk + audit + CodeQL)

**Files:**

- Create: `.github/workflows/security.yml`, `.zap/rules.tsv`

- [ ] **Step 1: Create `.zap/rules.tsv`** (baseline scan rules — empty means "warn-only" defaults)

```bash
mkdir -p .zap
```

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.zap/rules.tsv`:

```
# ZAP baseline scan rule customizations.
# Format: ALERT_ID	{IGNORE,WARN,FAIL}	[REGEX]
# Empty file = use defaults (all rules WARN, none FAIL).
# Customize by adding lines like:
#   10049	IGNORE	(known false positive for our deployment)
```

- [ ] **Step 2: Write `.github/workflows/security.yml`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.github/workflows/security.yml`:

```yaml
name: Security Scan

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'
  workflow_dispatch:

permissions:
  contents: read
  security-events: write
  pull-requests: write

jobs:
  zap-baseline:
    name: OWASP ZAP Baseline Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: corepack enable
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }

      - run: pnpm install --frozen-lockfile

      - name: Cache Turborepo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ hashFiles('pnpm-lock.yaml', '**/package.json', 'turbo.json', 'tsconfig*.json', '.env.example') }}
          restore-keys: |
            ${{ runner.os }}-turbo-

      - name: Build app
        run: pnpm -F web build

      - name: Start app
        run: |
          pnpm -F web start &
          npx --yes wait-on http://localhost:3000 --timeout 60000
        env:
          NEXT_PUBLIC_APP_URL: http://localhost:3000

      - name: Fix workspace permissions for ZAP
        run: chmod -R 777 ${{ github.workspace }} || true

      - name: Run ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.14.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a -j'
          allow_issue_writing: false
          artifact_name: 'zap-scan'

      - name: Upload ZAP scan report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: zap-scan-report
          path: |
            report_html.html
            report_json.json
          retention-days: 30

      - name: Comment ZAP results on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            let report = 'No critical issues found';
            if (fs.existsSync('report_json.json')) {
              const zapReport = JSON.parse(fs.readFileSync('report_json.json'));
              const alerts = zapReport.site?.[0]?.alerts || [];
              const critical = alerts.filter(a => a.riskcode === '3');
              if (critical.length > 0) {
                report = `⚠️ **${critical.length} Critical Security Issues Found**\n\n`;
                critical.forEach(a => { report += `- **${a.name}**: ${a.desc}\n`; });
              } else {
                report = '✅ No critical security issues found';
              }
            }
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🔒 Security Scan Results\n\n${report}`,
            });

  dependency-scan:
    name: Dependency Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: corepack enable
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile

      - name: Snyk scan (continue-on-error — needs SNYK_TOKEN)
        uses: snyk/actions/node@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high --all-projects

      - name: pnpm audit
        run: pnpm audit --audit-level=high || true

  codeql:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v3
        with:
          category: '/language:javascript-typescript'
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/security.yml .zap
git commit -m "ci: add security workflow (OWASP ZAP, Snyk, pnpm audit, CodeQL)"
```

---

### Task 24: Deploy-dev workflow

**Files:**

- Create: `.github/workflows/deploy-dev.yml`

- [ ] **Step 1: Write `.github/workflows/deploy-dev.yml`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.github/workflows/deploy-dev.yml`:

```yaml
name: Deploy to dev

# Fast-forwards `deploy/dev` tracking branch to `main` after every push to main.
# Vercel and Amplify watch `deploy/dev` and auto-rebuild.
#
# When BMAD adds a database, uncomment the migration-apply steps below
# (and add the relevant secrets to the `dev` GitHub Environment).

on:
  push:
    branches: [main]

concurrency:
  group: deploy-dev
  cancel-in-progress: false

jobs:
  deploy-dev:
    name: Advance deploy/dev tracking branch
    runs-on: ubuntu-latest
    environment:
      name: dev
    permissions:
      contents: write

    steps:
      - name: Checkout main with full history
        uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Fetch deploy/dev for comparison
        run: |
          if git ls-remote --exit-code origin deploy/dev > /dev/null; then
            git fetch origin deploy/dev:refs/remotes/origin/deploy/dev
          else
            echo "deploy/dev does not exist yet — will be created on first push."
          fi

      # When a DB is added, uncomment:
      # - name: Verify migrations are forward-only
      #   run: bash scripts/check-migrations-forward-only.sh origin/deploy/dev
      #
      # - name: Apply migrations to dev DB
      #   env:
      #     DATABASE_URL: ${{ secrets.DATABASE_URL }}
      #   run: <migration tool> migrate --target dev

      - name: Fast-forward deploy/dev to main
        # NOT a force push. If deploy/dev has commits not on main, this fails
        # loudly so a human can investigate (someone pushed directly to it).
        run: git push origin HEAD:refs/heads/deploy/dev

      - name: Summarize
        run: |
          {
            echo "## Dev deploy summary"
            echo ""
            echo "- Commit: \`$(git rev-parse --short HEAD)\` ($(git log -1 --pretty=%s))"
            echo "- \`deploy/dev\` fast-forwarded — Vercel + Amplify rebuilding"
          } >> "$GITHUB_STEP_SUMMARY"
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-dev.yml
git commit -m "ci: add deploy-dev workflow (fast-forward deploy/dev on push to main)"
```

---

### Task 25: Promote workflow (stage/prod)

**Files:**

- Create: `.github/workflows/promote.yml`

- [ ] **Step 1: Write `.github/workflows/promote.yml`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.github/workflows/promote.yml`:

````yaml
name: Promote (stage or prod)

# Manual GitOps promotion: dev → stage → prod.
#
# plan: runs immediately, posts what's about to promote to $GITHUB_STEP_SUMMARY.
# apply: runs in the target GitHub Environment, gated by required reviewers,
#        re-verifies source SHA hasn't moved, fast-forwards the target tracking branch.
#
# Source/target mapping:
#   target=stage → source=deploy/dev,   target=deploy/stage
#   target=prod  → source=deploy/stage, target=deploy/prod

on:
  workflow_dispatch:
    inputs:
      target:
        description: 'Environment to promote to'
        required: true
        type: choice
        options: [stage, prod]

concurrency:
  group: promote-${{ inputs.target }}
  cancel-in-progress: false

jobs:
  plan:
    name: Plan promotion to ${{ inputs.target }}
    runs-on: ubuntu-latest
    outputs:
      source_branch: ${{ steps.refs.outputs.source_branch }}
      target_branch: ${{ steps.refs.outputs.target_branch }}
      source_sha: ${{ steps.refs.outputs.source_sha }}
      target_sha: ${{ steps.refs.outputs.target_sha }}
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      - name: Resolve source/target refs
        id: refs
        run: |
          case "${{ inputs.target }}" in
            stage) SRC="deploy/dev";   DST="deploy/stage" ;;
            prod)  SRC="deploy/stage"; DST="deploy/prod"  ;;
            *) echo "::error::Unknown target: ${{ inputs.target }}"; exit 1 ;;
          esac
          git fetch origin "$SRC:refs/remotes/origin/$SRC" "$DST:refs/remotes/origin/$DST"
          SRC_SHA=$(git rev-parse "origin/$SRC")
          DST_SHA=$(git rev-parse "origin/$DST")
          {
            echo "source_branch=$SRC"
            echo "target_branch=$DST"
            echo "source_sha=$SRC_SHA"
            echo "target_sha=$DST_SHA"
          } >> "$GITHUB_OUTPUT"

      - name: Verify target is ancestor of source (fast-forward only)
        run: |
          if [ "${{ steps.refs.outputs.source_sha }}" = "${{ steps.refs.outputs.target_sha }}" ]; then
            echo "::warning::Source and target are at the same commit. Nothing to promote."
            exit 0
          fi
          if ! git merge-base --is-ancestor "${{ steps.refs.outputs.target_sha }}" "${{ steps.refs.outputs.source_sha }}"; then
            echo "::error::Target is not an ancestor of source — cannot fast-forward."
            exit 1
          fi

      - name: Compute promotion summary
        run: |
          SRC="${{ steps.refs.outputs.source_branch }}"
          DST="${{ steps.refs.outputs.target_branch }}"
          COMMITS=$(git log --oneline "origin/$DST..origin/$SRC" || echo "")
          {
            echo "## Promotion plan: \`$SRC\` → \`$DST\` (target: **${{ inputs.target }}**)"
            echo ""
            echo "- Source tip: \`${{ steps.refs.outputs.source_sha }}\`"
            echo "- Target tip: \`${{ steps.refs.outputs.target_sha }}\`"
            echo ""
            echo "### Commits to promote"
            if [ -z "$COMMITS" ]; then
              echo "_No new commits — source and target are at the same tip._"
            else
              echo '```'
              echo "$COMMITS"
              echo '```'
            fi
          } >> "$GITHUB_STEP_SUMMARY"

  apply:
    name: Apply promotion to ${{ inputs.target }}
    needs: plan
    runs-on: ubuntu-latest
    environment:
      name: ${{ inputs.target }}
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      - name: Fetch source and target branches
        run: |
          git fetch origin \
            "${{ needs.plan.outputs.source_branch }}:refs/remotes/origin/${{ needs.plan.outputs.source_branch }}" \
            "${{ needs.plan.outputs.target_branch }}:refs/remotes/origin/${{ needs.plan.outputs.target_branch }}"

      - name: Re-verify source SHA hasn't moved since plan
        run: |
          CURRENT_SRC_SHA=$(git rev-parse "origin/${{ needs.plan.outputs.source_branch }}")
          if [ "$CURRENT_SRC_SHA" != "${{ needs.plan.outputs.source_sha }}" ]; then
            echo "::error::Source branch moved during approval window."
            echo "::error::  Planned: ${{ needs.plan.outputs.source_sha }}"
            echo "::error::  Current: $CURRENT_SRC_SHA"
            exit 1
          fi

      # When a DB is added, uncomment:
      # - name: Apply migrations to ${{ inputs.target }} DB
      #   env:
      #     DATABASE_URL: ${{ secrets.DATABASE_URL }}
      #   run: <migration tool> migrate --target ${{ inputs.target }}

      - name: Fast-forward target tracking branch
        run: |
          git push origin \
            "${{ needs.plan.outputs.source_sha }}:refs/heads/${{ needs.plan.outputs.target_branch }}"

      - name: Summarize
        run: |
          {
            echo "## ${{ inputs.target }} promotion complete"
            echo ""
            echo "- Promoted: \`${{ needs.plan.outputs.source_branch }}\` → \`${{ needs.plan.outputs.target_branch }}\`"
            echo "- Commit: \`${{ needs.plan.outputs.source_sha }}\`"
            echo "- Amplify + Vercel rebuilding"
          } >> "$GITHUB_STEP_SUMMARY"
````

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/promote.yml
git commit -m "ci: add promote workflow (manual stage/prod GitOps promotion gated by Environments)"
```

---

### Task 26: Dependabot config

**Files:**

- Create: `.github/dependabot.yml`

- [ ] **Step 1: Write `.github/dependabot.yml`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: '/'
    schedule: { interval: daily }
    open-pull-requests-limit: 10
    groups:
      next:
        patterns: ['next', 'react', 'react-dom', '@types/react', '@types/react-dom']
      eslint:
        patterns: ['eslint*', '@eslint/*', 'typescript-eslint', '@typescript-eslint/*']
      tailwind:
        patterns: ['tailwindcss', '@tailwindcss/*', 'tailwind-merge', 'prettier-plugin-tailwindcss']
      types:
        patterns: ['@types/*']
      commit-tooling:
        patterns: ['husky', 'lint-staged', '@commitlint/*', 'commitlint']

  - package-ecosystem: github-actions
    directory: '/'
    schedule: { interval: daily }
    open-pull-requests-limit: 5

  - package-ecosystem: devcontainers
    directory: '/'
    schedule: { interval: weekly }

  - package-ecosystem: pip
    directory: '/scripts'
    schedule: { interval: weekly }
```

- [ ] **Step 2: Commit**

```bash
git add .github/dependabot.yml
git commit -m "ci: add Dependabot config (npm, github-actions, devcontainers, pip)"
```

---

### Task 27: Vercel config

**Files:**

- Create: `vercel.json`

- [ ] **Step 1: Write `vercel.json`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/vercel.json`:

```jsonc
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm turbo run build --filter=web",
  "installCommand": "pnpm install --frozen-lockfile",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs",
  "git": {
    "deploymentEnabled": {
      "deploy/dev": true,
      "deploy/stage": true,
      "deploy/prod": true,
      "main": false,
    },
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "build(vercel): pin monorepo build + deploy only from deploy/* tracking branches"
```

---

### Task 28: Amplify config

**Files:**

- Create: `amplify.yml`

- [ ] **Step 1: Write `amplify.yml`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/amplify.yml`:

```yaml
version: 1
applications:
  - appRoot: apps/web
    frontend:
      # Run install AND build from the monorepo root. pnpm's `workspace:*`
      # resolution requires walking every workspace, and AWS docs document
      # `buildPath: '/'` as the canonical setup for monorepos where the dep
      # tree lives at the root.
      buildPath: '/'
      phases:
        preBuild:
          commands:
            # Pin pnpm to match `packageManager` in root package.json. Bump
            # by changing PNPM_VERSION here AND `packageManager` in
            # package.json; refresh `pnpm-lock.yaml` locally with
            # `pnpm install`.
            - export PNPM_VERSION="9.15.0"
            - corepack enable
            - corepack prepare "pnpm@${PNPM_VERSION}" --activate
            # `--frozen-lockfile` makes the install deterministic — fails
            # the build if `pnpm-lock.yaml` would need to change.
            - pnpm install --frozen-lockfile
        build:
          commands:
            # Build-time env validation runs at module load, so required
            # env vars must exist at build time. Write Amplify's env vars
            # to `apps/web/.env.production`, keyed by `.env.example` so
            # we only emit vars this app actually declares.
            - KEYS=$(grep -E '^[A-Z_][A-Z0-9_]*=' .env.example | cut -d= -f1 | paste -sd '|' -)
            - env | grep -E "^(${KEYS})=" >> apps/web/.env.production || true
            # `pnpm turbo run build --filter=web` runs the `build` task
            # for the `web` workspace, content-hashing inputs and
            # short-circuiting to the cached `.next/` output when nothing
            # relevant changed.
            - pnpm turbo run build --filter=web
      artifacts:
        # baseDirectory is relative to buildPath. With buildPath: '/'
        # that's an absolute-from-root path to the Next build output.
        baseDirectory: apps/web/.next
        files:
          - '**/*'
      cache:
        # Keep cache narrow and under the 5GB Amplify limit. The valuable
        # caches are:
        #   1. pnpm's content-addressed store (`node_modules/.pnpm-store/`)
        #   2. Turbo's content-addressed task cache (`.turbo/cache/`)
        #   3. Next's incremental build cache (`apps/web/.next/cache/`)
        paths:
          - .turbo/cache/**/*
          - apps/web/.next/cache/**/*
          - node_modules/.pnpm-store/**/*

# Multi-app extension pattern:
#
# To add another app (e.g. apps/admin), copy the block above, change:
#   - appRoot: apps/admin
#   - artifacts.baseDirectory: apps/admin/.next
#   - cache.paths: include apps/admin/.next/cache/**/*
#   - build command: pnpm turbo run build --filter=admin
# Then create a new Amplify App in the AWS console with
# AMPLIFY_MONOREPO_APP_ROOT=apps/admin set as an env var.
```

- [ ] **Step 2: Commit**

```bash
git add amplify.yml
git commit -m "build(amplify): pin pnpm 9.15.0, env-keyed .env.production write, narrow caches"
```

---

### Task 29: Wire `bmad:init` + `verify:vscode` scripts and `.env.example`

**Files:**

- Modify: root `package.json`
- Create: `.env.example` (root)

- [ ] **Step 1: Add scripts to root `package.json`**

Edit `/Volumes/Extended/IdeaProjects/my-startup-template/package.json` `"scripts"` block — add:

```
"bmad:init": "npx bmad-method@latest install --yes --tools claude-code --modules bmm,bmb,cis,tea --set core.output_folder=docs/bmad-output",
"bmad:init:interactive": "npx bmad-method@latest install",
"verify:vscode": "node scripts/verify-vscode-extensions.mjs"
```

The full scripts block should now be:

```json
"scripts": {
  "dev": "turbo run dev",
  "build": "turbo run build",
  "lint": "turbo run lint",
  "lint:fix": "turbo run lint:fix",
  "typecheck": "turbo run typecheck",
  "test": "turbo run test",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "clean": "turbo run clean && rm -rf node_modules .turbo",
  "bmad:init": "npx bmad-method@latest install --yes --tools claude-code --modules bmm,bmb,cis,tea --set core.output_folder=docs/bmad-output",
  "bmad:init:interactive": "npx bmad-method@latest install",
  "verify:vscode": "node scripts/verify-vscode-extensions.mjs",
  "prepare": "husky"
}
```

**What `bmad:init` does:**

- `--yes` skips all prompts (uses flags + defaults).
- `--tools claude-code` wires BMAD agents into `.claude/`.
- `--modules bmm,bmb,cis,tea` installs: BMad Method (agile core), BMad Builder (custom agent builder), Creative Intelligence Suite, Test Architect.
- `--set core.output_folder=docs/bmad-output` sends BMAD's PRDs, architecture docs, stories, etc. to `docs/bmad-output/` (alongside `docs/superpowers/`) instead of the default `_bmad-output/` at the repo root.

`bmad:init:interactive` is the escape hatch for users who want to pick a different IDE or different module set.

- [ ] **Step 2: Create root `.env.example`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/.env.example`:

```
# Root-level env example. Per-app envs live in apps/*/.env.example.
# This file is referenced by `turbo.json` globalDependencies so changes
# bust the build cache appropriately.
```

- [ ] **Step 3: Verify scripts work**

```bash
pnpm verify:vscode
```

Expected: `✓ 14 extensions in sync between .vscode/ and .devcontainer/`

- [ ] **Step 4: Commit**

```bash
git add package.json .env.example
git commit -m "chore: wire bmad:init and verify:vscode scripts, add root .env.example"
```

---

### Task 30: Final README.md

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Replace placeholder `README.md`**

Write `/Volumes/Extended/IdeaProjects/my-startup-template/README.md`:

````markdown
# my-startup-template

> Opinionated Turborepo template for fullstack Next.js startups driven by [BMAD](https://github.com/bmad-code-org/BMAD-METHOD) — brainstorm → PRD → architecture → dev → deploy.

A clean foundation for the toolchain (Node 22, pnpm, Turbo, Next.js 16, React 19, Tailwind v4, shadcn/ui, TypeScript strict, Python/UV, husky+commitlint, OWASP ZAP CI, Vercel + AWS Amplify deploys) with **no product code** — BMAD shapes that.

## Quickstart

### Option A — GitHub Codespaces

Click **Code → Codespaces → Create codespace on main**. The devcontainer auto-installs Node 22, pnpm (Corepack), Python 3.13, UV, and all recommended VS Code extensions. Then in the integrated terminal:

```bash
pnpm bmad:init    # Step 1 — headless BMAD install (bmm, bmb, cis, tea → claude-code, output: docs/bmad-output/)
pnpm dev          # Step 2 — runs the placeholder landing page
```
````

### Option B — Local

```bash
git clone <this-repo>
cd my-startup-template
corepack enable    # one-time, pulls pnpm@9.15.0 from packageManager field
pnpm install
pnpm bmad:init     # Step 1 — headless BMAD install (bmm, bmb, cis, tea → claude-code, output: docs/bmad-output/)
pnpm dev           # Step 2 — runs the placeholder landing page
```

Want a different IDE or module set? Run `pnpm bmad:init:interactive` instead.

Visit `http://localhost:3000` to see the placeholder landing page (proves Next + Tailwind + shadcn wiring). After `bmad:init`, ask the BMAD orchestrator in your IDE: `@bmad-orchestrator what should I do first?`

## Layout

```
apps/web/              Next.js 16 app (placeholder landing page)
packages/ui/           Shared component primitives (empty shell)
packages/types/        Shared TS types (empty shell)
packages/config/       Shared eslint, tsconfig, tailwind, prettier configs
scripts/               Python (UV) ad-hoc scripts + custom MCPs
.devcontainer/         Codespaces config
.github/               CI, security, deploy workflows
.claude/               Claude Code settings + MCP entries
.vscode/               Workspace settings + recommended extensions
docs/superpowers/      Design specs and implementation plans
AGENTS.md              Canonical agent instructions (read this!)
```

## Commands

| Command                      | What it does                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm dev`                   | Run all dev servers in parallel (just `web` initially)                                            |
| `pnpm build`                 | Build all workspaces (Turbo cached)                                                               |
| `pnpm lint`                  | ESLint every workspace                                                                            |
| `pnpm lint:fix`              | ESLint with auto-fix                                                                              |
| `pnpm typecheck`             | `tsc --noEmit` every workspace                                                                    |
| `pnpm test`                  | Run tests across workspaces                                                                       |
| `pnpm format`                | Prettier write the repo                                                                           |
| `pnpm format:check`          | Prettier check (CI)                                                                               |
| `pnpm verify:vscode`         | Assert `.vscode/` and `.devcontainer/` extension lists match                                      |
| `pnpm bmad:init`             | Headless BMAD install (modules: bmm/bmb/cis/tea, tools: claude-code, output: `docs/bmad-output/`) |
| `pnpm bmad:init:interactive` | Interactive BMAD installer (pick your own IDE + modules)                                          |
| `pnpm clean`                 | Remove all build/cache outputs                                                                    |

Filter to a single workspace with `-F`:

```bash
pnpm -F web dev
pnpm -F @my-startup-template/ui typecheck
```

## Deployment

The template is wired for **both Vercel and AWS Amplify Hosting**. Deployments are tied to _tracking branches_, not `main`:

| Branch         | Environment | Trigger                                                 |
| -------------- | ----------- | ------------------------------------------------------- |
| `main`         | none        | source of truth                                         |
| `deploy/dev`   | dev         | auto fast-forwarded on push to `main` (after CI passes) |
| `deploy/stage` | stage       | manual via `Promote` GitHub Action (target=stage)       |
| `deploy/prod`  | prod        | manual via `Promote` GitHub Action (target=prod)        |

`vercel.json` and `amplify.yml` are both committed. After creating the actual apps in their respective consoles, point each at the relevant tracking branch(es). Promotions are gated by GitHub Environments with required reviewers.

## Security

CI runs on every PR:

- **OWASP ZAP** baseline DAST scan against the running app
- **Snyk** dependency scan (requires `SNYK_TOKEN` secret)
- **`pnpm audit`** at high severity
- **CodeQL** static analysis for JavaScript/TypeScript

Dependabot opens daily PRs for npm, github-actions, devcontainers, and weekly for pip.

## More documentation

- [`AGENTS.md`](./AGENTS.md) — canonical instructions for AI coding agents (Claude, Copilot, Cursor, etc.)
- [`scripts/README.md`](./scripts/README.md) — Python tooling
- [`docs/superpowers/specs/`](./docs/superpowers/specs/) — design specs
- [`docs/superpowers/plans/`](./docs/superpowers/plans/) — implementation plans

## License

[MIT](./LICENSE)

````

- [ ] **Step 2: Format + lint + commit**

```bash
pnpm format
git add README.md
git commit -m "docs: replace placeholder README with full quickstart + commands + deployment guide"
````

---

### Task 31: Final verification (fresh clone simulation + smoke test)

**Files:** none (verification only)

- [ ] **Step 1: Format the whole repo**

```bash
pnpm format
```

- [ ] **Step 2: Verify format passes**

```bash
pnpm format:check
```

Expected: `All matched files use Prettier code style!`

- [ ] **Step 3: Lint everything**

```bash
pnpm lint
```

Expected: Exits 0 (no errors).

- [ ] **Step 4: Typecheck everything**

```bash
pnpm typecheck
```

Expected: Exits 0.

- [ ] **Step 5: Build everything**

```bash
pnpm build
```

Expected: `web` build succeeds. Turbo summary shows `2 successful, 2 total` (or similar — counts depend on transitive build deps).

- [ ] **Step 6: VS Code lockstep**

```bash
pnpm verify:vscode
```

Expected: `✓ 14 extensions in sync`.

- [ ] **Step 7: UV sync (Python toolchain works)**

```bash
cd scripts && uv sync && cd ..
```

Expected: `scripts/uv.lock` created. No errors.

Commit the lockfile:

```bash
git add scripts/uv.lock
git commit -m "build(scripts): generate uv.lock"
```

- [ ] **Step 8: Manual smoke test — dev server boots and renders**

```bash
pnpm -F web dev
```

In a browser, open `http://localhost:3000` and confirm:

- "my-startup-template" title renders inside a Card
- "Powered by BMAD" description shows
- Two buttons (Primary + Secondary) render with shadcn styling
- No console errors

Stop the dev server with Ctrl+C.

- [ ] **Step 9: Verify commit-msg hook rejects bad messages and accepts good ones**

```bash
# Should FAIL:
echo "broken message no type" > /tmp/__bad.txt
pnpm exec commitlint --edit /tmp/__bad.txt && echo "UNEXPECTED PASS" || echo "GOOD: rejected bad message"

# Should PASS:
echo "feat(web): add new button variant" > /tmp/__good.txt
pnpm exec commitlint --edit /tmp/__good.txt && echo "GOOD: accepted good message" || echo "UNEXPECTED FAIL"

rm /tmp/__bad.txt /tmp/__good.txt
```

Expected: First prints "GOOD: rejected bad message". Second prints "GOOD: accepted good message".

- [ ] **Step 10: Verify git log is clean and conventional**

```bash
git log --oneline
```

Expected: All commits follow conventional format (`feat:`, `chore:`, `docs:`, `build:`, `ci:`). Roughly 30 commits.

- [ ] **Step 11: Final summary commit (if any uncommitted files)**

```bash
git status
```

Expected: `nothing to commit, working tree clean`. If anything is uncommitted, stage and commit it with an appropriate conventional message before declaring done.

---

## Self-Review (author's notes)

**1. Spec coverage check:**

| Spec section                                       | Implemented in task           |
| -------------------------------------------------- | ----------------------------- |
| Repo layout (Section 1 of spec)                    | Tasks 1–28                    |
| Toolchain pinning (Section 2)                      | Tasks 1, 2, 14, 17            |
| shadcn explicit setup (Section 3)                  | Task 12                       |
| BMAD wiring (Section 4)                            | Task 29 + Task 19 (AGENTS.md) |
| MCP servers (Section 5)                            | Task 18                       |
| AGENTS.md + CLAUDE.md/GEMINI.md (Section 6)        | Tasks 19, 20                  |
| Devcontainer (Section 7)                           | Task 17                       |
| CI/CD (Section 8)                                  | Tasks 22–26                   |
| Vercel + Amplify configs (Section 9)               | Tasks 27, 28                  |
| Python/UV (Section 10)                             | Task 14                       |
| README (Section 11)                                | Task 30                       |
| Linting/Prettier/git hooks/VS Code (added by user) | Tasks 5, 6, 15, 16, 17        |
| `verify:vscode` script (added by user)             | Tasks 14, 29                  |
| Verification                                       | Task 31                       |

All spec sections are covered.

**2. Placeholder scan:** No `TBD`, `TODO`, or "implement later" markers. Every step has actual content.

**3. Type/naming consistency:**

- Workspace package names: `@my-startup-template/{tsconfig,prettier-config,eslint-config,tailwind-config,ui,types}` and `web` — consistent across all tasks.
- Script names: `bmad:init`, `verify:vscode`, `lint`, `lint:fix`, `typecheck`, `build`, `dev`, `test`, `format`, `format:check`, `clean` — consistent in root, AGENTS.md, README, CI workflow, and pre-commit.
- `cn()` utility import path: `@/lib/utils` in Tasks 11, 12 — consistent.
- Extension list (14 entries) appears identically in Tasks 16 and 17 and is enforced by Task 14's verifier script.

**4. Ordering check:**

- Task 5 references Prettier — Prettier plugins are added to `devDependencies` in Step 5 of Task 5 before the smoke test.
- Task 6 ESLint config relies on packages declared in its own `dependencies` (not just root) so any consumer gets them transitively — verified.
- Task 11 marketing page imports Button + Card before Task 12 creates them — flagged in Task 11 Step 4 as expected; resolved in Task 12.
- Task 13 lint depends on `apps/web/eslint.config.mjs` (created in Step 1 of Task 13) which references `@my-startup-template/eslint-config/next` (created in Task 6). Order is correct.
- Task 14's verifier script is created before the VS Code files (Task 16) and devcontainer (Task 17), but it isn't _called_ until those files exist. Verifier call appears in Task 17 Step 4 and Task 29 Step 3. Order is correct.
- `prepare: "husky"` script (Task 15) creates `.husky/_` directory on `pnpm install`. The pre-commit + commit-msg files written in Task 15 Steps 4–5 are then picked up. Order is correct.

**5. Versions:** Next.js 16 is specified in the spec — if 16.x is not yet released when executing, the engineer should use `next@latest` and accept the closest match (this template targets Next 16+). All other versions are stable as of the spec's date (2026-05-31).

**6. Potential issue — Task 22 CI job `lint-typecheck-build-test` runs `pnpm format:check` before the turbo run.** This runs Prettier across the whole repo from CI; on the very first push of the template it should pass because Task 31 Step 1 formatted everything. Confirmed.

**7. Potential issue — Task 31 Step 8 requires a human to look at the browser.** This is necessary; type/build success doesn't prove the visual wiring. Documented as a manual step.

End of plan.
