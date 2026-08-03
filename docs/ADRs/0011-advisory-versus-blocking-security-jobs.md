# ADR-0011: Security jobs are advisory; only leaked secrets block

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

`.github/workflows/security.yml` runs four kinds of scan: OWASP ZAP baseline DAST, `pnpm audit`, CodeQL, and gitleaks. The question is which of them may fail a build.

Making all of them blocking sounds like the safe default and is not. A freshly-published advisory with no patch available would turn every PR red — in a **template that other people clone**, so the breakage propagates to repos whose maintainers did not choose this policy and cannot fix the upstream package. The predictable result is that someone disables the whole workflow, which is strictly worse than an advisory one.

Making all of them advisory is also wrong, for one specific case.

## Decision

**Advisory — report to the run summary, never fail the build:** OWASP ZAP baseline, `pnpm audit`, CodeQL.

**Blocking — fails the build:** gitleaks.

The asymmetry has a single justification: **a committed secret is already leaked and cannot be un-leaked by merging more slowly.** Every other finding describes a risk that persists whether or not this PR merges, so blocking the PR does not reduce it — it just moves the work. A secret is the one case where the merge itself is the harm.

**Cloud integrations must degrade, not fail.** Any scan that needs an external token has to run — or skip cleanly — when the token is absent. A fresh clone has no SonarCloud token, no Snyk token, and no GitHub Advanced Security, and none of those should produce a red X on the first PR.

**A Snyk step was removed rather than pinned.** It referenced `snyk/actions/node@master` — a moving branch, not even a tag ([ADR-0007](0007-pin-github-actions-by-commit-sha.md)) — required a `SNYK_TOKEN` this repo does not set, and was `continue-on-error`. It was third-party code running in a checkout with a token, producing nothing. Deleting it was the smaller change than fixing it.

## Consequences

Advisory findings need someone to read the run summary. Nothing forces that. **Dependabot alerts are the authoritative watcher for dependency advisories**, not `pnpm audit` — audit reports the same database but does not gate, so it is a convenience view, not a control.

**Dependabot's blind spot:** it cannot auto-fix an advisory suppressed through `pnpm.overrides`, because an override is not a declared dependency. It detects and alerts, but opens no PR. Those need bumping by hand, and an override left at a stale range keeps the alert open while looking fixed. A pin is a snapshot, not a subscription.

The ZAP job runs the app it just built, on a runner, in a checkout of the PR's own code. That is the reason [ADR-0012](0012-least-privilege-ci-credentials.md) exists — the exposure is not the scanner, it is what else is in the workspace when PR-authored code runs.

Fork PRs get a read-only `GITHUB_TOKEN` regardless of what a `permissions:` block grants, so any step that writes a PR comment fails on a fork. Those steps are gated to same-repo PRs; forks still get the scan and still get the report as an artifact, they just do not get the comment.
