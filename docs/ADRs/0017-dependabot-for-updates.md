# ADR-0017: Dependabot for dependency updates

- **Status:** Superseded by [0019](0019-renovate-for-updates.md)
- **Date:** 2026-08-03

## Context

Every dependency in this repo is pinned to an exact version ([ADR-0006](0006-exact-dependency-pinning.md)), and every GitHub Action to a commit SHA ([ADR-0007](0007-pin-github-actions-by-commit-sha.md)). Exact pins do not update themselves. Without automation the policy converts directly into staleness — the whole tree frozen at whatever was current the day it was written.

The choice is Dependabot or Renovate. Renovate is more configurable: grouped PRs, custom schedules, automerge rules, dependency dashboards.

## Decision

**Dependabot**, configured for four ecosystems — npm, GitHub Actions, devcontainers, and pip — on a daily schedule.

The reason is that it is already there. It needs no app installation, no token, and no service; it works in a fork and on a fresh clone with zero setup. For a template other people copy, "works with no configuration" outweighs Renovate's configurability, which mostly buys PR-volume management this repo does not yet have a volume problem with.

Dependabot also drives **security alerts** on transitive advisories in `pnpm-lock.yaml`, which is the authoritative watcher for dependency vulnerabilities here — `pnpm audit` reports the same database but is advisory and gates nothing ([ADR-0011](0011-advisory-versus-blocking-security-jobs.md)).

**Status is "revisit", with the trigger recorded:** when daily PR volume becomes the bottleneck, or when grouped updates across the four ecosystems would meaningfully reduce review load, re-evaluate Renovate. Not before.

## Consequences

Daily PRs, one per dependency, and this repo has a lot of dependencies. Review load is the accepted cost of exact pinning, not a flaw in Dependabot.

**The blind spot that matters: Dependabot cannot auto-fix an advisory suppressed through `pnpm.overrides`.** An override is not a declared dependency, so there is nothing for it to open a PR against. It raises the alert and stops there. The alert stays open while the override sits at a version that no longer covers the widened advisory range — the repo looks patched and the alert looks like noise.

Those need bumping by hand, and the discipline is: **when an alert names a package that appears in `pnpm.overrides`, the override is the thing to check.** A pin is a snapshot, not a subscription.

Dependabot PRs must pass the same gates as any other — `pnpm verify:deps` rejects a range if one is introduced, and the Actions SHA check rejects a tag ref. An update that violates the pinning policy fails rather than merging quietly.

`mise.lock` is outside Dependabot's reach entirely. Toolchain updates are a manual bump plus `mise lock` ([ADR-0004](0004-mise-owns-the-toolchain.md)), gated by `pnpm verify:mise`.
