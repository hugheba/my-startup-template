# ADR-0013: Deploy from tracking branches, to two platforms

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

Deploying from `main` conflates two things that need to move at different speeds: the source of truth, and what is currently running in production. Once they are the same ref, a production rollback means rewriting `main`, and a hotfix means racing whatever else is merging.

Separately: the template should not force a hosting choice on whoever clones it. Vercel is the obvious default for Next.js; AWS Amplify is what a team already inside AWS will want. Supporting one and documenting the other as an exercise means the second one does not actually work.

## Decision

**Deployments are tied to tracking branches, never to `main`:**

| Branch         | Environment | Trigger                                         |
| -------------- | ----------- | ----------------------------------------------- |
| `main`         | none        | source of truth                                 |
| `deploy/dev`   | dev         | auto fast-forwarded after CI passes on `main`   |
| `deploy/stage` | stage       | manual, via the `Promote` action (target=stage) |
| `deploy/prod`  | prod        | manual, via the `Promote` action (target=prod)  |

`stage` and `prod` promotions are gated behind **GitHub Environments with required reviewers**. Rolling back is moving a tracking branch, which does not touch history.

**Both platforms are wired and both are committed** — `vercel.json` and `amplify.yml`. Both build from the **repo root**, because pnpm's `workspace:*` resolution has to walk every workspace; neither can build from `apps/web`.

Each platform needs a one-time console setup that no committed file can perform, and it is documented in `AGENTS.md` rather than left implicit. The load-bearing one is **Vercel's Root Directory, which must be empty**: Vercel resolves the paths _inside_ `vercel.json` relative to it, so pointing it at `apps/web` makes `outputDirectory` resolve to `apps/web/apps/web/.next`. The build succeeds and then fails looking for output that was never going to be there — a failure that reads like a build problem and is a configuration problem.

## Consequences

`main` stays deployable-but-not-deployed, and production state is a ref you can move.

**On a fresh clone only `main` exists.** `deploy/dev` appears after the first `main` build; `deploy/stage` and `deploy/prod` are created by their first `Promote` run. Vercel's Production Branch dropdown only lists branches that already exist, so bootstrap them before that step:

```bash
git push origin main:refs/heads/deploy/stage main:refs/heads/deploy/prod
```

Supporting two platforms means two build configs to keep honest, and only one of them gets exercised on any given deploy. The one that is not in use will rot silently.

Amplify's SSR bundling is why `nodeLinker: hoisted` is set ([ADR-0008](0008-pnpm-settings-in-workspace-yaml.md)). That coupling is easy to miss: a pnpm setting exists because of a hosting platform, and removing it produces a green CI run and a broken deploy.

`amplify.yml` writes `apps/web/.env.production` at build time from whichever documented vars are set in the Amplify environment, so build-time env validation works. That file is gitignored and must stay that way.
