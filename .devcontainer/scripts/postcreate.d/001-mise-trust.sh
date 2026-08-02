#!/usr/bin/env bash
#
# Trust the repo's mise.toml so the pinned toolchain lands on PATH.
#
# `mise trust` is keyed on the config file's absolute path. The image trusts
# the build-time copy baked in at /workspace, but the live repo is bind-mounted
# somewhere else entirely — so that trust does not transfer. Without this step
# mise refuses to activate the config and every pinned tool (node, python, uv,
# gh, aws) silently falls back to whatever the base image happens to ship.
set -uo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)}"

apply() {
  cd "$REPO_ROOT" || return 1
  mise trust --yes
}

check() {
  cd "$REPO_ROOT" || return 1

  local out
  out="$(mise trust --show 2>&1)" || true

  # `mise trust --show` prints the trusted DIRECTORY, not the config file:
  #   /workspaces/my-startup-template: trusted
  # A check written against "mise.toml" would never match and would report a
  # permanent, meaningless FAIL.
  if [[ "$out" == *"$REPO_ROOT: trusted"* ]]; then
    echo "mise-trust: PASS ($REPO_ROOT)"
  else
    echo "mise-trust: FAIL ($REPO_ROOT absent from 'mise trust --show')"
  fi

  local node
  node="$(mise which node 2>/dev/null)" || node=""
  if [ -n "$node" ]; then
    echo "mise-node: PASS ($node)"
  else
    echo "mise-node: FAIL ('mise which node' resolved nothing — config not active)"
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
