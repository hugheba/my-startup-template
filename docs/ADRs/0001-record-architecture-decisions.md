# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

This is a template. Its whole purpose is to be cloned, and the person cloning it inherits every decision in it without having been in the room for any of them.

The reasoning currently lives in three places, none of which survive a clone well:

- **`AGENTS.md`** carries a lot of it, but it is written as instructions. It says what to do, and only sometimes says what was rejected.
- **Commit messages** carry the rest. They are the best record we have, and they are effectively unreadable after a squash-merge, a fork, or six months.
- **Pull request threads** carry the arguments. Those are on GitHub, not in the repo, and a clone does not bring them.

The observable symptom is decisions getting quietly undone. A step gets deleted because its purpose is not visible in the file, a pin gets loosened because the range looks harmless, a "redundant" config gets cleaned up. Each of these is a reasonable action taken without the context that would have prevented it.

## Decision

Keep architecture decision records in `docs/ADRs/`, numbered and in Nygard format (Context, Decision, Consequences).

Records are immutable once accepted. When a decision changes, write a new record that supersedes the old one and update the old one's status with a pointer forward. Do not edit the reasoning of an accepted record.

Scope: a decision earns a record when there is a plausible alternative that someone would otherwise re-argue, or when the choice looks wrong from the outside and needs its justification attached. Ordinary implementation choices do not.

## Consequences

The `why` becomes greppable and travels with a clone. A reviewer who wants to remove something can find out first whether it was already considered.

Immutability is the part that costs something. Superseded records accumulate, and the index grows entries that no longer describe the system. That is the intended trade: knowing which reasoning already failed is worth more than a tidy directory, and a rewritten history cannot tell you that.

Two documents now describe the same system, so they can drift. The split is: `AGENTS.md` is normative about the present, ADRs are normative about the reasoning. An ADR that restates a procedure from `AGENTS.md` is doing the wrong job and will go stale.
