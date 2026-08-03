# ADR-0002: Turborepo with pnpm workspaces

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

The template has to be viable both on day one, when it is a single web app, and on the day it grows a second app, a shared component library, and a background worker. Restructuring a repo from single-package to monorepo later is a large, disruptive change that tends to get deferred past the point where it hurts.

Starting as a monorepo costs a little ceremony up front and nothing later.

## Decision

Turborepo over pnpm workspaces, with three workspace globs:

```text
apps/*              deployable applications
packages/*          shared libraries
packages/config/*   shared tool configuration (eslint, tsconfig, tailwind, prettier)
```

Inter-workspace dependencies use the `workspace:*` protocol. Every `packages/*` is `private: true`. Shared configuration is consumed by **extending** it, never by copying it into a workspace.

### Alternatives considered

- **A single Next.js app.** Correct until the first shared package, then it is a migration. Rejected because the migration is the expensive part and it is entirely avoidable.
- **Nx.** More capable — generators, a plugin ecosystem, a richer task graph. Rejected as too much machinery for a template whose product is undefined; Turborepo's caching and task pipeline are the parts actually needed here, and it stays out of the way.
- **npm or Yarn workspaces.** Rejected for pnpm's content-addressed store and its strict, non-flat `node_modules`, which prevents a workspace from importing a package it never declared. That strictness catches real bugs at install time that a hoisted layout hides until deploy.

## Consequences

Turborepo caches task output, so `pnpm build` on an untouched workspace is a cache hit. Task definitions live in `turbo.json` once, and a new workspace inherits them by declaring the matching script.

Every package being `private: true` is what makes the exact `peerDependencies` in [ADR-0006](0006-exact-dependency-pinning.md) safe. Exact peers would normally make a package uncomposable; here nothing is published and everything resolves through `workspace:*`, so exact peers enforce lockstep instead. **Publishing any `packages/*` to npm requires widening its peer ranges first.**

pnpm's strictness has one known interaction: AWS Amplify's SSR bundling needs a hoisted layout to resolve `next`, which is why `nodeLinker: hoisted` is set (see [ADR-0008](0008-pnpm-settings-in-workspace-yaml.md)). That setting is load-bearing for deploys and is not a leftover.
