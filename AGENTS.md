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
| Package manager | pnpm 11.20.0 (Corepack — auto-installed)                       |
| JVM             | GraalVM CE 21 incl. `native-image`; Kotlin 2.4 + Gradle 9      |
| Rust            | 1.97 via rustup — the one tool `mise.lock` cannot checksum     |
| Monorepo        | Turborepo                                                      |
| Framework       | Next.js 16 (App Router, RSC)                                   |
| UI runtime      | React 19                                                       |
| Styling         | Tailwind CSS v4                                                |
| Components      | shadcn/ui (new-york style, RSC)                                |
| Language        | TypeScript 5.6+ (strict, `noUncheckedIndexedAccess`)           |
| Linting         | ESLint 9 flat config                                           |
| Formatting      | Prettier 3                                                     |
| Git hooks       | lefthook + commitlint (conventional commits)                   |
| Tests           | Vitest (`apps/web` only — see Testing)                         |
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

**`rust` is the one exception**, and it is exempt by name rather than by accident. mise's `core:rust` backend delegates to rustup, which resolves and downloads toolchains itself, so mise never sees an asset URL and `mise lock` writes a version-only entry (the `asdf:code-lever/asdf-rust` backend behaves identically). Integrity there is rustup's — signed channel manifests over TLS — not this lockfile's. `NO_PLATFORM_CHECKSUMS` in `scripts/verify-mise-lock.mjs` carries the reasoning, the version half of the gate still applies to it, and `pnpm verify:mise` prints the exemption on every run so the coverage gap cannot go quiet. Adding a name to that set is a supply-chain decision, not a formality.

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

**Every dependency that feeds a build or ships to users is pinned to an exact version. No `^`, no `~`, no `>=`, no `*`, no `latest`, no floating tags.** A range means two people who run the same install on the same commit can get different bytes, and "it broke and nothing changed" becomes unanswerable. Two surfaces are exempt by policy — they are listed at the end of this section.

This is enforced, not aspirational: `pnpm verify:deps` (`scripts/verify-exact-deps.mjs`) fails CI on any loose specifier in any workspace `package.json` — including the `overrides` values in `pnpm-workspace.yaml` and the `npx` invocations in `.mcp.json` — on any `uses:` ref in `.github/workflows/` that is not a 40-character commit SHA, and on any `image:` in a Compose file that is not digest-pinned.

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
| `overrides` (`pnpm-workspace.yaml`)  | exact versions (the key may be a range — it is a selector) |
| `npx` / `dlx` inside a script        | exact versions + `pnpm verify:deps` gate                   |
| MCP servers in `.mcp.json`           | exact versions + `pnpm verify:deps` gate                   |
| toolchain (Node, Python, GraalVM, …) | `mise.toml` exact versions + `mise.lock` checksums         |
| `.nvmrc` / `scripts/.python-version` | exact, kept in lockstep with `mise.toml`                   |
| devcontainer OS packages             | apt version pins in `.devcontainer/Dockerfile`             |
| GitHub Actions `uses:` refs          | 40-char commit SHA + `pnpm verify:deps` gate               |
| the gitleaks scanner image           | image digest (`@sha256:…`), not a tag                      |
| Compose service images (sidecars)    | image digest + `pnpm verify:deps` gate — see below         |

### Sidecar images

**A sidecar is a dependency.** The services in `.devcontainer/docker-compose.yml` — today Postgres
and Adminer (see [Database](#database)) plus Homepage (see [Dev dashboard](#dev-dashboard)) — are
pinned by **digest**, never by tag. A tag is
mutable: `postgres:16` is a different filesystem this week than last, and the whole point of this
section is that two people on the same commit get the same bytes. `:latest` is the same failure with
the volume turned up.

Two forms pass the gate, and the second is the house style:

```yaml
services:
  db:
    image: postgres@sha256:<64 hex> # pinned inline
  cache:
    image: redis@${REDIS_IMAGE_DIGEST} # pinned in .devcontainer/.env
```

Prefer the variable form. Compose already auto-loads `.devcontainer/.env`, so the digest lands beside
every other pin in the one manifest a reviewer reads, and Renovate can reach it there — an inline
digest in a YAML file is a second place versions live.

Resolve a digest with `docker buildx imagetools inspect <image>:<tag>` and keep the tag as a trailing
comment, exactly as workflow `uses:` refs do, so the automation can bump it later.

> The gate reports counts rather than a bare "passed" — currently `3 container image(s) across 1 compose file(s)`. That is deliberate. A gate over an empty set passes for the same reason a working one does, and the count is the only thing that tells those two states apart. It earned its keep before there was anything to check: the first version globbed `**/docker-compose*.yml`, which Node's `globSync` never descends into `.devcontainer/` for, and the printed `0 compose file(s)` is what exposed it.

**Every pnpm setting lives in `pnpm-workspace.yaml`.** As of pnpm 11 the `pnpm` field in `package.json` is not read at all, and `.npmrc` is restricted to auth and registry credentials. The two failure modes are not equal, and the difference matters: a leftover `pnpm` field in `package.json` produces a warning naming the ignored keys, but a setting left in `.npmrc` is dropped in **complete silence** — `node-linker=isolated` there changes nothing and says nothing. That silent case is the dangerous one, because `.npmrc` is where `nodeLinker: hoisted` used to live and that setting is load-bearing for AWS Amplify SSR deploys. `.npmrc` is therefore kept as an empty file whose only content is a comment saying where settings go.

**Dependency install scripts are denied by default.** pnpm blocks lifecycle scripts for dependencies, and `strictDepBuilds` defaults to on, so an unreviewed one _fails_ the install rather than warning. Grants live in `allowBuilds` in `pnpm-workspace.yaml`, and each grant hands that package arbitrary code execution at install time — check whether it genuinely needs the script before adding one. Exactly one of 591 packages currently asks, and it is denied: lefthook's postinstall only re-runs `lefthook install`, which the root `prepare` script already does, and its binary comes from a per-platform `optionalDependency` rather than that script.

**`npm install` and `yarn install` are blocked** by a root `preinstall` guard that checks `npm_config_user_agent`. Corepack can shim `npm` to do this, but only when Corepack owns the shim — under a `mise`-managed Node it does not, so the guard is in `package.json` where it holds regardless of how Node was installed.

**GitHub Actions used to be exempt from this rule, referenced by major tag. They are not anymore.** The old reasoning was that nothing an action produces ships to users. That was the wrong question: every action in these workflows executes arbitrary third-party code inside a checkout of this repo, holding a token. `@v4` is a tag, and a tag is a pointer the owner can move at any time — which is precisely the ref shape the `tj-actions/changed-files` compromise targeted, repointing tags at a malicious commit that dumped runner secrets into build logs. A 40-hex commit SHA is the only ref GitHub cannot repoint.

The stated cost was unreadable diffs, and that part was real — so every pin keeps its version as a trailing comment (`@3d3c42e… # v7.0.1`). Renovate reads that comment: bumps still arrive as PRs and still say which version you are moving to. The gitleaks scanner image was already digest-pinned on this reasoning; it is now the rule rather than the exception.

Two deliberate exemptions — these are policy, not oversights, so do not "fix" them:

- **`engines`** (`node`, `pnpm`) stays a range. It declares _compatibility_, not what gets installed — pinning it exactly would reject a contributor on 24.18.0 for no reason. The installed version is pinned by `mise.toml`.
- **VS Code extensions** (`.vscode/extensions.json`, `.devcontainer/devcontainer.json`) carry no version at all — they are marketplace IDs, and the marketplace always installs latest. They are editor conveniences, not build inputs. What matters there is that the two lists agree, which `pnpm verify:vscode` enforces in CI.

`peerDependencies` are pinned exactly too, which is unusual — normally a peer range is what makes a package composable. It is correct here only because every `packages/*` is `private: true` and consumed solely via `workspace:*`, so exact peers enforce version lockstep across the monorepo. **If you ever publish one of these packages to npm, widen its peer ranges first.**

## Dev dashboard

**<http://localhost:8081> lists everything this container runs.** One page of tiles — every forwarded port, with a live up/down dot for the HTTP ones. It is a sidecar ([Homepage](https://gethomepage.dev)), not an editor extension, so it works in Codespaces, in a plain browser, and for anyone not using VS Code.

**Tiles are generated from `forwardPorts` + `portsAttributes` in `.devcontainer/devcontainer.json`** — not from `package.json`. That is the point: this container runs Node, JVM (Quarkus), Rust and Python apps, and `forwardPorts` is the one place all of them declare a port in the same syntax. A Quarkus dev server gets a tile by being forwarded and labelled, with nothing Node-specific involved.

To add a service to the dashboard:

```jsonc
// .devcontainer/devcontainer.json
// A bare number is a port in the WORKSPACE container. A sidecar must be
// written "service:port" — see the warning below.
"forwardPorts": [3000, "db:5432", "adminer:8080", "homepage:8081", 9000],
"portsAttributes": {
  "9000": { "label": "Quarkus dev", "protocol": "http" }
}
```

```bash
pnpm dashboard:sync   # regenerate; commit the result
```

**A sidecar written as a bare port number is silently unreachable.** In a Compose devcontainer a bare number always means a port in the _primary_ container, so `8080` forwards from `app` — where nothing listens — while Adminer sits perfectly healthy in its own container answering on `adminer:8080`. Nothing errors. The forward is created, the container is healthy, `docker compose ps` is clean, and every check reachable from inside the workspace passes; only your browser gets nothing. This template shipped that bug, and it is the reason the generator now cross-checks each entry against `docker-compose.yml`.

**Host and container port must be the same number for a sidecar**, which is why Homepage runs on `PORT: 8081` internally rather than its default 3000. Two independent routes reach these services — Docker's published port and VS Code's devcontainer forward — and they only agree on one URL if the two halves match. They also collide: Homepage's default 3000 is the Next.js dev port, so `homepage:3000` and the dev server would contend for one local port. The generator fails on a mismatch rather than emitting a tile that works via one route and not the other.

- **`label` is required.** A forwarded port without one fails the generator rather than becoming an anonymous tile.
- **`portsAttributes` keys must match the `forwardPorts` entry exactly**, `service:` prefix included. `"8080"` and `"adminer:8080"` are different keys, and a mismatch loses the label rather than warning.
- **`protocol: "http"` makes a tile clickable and monitored.** Omit it for non-HTTP services — a browser link to Postgres is noise, so it renders as an informational tile instead.
- **Only standard devcontainer.json fields are used.** Custom keys would work at runtime but leave a permanent schema warning in that file, so the generator cross-checks against `docker-compose.yml` instead.
- **`pnpm verify:dashboard` gates drift**, as a step in the required `Lint + Typecheck + Build + Test` job. The generated `services.yaml` is committed, so it can go stale the moment someone forwards a port without regenerating — and a stale dashboard is worse than none, because it is confidently wrong about where a service lives. `bookmarks.yaml` is excluded: it is generated from the `origin` remote and differs per fork by design, so gating it would fail CI for everyone who forks this template.
- **Anything that is not a forwarded port** goes in `.devcontainer/homepage/services.extra.yaml`, appended verbatim and never clobbered by a regeneration.

**Homepage's host validation is turned off (`HOMEPAGE_ALLOWED_HOSTS: '*'`), and that is deliberate.** It refuses any request whose `Host` it does not recognise, rendering `Error: Host validation failed` instead of the dashboard. An explicit list cannot be written here, because the host you reach it on is not knowable when the file is committed: `localhost:8081` locally, a generated `<name>-8081.app.github.dev` in Codespaces, and whatever port VS Code falls back to if Docker already holds 8081. The protection targets internet-exposed instances; this one is published on `127.0.0.1` only and, in Codespaces, sits behind that platform's auth. Changing it requires the container to be **recreated, not restarted** — a restart keeps the old environment, so the error does not change and the fix looks like it failed.

Two more details that look like bugs if you meet them cold. Each tile carries **two different hosts**: `href` is opened by _your browser_, outside the container network, so it is `localhost:<port>`; `siteMonitor` is fetched by the _Homepage container_, inside that network, where `localhost` means Homepage itself — so it must use the Compose service name. Get them the wrong way round and the tile either never opens or sits permanently grey. And the config volume is **not** mounted read-only: Homepage writes a `logs/` directory and a `kubernetes.yaml` into its own config dir on boot, and mounted `:ro` it crash-loops on `ENOENT: mkdir '/app/config/logs'` while still answering HTTP — so it looks up and renders nothing. Both artefacts are gitignored.

**Why this and not a drag-and-drop dashboard** (Homarr, Dashy): the board is committed YAML, so it ships with the template, arrives populated in a fork, and shows up in the diff of the PR that changed it. A board stored in a container database is none of those and starts empty for everyone who clones. Homarr is the better choice if you want each developer arranging their own layout — that is its native model, and YAML would fight you.

## Database

**Postgres runs as a sidecar and is already up when your terminal opens.** Nothing to start by hand; the `app` container waits on its healthcheck, so the first query of a session cannot race first-boot `initdb`.

| Thing                         | Value                                                     |
| ----------------------------- | --------------------------------------------------------- |
| Host **inside** the container | `db` (the Compose service name)                           |
| Host **from your machine**    | `localhost:5432` (bound to loopback only)                 |
| User / password               | `postgres` / `postgres` — local only, not a secret        |
| Database name                 | `postgres`                                                |
| Connection string             | `postgresql://postgres:postgres@db:5432/postgres`         |
| Web UI                        | <http://localhost:8080> (Adminer, also a sidecar)         |
| Data                          | Named volume `pgdata`; wipe with `docker compose down -v` |

**Postgres major 17 tracks Supabase**, which is this template's recommended hosted path — their self-hosted default moved 15 → 17 in June 2026. Matching majors means the same SQL, extensions and dump/restore behaviour in both places. Bump it **by hand**, together with whatever Supabase runs: a Postgres major upgrade is a data migration, not a version bump, which is why that pin carries no Renovate annotation.

**The database is named `postgres` on purpose.** A Supabase connection string ends in `/postgres`, so keeping the name locally means local and hosted differ only in host and password — same migrations, same dumps, same `DATABASE_URL` shape, no rename step. Do not rename it per environment; the environment is distinguished by the host, not by the database name.

**Adminer is a container, not an editor extension**, so it works identically in Codespaces, in a browser, and for anyone not using VS Code, and carries no licence tier. Verified driver list for the pinned image, read off its own login page: **MySQL/MariaDB, PostgreSQL, SQLite, MS SQL, Oracle (beta)**. Elasticsearch, MongoDB and Redis are **plugins**, not built in — they mount into `/var/www/html/plugins-enabled` and are a real step to add. No free tool currently covers Postgres + Elasticsearch + Redis in one UI; `dbgate/dbgate` (GPL-3) is the alternative if Redis and MongoDB matter more than Elasticsearch.

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
- **ESLint** auto-fixes on save (VS Code) and on staged files (lefthook pre-commit).
- **Prettier** formats on save and on staged files.
- **Git hooks** live in [`lefthook.yml`](lefthook.yml) — one file for both the hook definitions and the checks they run. `pnpm install` installs them via the `prepare` script. Jobs there run sequentially on purpose; see the comment at the top of the file before adding `parallel: true`.
- **Commits** must follow conventional-commit format (`feat(scope):`, `fix(scope):`, `chore:`, `docs:`, `ci:`, `build:`). Enforced by commitlint on `commit-msg`.
- **VS Code extensions** are kept in lockstep between `.vscode/extensions.json` (recommendations) and `.devcontainer/devcontainer.json` (auto-installed in Codespaces). `pnpm verify:vscode` enforces this in CI. The prompts a fresh clone sees on first launch — and which of them silently degrade the toolchain if dismissed — are in [`docs/vscode-setup.md`](docs/vscode-setup.md).

## Testing

Vitest runs in `apps/web` only — today it is the only workspace with code. `pnpm test` (→ `turbo run test`) is part of the required `Lint + Typecheck + Build + Test` check.

- Tests sit **beside** what they cover: `lib/utils.ts` → `lib/utils.test.ts`, `components/ui/button.tsx` → `components/ui/button.test.tsx`. No separate `__tests__/` tree.
- Import `describe` / `it` / `expect` from `vitest` explicitly. `globals` stays **false** — it keeps a test file's dependencies visible and ESLint's `no-undef` honest.
- **Component tests run in jsdom** via [`apps/web/vitest.config.ts`](apps/web/vitest.config.ts), with `@testing-library/react` and the `jest-dom` matchers. Three things in that config are load-bearing and each fails as something other than what it is — read its comments before changing it:
  - `oxc: { jsx: { runtime: 'automatic' } }` — the shared tsconfig sets `jsx: "preserve"` for Next, so without this the transformer emits JSX verbatim and tests die with "invalid JS syntax" pointing at the component's first tag. It is `oxc`, not `esbuild` (Vitest 4 switched); the `esbuild` key is not an error, it warns and is ignored. Use the object form — the bare string `'automatic'` runs but fails `tsc --noEmit`.
  - `resolve.alias` for `@/*` — Vite does not read tsconfig `paths`, so every `@/lib/utils` import inside a component fails to resolve. It is a second home for that mapping; change both together.
  - [`vitest.setup.ts`](apps/web/vitest.setup.ts) calls `cleanup()` in `afterEach` by hand, because Testing Library only self-registers that when `globals` is true. Without it, renders accumulate in one `document.body` and `getByRole` starts throwing "found multiple elements" in whichever test runs second.
- Assert **behaviour that can break**, not the implementation restated. The existing tests each guard a named failure mode in a comment — `asChild` silently ceasing to render links, a dropped `ref` mispositioning every Radix overlay, a caller's `className` losing to a variant class. A test that cannot fail is worse than no test, because it reports coverage it does not provide.
- To add a runner to another workspace: add `vitest` (exact-pinned, per the section above) and a `"test": "vitest run"` script. `turbo.json` already declares the task — nothing changes there. A workspace rendering components also needs the jsdom setup above; one that does not can stay zero-config.

**`turbo run test` exits 0 when no workspace defines a `test` script.** It prints `Tasks: 0 successful, 0 total` and the required check goes green having run nothing. That is how this repo shipped a `Test` gate that had never executed a test. If you delete the last `test` script, the gate does not turn red — it goes quiet.

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

**Pre-commit secret scan:** [gitleaks](https://github.com/gitleaks/gitleaks) runs via lefthook as `mise exec -- gitleaks git --staged` — through mise, because a git hook inherits whatever shell ran `git commit` and a bare `gitleaks` there is either missing or somebody else's version. No glob and no file list — `--staged` reads the git index directly, so every staged file is covered including types no formatter touches (`.env`, `.pem`, a test fixture). If you stage a GitHub token, AWS key, Stripe key, npm token, or Slack webhook, the commit is rejected.

It is the **same binary CI runs**, on the same default ruleset — there is no `.gitleaks.toml`. That is the point: the version pin in `.devcontainer/.env` and the image tag in `.github/workflows/security.yml` must move together, or "it passed locally" stops meaning anything about CI. (This used to be secretlint locally and gitleaks in CI, which made the innermost gate the weakest — secretlint's preset does not flag `AKIA…` AWS keys. See [ADR-0018](docs/ADRs/0018-one-secret-scanner-three-positions.md).)

To bypass for a confirmed false positive, add the fingerprint to `.gitleaksignore` or a `gitleaks:allow` comment on the line — do NOT use `--no-verify`, which disables commitlint and the formatters too.

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

- **CI** runs OWASP ZAP baseline DAST, `pnpm audit`, and CodeQL on every PR (see `.github/workflows/security.yml`). CodeQL also runs on every push to `main`, and is the only one that does — code scanning diffs a PR's alerts against the default branch's analysis, so that run is the baseline. The other three would only repeat on the merge commit what they already reported on the PR, so they carry `if: github.event_name != 'push'`. Those three are advisory — they report findings to the run summary and never fail the build, because a freshly-published advisory with no patch available should not block every PR in a template other people clone. `gitleaks` is the one blocking security job: a committed secret is already leaked and cannot be un-leaked by merging more slowly. (A Snyk step used to run here. It referenced `snyk/actions/node@master` — a moving branch, not even a tag — needed a `SNYK_TOKEN` this repo does not set, and was `continue-on-error`, so it was third-party code with repo access producing nothing. It was removed rather than pinned.)
- **gitleaks** runs at three positions, all the same scanner: the pre-commit hook (staged index), GitHub push protection (server-side, on push), and CI (full commit history, **blocks the merge**). Each outer layer is strictly broader than the one inside it, so passing the hook says nothing about earlier commits on the branch — only the CI run is a statement about the branch. See [ADR-0018](docs/ADRs/0018-one-secret-scanner-three-positions.md).
- **Renovate** opens grouped update PRs weekly — npm, GitHub Actions, pip, and the version pins in `.devcontainer/.env` — and regenerates `mise.lock` inside the PR branch so a toolchain bump arrives as one reviewable commit. It is self-hosted from `.github/workflows/renovate.yml` and **does nothing until a `RENOVATE_TOKEN` secret exists**; see [`docs/repository-setup.md`](docs/repository-setup.md) and [ADR-0019](docs/ADRs/0019-renovate-for-updates.md). A pin it does not own is visibly un-owned: every tracked key in `.devcontainer/.env` carries a `# renovate:` annotation, and the ones without carry the reason why (apt, GraalVM, the devcontainer feature).
- **Dependabot alerts** (repo → Security) stay on and remain the authoritative vulnerability watcher — `pnpm audit` in CI reports the same database but does not gate. Renovate does update `overrides` in `pnpm-workspace.yaml`, which Dependabot could not, but **an override still needs its selector bumped along with its target**: the key is a range, so raising only the value leaves a selector that matches nothing and an override that enforces nothing. Not every rot raises an alert either — one of the four found in August 2026 was visible only to `pnpm audit` run by hand.
- **GitHub Environments** gate `stage` and `prod` promotions behind required reviewers. They, branch protection, push protection, and the Renovate token are repository settings rather than files — all of them are written down in [`docs/repository-setup.md`](docs/repository-setup.md).
- **Every binary the dev container downloads is version-pinned and integrity-checked** — but not by hand, and not in the Dockerfile. `mise.lock` pins each tool to an exact release asset URL + SHA256 for every platform, and verifies SLSA provenance where the publisher signs it; the Dockerfile deliberately carries no `curl`/`tar`/`sha256sum` blocks, because hand-maintained per-arch hashes are what drift. A mismatch fails the install rather than silently fetching different bytes. **To bump:** edit `.devcontainer/.env`, run `mise lock -p linux-x64,linux-arm64,macos-arm64,macos-x64`, and commit both files together — CI fails the PR if `mise.lock` is out of sync with the declared versions.

## Code intelligence (Gortex)

[Gortex](https://github.com/zzet/gortex) indexes this repo into a queryable graph and serves it to agents over MCP. It is baked into the dev container and indexed by `postCreateCommand`; the MCP server is registered in `.mcp.json`.

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
.mcp.json                MCP servers (project scope, shared)
.claude/                 Claude Code settings (permissions, MCP approvals)
.vscode/                 Workspace settings + recommended extensions
docs/superpowers/        Design specs and implementation plans
```

## When extending the template (post-BMAD-init)

1. **Adding a DB:** the `supabase` MCP is defined in `.mcp.json` and rejected by `disabledMcpjsonServers` in `.claude/settings.json` — drop it from that list and set `SUPABASE_ACCESS_TOKEN` / `SUPABASE_PROJECT_REF`. Add migrations apply steps in `deploy-dev.yml` / `promote.yml` (placeholders are already commented in).
2. **Adding another app:** create `apps/<name>/` matching the `apps/web/` shape. Add an `appRoot:` block to `amplify.yml` (the existing block has comments showing the multi-app pattern).
3. **Adding shared code:** extract into `packages/<name>/` with its own `package.json` (`workspace:*`), an `eslint.config.mjs` extending the shared config, and a `tsconfig.json` extending the shared config.
