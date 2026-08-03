# ADR-0012: Least-privilege CI credentials

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

`GITHUB_TOKEN` defaults to a broad permission set. Workflows here run third-party actions and, in several jobs, **execute the pull request's own code** — installing its dependencies, building it, and in the ZAP job actually serving it ([ADR-0011](0011-advisory-versus-blocking-security-jobs.md)).

Any code running in that workspace can read anything else in it. That includes credentials the workflow never intended to expose to it.

`actions/checkout` writes the token into `.git/config` by default so subsequent git commands authenticate. That is convenient and, in a job that runs PR-authored code, it means a checkout step hands the token to the thing being tested. The devcontainer boot check made this concrete: `docker cp .` copied the whole workspace — `.git/config` and its token included — into a container built from PR-controlled instructions.

## Decision

**Every workflow declares `permissions:` explicitly**, at the top level and narrowed per job where a job needs more. No job inherits the default set.

**`persist-credentials: false` on every checkout in a job that runs PR-authored code.** Applied to 7 of 10 checkouts across the workflows; the 3 exceptions are jobs that push, and they need the credential to do it.

**Steps that write to the PR are gated to same-repo events.** A fork PR gets a read-only token no matter what `permissions:` grants, so `issues.createComment` fails there and turns an outside contributor's first PR red for a reason belonging to the template.

**Do not add a permission to make a step work without establishing what the step actually needs.** A request to add `issues: write` for reading run logs was declined on this basis — the run log did not require it.

**Do not correct a third-party action's behaviour from outside.** A `chmod -R 777 $GITHUB_WORKSPACE` step existed so ZAP (uid 1000 in its container) could write reports back through the bind mount. The action already does this itself — `chmod a+w $GITHUB_WORKSPACE`, unconditionally, immediately before it mounts. Our step contributed nothing but the recursion, which world-wrote every file in the checkout including `.git`. It was **deleted rather than narrowed**, with a comment in its place naming the action's own chmod, because a step that exists only to adjust a pinned action stops matching silently the next time that pin moves.

## Consequences

A new workflow starts with no permissions and gains them one at a time, with a reason. This is more friction than inheriting the default, and the friction is the mechanism.

`persist-credentials: false` breaks any subsequent git operation that needs auth. That is the intended failure — it is loud, and it appears in the job that needs the credential rather than in the one that leaks it.

The devcontainer **boot** check is what surfaced the token leak; a build-only check would have passed. Verifying that a thing starts is a different claim from verifying that it builds ([ADR-0005](0005-devcontainer-compose-and-phase-runner.md)).

None of this defends against a compromised action that runs before the narrowing takes effect. SHA pinning ([ADR-0007](0007-pin-github-actions-by-commit-sha.md)) is the control for that; these two ADRs are layers of the same defence, not alternatives.
