# ADR-0015: AGENTS.md is the single source of truth for conventions

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

Every AI coding tool wants its own instruction file: `CLAUDE.md` for Claude Code, `GEMINI.md` for Gemini, `.github/copilot-instructions.md` for Copilot, and more arriving. Cursor, Windsurf, and others each have their own convention.

Writing the conventions once per tool means N copies of the same rules. They start identical and diverge — someone updates the one their editor reads, and the others quietly describe a repo that no longer exists. A contributor using a different tool then follows stale instructions in good faith.

## Decision

**[`AGENTS.md`](../../AGENTS.md) holds the conventions. Every tool-specific file is a redirect to it.**

`CLAUDE.md`, `GEMINI.md`, and `.github/copilot-instructions.md` each contain a pointer and nothing else. No IDE-specific divergence — if a rule is worth stating, it goes in `AGENTS.md` and every tool gets the same one.

`AGENTS.md` is normative about **the present**: how to work here, what commands to run, what is enforced. These ADRs are normative about **the reasoning**: why it is that way, and what was rejected.

The division matters in both directions. An ADR that restates an `AGENTS.md` procedure will go stale, because procedures change and ADRs do not ([ADR-0001](0001-record-architecture-decisions.md)). An `AGENTS.md` section that argues its own case is doing an ADR's job and will bloat the file every agent reads on every task.

## Consequences

One file to update. The redirects need touching only if a tool changes its filename convention.

`AGENTS.md` is long — it is loaded into context on every task, so its size is a real recurring cost. That cost is the argument for pushing rationale out to ADRs, which are read on demand by someone asking "why", not on every edit.

Some tools support directory-scoped instruction files that override the root one. This repo does not use them; a rule that applies only in `apps/web` still belongs in `AGENTS.md`, scoped in prose. Scattering instruction files re-creates the divergence problem with extra steps.

`.github/instructions/` is formatted by CodeGuard rather than by this repo's Prettier config, which is why it is in `.prettierignore` — that is an exception to the formatting rule, not to this one.
