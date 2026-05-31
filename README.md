# my-startup-template

Opinionated **Turborepo + Next.js 16 + Tailwind v4 + shadcn/ui** template for fullstack startups driven by [BMAD](https://github.com/bmad-code-org/BMAD-METHOD) (Breakthrough Method of Agile AI-Driven Development). Ships pre-configured toolchain, CI/CD, security scanning, and Claude Code MCP wiring — **no product code**. BMAD shapes the rest.

> **You're reading the template's intro.** Once your project is up and running (steps below), **delete this content and replace it with your own project's README**. The operational reference (commands, conventions, deployment) lives in [`AGENTS.md`](./AGENTS.md) and doesn't need duplication here.

---

## Quickstart (5 steps, ~5 minutes)

### 1. Create your repo from this template

On GitHub, click **"Use this template" → "Create a new repository"**. (Don't fork — "Use this template" gives you a clean history without the template's commits.)

### 2. Open in GitHub Codespaces

In your new repo on GitHub: **Code → Codespaces → Create codespace on main**.

The devcontainer auto-installs Node 22, pnpm (via Corepack), Python 3.13, UV, and all 14 recommended VS Code extensions (ESLint, Prettier, Tailwind, Ruff, Claude Code, Copilot, ...). First boot takes ~3 minutes.

> Prefer local? Run `corepack enable && pnpm install` after cloning. Make sure you're on Node 22 (`.nvmrc` is included for nvm/fnm/Volta).

### 3. Rename the project

```bash
pnpm rename:project
```

This interactive script prompts for your new project name (e.g. `acme-app`), validates it (npm package-naming rules), and rewrites every `my-startup-template` and `@my-startup-template/*` reference across `package.json` files, configs, devcontainer, AGENTS.md, and this README. It then re-runs `pnpm install` to refresh the lockfile.

Commit the result:

```bash
git add -A
git commit -m "chore: rename project to <your-name>"
```

### 4. Initialize BMAD

```bash
pnpm bmad:init
```

This runs BMAD's [headless install](https://docs.bmad-method.org/how-to/install-bmad/#headless-ci-installs) with the template's chosen defaults:

- **IDE:** Claude Code (writes agents into `.claude/agents/`)
- **Modules:** `bmm` (BMad Method — PM/Architect/Dev/QA/SM agents), `bmb` (BMad Builder), `cis` (Creative Intelligence Suite), `tea` (Test Architect)
- **Output:** `docs/bmad-output/` (PRDs, architecture docs, stories — alongside `docs/superpowers/`)

Want a different IDE or module set? Run `pnpm bmad:init:interactive` instead.

If GitHub rate-limits the install: `GITHUB_TOKEN=ghp_xxx pnpm bmad:init`.

### 5. Start with `/bmad-help`

Open the AI chat panel in your IDE (Claude Code in the bottom panel, or GitHub Copilot Chat in the sidebar) and type:

```
/bmad-help
```

> If `/bmad-help` isn't recognized, try `@bmad-orchestrator what should I do first?` — BMAD's PM agent will walk you through the **brainstorm → PRD → architecture → dev → deploy** flow from scratch.

That's it. Your stack is ready. BMAD takes over from here.

---

## After you've shipped something

Once your product takes shape:

1. **Replace this README** with your project's actual README (description, usage, screenshots, etc.). Keep [`AGENTS.md`](./AGENTS.md) — that's the operational reference for both you and your AI agents.
2. **Drop the rename script** if you don't need it anymore: `rm scripts/rename-template.mjs` and remove the `rename:project` entry from `package.json` scripts.
3. **Customize the LICENSE** — currently MIT with `Bryan Hughes` as copyright holder; change to your own.

---

## What's in the box

| Layer           | Choice                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| Runtime         | Node 22 LTS                                                                                                  |
| Package manager | pnpm 9.15.0 (Corepack)                                                                                       |
| Monorepo        | Turborepo                                                                                                    |
| Web app         | Next.js 16 + React 19 + Tailwind v4 + shadcn/ui (new-york)                                                   |
| Language        | TypeScript 5.6+ strict                                                                                       |
| Linting/format  | ESLint 9 flat config + Prettier 3                                                                            |
| Git hooks       | husky + lint-staged + commitlint (conventional commits)                                                      |
| Python          | 3.13 + UV (in `scripts/`)                                                                                    |
| CI              | Lint, typecheck, build, test, format, OWASP ZAP, Snyk, CodeQL                                                |
| Deploy          | Vercel + AWS Amplify (both wired, both watching `deploy/dev\|stage\|prod` tracking branches)                 |
| Agents          | Claude Code (`.claude/`), GitHub Copilot (`.github/`), Gemini (`GEMINI.md`) — all redirecting to `AGENTS.md` |

Full layout, commands, conventions, deployment: see [`AGENTS.md`](./AGENTS.md).

---

## License

[MIT](./LICENSE) — replace with your own.
