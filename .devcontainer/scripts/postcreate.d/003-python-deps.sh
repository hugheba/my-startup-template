#!/usr/bin/env bash
#
# Install the Python tooling used by scripts/ into its own uv-managed venv.
set -uo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)}"

apply() {
  cd "$REPO_ROOT/scripts" || return 1
  uv sync --frozen
}

check() {
  local py="$REPO_ROOT/scripts/.venv/bin/python"
  if [ -x "$py" ]; then
    echo "uv-venv: PASS ($("$py" --version 2>&1))"
  else
    echo "uv-venv: FAIL (no interpreter at scripts/.venv/bin/python)"
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
