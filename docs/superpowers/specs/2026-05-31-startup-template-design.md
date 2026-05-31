# Startup Template — Design Spec

**Date:** 2026-05-31
**Status:** Draft, awaiting user approval
**Owner:** Bryan Hughes

## Goal

A reusable, opinionated Turborepo template for building "Startup Company" projects as fullstack Next.js applications deployable to both Vercel and AWS Amplify Hosting. End users clone the template, optionally open it in GitHub Codespaces, and drive product/architecture/development/deployment through the [BMAD method](https://github.com/bmad-code-org/BMAD-METHOD). The template ships pre-configured toolchain, CI/CD, security scanning, and agent instructions — but no business logic, no database, and no installed BMAD modules (the user runs `pnpm bmad:init` as Step 1 to choose their own).

## Non-goals

- Domain code (auth flows, user models, billing, etc.) — BMAD's PRD/architecture phase decides these.
- Database choice (Postgres, Supabase, etc.) — chosen during BMAD architecture phase. CI deploy workflow ships a commented-out migration step ready to enable.
- Mobile apps. Web-only template.
- Multi-app monorepo out of the box (only `apps/web` ships). The `amplify.yml` documents the multi-app pattern in comments.

## Tech stack (pinned)

| Layer           | Choice                           | Version             | Pinned via                                        |
| --------------- | -------------------------------- | ------------------- | ------------------------------------------------- |
| Runtime         | Node.js                          | 22 LTS              | `.nvmrc`, `engines.node`, devcontainer base image |
| Package manager | pnpm                             | 9.x                 | `packageManager` field (Corepack)                 |
| Monorepo        | Turborepo                        | latest              | `turbo.json`                                      |
| Framework       | Next.js                          | 16+                 | `apps/web/package.json`                           |
| UI runtime      | React                            | 19                  | `apps/web/package.json`                           |
| Styling         | Tailwind CSS                     | v4                  | `apps/web/package.json`                           |
| Components      | shadcn/ui                        | new-york style, RSC | `apps/web/components.json`                        |
| Language        | TypeScript                       | 5.6+ strict         | `packages/config/tsconfig/base.json`              |
| Python          | Python + UV                      | 3.13                | `scripts/.python-version`, devcontainer           |
| Linting         | ESLint                           | 9 (flat config)     | `packages/config/eslint/`                         |
| Formatting      | Prettier                         | latest              | `packages/config/prettier/`                       |
| Git hooks       | husky + lint-staged + commitlint | latest              | root                                              |

## Repo layout

```
my-startup-template/
├── apps/
│   └── web/                          # Next.js 16, React 19, App Router
│       ├── app/
│       │   ├── (marketing)/page.tsx  # placeholder landing
│       │   ├── layout.tsx
│       │   └── globals.css           # @import "tailwindcss"
│       ├── components/ui/            # shadcn target
│       │   ├── button.tsx            # seed component
│       │   └── card.tsx              # seed component
│       ├── lib/
│       │   └── utils.ts              # cn() helper
│       ├── public/
│       ├── components.json           # shadcn config (style: new-york)
│       ├── tailwind.config.ts        # Tailwind v4
│       ├── postcss.config.mjs
│       ├── next.config.ts
│       ├── middleware.ts             # empty pass-through
│       ├── eslint.config.mjs         # extends packages/config/eslint/next.js
│       ├── tsconfig.json             # extends packages/config/tsconfig/nextjs.json
│       ├── .env.example
│       └── package.json
├── packages/
│   ├── ui/                           # shared component primitives (workspace:*)
│   │   ├── src/index.ts
│   │   ├── eslint.config.mjs         # extends react-lib
│   │   ├── tsconfig.json             # extends react-lib
│   │   └── package.json
│   ├── config/
│   │   ├── eslint/
│   │   │   ├── base.js
│   │   │   ├── next.js
│   │   │   ├── react-lib.js
│   │   │   └── package.json
│   │   ├── tsconfig/
│   │   │   ├── base.json
│   │   │   ├── nextjs.json
│   │   │   ├── react-lib.json
│   │   │   └── package.json
│   │   ├── tailwind/
│   │   │   ├── preset.ts
│   │   │   └── package.json
│   │   └── prettier/
│   │       ├── index.mjs
│   │       └── package.json
│   └── types/                        # shared TS types (workspace:*)
│       ├── src/index.ts
│       ├── tsconfig.json
│       └── package.json
├── scripts/                          # Python + UV
│   ├── pyproject.toml                # python>=3.13, ruff, pytest
│   ├── .python-version               # 3.13
│   ├── uv.lock
│   └── README.md
├── .devcontainer/
│   ├── devcontainer.json
│   └── Dockerfile
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # lint + typecheck + build + test
│   │   ├── security.yml              # ZAP, Snyk, audit, CodeQL
│   │   ├── deploy-dev.yml            # fast-forward deploy/dev on push to main
│   │   └── promote.yml               # workflow_dispatch stage/prod promotion
│   ├── dependabot.yml
│   ├── copilot-instructions.md       # one-liner: read ../AGENTS.md
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   └── feature_request.yml
│   └── pull_request_template.md
├── .claude/
│   ├── settings.json                 # MCP servers + permissions
│   ├── agents/                       # blank — BMAD installs here
│   └── commands/                     # blank — BMAD installs here
├── .vscode/
│   ├── settings.json                 # format on save, default formatter Prettier, ESLint flat config, Tailwind v4
│   └── extensions.json               # recommendations (mirrored in devcontainer for auto-install)
├── .husky/
│   ├── pre-commit                    # lint-staged
│   └── commit-msg                    # commitlint
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
├── AGENTS.md                         # canonical agent instructions (source of truth)
├── CLAUDE.md                         # one-liner: read ./AGENTS.md
├── GEMINI.md                         # one-liner: read ./AGENTS.md
├── README.md                         # quickstart, structure, commands
├── LICENSE                           # MIT placeholder
├── turbo.json                        # tasks: dev, build, lint, format, typecheck, test, clean
├── pnpm-workspace.yaml               # apps/*, packages/*
├── package.json                      # root scripts, packageManager: pnpm@9.x
├── vercel.json                       # monorepo build config
├── amplify.yml                       # appRoot: apps/web, buildPath: /
├── commitlint.config.mjs
├── .gitignore
├── .gitattributes
├── .editorconfig
├── .npmrc                            # engine-strict, auto-install-peers
├── .prettierignore                   # prettier config lives in package.json "prettier" field
├── .nvmrc                            # 22
└── .env.example
```

## Component-by-component spec

### `apps/web`

- **Next.js 16** App Router, React 19, RSC by default.
- **Tailwind v4** via `@import "tailwindcss"` in `app/globals.css`; `prettier-plugin-tailwindcss` sorts classes.
- **shadcn/ui** initialized explicitly (not just staged): `components.json` configured (style: new-york, RSC: true, baseColor: zinc, cssVariables: true), `lib/utils.ts` exports `cn()`, two seed components (`button`, `card`) committed so wiring is provably working. Users add more via `pnpm dlx shadcn@latest add <name>`.
- **Middleware** is a pass-through (`return NextResponse.next()`) — BMAD adds auth/locale/etc. when needed.
- **Landing page** at `app/(marketing)/page.tsx` renders a minimal "Powered by BMAD" placeholder using the seed shadcn `Card` + `Button` so a fresh `pnpm dev` proves the toolchain end-to-end.
- **Env vars:** only `NEXT_PUBLIC_APP_URL` ships in `apps/web/.env.example`. BMAD adds more during architecture phase.

### `packages/ui`

Workspace package consumable by `apps/web` (and any future apps). Ships with `src/index.ts` exporting nothing initially — BMAD adds shared components here as the design system emerges.

### `packages/config/*`

Centralized config consumed by every workspace via `workspace:*`:

- **`eslint/`**: flat-config files. `base.js` enables `@typescript-eslint`, `import/order`, `unused-imports`, `no-only-tests`. `next.js` extends base + `@next/eslint-plugin-next`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`. `react-lib.js` is base + react without next-specific rules.
- **`tsconfig/`**: `base.json` is strict (`strict: true`, `noUncheckedIndexedAccess: true`, `isolatedModules: true`, `moduleResolution: "bundler"`, `target: ES2022`). `nextjs.json` and `react-lib.json` extend it.
- **`tailwind/`**: shared preset (`preset.ts`) defining design tokens consumed by `apps/web/tailwind.config.ts` and (eventually) `packages/ui`.
- **`prettier/`**: `index.mjs` exports the shared config — `singleQuote: true`, `trailingComma: "all"`, `printWidth: 100`, `plugins: ["prettier-plugin-organize-imports", "prettier-plugin-tailwindcss"]`. Root `package.json` references it via the `"prettier": "@my-startup-template/prettier-config"` field (Prettier 3's config-sharing mechanism — no duplicate `.prettierrc.*` file).

### `packages/types`

Shared TS types. Empty `src/index.ts` initially.

### `scripts/` (Python + UV)

UV-managed Python project for scripts and (future) custom MCP servers.

- `pyproject.toml`: `python>=3.13,<3.14`, dependencies = `[]`, dev dependencies = `["ruff", "pytest"]`
- `.python-version`: `3.13`
- `uv.lock` committed
- `scripts/README.md` explains: `cd scripts && uv sync && uv run python <module>`
- No example code (per user preference)

### `.devcontainer/`

Codespaces-ready container.

- **Base:** `mcr.microsoft.com/devcontainers/typescript-node:22-bookworm`
- **Features:**
  - `ghcr.io/devcontainers/features/python:1` (version 3.13)
  - `ghcr.io/devcontainers/features/github-cli:1`
  - `ghcr.io/devcontainers-extra/features/uv:1`
- **`postCreateCommand`:** `corepack enable && pnpm install && cd scripts && uv sync`
  - Intentionally does NOT auto-run `pnpm bmad:init` — user chooses IDE/modules interactively.
- **Forwarded ports:** `3000`
- **VS Code extensions:** auto-installed in Codespaces via `customizations.vscode.extensions` (same list as `.vscode/extensions.json` — see VS Code section below). This is the effective-required mechanism: in Codespaces, every user gets them; locally, VS Code prompts on workspace open.

### `.github/`

#### `workflows/ci.yml`

Runs on PRs and pushes to `main`. Single `lint-typecheck-build-test` job:

1. Checkout
2. Setup pnpm (`pnpm/action-setup@v4`, version pinned via `packageManager` field detection)
3. Setup Node 22 (cache: pnpm)
4. `pnpm install --frozen-lockfile`
5. Turbo cache restore (key: `${{ runner.os }}-turbo-${{ hashFiles('pnpm-lock.yaml', '**/package.json', 'turbo.json', 'tsconfig*.json', '.env.example') }}`)
6. `pnpm turbo run lint typecheck build test` with `--filter=...[origin/main]` on PRs (affected-only)
7. Upload coverage artifact if `test` produced one

**Runner:** `ubuntu-latest`. Concurrency group cancels in-progress runs on the same ref.

#### `workflows/security.yml`

Runs on PRs, weekly cron (`0 2 * * 1`), and `workflow_dispatch`. Three jobs:

1. **`zap-baseline`** — OWASP ZAP baseline scan. Builds `apps/web`, starts it on `:3000`, runs `zaproxy/action-baseline@v0.14.0` against it. Posts PR comment summary. Reports uploaded as artifact.
2. **`dependency-scan`** — Snyk (`snyk/actions/node@master`, `continue-on-error: true`, requires `SNYK_TOKEN` secret) + `pnpm audit --audit-level=high` (non-blocking).
3. **`codeql`** — `github/codeql-action/init@v3` + `analyze@v3` for `javascript-typescript`.

ZAP requires no DB for the starter (placeholder landing page works as-is). When BMAD adds DB-backed features, users extend this workflow to stand up a DB.

#### `workflows/deploy-dev.yml`

On push to `main`:

1. Checkout `main` with full history
2. Fetch `deploy/dev` for comparison
3. (Commented-out placeholder for forward-only migration check — enable when DB is added)
4. (Commented-out placeholder for `supabase db push` or equivalent — enable when DB is added)
5. Fast-forward push to `deploy/dev` → Vercel + Amplify auto-build the branch

**Concurrency:** `deploy-dev`, `cancel-in-progress: false`.

#### `workflows/promote.yml`

`workflow_dispatch` with `target` input (`stage` | `prod`). Two jobs:

1. **`plan`** — resolves source/target tracking branches (`stage` ← `deploy/dev`, `prod` ← `deploy/stage`), verifies fast-forward-only, posts promotion summary (commits + new migrations) to `$GITHUB_STEP_SUMMARY`.
2. **`apply`** — runs in GitHub Environment matching `target` (required-reviewers gated). Re-verifies source SHA hasn't moved since plan. (Commented-out migration apply step.) Fast-forwards target tracking branch.

#### `dependabot.yml`

Daily updates for: `npm` (pnpm-detected), `github-actions`, `devcontainers`, `pip` (for `scripts/`).

#### `copilot-instructions.md`

Single line: `For all coding instructions, conventions, and workflows, read ./AGENTS.md.`

### `.vscode/` (workspace IDE config)

VS Code has no native "required extensions" mechanism, but the effective-required pattern is:

- **`.vscode/extensions.json`** lists extensions under `recommendations`. VS Code prompts every user to install on workspace open.
- **`.devcontainer/devcontainer.json`** mirrors the same list in `customizations.vscode.extensions`. In Codespaces (or any devcontainer) these are auto-installed — no prompt, no opt-out.

**Both lists are kept in lockstep.** A `pnpm verify:vscode` script (added to root `package.json`) diffs them and fails CI if they drift. The CI `ci.yml` workflow runs `pnpm verify:vscode` as a lint-tier step.

#### `.vscode/extensions.json`

```jsonc
{
  "recommendations": [
    // Code quality
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "editorconfig.editorconfig",
    "usernamehw.errorlens",
    "yoavbls.pretty-ts-errors",

    // Styling
    "bradlc.vscode-tailwindcss",

    // Python toolchain (scripts/)
    "ms-python.python",
    "charliermarsh.ruff",

    // File formats
    "redhat.vscode-yaml",
    "mikestead.dotenv",

    // Conventional commits (matches commitlint hook)
    "vivaxy.vscode-conventional-commits",

    // AI assistants
    "anthropic.claude-code",
    "github.copilot",
    "github.copilot-chat",
  ],
  "unwantedRecommendations": [],
}
```

#### `.vscode/settings.json`

```jsonc
{
  // Format on save, Prettier as default
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never", // Prettier plugin handles this
  },

  // ESLint flat config
  "eslint.useFlatConfig": true,
  "eslint.workingDirectories": [{ "pattern": "apps/*" }, { "pattern": "packages/*" }],

  // Tailwind v4
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
  ],

  // TypeScript: prefer workspace TS version
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,

  // Python (scripts/)
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit",
    },
  },
  "python.defaultInterpreterPath": "scripts/.venv/bin/python",

  // File excludes from search/explorer noise
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

  // Conventional Commits extension defaults
  "conventionalCommits.scopes": ["web", "ui", "config", "types", "scripts", "ci", "deps", "docs"],
}
```

#### `.devcontainer/devcontainer.json` extension mirror

```jsonc
{
  // ...other fields elided
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
      "settings": {
        // Codespaces-specific overrides if any; defaults inherit from .vscode/settings.json
      },
    },
  },
}
```

#### `scripts/verify-vscode-extensions.mjs` (lockstep check)

A small Node script that loads both `.vscode/extensions.json` and `.devcontainer/devcontainer.json`, asserts the extension lists match exactly (same set, same order), and exits non-zero with a diff if they drift. Wired as `pnpm verify:vscode` in root `package.json` and called from `ci.yml`.

### `.claude/settings.json`

```jsonc
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": ["Bash(pnpm:*)", "Bash(npx:*)", "Bash(uv:*)", "Bash(git:*)", "Bash(gh:*)"],
  },
  "mcpServers": {
    "context7": {
      /* HTTP MCP, no env needed */
    },
    "playwright": {
      /* npx @playwright/mcp@latest */
    },
    "shadcn": {
      /* npx shadcn@latest mcp */
    },
    "supabase": {
      // Configure SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF in env when DB is added
    },
    "gitnexus": {
      // Point at local gitnexus install — path varies by machine
    },
  },
}
```

Supabase + gitnexus entries are commented placeholders; user fills in when ready.

### `AGENTS.md` (canonical source of truth)

Sections:

1. **Project mission** — "This is a Startup Company template. The product is undefined until BMAD's brainstorm → PRD → architecture phases run."
2. **Step 1 — Initialize BMAD**
   ```
   pnpm bmad:init
   ```
   Headless install: target IDE `claude-code`, modules `bmm,bmb,cis,tea`, output folder `docs/bmad-output/`. After install, ask the BMAD orchestrator agent what to do next. Escape hatch: `pnpm bmad:init:interactive` for a different IDE/module set.
3. **Tech stack** — pnpm + Turbo + Next.js 16 + React 19 + Tailwind v4 + shadcn/ui + TS strict + Python/UV.
4. **Monorepo conventions** — workspaces, `workspace:*` protocol, shared configs in `packages/config`.
5. **Commands cheatsheet:**
   ```
   pnpm dev               # turbo run dev (parallel)
   pnpm build             # turbo run build (cached)
   pnpm lint              # eslint via turbo
   pnpm lint:fix
   pnpm typecheck         # tsc --noEmit via turbo
   pnpm test              # turbo run test
   pnpm format            # prettier --write .
   pnpm format:check
   pnpm bmad:init         # headless install (bmm,bmb,cis,tea → claude-code, output: docs/bmad-output/)
   pnpm bmad:init:interactive  # interactive installer (different IDE or module set)
   ```
6. **Adding shadcn components:** `pnpm dlx shadcn@latest add <name>` from `apps/web/`.
7. **Deployment:** push to `main` → CI runs → `deploy/dev` auto-advances → Vercel/Amplify rebuild. Promote stage/prod via the `Promote` GitHub Action.
8. **Code quality:** ESLint + Prettier auto-run on pre-commit via husky + lint-staged. commitlint enforces conventional commits on `commit-msg`.
9. **Python scripts:** `cd scripts && uv sync && uv run python <module>`.

### `CLAUDE.md`, `GEMINI.md`

Each is one line pointing at AGENTS.md:

```
Read and follow ./AGENTS.md.
```

### `README.md`

User-facing quickstart:

1. **Title + 1-line description** (placeholder for user to customize)
2. **Quickstart**
   - Codespaces button OR `git clone …`
   - `pnpm install`
   - `pnpm bmad:init` (Step 1 — kicks off BMAD)
   - `pnpm dev`
3. **Layout** — tree (matches Repo Layout section above, abbreviated)
4. **Commands** — table (mirrors AGENTS.md cheatsheet)
5. **Deployment** — branch model (`main` → `deploy/dev` → `deploy/stage` → `deploy/prod`), Vercel + Amplify both supported
6. **Documentation** — pointers to `AGENTS.md` (canonical) and `scripts/README.md`

### `turbo.json` tasks

```jsonc
{
  "$schema": "https://turborepo.org/schema.json",
  "ui": "tui",
  "globalDependencies": [".env.example", "tsconfig*.json"],
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "lint:fix": { "cache": false },
    "typecheck": { "dependsOn": ["^build"], "outputs": ["*.tsbuildinfo"] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "format": { "cache": false },
    "format:check": {},
    "clean": { "cache": false },
  },
}
```

### `vercel.json`

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

Deploys are tied to tracking branches, not `main`. `main` itself is never deployed — `deploy-dev.yml` fast-forwards `deploy/dev` after CI passes.

### `amplify.yml`

Single-app baseline for the template, with the multi-app pattern documented in comments for users who add more apps:

```yaml
version: 1
applications:
  - appRoot: apps/web
    frontend:
      buildPath: '/'
      phases:
        preBuild:
          commands:
            # Pin pnpm to match `packageManager` in root package.json so
            # Amplify's build matches CI's build matches local builds.
            # Bump by changing PNPM_VERSION here AND `packageManager` in
            # package.json; refresh `pnpm-lock.yaml` locally.
            - export PNPM_VERSION="9.15.0"
            - corepack enable
            - corepack prepare "pnpm@${PNPM_VERSION}" --activate
            - pnpm install --frozen-lockfile
        build:
          commands:
            # Write Amplify env vars to apps/web/.env.production keyed by
            # .env.example. Required because
            # Next.js's build-time env validation runs at module load.
            - KEYS=$(grep -E '^[A-Z_][A-Z0-9_]*=' .env.example | cut -d= -f1 | paste -sd '|' -)
            - env | grep -E "^(${KEYS})=" >> apps/web/.env.production || true
            - pnpm turbo run build --filter=web
      artifacts:
        baseDirectory: apps/web/.next
        files:
          - '**/*'
      cache:
        paths:
          - .turbo/cache/**/*
          - apps/web/.next/cache/**/*
          - node_modules/.pnpm-store/**/*
```

### `package.json` (root)

```jsonc
{
  "name": "my-startup-template",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=22 <23", "pnpm": ">=9" },
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
    "clean": "turbo run clean && rm -rf node_modules .turbo",
    "bmad:init": "npx bmad-method@latest install --yes --tools claude-code --modules bmm,bmb,cis,tea --set core.output_folder=docs/bmad-output",
    "bmad:init:interactive": "npx bmad-method@latest install",
    "verify:vscode": "node scripts/verify-vscode-extensions.mjs",
    "prepare": "husky",
  },
  "devDependencies": {
    "turbo": "latest",
    "prettier": "latest",
    "prettier-plugin-organize-imports": "latest",
    "prettier-plugin-tailwindcss": "latest",
    "husky": "latest",
    "lint-staged": "latest",
    "@commitlint/cli": "latest",
    "@commitlint/config-conventional": "latest",
    "typescript": "latest",
    "@my-startup-template/eslint-config": "workspace:*",
    "@my-startup-template/prettier-config": "workspace:*",
    "@my-startup-template/tsconfig": "workspace:*",
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx,mjs,cjs}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml,css}": ["prettier --write"],
  },
  "prettier": "@my-startup-template/prettier-config",
}
```

### `.gitignore`

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

### `.gitattributes`

```
* text=auto eol=lf
pnpm-lock.yaml -diff
uv.lock -diff
```

### `.editorconfig`

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

### `.npmrc`

```
engine-strict=true
auto-install-peers=true
package-manager-strict=true
strict-peer-dependencies=false
```

### `commitlint.config.mjs`

```js
export default { extends: ['@commitlint/config-conventional'] };
```

### `.husky/pre-commit`

```sh
pnpm exec lint-staged
```

### `.husky/commit-msg`

```sh
pnpm exec commitlint --edit "$1"
```

### `LICENSE`

MIT placeholder. User edits the copyright line.

## Architecture decisions

### Why pnpm (not Bun or npm)

- pnpm has the strongest Turborepo + monorepo story (content-addressed store, strict hoisting, native workspaces).
- `packageManager` + Corepack gives a single pin that CI, Vercel, and Amplify all respect.
- Bun is faster but has known Amplify quirks (documented in earlier reference implementations); pnpm avoids them.

### Why tracking branches (`deploy/dev`, `deploy/stage`, `deploy/prod`)

- Decouples "merged to main" from "deployed". CI failure or a bad migration on `main` doesn't auto-promote.
- Both Vercel and Amplify natively support per-branch deployments — same git ref deploys to both.
- Promotion is an auditable workflow run with required reviewers (via GitHub Environments).
- Pattern proven in a prior reference implementation.

### Why BMAD stays uninstalled

- The user's IDE choice (Claude Code, Cursor, Windsurf, etc.) and module selection (BMM core, others) are personal. Pre-installing locks them in.
- BMAD's installer writes into `.claude/agents/`, `.claude/commands/`, etc. Committing those would make the template diverge per-user.
- A `pnpm bmad:init` script (and AGENTS.md "Step 1") makes the bootstrap trivial without locking choice.

### Why AGENTS.md is canonical (CLAUDE.md/GEMINI.md re-export)

- Single source of truth — no copy-drift between IDEs.
- AGENTS.md is the emerging community standard. Other IDEs (Cursor, Windsurf, etc.) increasingly recognize it.
- Per the `using-superpowers` skill priority order, user-authored AGENTS.md overrides everything.

### Why no DB in the template

- Database choice (Postgres/Supabase/PlanetScale/Drizzle/Prisma) is an architectural decision BMAD's architect agent should make based on the PRD.
- The CI deploy workflow ships commented-out migration steps ready to enable — no rewrite needed when BMAD picks a DB.

## Testing strategy

The template ships _infrastructure_ for testing but no tests:

- `apps/web/package.json` includes `vitest` + `@testing-library/react` + `jsdom` as devDeps; `vitest.config.ts` committed.
- `turbo.json` defines a `test` task.
- No example test (YAGNI — BMAD adds tests alongside features per its TDD discipline).
- CI runs `turbo run test`; passes when there are no tests.

## Open risks

- **Vercel "Enable Git Repository" deployments** require connecting the repo to Vercel manually after first clone. Document this in README.
- **AWS Amplify App creation** is manual (console + Terraform optional via `infra/`). Document in README; ship `amplify.yml` ready.
- **OWASP ZAP** requires the app to start with no external dependencies. The starter landing page satisfies this. When BMAD adds a feature that needs a DB, the user must extend `security.yml` to stand it up.
- **`packageManager` version drift** — if user upgrades pnpm locally without updating Amplify's `PNPM_VERSION` env var or `package.json`'s `packageManager` field, builds diverge. Documented in `amplify.yml` comments and AGENTS.md.

## Out of scope (explicit non-goals)

- Auth scaffolding
- DB schema, migrations tooling, ORM choice
- Email/notification provider
- Analytics, observability
- Stripe/billing
- Storybook
- Mobile apps
- i18n
- Marketing site CMS

All of the above are BMAD-phase decisions.

## Implementation phasing (preview — will be detailed by writing-plans)

1. **Monorepo skeleton:** root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.gitattributes`, `.editorconfig`, `.npmrc`, `.nvmrc`, LICENSE.
2. **Shared configs:** `packages/config/{eslint,tsconfig,tailwind,prettier}`.
3. **`apps/web`:** Next.js 16 starter, Tailwind v4, shadcn init + seed components, placeholder landing page.
4. **`packages/ui`, `packages/types`:** empty workspace shells.
5. **Python `scripts/`:** UV-initialized.
6. **Git hooks:** husky + lint-staged + commitlint.
7. **Devcontainer.**
8. **`.claude/settings.json`** with MCP entries.
9. **`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, README.md, `.github/copilot-instructions.md`.**
10. **CI/CD:** `ci.yml`, `security.yml`, `deploy-dev.yml`, `promote.yml`, `dependabot.yml`, issue/PR templates.
11. **Deploy configs:** `vercel.json`, `amplify.yml`.
12. **Verification:** `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check` all green from a fresh clone.

## Success criteria

- Fresh `git clone` + `pnpm install` + `pnpm dev` boots `apps/web` showing the placeholder landing page (proves Next + Tailwind + shadcn wiring).
- `pnpm lint && pnpm typecheck && pnpm build && pnpm format:check` all pass.
- Opening in Codespaces produces an identical working environment via devcontainer postCreate.
- `pnpm bmad:init` cleanly bootstraps BMAD into `.claude/` without conflicts.
- GitHub Actions CI passes on the initial commit.
- The repo can be pushed to GitHub, connected to Vercel and an Amplify app, and a `deploy/dev` push successfully builds on both.
