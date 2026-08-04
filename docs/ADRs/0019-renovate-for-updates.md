# ADR-0019: Renovate for dependency updates

- **Status:** Accepted — supersedes [0017](0017-dependabot-for-updates.md)
- **Date:** 2026-08-04

## Context

[ADR-0017](0017-dependabot-for-updates.md) chose Dependabot and wrote down the condition for revisiting it: _"when daily PR volume becomes the bottleneck, or when grouped updates across the four ecosystems would meaningfully reduce review load."_ Volume did become a bottleneck — a 16-PR backlog got consolidated by hand into one PR, twice — but that is the weaker half of the case, and grouping alone would not justify the setup cost 0017 correctly weighed against it.

What actually forces this is that **the set of things Dependabot cannot see has grown to include most of what this repo pins.**

**The toolchain moved out of reach.** [ADR-0004](0004-mise-owns-the-toolchain.md) made `.devcontainer/.env` the single manifest for every version — base image digest, apt pins, nine mise-managed tools, the npm-global CLIs. It is a dotenv file. Dependabot has no manager for it and no mechanism for teaching it one. Eleven pins that used to be spread across files Dependabot understood are now in one file it cannot read at all, and they are exactly the pins whose staleness is least visible.

**`pnpm.overrides` was already a hole, and 0017 said so.** That record's own Consequences section: _"Dependabot cannot auto-fix an advisory suppressed through `pnpm.overrides`… It raises the alert and stops there."_ Four of those overrides had rotted into no-ops before anyone noticed — the advisory range widened underneath a pin that used to cover it. The mitigation on the books is a discipline ("when an alert names a package that appears in overrides, check the override"), which is another way of saying there is no mechanism.

**A toolchain bump is two files, and no bot can produce half of one.** Editing `MISE_VERSION` without regenerating `mise.lock` yields a version with no reviewed checksum; `pnpm verify:mise` fails the PR for it, correctly. Any tool that can only rewrite the first file produces a PR that is guaranteed red.

## Decision

**Renovate**, self-hosted from [`.github/workflows/renovate.yml`](../../.github/workflows/renovate.yml) on a weekly schedule, configured by [`.github/renovate.json`](../../.github/renovate.json). `.github/dependabot.yml` is deleted.

**Self-hosted rather than the Renovate GitHub App**, which is the more usual choice and the cheaper one. Two reasons, in order:

1. **`allowedCommands` is a self-hosted-only setting.** It is what authorizes `postUpgradeTasks` to run `mise lock` in the branch, which is the whole answer to the two-file problem above. The hosted App refuses `postUpgradeTasks` outright — no allowlist exists for it to consult. Choosing the App means choosing to keep bumping the toolchain by hand.
2. A workflow file is portable. This template is expected to survive a move to a GitLab mirror; the App is GitHub-only, and a config that only works on one forge is a config that gets rewritten during the migration that is already hard enough.

**Weekly, not daily.** Dependabot ran npm daily and produced a queue nobody drained on a weekday. The same updates arrive grouped on Monday, in one review session instead of five partial ones.

**Pins are annotated at the pin, not catalogued in the config.** Every Renovate-tracked key in `.devcontainer/.env` carries a `# renovate: datasource=… depName=…` comment directly above it, matched by a custom manager. The alternative — a table of file/line/datasource triples inside `renovate.json` — is a second place for the same fact to live. The annotation survives a key rename, and **a key with no annotation is visibly untracked**, which turns "is this bumped automatically?" from a question about the config into something readable at the value.

**Nothing automerges.** Every PR in this repo is merged by a human, and a dependency PR is not the place to start relaxing that.

## Consequences

**A manual step now stands between a fresh clone and working dependency updates.** Renovate needs a `RENOVATE_TOKEN` PAT with `repo` + `workflow` scopes, created in the GitHub UI. This is a genuine regression from Dependabot's zero-configuration story, and it was 0017's single best argument — for a template other people copy, "works with no setup" is worth a lot.

Two things blunt it. The workflow **skips loudly instead of failing** when the secret is absent: no red scheduled run on a fork, just a job summary pointing at the docs. And the step is written down in [`docs/repository-setup.md`](../repository-setup.md) alongside every other setting that lives outside version control, rather than being folklore.

**Dependabot alerts and Dependabot security updates stay on.** They are repository settings, not `.github/dependabot.yml`, and deleting that file does not touch them. They remain the authoritative vulnerability feed ([ADR-0011](0011-advisory-versus-blocking-security-jobs.md)); Renovate handles routine bumps.

**0017's `overrides` blind spot closes.** Renovate updates `overrides` in `pnpm-workspace.yaml` as first-class dependencies. A rotted pin now produces a PR instead of a discipline.

**`postUpgradeTasks` degrades to the old behaviour, not to something worse.** If `mise lock` fails inside the Renovate container, the PR still opens — with a stale lock, which `pnpm verify:mise` fails it for. The bad case is a red PR someone finishes by hand: exactly where this repo already was. It is not a silently-wrong lockfile.

**The cost of that is a container entrypoint script.** `renovatebot/github-action` runs Renovate in Docker, so mise must be installed _inside_ that container; [`.github/renovate-entrypoint.sh`](../../.github/renovate-entrypoint.sh) does it and hands off to Renovate as the unprivileged user. It is the least obvious file in this change and carries the most comments per line for that reason.

**Four things stay manual, each for a stated reason, each visible as a missing annotation:**

| Pin                                | Why Renovate cannot own it                                                                                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BASE_IMAGE_DIGEST` + 8 `APT_*`    | Renovate has no apt datasource. A digest bump without matching apt bumps breaks the build.                                                                                                    |
| `JAVA_VERSION`                     | The value is a mise plugin identifier (`graalvm-community-21.0.2`), not a version any datasource emits.                                                                                       |
| `DOCKER_IN_DOCKER_FEATURE_VERSION` | Authoritative pin is a `devcontainer-lock.json` integrity digest Renovate cannot regenerate.                                                                                                  |
| Renovate's own version             | Pinned in the workflow like every other action ([ADR-0007](0007-pin-github-actions-by-commit-sha.md)). Unpinned, the tool whose job is deliberate version movement would move undeliberately. |

**Renovate's own PRs pass the same gates as everyone's.** `pnpm verify:deps` rejects a range, the SHA check rejects a tag ref, `pnpm verify:mise` rejects a stale lock. An update that violates the pinning policy fails rather than merging quietly — unchanged from 0017, and the reason none of this needs to be trusted.
