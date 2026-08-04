# ADR-0018: One secret scanner, three positions

- **Status:** Accepted — supersedes [0010](0010-layered-secret-scanning.md)
- **Date:** 2026-08-03

## Context

[ADR-0010](0010-layered-secret-scanning.md) put two different scanners at two positions: secretlint in the pre-commit hook, gitleaks in CI. It was right about the layering and wrong about two things underneath it.

**The layering was never two positions. It is three.** GitHub secret scanning **push protection is enabled on this repository**, and it sits between the hook and CI — server-side, on `git push`, rejecting the push outright. ADR-0010 does not mention it, so every cost/benefit argument in that record was made against a gate that was one layer short of reality.

**The innermost gate was the weakest one, and nothing said so.** ADR-0010 recorded the measurement — secretlint's recommended preset does not flag `AKIA…` AWS access key ids, gitleaks does — and then accepted living with it. That is backwards. The layer a developer hits first, most often, and most casually trusts is the one that should not have a hole in it, because "the hook passed" is what people act on.

**The cost of consolidating was overstated, by me, in that record.** ADR-0010's Consequences section argued the swap was "not as cheap as it reads" because gitleaks would need adding to `mise.toml` and `mise.lock` regenerated across four platforms. True, and irrelevant: that is a **one-time** cost, and it was being weighed against secretlint's **per-commit** one. A Node CLI pays interpreter startup plus preset-tree load on every single commit; a static Go binary scanning the index returns in milliseconds.

## Decision

One scanner — gitleaks — at all three positions, pinned by `GITLEAKS_VERSION` in `.devcontainer/.env`.

| Position           | Mechanism                              | Scope               | On finding    |
| ------------------ | -------------------------------------- | ------------------- | ------------- |
| pre-commit (local) | `gitleaks git --staged`, via lefthook  | the staged index    | blocks commit |
| push (server)      | GitHub secret scanning push protection | the pushed commits  | rejects push  |
| CI (pull request)  | gitleaks, digest-pinned container      | full commit history | blocks merge  |

**The local hook and the CI job are the same binary on the same ruleset.** There is no `.gitleaks.toml`; neither side overrides the default rules. `GITLEAKS_VERSION` in `.devcontainer/.env` and the image tag in `.github/workflows/security.yml` must move together — the moment they diverge, "it passed locally" stops meaning anything about CI.

**No `{staged_files}` and no glob on the hook job.** `--staged` reads the git index directly, so coverage is every staged file including the types no formatter touches (`.env`, `.pem`, `.txt`, a test fixture). ADR-0010 achieved the same coverage by deliberately leaving the job unglobbed; this achieves it by not passing files at all.

**The hook does not pass `--redact`; CI does.** A local finding is in your own working tree on your own terminal, and seeing which string tripped is the point. CI logs on a public repository are world-readable, so a finding printed there would leak the secret a second time.

## Consequences

**The three layers now degrade in the right direction.** Each outer layer is strictly broader than the one inside it: the hook sees the index, push protection sees the commits, CI sees the history. Passing an inner layer no longer implies coverage that layer does not have.

**One tool, one config, one vocabulary.** secretlint, `@secretlint/secretlint-rule-preset-recommend`, and `.secretlintrc.json` are gone — two devDependencies and a config file removed rather than maintained.

**False positives move to `.gitleaksignore` or a `gitleaks:allow` comment.** Not `--no-verify`, which disables every hook including commitlint and the formatters.

**Two version pins must move together, so a gate enforces it.** gitleaks is the one tool pinned twice — through mise for the hook, as a container digest for CI — and a drifted pair fails _silently_: both sides keep working, just as different scanners, while the hook quietly stops being a statement about CI. Comments cannot catch that, so `scripts/verify-mise-lock.mjs` asserts `GITLEAKS_VERSION` equals the image tag in `security.yml`. Bumping one without the other now fails `pnpm verify:mise`.

**A fresh clone with no mise gets no hook.** The hook calls `gitleaks` from `PATH`, which `mise install` provides. Someone who skips the toolchain loses the innermost layer — but keeps push protection and CI, which are the two that were ever load-bearing.
