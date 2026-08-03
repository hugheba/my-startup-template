# ADR-0007: Pin GitHub Actions by commit SHA

- **Status:** Accepted
- **Date:** 2026-08-03
- **Amends:** [ADR-0006](0006-exact-dependency-pinning.md) — removes its GitHub Actions exemption

## Context

GitHub Actions were originally exempt from the exact-pinning rule, referenced by major tag (`actions/checkout@v4`). The stated reasoning was that nothing an action produces ships to users, so a floating reference could not reach production.

That was the wrong question. Every action in these workflows **executes arbitrary third-party code inside a checkout of this repo, holding a token**. What it produces is irrelevant; what it can read is the exposure.

`@v4` is a tag, and a tag is a mutable pointer the owner can move at any time. This is not hypothetical — it is precisely the ref shape the `tj-actions/changed-files` compromise targeted, repointing existing tags at a malicious commit that dumped runner secrets into build logs. Every repo pinned by tag picked it up automatically. A 40-hex commit SHA is the only ref GitHub cannot repoint.

The counter-argument was diff readability: `@3d3c42e…` tells a reviewer nothing about which version they are moving to.

## Decision

**Every `uses:` ref is a 40-character commit SHA**, enforced by `pnpm verify:deps` alongside the rest of [ADR-0006](0006-exact-dependency-pinning.md).

**Every pin keeps its version as a trailing comment:**

```yaml
uses: actions/checkout@3d3c42e2f2ba7b7dc2b0e5bdbde5b21eb3a0e3a1 # v7.0.1
```

Dependabot reads that comment. Bumps still arrive as PRs, still say which version you are moving to, and still update the comment. The readability objection is real and this answers it, rather than trading it away.

The gitleaks scanner image was already digest-pinned on exactly this reasoning. That made it the exception; it is now the rule.

## Consequences

A compromised upstream tag no longer reaches this repo. A compromised upstream _release_ still does, if Dependabot opens the bump and it is merged unreviewed — SHA pinning buys review time, not immunity.

Adding an action by hand now requires resolving its SHA first. The gate fails the PR otherwise, so this is caught in CI rather than in review.

Actions referenced by branch are the worst case of this and are simply not allowed. A Snyk step referenced `snyk/actions/node@master` — a moving branch, not even a tag. It was removed rather than pinned, for reasons in [ADR-0011](0011-advisory-versus-blocking-security-jobs.md).

The SHA validation is case-insensitive on the hex digits. Git accepts uppercase refs, so a `@3D3C42E…` pin is valid and must not be rejected by the gate.
