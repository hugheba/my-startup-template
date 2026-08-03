# ADR-0014: Gortex for code intelligence

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

Agents working in this repo answer structural questions constantly — who calls this, what breaks if I change that signature, where is this symbol defined. Answering them by grepping and reading files costs tokens proportional to the repo, returns text rather than relationships, and gets less reliable as the repo grows.

Two earlier attempts at this are worth recording because both are things someone would plausibly re-add: **CodeGraphContext** and **GitNexus**. Both aimed at the same problem. Both were removed.

## Decision

**Gortex**, indexing the repo and exposing a graph over MCP.

- Indexed by `postCreateCommand` when the container is created ([ADR-0005](0005-devcontainer-compose-and-phase-runner.md)).
- Registered as an MCP server so agents query the graph instead of reading files.
- Runs **entirely inside the container over a unix socket** — no network port, no credential, nothing leaving the machine.
- `GORTEX_TELEMETRY=0` is baked into the image _and_ re-asserted at postCreate. Twice, deliberately: the image env is the default, the postCreate assertion survives an image rebuild that drops it.

**CodeGraphContext and GitNexus are replaced by this and should not be reintroduced.** Running two graph indexers means two indexes disagreeing about the same repo, and the disagreement is invisible until an agent acts on the stale one.

## Consequences

Indexing costs time at container create. That is once per container, and the phase runner reports its duration so the cost is visible rather than felt.

The index is a cache of a moving target. It is rebuilt on create and refreshed as files change; an index that has drifted answers confidently and wrongly, which is worse than not answering. Treat a surprising graph answer as a reason to check the file, not as ground truth.

Gortex is a dependency of the _workflow_, not of the _product_. Nothing in `apps/` or `packages/` imports it, and the build does not need it. Someone who clones this template and does not want it can drop the MCP registration without touching a line of application code.

The no-network-port property is what makes this acceptable in a container that also holds credentials. A code-intelligence tool has, by construction, read access to the entire source tree; one that also opens a socket to the outside is a different risk category entirely.
