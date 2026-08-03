# ADR-0005: Dev container via Docker Compose, lifecycle via a phase runner

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

Two separate problems in the dev container, decided together because the fix to one constrains the other.

**Build inputs.** [ADR-0004](0004-mise-owns-the-toolchain.md) puts every version literal in `.devcontainer/.env`. Those values have to reach the Dockerfile as build args. A `devcontainer.json` `build:` block can pass `args`, but only by listing every one of them by hand — a second copy of the manifest, which is the duplication ADR-0004 exists to remove.

**Lifecycle.** `postCreateCommand` was a chain of commands joined by `&&`. That chain has one fatal property: the first non-zero exit skips everything after it. A transient network failure in step two leaves the container missing steps three through eight, and the phase reports completion anyway. The container looks configured and is not.

## Decision

**Build through `docker-compose.yml`, not a `build:` block.** Compose auto-loads a file named `.env` from its own directory and makes every entry available for interpolation into build args. The manifest reaches the Dockerfile without being restated.

**Run both lifecycle phases through one runner:**

```bash
bash .devcontainer/scripts/devcontainer-phase.sh <postcreate|poststart> [check]
```

Steps are individual scripts in `.devcontainer/scripts/postcreate.d/` and `poststart.d/`, run in filename order. Every step runs regardless of whether an earlier one failed; each reports its own exit code and duration; the phase exits non-zero if any step failed.

The optional `check` argument re-runs a phase's verification without re-running its side effects, which is what CI uses.

**Commit `devcontainer-lock.json`** so devcontainer features are pinned like everything else.

**CI builds _and boots_ the image**, then runs the lifecycle phases inside it. A build that succeeds and a container that comes up are different claims.

## Consequences

Adding a setup step means adding a file to a `.d/` directory. No editing of a chain, no ordering hazard beyond the filename prefix, and a failing step names itself instead of taking the rest of the phase down with it.

The runner is ~190 lines of bash that would not exist with an `&&` chain. That is the cost, and it buys attributable failures — the chain's silent partial-configuration is the exact bug that motivated writing it.

Compose adds indirection: the container is described across `devcontainer.json`, `docker-compose.yml`, and the Dockerfile, and a reader has to follow all three. Accepted, because the alternative reintroduces a hand-maintained copy of every version.

Booting in CI makes the devcontainer job slower than a build-only check, and it is a required status check, so that cost is on every PR. It caught a real credential leak: `docker cp .` copied the checkout's `.git/config` — including the `GITHUB_TOKEN` that `actions/checkout` persists there — into a container built from PR-controlled code. Fixed with `persist-credentials: false` (see [ADR-0012](0012-least-privilege-ci-credentials.md)); a build-only check would not have exercised the path.
