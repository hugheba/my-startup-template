# ADR-0008: All pnpm settings live in `pnpm-workspace.yaml`

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

pnpm settings historically had three homes: the `pnpm` field in `package.json`, `.npmrc`, and `pnpm-workspace.yaml`. pnpm 11 collapsed this — the `package.json` field is no longer read at all, and `.npmrc` is restricted to auth and registry credentials.

**The two failure modes are not equal, and the difference is what drove this decision.** A leftover `pnpm` field in `package.json` produces a warning naming the ignored keys. A setting left in `.npmrc` is dropped in **complete silence**: `node-linker=isolated` there changes nothing and says nothing.

That silent case is the dangerous one, because `.npmrc` is where `nodeLinker: hoisted` used to live, and that setting is load-bearing — AWS Amplify's SSR bundling cannot resolve `next` without it. Silently losing it produces a green CI run and a broken production deploy.

## Decision

**Every pnpm setting lives in `pnpm-workspace.yaml`**: `nodeLinker`, `overrides`, `allowBuilds`, `strictDepBuilds`, all of it.

**`.npmrc` is kept as an empty file whose only content is a comment saying where settings go.** Deleting it would be tidier; keeping it is what stops the next person from creating one and losing a setting to the silent path.

Two related settings, decided at the same time:

**Dependency install scripts are denied by default.** pnpm blocks lifecycle scripts for dependencies, and `strictDepBuilds` is on, so an unreviewed one **fails** the install rather than warning. Grants live in `allowBuilds`, and each grant hands that package arbitrary code execution at install time. Exactly one of 591 packages currently asks, and it is denied: lefthook's postinstall only re-runs `lefthook install`, which the root `prepare` script already does, and its binary arrives via a per-platform `optionalDependency` rather than that script.

**`npm install` and `yarn install` are blocked** by a root `preinstall` guard that checks `npm_config_user_agent`. Corepack can shim `npm` to do this, but only when Corepack owns the shim — under a mise-managed Node it does not, so the guard lives in `package.json` where it holds regardless of how Node was installed.

## Consequences

One file to read to know how installs behave.

`nodeLinker: hoisted` is a deliberate retreat from pnpm's strict layout ([ADR-0002](0002-turborepo-pnpm-workspaces.md)) and gives up the guarantee that a workspace cannot import an undeclared package. It is there for Amplify SSR and nothing else. **Do not remove it as cleanup** — the CI signal is green and the failure is at deploy time.

Deny-by-default on install scripts will eventually block a legitimate dependency, and the fix is a one-line `allowBuilds` grant. Read what the script does first; the grant is arbitrary code execution, not a formality.

The migration is what silently broke the `overrides` half of `pnpm verify:deps` — the gate was reading a path that no longer held the data. That lesson is recorded in [ADR-0006](0006-exact-dependency-pinning.md).
