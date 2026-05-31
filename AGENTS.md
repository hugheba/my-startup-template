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
2. **Adding another app:** create `apps/<name>/` matching the `apps/web/` shape. Add an `appRoot:` block to `amplify.yml` (the existing block has comments showing the multi-app pattern from the proxcinity reference).
3. **Adding shared code:** extract into `packages/<name>/` with its own `package.json` (`workspace:*`), an `eslint.config.mjs` extending the shared config, and a `tsconfig.json` extending the shared config.
