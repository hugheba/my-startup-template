# ADR-0003: Next.js App Router, React, Tailwind, shadcn/ui

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

The template needs a web stack that a product team can start building on immediately, and that does not force a rewrite when the product turns out to need server rendering, streaming, or a design system.

It also needs to be deployable to both Vercel and AWS Amplify (see [ADR-0013](0013-tracking-branch-deployments.md)), which rules out anything with a single-host runtime assumption.

## Decision

| Layer      | Choice                                                  |
| ---------- | ------------------------------------------------------- |
| Framework  | Next.js 16, App Router, React Server Components         |
| UI runtime | React 19                                                |
| Styling    | Tailwind CSS v4                                         |
| Components | shadcn/ui (`new-york` style, RSC-compatible)            |
| Language   | TypeScript strict, including `noUncheckedIndexedAccess` |

App Router rather than Pages Router: it is where the framework's development is going, and starting on Pages Router means an eventual migration for a template that has no legacy to protect.

shadcn/ui rather than a component library dependency: shadcn copies source into `apps/web/components/ui/` rather than installing a package. The components become ours — editable, unversioned, with no upgrade treadmill and no wrapper layer to fight when a design diverges from the library's defaults.

## Consequences

**`noUncheckedIndexedAccess` is the setting that will generate complaints.** It makes `arr[0]` typed as possibly-undefined, which is true and which most codebases turn off. It stays on: the alternative is a type system that confidently lies about the most common source of runtime `undefined`.

**shadcn components cannot be version-pinned**, because they are not a dependency. `pnpm dlx shadcn@latest add <component>` is the documented way to add one, and it is deliberately outside the exact-pinning rule in [ADR-0006](0006-exact-dependency-pinning.md) — that rule covers inputs to a build, and this is a code generator run by hand whose output is then committed and reviewed. The generated files are the artifact, not the generator.

The trade is that components do not receive upstream fixes automatically. Re-running `add` for a component overwrites local edits, so a customized component is customized permanently. This is the intended shape — it is why shadcn is not a dependency — but it means treating a heavily edited component as owned code, not as a vendored file.

Tailwind v4 configures through CSS rather than `tailwind.config.js`. The shared config in `packages/config/tailwind` reflects that, and v3 examples found online will not transfer directly.
