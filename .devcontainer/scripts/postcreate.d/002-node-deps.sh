#!/usr/bin/env bash
#
# Activate the pinned pnpm and install the workspace.
#
# corepack reads `packageManager` from package.json and shims that exact
# version, so the container never uses whatever pnpm happens to be on PATH.
set -uo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)}"

# Corepack's pnpm shim opens with `COREPACK_ENABLE_DOWNLOAD_PROMPT ??= '1'`, and
# at 1 it stops on "? Do you want to continue? [Y/n]" before fetching the pinned
# pnpm. `??=` only fills an UNSET variable, so exporting 0 here wins. It is set
# at file scope, not inside apply(), because check() shells out to `pnpm
# --version` and would hit the same prompt on a container whose corepack cache
# is cold. Nothing is loosened by this: `packageManager` still pins the exact
# version and the download still happens — only the question goes away.
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

apply() {
  cd "$REPO_ROOT" || return 1
  corepack enable || return 1
  # --frozen-lockfile: a container build that silently updates the lockfile is
  # a container that disagrees with CI.
  #
  # --config.confirmModulesPurge=false: on macOS and Windows the workspace
  # reaches the container over a bind mount, node_modules included — built
  # against the host's platform and a store path that does not exist here. pnpm
  # correctly decides to rebuild it from scratch, then asks permission first,
  # and that prompt is what hung this phase on first boot. Purging a
  # host-built node_modules is the only correct outcome inside the container,
  # so there is no decision left for a human to make. The setting stays out of
  # pnpm-workspace.yaml deliberately: at an interactive shell the confirmation
  # is a real guard against an unexpected wipe, and this turns it off only for
  # the one caller that has nobody to answer it.
  pnpm install --frozen-lockfile --config.confirmModulesPurge=false
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
