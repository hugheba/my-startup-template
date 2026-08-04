# ADR-0010: Layered secret scanning — fast filter, hard boundary

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

A committed secret is already leaked. Rotating it is the only remedy; removing the commit is not, because the object is in every clone and every fork the moment it is pushed. So the useful place to catch one is _before_ the push, and the necessary place to catch one is _before_ the merge.

Those two positions have different constraints. A pre-commit check runs on every commit and has a latency budget measured in the seconds a developer will tolerate. A CI check runs once per PR and can afford to scan the entire history.

## Decision

Two scanners, two positions:

| Position           | Scanner    | Scope                        | On finding    |
| ------------------ | ---------- | ---------------------------- | ------------- |
| pre-commit (local) | secretlint | staged files only, unglobbed | blocks commit |
| CI (pull request)  | gitleaks   | full commit history          | blocks merge  |

**The pre-commit job is unglobbed** — every other lefthook job filters by extension, this one does not. A credential can land in any file type, including ones no formatter touches.

**gitleaks blocks the merge.** It is the one security job in CI that is not advisory ([ADR-0011](0011-advisory-versus-blocking-security-jobs.md)). Its scanner image is pinned by digest, not tag.

**The two scanners do not have the same coverage, and this was measured rather than assumed.** secretlint's recommended preset does **not** flag AWS credentials — neither an `AKIA…` access key id nor a secret access key trips it. gitleaks catches those. This is why the CI scan is the boundary and the hook is only a filter, and it is why AWS keys are not listed as something the hook protects you from.

gitleaks also sees what the hook cannot: a secret introduced in an earlier commit on the branch. The hook only ever sees the diff you are about to make.

**False positives are suppressed by a precise pattern in `.secretlintrc.json`'s `allows` field.** Not `--no-verify`, which disables every hook including commitlint and the formatters.

## Consequences

Two tools, two configs, two vocabularies for the same concern. That is the cost, and it is the reason consolidating onto gitleaks alone is under consideration.

**That consolidation is not as cheap as it reads.** gitleaks runs in CI as a digest-pinned container image and is **not** part of the toolchain — `mise.toml` declares nine tools and gitleaks is not one of them, so a local hook has no existing pin to reuse. It would need adding to `mise.toml` with `mise.lock` regenerated across all four platforms, or a container start on every commit. Neither is large; both are more than the "one pin already there" this paragraph used to claim.

Until that happens, **the coverage gap is asymmetric and must not be misread**: passing the pre-commit hook does not mean the branch is clean, because the hook misses AWS keys and misses earlier commits. Only the CI run is a statement about the branch.

Neither scanner survives `--no-verify` on the local side. That is deliberate — the local check is a convenience, and treating it as a control would be trusting the person being checked.
