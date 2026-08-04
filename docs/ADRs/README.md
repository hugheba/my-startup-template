# Architecture Decision Records

Why this repo is shaped the way it is.

[`AGENTS.md`](../../AGENTS.md) is the operating manual — what to run, what to pin, where things live. It answers _how_. These records answer _why_, including the alternatives that were rejected and what each choice costs. When the two disagree, AGENTS.md is right about the current state and the ADR is right about the reasoning; fix whichever has drifted.

## Format

Each record follows [Michael Nygard's format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions): Context, Decision, Consequences.

Records are **immutable once accepted**. A decision that changes gets a new record that supersedes the old one — the old file stays, with its status updated and a pointer forward. The value is the trail, not the current snapshot; a rewritten history cannot tell you which reasoning already failed.

## Index

| #                                                      | Title                                                          | Status                     |
| ------------------------------------------------------ | -------------------------------------------------------------- | -------------------------- |
| [0001](0001-record-architecture-decisions.md)          | Record architecture decisions                                  | Accepted                   |
| [0002](0002-turborepo-pnpm-workspaces.md)              | Turborepo with pnpm workspaces                                 | Accepted                   |
| [0003](0003-nextjs-app-router-stack.md)                | Next.js App Router, React, Tailwind, shadcn/ui                 | Accepted                   |
| [0004](0004-mise-owns-the-toolchain.md)                | mise owns the toolchain, from one version manifest             | Accepted                   |
| [0005](0005-devcontainer-compose-and-phase-runner.md)  | Dev container via Docker Compose, lifecycle via a phase runner | Accepted                   |
| [0006](0006-exact-dependency-pinning.md)               | Pin every dependency exactly, and enforce it                   | Accepted                   |
| [0007](0007-pin-github-actions-by-commit-sha.md)       | Pin GitHub Actions by commit SHA                               | Accepted — amends **0006** |
| [0008](0008-pnpm-settings-in-workspace-yaml.md)        | All pnpm settings live in `pnpm-workspace.yaml`                | Accepted                   |
| [0009](0009-lefthook-for-git-hooks.md)                 | lefthook for git hooks                                         | Accepted                   |
| [0010](0010-layered-secret-scanning.md)                | Layered secret scanning: fast filter, hard boundary            | Superseded by **0018**     |
| [0011](0011-advisory-versus-blocking-security-jobs.md) | Security jobs are advisory; only leaked secrets block          | Accepted                   |
| [0012](0012-least-privilege-ci-credentials.md)         | Least-privilege CI credentials                                 | Accepted                   |
| [0013](0013-tracking-branch-deployments.md)            | Deploy from tracking branches, to two platforms                | Accepted                   |
| [0014](0014-gortex-for-code-intelligence.md)           | Gortex for code intelligence                                   | Accepted                   |
| [0015](0015-agents-md-single-source-of-truth.md)       | `AGENTS.md` is the single source of truth for conventions      | Accepted                   |
| [0016](0016-vitest-colocated-tests.md)                 | Vitest, colocated, deliberately minimal                        | Accepted                   |
| [0017](0017-dependabot-for-updates.md)                 | Dependabot for dependency updates                              | Superseded by **0019**     |
| [0018](0018-one-secret-scanner-three-positions.md)     | One secret scanner, three positions                            | Accepted — supersedes 0010 |
| [0019](0019-renovate-for-updates.md)                   | Renovate for dependency updates                                | Accepted — supersedes 0017 |

## Adding a record

Copy the shape of any existing file. Take the next number — numbers are never reused, even if a record is later superseded. Keep it short: if the Context needs more than a few paragraphs, the decision is probably two decisions.

A record is worth writing when the choice has a plausible alternative someone would otherwise re-litigate. "We use TypeScript" is not an ADR. "We pin peer dependencies exactly, which is normally wrong, and here is the specific reason it is correct here" is.
