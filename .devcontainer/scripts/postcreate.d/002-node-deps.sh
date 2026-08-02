#!/usr/bin/env bash
#
# Activate the pinned pnpm and install the workspace.
#
# corepack reads `packageManager` from package.json and shims that exact
# version, so the container never uses whatever pnpm happens to be on PATH.
set -uo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)}"

apply() {
  cd "$REPO_ROOT" || return 1
  corepack enable || return 1
  # --frozen-lockfile: a container build that silently updates the lockfile is
  # a container that disagrees with CI.
  pnpm install --frozen-lockfile
}

check() {
  cd "$REPO_ROOT" || return 1

  local want have
  want="$(node -p "require('./package.json').packageManager.split('@')[1]" 2>/dev/null)" || want=""
  have="$(pnpm --version 2>/dev/null)" || have=""

  if [ -n "$want" ] && [ "$want" = "$have" ]; then
    echo "pnpm-version: PASS ($have)"
  else
    echo "pnpm-version: FAIL (packageManager pins '${want:-?}', pnpm reports '${have:-not found}')"
  fi

  if [ -d node_modules ]; then
    echo "node-modules: PASS"
  else
    echo "node-modules: FAIL (no node_modules — install did not complete)"
  fi
}

case "${1:-apply}" in
  apply) apply ;;
  check) check ;;
  *)
    echo "usage: $0 [apply|check]" >&2
    exit 2
    ;;
esac
