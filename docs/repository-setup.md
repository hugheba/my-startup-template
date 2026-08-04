# Repository setup

Everything in this repo that a commit cannot do for you.

Most of the toolchain configures itself: clone, open the dev container, and the pins in [`.devcontainer/.env`](../.devcontainer/.env) produce the same environment everywhere. The steps below are the exceptions — GitHub settings and secrets that live in the web UI, outside version control, and that therefore do **not** come along when someone forks this template or generates a repo from it.

Nothing here is required to run the app or to open a PR. Each item says what stops working without it.

---

## 1. `RENOVATE_TOKEN` — required for dependency updates

**Without it:** [`.github/workflows/renovate.yml`](../.github/workflows/renovate.yml) runs weekly, skips, and writes "No `RENOVATE_TOKEN` secret is set" to its job summary. No dependency PRs are ever opened. Nothing turns red.

Renovate is self-hosted from a workflow rather than installed as the GitHub App (see [ADR-0019](ADRs/0019-renovate-for-updates.md)), and the action does not accept `GITHUB_TOKEN` — a token minted by Actions cannot push a branch that triggers other workflows, so the PRs it opened would sit with no CI on them. It needs a real user token.

1. Create a **classic** personal access token at [github.com/settings/tokens](https://github.com/settings/tokens) → _Generate new token (classic)_:
   - **`repo`** — read the repo, push branches, open PRs, write the Dependency Dashboard issue.
   - **`workflow`** — Renovate's `github-actions` manager edits `.github/workflows/*`, and GitHub rejects a push touching those files from a token without this scope. Omit it and every other manager works while Action bumps fail with `refusing to allow a Personal Access Token to create or update workflow`.
   - Set an expiry you will actually notice. When it lapses, Renovate goes quiet in exactly the same way it does when the secret was never created.
2. Add it at **Settings → Secrets and variables → Actions → New repository secret**, named `RENOVATE_TOKEN`.
3. Run the workflow once by hand — **Actions → Renovate → Run workflow** — rather than waiting for Monday's cron. The first run opens the Dependency Dashboard issue and whatever PRs the backlog holds.

> A fine-grained token also works, but needs Contents + Pull requests + Issues + Workflows read/write on this repo specifically, and has to be re-granted whenever the repo list changes. Classic is less to maintain for a single repo.

**Forks and generated repos start with no token.** That is a real regression from Dependabot, which needed no configuration at all — and it is the price of a config that also works on a GitLab mirror. ADR-0019 records the trade.

---

## 2. Dependabot — keep the alerts, drop the PRs

`.github/dependabot.yml` is deleted; Renovate opens the version PRs now. Two things Dependabot did are **repository settings, not that file**, and they survive its deletion. Leave them on:

- **Settings → Advanced Security → Dependabot alerts** — the vulnerability feed behind the Security tab. [`.github/workflows/security.yml`](../.github/workflows/security.yml) treats `pnpm audit` as advisory precisely because these alerts are the authoritative watcher.
- **Dependabot security updates** — auto-PRs for a vulnerable transitive dep. Renovate handles routine bumps; this handles the urgent ones with GitHub's own advisory data.

**One-time cleanup after the switch:** any Dependabot PRs still open are now orphaned — nothing will rebase or close them. Close them and delete their branches. Renovate will re-propose whatever is still outstanding on its next run, grouped its way.

---

## 3. Secret scanning and push protection

**Without it:** the pre-commit hook and the CI job still scan (both gitleaks, same version — [ADR-0018](ADRs/0018-one-secret-scanner-three-positions.md)), but a secret pushed from a machine with hooks skipped reaches the remote.

**Settings → Advanced Security** → enable **Secret scanning** and **Push protection**.

This is the middle of the three positions in ADR-0018 and the only one that cannot be a file in the repo: it runs on GitHub's side, on the push itself, and rejects it. Free on public repositories.

---

## 4. Code scanning (CodeQL)

**Without it:** the `CodeQL Analysis` job in `security.yml` runs, finds things, and fails to upload them. It carries `continue-on-error: true` so this degrades to a yellow step rather than a broken PR.

**Settings → Advanced Security → Code scanning.** Free on public repositories; on private ones it requires GitHub Advanced Security. Results land in the Security tab.

---

## 5. Deployment environments

**Without them:** `deploy-dev.yml` and `promote.yml` still run, with no reviewer gate — a promotion to prod applies the moment someone dispatches it.

**Settings → Environments.** Three, matching the tracking branches in [ADR-0013](ADRs/0013-tracking-branch-deployments.md):

| Environment | Used by                                 | Protection worth setting       |
| ----------- | --------------------------------------- | ------------------------------ |
| `dev`       | `deploy-dev.yml` (auto, on push `main`) | None — this is the fast lane   |
| `stage`     | `promote.yml`, `target=stage`           | Required reviewers             |
| `prod`      | `promote.yml`, `target=prod`            | Required reviewers, wait timer |

The workflow refers to the environment by the dispatch input (`environment: ${{ inputs.target }}`), so the names must match the `options: [stage, prod]` choices exactly.

Deploy credentials, if you use them, are **environment** secrets rather than repository secrets — that is the whole point of the split. `deploy-dev.yml` and `promote.yml` both carry a commented-out `DATABASE_URL` showing where they would go.

---

## 6. Branch protection on `main`

**Without it:** every gate in CI still runs and still reports. Nothing stops a red PR from merging.

**Settings → Rules → Rulesets** (or the older Branches → Branch protection), targeting `main`. Require a pull request, and require these checks — the job names, exactly as they appear on a PR:

| Check                                   | Workflow           |
| --------------------------------------- | ------------------ |
| `VS Code extension lockstep`            | `ci.yml`           |
| `Dependencies pinned to exact versions` | `ci.yml`           |
| `Lint + Typecheck + Build + Test`       | `ci.yml`           |
| `Secret scan (gitleaks)`                | `security.yml`     |
| `Build devcontainer image`              | `devcontainer.yml` |

Deliberately **not** required: `Dependency Security Scan`, `CodeQL Analysis`, `OWASP ZAP Baseline Scan`. Those are advisory by design — [ADR-0011](ADRs/0011-advisory-versus-blocking-security-jobs.md) explains why a scanner whose finding count moves with an upstream feed makes a bad merge gate.

The tracking branches (`deploy/dev`, `deploy/stage`, `deploy/prod`) are written by workflows, not by people. Protect them against direct pushes if you want, but do not require checks on them — the workflow's own push would be the thing blocked.

---

## 7. Repository visibility

This template is public, and a repo generated from it inherits nothing about that — you choose at creation time.

If you started public and are going private (or the reverse): **Settings → General → Danger Zone → Change repository visibility.** Note that going private turns off the free tier of secret scanning and code scanning; §3 and §4 become paid features.

---

## Verifying you got it all

There is no script for this — that is what makes it a document. But the observable end state is:

- **Actions → Renovate**, run manually, ends green and opens an issue titled _Dependency Dashboard_.
- A PR shows five required checks and cannot merge until they pass.
- Pushing a commit containing a plausible AWS key is rejected by the remote, not just by your hook.
- **Security** tab lists Dependabot alerts and CodeQL results.
