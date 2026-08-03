# ADR-0009: lefthook for git hooks

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

Hooks were husky + lint-staged: two dependencies, plus `.husky/` shell shims, plus a `lint-staged` config block. Three files to read to answer "what runs when I commit", and the split is arbitrary — husky owns _when_, lint-staged owns _what_, and neither is meaningful alone.

husky also installs by writing executable shell scripts into `.husky/`, which is a directory of generated files that has to be committed and stays in the diff.

## Decision

**lefthook, configured in a single [`lefthook.yml`](../../lefthook.yml)** holding both the hook definitions and the commands they run. Installed by the root `prepare` script, so `pnpm install` wires it up.

Current hooks:

| Hook         | Jobs                                            |
| ------------ | ----------------------------------------------- |
| `pre-commit` | `eslint --fix`, `prettier --write`, secret scan |
| `commit-msg` | `commitlint` (conventional commits)             |

**Jobs run sequentially, deliberately.** `eslint --fix` and `prettier --write` both rewrite the same staged files; under `parallel: true` they race and one silently overwrites the other's output. There is a comment at the top of `lefthook.yml` saying so — read it before adding `parallel: true` for speed.

**The secret-scan job is deliberately unglobbed.** Every other job filters by extension. A credential can land in any file type, including ones no formatter touches — `.env`, `.pem`, `.txt`, a test fixture. See [ADR-0010](0010-layered-secret-scanning.md).

## Consequences

Two fewer dependencies, one file, no generated shell shims in the tree.

`stage_fixed: true` on the formatting jobs means they re-stage what they rewrite, so a commit does not land half-formatted. The scanning job has no `stage_fixed` because it only reads.

Conventional commits are enforced at `commit-msg`, which means a non-conforming message is rejected after you have written it. That is the only point where the message exists to check.

`--no-verify` bypasses all of it. That is git's behaviour, not lefthook's, and it is the reason the CI-side gates in [ADR-0010](0010-layered-secret-scanning.md) and [ADR-0011](0011-advisory-versus-blocking-security-jobs.md) exist rather than trusting the hook. **The hook is the fast filter; CI is the boundary.**
