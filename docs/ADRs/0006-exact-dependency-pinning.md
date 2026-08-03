# ADR-0006: Pin every dependency exactly, and enforce it

- **Status:** Accepted
- **Date:** 2026-08-03
- **Amended by:** [ADR-0007](0007-pin-github-actions-by-commit-sha.md) — removes the GitHub Actions exemption

## Context

A range specifier means two people who run the same install on the same commit can get different bytes. When something breaks, "nothing changed" is both true and useless — the commit is identical and the dependency tree is not.

Lockfiles solve this for the install that reads them, and stop solving it at every boundary a lockfile does not cover: a `dlx` call in a script, a Docker base image tag, an action referenced by major version, a toolchain installed by a `curl | sh` that resolves latest.

Convention alone does not hold this. `pnpm add` writes a caret by default, so the loose specifier is what you get unless you actively fix it every time.

## Decision

**Every dependency that feeds a build or ships to users is pinned exactly.** No `^`, no `~`, no `>=`, no `*`, no `latest`, no floating tags.

Enforced by `pnpm verify:deps` ([`scripts/verify-exact-deps.mjs`](../../scripts/verify-exact-deps.mjs)), which fails CI on any loose specifier in any workspace `package.json`, in the `overrides` values in `pnpm-workspace.yaml`, and in `npx`/`dlx` invocations — inside package scripts or inside an MCP server definition in `.mcp.json`.

| Surface                              | Pinned by                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| workspace `package.json` deps        | exact versions + `pnpm verify:deps`                                               |
| `overrides` in `pnpm-workspace.yaml` | exact versions (the _key_ may be a range — it is a selector)                      |
| `npx` / `dlx` inside a script        | exact versions + `pnpm verify:deps`                                               |
| MCP servers in `.mcp.json`           | exact versions + `pnpm verify:deps`                                               |
| toolchain                            | `mise.toml` + `mise.lock` checksums ([ADR-0004](0004-mise-owns-the-toolchain.md)) |
| devcontainer OS packages             | apt version pins in `.devcontainer/Dockerfile`                                    |
| GitHub Actions `uses:` refs          | 40-char commit SHA ([ADR-0007](0007-pin-github-actions-by-commit-sha.md))         |
| the gitleaks scanner image           | image digest (`@sha256:…`), not a tag                                             |

### Two deliberate exemptions

These are policy. Do not "fix" them.

- **`engines`** (`node`, `pnpm`) stays a range. It declares _compatibility_, not what gets installed. Pinning it exactly rejects a contributor on 24.18.0 for no reason; the installed version is pinned by `mise.toml`.
- **VS Code extensions** carry no version at all — they are marketplace IDs and the marketplace always installs latest. They are editor conveniences, not build inputs. What matters is that `.vscode/extensions.json` and `.devcontainer/devcontainer.json` agree, which `pnpm verify:vscode` enforces.

## Consequences

Adding a dependency takes an extra step, permanently:

```bash
pnpm add -D <pkg>     # writes a caret…
# …replace it with the version that actually resolved
pnpm install
pnpm verify:deps
```

**`peerDependencies` are pinned exactly, which is normally wrong.** A peer range is what makes a package composable. It is correct here only because every `packages/*` is `private: true` and consumed solely via `workspace:*` ([ADR-0002](0002-turborepo-pnpm-workspaces.md)), so exact peers enforce version lockstep across the monorepo instead of blocking consumers. **Publishing any of these packages to npm requires widening its peer ranges first.**

Upgrades become explicit and frequent rather than implicit and invisible. Dependabot carries that load ([ADR-0017](0017-dependabot-for-updates.md)).

**Two pinned surfaces have no such carrier: `.mcp.json` and `mise.toml`.** Dependabot reads dependency manifests, and neither file is one — so their pins are exact and will go stale in silence, with nothing opening a PR. That is still the right trade, because the alternative is not "fresh" but "unreviewed": `npx pkg@latest` in an MCP server hands whatever was published minutes ago the developer's environment and credentials, with no diff anywhere in between. Staleness is visible when you look; a floating tag is invisible even when you do. Bump these by hand, and treat that as the recurring cost of the pin rather than a defect in it.

The gate is only as good as its coverage, and coverage has silently regressed at least once — the `overrides` check stopped firing during the pnpm 11 migration because the settings moved file ([ADR-0008](0008-pnpm-settings-in-workspace-yaml.md)). **A verification script that reads a path is a dependency on that path.** When config moves, check the gate still sees it.
