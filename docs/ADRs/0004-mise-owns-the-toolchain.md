# ADR-0004: mise owns the toolchain, from one version manifest

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

Before this decision, tool versions were spread across the Dockerfile (`apt-get install`, `curl | sh` installers), `.nvmrc`, `scripts/.python-version`, and assorted CI workflow inputs. Four places, no single answer to "what version of Python does this project use", and no mechanism that made them agree.

The failure mode is not dramatic. It is a contributor whose local Node is a minor version off the container's, chasing a bug that only exists in that gap.

## Decision

**mise owns every language and CLI**, declared in `mise.toml`: Node, Python, GraalVM CE (with `native-image`), uv, the GitHub CLI, the AWS CLI, and the agent tooling.

**Every version literal lives in one file — [`.devcontainer/.env`](../../.devcontainer/.env).** There are no version numbers in `mise.toml`, the Dockerfile, or `docker-compose.yml`. That file has exactly two consumers:

1. **Docker Compose** auto-loads it, because it is named `.env` and sits beside `docker-compose.yml`, and passes each entry to the Dockerfile's build args. This is the reason the container is built through Compose rather than a plain `build:` block — see [ADR-0005](0005-devcontainer-compose-and-phase-runner.md).
2. **mise** loads it via `[env] _.file` and templates every `[tools]` entry from it with `{{ env.X }}`.

**`mise.lock` is committed.** It pins each tool to an exact release-asset URL and SHA256 **per platform**, and records SLSA provenance where the publisher signs it.

Three things stay outside mise, all still pinned in `.devcontainer/.env`:

- **pnpm** — already pinned by `packageManager` + Corepack. A second pin would be a second source of truth, which is the problem this ADR exists to remove.
- **docker-in-docker** — a daemon and a privileged container, not a versioned binary. It is a devcontainer feature, pinned in `devcontainer-lock.json`.
- **the Claude Code CLI** — mise's npm backend installs with `--ignore-scripts`, so the package's postinstall never runs and its platform-native binary is never fetched. `claude` then fails at runtime with "claude native binary not installed". It is `npm install -g`'d in the Dockerfile instead.

## Consequences

One file to edit for a version bump, and one command to re-lock:

```bash
mise lock -p linux-x64,linux-arm64,macos-arm64,macos-x64
```

**`mise.lock` must never be deleted.** mise only maintains a lockfile that already exists. Without it, builds silently downgrade to "resolve whatever is latest" — no error, no warning, just a different toolchain than the one that was reviewed.

**Bumping a version without re-locking is fail-open**, which is why it is gated rather than trusted to discipline. The bumped version takes effect immediately; the orphaned lock entry means that tool's next install has no reviewed checksum and mise records whatever it downloads. `pnpm verify:mise` fails the PR when `.devcontainer/.env` and `mise.lock` disagree.

Locking for four platforms means the lockfile is large and its diffs are noisy on every bump. Accepted: the alternative is a contributor on a different architecture silently getting unverified bytes.

Cross-tool version references (`.nvmrc`, `scripts/.python-version`) still exist for tools that read them directly, and are kept in lockstep by hand. They are duplication, and the reason they survive is that Node and Python tooling outside mise reads them.
