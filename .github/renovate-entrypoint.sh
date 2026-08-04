#!/bin/bash
# Container entrypoint for the self-hosted Renovate run (.github/workflows/renovate.yml).
#
# WHY THIS FILE EXISTS
# --------------------
# renovatebot/github-action runs Renovate inside a Docker container, not on the
# runner. Anything the runner installs — including anything mise would install —
# is invisible from in there. But `postUpgradeTasks` in .github/renovate.json has
# to run `mise lock`, because a bump to .devcontainer/.env without a regenerated
# mise.lock is a PR that cannot pass `pnpm verify:mise`.
#
# So mise has to exist *inside* the container, and the only hook the action gives
# for that is `docker-cmd-file`: this script replaces the image's command. It
# must therefore end by starting Renovate itself — if it just exits, the action
# reports success having updated nothing at all.
#
# Run as root (`docker-user: root` in the workflow) so the install can write to
# /usr/local/bin; Renovate itself must NOT run as root, hence the runuser hand-off
# on the last line. That is the container's own unprivileged user, `ubuntu`.
set -euo pipefail

# Passed through from the workflow, which reads it out of .devcontainer/.env so
# this is the same mise the dev container and CI use. It only arrives here
# because the workflow widens the action's `env-regex` to admit it — the default
# lets through RENOVATE_* and little else. Fail loudly rather than silently
# installing whatever `mise.run` serves today.
: "${MISE_VERSION:?not set — check env-regex in .github/workflows/renovate.yml}"

export MISE_INSTALL_PATH=/usr/local/bin/mise
curl -fsSL https://mise.run | sh

# mise refuses to evaluate a config it has not been trusted with, and mise.toml
# is nothing but `{{ env.X }}` templates — untrusted, it resolves no versions and
# `mise lock` rewrites the lockfile into something empty. Renovate clones into
# its baseDir, so trusting that prefix covers the checkout wherever it lands.
export MISE_TRUSTED_CONFIG_PATHS="${RENOVATE_BASE_DIR:-/tmp/renovate}"

# `runuser` keeps the environment (unlike `su -`), so the two exports above reach
# the postUpgradeTask that Renovate spawns. exec, so signals go to Renovate and
# its exit status is the container's.
exec runuser -u ubuntu -- renovate
