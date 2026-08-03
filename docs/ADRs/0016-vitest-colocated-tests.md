# ADR-0016: Vitest, colocated, deliberately minimal

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

A template needs a test setup that works on the first `pnpm test` and does not prescribe a testing philosophy nobody asked for. The failure modes are opposite and both common: no test infrastructure at all, so the first test written is also a config task; or a full pyramid of jsdom, Testing Library, MSW, coverage thresholds, and a `__tests__/` tree, all of it configured for tests that do not exist yet.

There was also a concrete defect. The `Test` gate in CI was required and green, and had **never executed a test** — `turbo run test` exits 0 when no workspace defines a `test` script. It prints `Tasks: 0 successful, 0 total` and reports success. A required check that runs nothing is worse than no check: it is a green light with nothing behind it.

## Decision

**Vitest, in `apps/web` only.** Tests live **beside the code they cover** — `lib/utils.ts` is tested by `lib/utils.test.ts`. No `__tests__/` directory.

Colocation means a file and its test move, rename, and delete together, and a module with no test is visible by looking at the directory rather than by cross-referencing a parallel tree.

**No config file, no setup file, no `globals: true`.** Every test imports what it uses. Zero-config Vitest works here because `apps/web` is `"type": "module"`; the moment a config file exists it becomes something to keep in sync with `next.config.ts` and `tsconfig.json`.

**No jsdom and no `@testing-library/react` yet.** They are the right tools for a component with behaviour worth asserting. Adding them before such a component exists means installing and configuring a DOM environment to test nothing.

## Consequences

`pnpm test` runs real tests, and the CI gate now fails when they fail. **That is the property to protect** — if the last test in the repo is ever deleted, the gate silently goes back to asserting nothing. A `test` script that exists but matches no files is the trap; check that the gate would notice.

Colocation puts `*.test.ts` files next to source. `next.config.ts` and `tsconfig.json` must keep excluding them from the production build, or test code ships.

The first component test will need jsdom and Testing Library, and adding them will require a Vitest config file. That is expected — it is the point at which the configuration earns itself.

Only `apps/web` has tests. `packages/*` are private and consumed via `workspace:*` ([ADR-0002](0002-turborepo-pnpm-workspaces.md)); when one grows logic worth pinning down, it gets its own `test` script, and Turbo picks it up with no change to the pipeline.
