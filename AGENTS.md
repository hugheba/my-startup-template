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

| Layer           | Choice                                                         |
| --------------- | -------------------------------------------------------------- |
| Toolchain       | mise (`mise.toml` + `mise.lock`) — owns every language and CLI |
| Runtime         | Node 24 LTS                                                    |
| Package manager | pnpm 9.15.0 (Corepack — auto-installed)                        |
| JVM             | GraalVM CE 21 incl. `native-image`                             |
| Monorepo        | Turborepo                                                      |
| Framework       | Next.js 16 (App Router, RSC)                                   |
| UI runtime      | React 19                                                       |
| Styling         | Tailwind CSS v4                                                |
| Components      | shadcn/ui (new-york style, RSC)                                |
| Language        | TypeScript 5.6+ (strict, `noUncheckedIndexedAccess`)           |
| Linting         | ESLint 9 flat config                                           |
| Formatting      | Prettier 3                                                     |
| Git hooks       | husky + lint-staged + commitlint (conventional commits)        |
| Python          | Python 3.14 + UV (in `scripts/`)                               |

## Monorepo conventions

- Workspaces: `apps/*`, `packages/*`, `packages/config/*`
- Inter-workspace deps use the `workspace:*` protocol
- Shared configs live in `packages/config/` (`eslint`, `tsconfig`, `tailwind`, `prettier`)
- Apps consume shared configs by extending them — never duplicate config

## Toolchain (mise)

**Every pinned version lives in [`.devcontainer/.env`](.devcontainer/.env)** — base image digest, apt packages, the mise installer, every mise-managed tool, and the npm-global Claude Code CLI. There are no version literals in `mise.toml`, the Dockerfile, or `docker-compose.yml`.

That one file has **two consumers**:

1. **Docker Compose** auto-loads it (same directory, that exact filename) and passes each entry to the Dockerfile's build ARGs — which is why the dev container is built through `docker-compose.yml` rather than a plain `build:` block.
2. **mise** loads it via `[env] _.file` and templates every `[tools]` version from it with `{{ env.X }}`.

`mise.lock` pins each tool to an exact release-asset URL and SHA256 **per platform**, and records SLSA provenance where the publisher signs it. Templating costs nothing here — the lock is generated against the resolved versions. **Never delete it** — mise only maintains a lockfile that already exists, and without it builds silently downgrade to "resolve whatever is latest".

To bump anything:

```bash
# 1. edit the value in .devcontainer/.env, then refresh the lock for every
#    platform the container and contributors use (installs nothing):
mise lock -p linux-x64,linux-arm64,macos-arm64,macos-x64
# 2. commit .devcontainer/.env and mise.lock together
```

**CI fails the PR if you forget step 2.** A bumped version against a stale lock still takes effect, but the orphaned lock entry leaves that tool's next install with no reviewed checksum — mise records whatever it downloads. That is fail-open, so it is gated rather than trusted to discipline.

Three things stay outside mise (all still pinned in `.devcontainer/.env`):

- **pnpm** — pinned by `packageManager` + Corepack; a second pin would drift.
- **docker-in-docker** — a daemon and a privileged container, not a versioned binary. It is a devcontainer feature (`moby: false`, so it installs Docker CE), pinned in `devcontainer-lock.json`.
- **the Claude Code CLI** — mise's npm backend installs with `--ignore-scripts` / `--omit=optional`, so the package's postinstall never runs and its platform-native binary is never fetched; `claude` then fails at runtime with "claude native binary not installed". It is `npm install -g`'d at `CLAUDE_CODE_VERSION` in the Dockerfile instead.

Anything the OS must provide — `build-essential`, `zlib1g-dev` (GraalVM `native-image` links against libz), and the network tools missing from the base image (`ping`, `dig`, `nc`, `traceroute`) — is apt-pinned in `.devcontainer/.env` and consumed as build args.

## Dependency pinning — MANDATORY

**Every dependency that feeds a build or ships to users is pinned to an exact version. No `^`, no `~`, no `>=`, no `*`, no `latest`, no floating tags.** A range means two people who run the same install on the same commit can get different bytes, and "it broke and nothing changed" becomes unanswerable. Three surfaces are exempt by policy — they are listed at the end of this section.

This is enforced, not aspirational: `pnpm verify:deps` (`scripts/verify-exact-deps.mjs`) fails CI on any loose specifier in any workspace `package.json`, including `pnpm.overrides` values.

When adding a dependency:

```bash
pnpm add -D <pkg>                  # pnpm writes a caret by default…
# …so replace the caret with the version it actually resolved, then:
pnpm install                       # refresh pnpm-lock.yaml
pnpm verify:deps                   # must pass before you commit
```

Where the rule applies today:

| Surface                              | Pinned by                                                  |
| ------------------------------------ | ---------------------------------------------------------- |
| workspace `package.json` deps        | exact versions + `pnpm verify:deps` gate                   |
| `pnpm.overrides`                     | exact versions (the key may be a range — it is a selector) |
| `npx` / `dlx` inside a script        | exact versions + `pnpm verify:deps` gate                   |
| toolchain (Node, Python, GraalVM, …) | `mise.toml` exact versions + `mise.lock` checksums         |
| `.nvmrc` / `scripts/.python-version` | exact, kept in lockstep with `mise.toml`                   |
| devcontainer OS packages             | apt version pins in `.devcontainer/Dockerfile`             |
| the gitleaks scanner image           | image digest (`@sha256:…`), not a tag                      |

`pnpm.overrides` sits in `package.json` because that is where pnpm 9 reads it. **pnpm 10 does not** — it reads `overrides` from `pnpm-workspace.yaml` and ignores the `package.json` block with nothing louder than a warning. Move the block in the same commit that bumps `packageManager` to 10. Doing it afterwards silently reopens every advisory the overrides suppress, and the only signal is a warning that looks like ordinary pnpm noise.

Three deliberate exemptions — these are policy, not oversights, so do not "fix" them:

- **`engines`** (`node`, `pnpm`) stays a range. It declares _compatibility_, not what gets installed — pinning it exactly would reject a contributor on 24.18.0 for no reason. The installed version is pinned by `mise.toml`.
- **GitHub Actions** are referenced by major tag (`actions/checkout@v4`). Nothing they produce ships to users, Dependabot keeps them current, and SHA pins make workflow diffs unreadable for the benefit. The one exception inside CI is the **gitleaks scanner image**, which _is_ digest-pinned — a job whose entire purpose is trusting what it runs should not run a mutable tag.
- **VS Code extensions** (`.vscode/extensions.json`, `.devcontainer/devcontainer.json`) carry no version at all — they are marketplace IDs, and the marketplace always installs latest. They are editor conveniences, not build inputs. What matters there is that the two lists agree, which `pnpm verify:vscode` enforces in CI.

`peerDependencies` are pinned exactly too, which is unusual — normally a peer range is what makes a package composable. It is correct here only because every `packages/*` is `private: true` and consumed solely via `workspace:*`, so exact peers enforce version lockstep across the monorepo. **If you ever publish one of these packages to npm, widen its peer ranges first.**

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
pnpm lint:md           # markdownlint-cli2 (config: .markdownlint-cli2.jsonc)
pnpm lint:md:fix
pnpm verify:vscode     # diffs .vscode/ vs .devcontainer/ extension lists
pnpm verify:deps       # fails on any non-exact dependency specifier
pnpm verify:mise       # fails if mise.lock drifts from .devcontainer/.env
pnpm bmad:init         # install BMAD non-interactively (--yes, preset modules)
pnpm bmad:init:interactive  # same installer, but prompts for tools and modules
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

## Secrets management

**Where secrets go:**

| File                     | Status     | Use for                                      |
| ------------------------ | ---------- | -------------------------------------------- |
| `.env.example`           | committed  | documenting required vars (NO actual values) |
| `.env.local`             | gitignored | **local secrets** (API keys, tokens)         |
| `.env.development.local` | gitignored | local-only `next dev` overrides              |
| `.env.production`        | gitignored | written by `amplify.yml` at build time       |
| Vercel/Amplify console   | external   | production + preview secrets                 |

`apps/web/.env.example` is the canonical list of required env vars for the web app. The `amplify.yml` build phase writes whichever of those vars are set in the Amplify environment to `apps/web/.env.production` at build time, so build-time env validation (zod, etc.) works.

**Never** put a secret behind a `NEXT_PUBLIC_*` prefix — those vars are inlined into the client bundle at build time and end up shipped to every browser.

**Pre-commit secret scan:** [secretlint](https://github.com/secretlint/secretlint) runs on every staged file via lint-staged. If you accidentally stage a credential (AWS key, GitHub token, Stripe key, npm token, Slack webhook, etc.), the commit is rejected. To bypass for a confirmed false positive, add a precise pattern to `.secretlintrc.json` `allows` field — do NOT use `--no-verify`.

## Deployment

The template is wired for both **Vercel** and **AWS Amplify Hosting**. Deployments are tied to _tracking branches_, not `main`:

| Branch         | Environment | Trigger                                           |
| -------------- | ----------- | ------------------------------------------------- |
| `main`         | none        | source of truth                                   |
| `deploy/dev`   | dev         | auto fast-forwarded after CI passes on `main`     |
| `deploy/stage` | stage       | manual via `Promote` GitHub Action (target=stage) |
| `deploy/prod`  | prod        | manual via `Promote` GitHub Action (target=prod)  |

`vercel.json` and `amplify.yml` are both committed, and both build from the **repo root** — pnpm's `workspace:*` resolution has to walk every workspace, so neither builds from `apps/web`.

Each platform still needs a one-time console setup that no committed file can perform, because these settings have no in-repo equivalent:

**Vercel** — Settings → Build & Deployment:

| Setting                          | Value                   |
| -------------------------------- | ----------------------- |
| Root Directory                   | _empty_ — the repo root |
| Framework Preset                 | Next.js                 |
| Production Branch (→ Git)        | `deploy/prod`           |
| Build / Install / Output Command | leave on **Auto**       |

Root Directory is the load-bearing one: Vercel resolves the paths **inside** `vercel.json` relative to it. Point it at `apps/web` and `outputDirectory` becomes `apps/web/apps/web/.next` — the build itself succeeds, then fails looking for output that was never going to be there.

Framework Preset needs setting by hand for the same reason: with Root Directory at the repo root there is no `package.json` with `next` beside it, so a fresh import autodetects **Other**. Leave the three commands on Auto — `vercel.json` owns them, and a console override duplicates them and drifts.

**Amplify** — connect the repo, set `AMPLIFY_MONOREPO_APP_ROOT=apps/web` as an env var, and map each tracking branch to its environment. `amplify.yml`'s `buildPath: '/'` already handles the root build.

On a fresh clone only `main` exists. `deploy/dev` appears after the first `main` build; `deploy/stage` and `deploy/prod` are created by their first `Promote` run. Vercel's Production Branch dropdown only lists branches that already exist, so bootstrap them before that step:

```bash
git push origin main:refs/heads/deploy/stage main:refs/heads/deploy/prod
```

## Security

- **CI** runs OWASP ZAP baseline DAST, Snyk dependency scan, `pnpm audit`, and CodeQL on every PR (see `.github/workflows/security.yml`). Those four are advisory.
- **gitleaks** scans the full commit history on every PR and **blocks the merge** on a finding. `secretlint` (via lint-staged) only sees the diff you are about to commit; gitleaks catches a secret introduced in an earlier commit on the branch.
- **Dependabot** opens PRs for npm, GitHub Actions, devcontainers, and pip updates daily.
- **GitHub Environments** gate `stage` and `prod` promotions behind required reviewers.
- **Every binary the dev container downloads is version-pinned and SHA256-verified** (`.devcontainer/Dockerfile`). A hash mismatch fails the build rather than silently installing different bytes. When bumping a version, refresh its hash in the same commit.

## Code intelligence (Gortex)

[Gortex](https://github.com/zzet/gortex) indexes this repo into a queryable graph and serves it to agents over MCP. It is baked into the dev container and indexed by `postCreateCommand`; the MCP server is registered in `.claude/settings.json`.

Prefer graph queries over blind file reads when locating code:

```bash
gortex explore "<task>"   # assemble the working set for a task
gortex query <...>        # query the graph directly
gortex status             # tracked repos, node/edge counts, index freshness
```

It runs entirely inside the container over a unix socket — no network port, no credential. Telemetry is hard-disabled in the image (`GORTEX_TELEMETRY=0`) and re-asserted at `postCreate`.

It **replaces** CodeGraphContext and GitNexus; neither should be reintroduced.

## File map (high-level)

```text
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
