#!/usr/bin/env bash
#
# Gortex code-intelligence daemon: telemetry off, daemon up, repo indexed.
#
# This runs on every container start rather than once at create, because the
# daemon does not survive a stop/start and the index needs re-attaching.
set -uo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)}"

apply() {
  cd "$REPO_ROOT" || return 1

  # Belt and suspenders. The image already sets GORTEX_TELEMETRY=0, which is
  # the highest-precedence control, but that only holds for processes that
  # inherit the image's environment. This writes the decision to config so it
  # survives a shell that was started some other way.
  gortex telemetry off || return 1

  # Already-running is the normal case on a restart, not a failure — and it
  # exits non-zero with a full usage dump, which would put 25 lines of help
  # text in the log on every single boot. Swallow that one case, surface
  # anything else.
  local out
  if ! out="$(gortex daemon start --detach 2>&1)"; then
    case "$out" in
      *"already running"*) ;;
      *) printf '%s\n' "$out" >&2 ;;
    esac
  fi

  # A cold index of this repo blocks for roughly two minutes; a warm one takes
  # about a second. Two minutes lands squarely on the IDE's "Configuring dev
  # container" spinner, so index in the background and let `check` report
  # progress instead.
  #
  # The redirect is load-bearing: an inherited pipe would keep the phase
  # runner's `tee` open until indexing finished, which is exactly the wait we
  # are removing.
  gortex track "$REPO_ROOT" >/dev/null 2>&1 &
}

check() {
  local out state

  out="$(gortex telemetry status 2>&1)" || true
  # Match the state line, not the help text. `gortex telemetry status` prints
  # "Change with: gortex telemetry on | off" in BOTH states, so a check that
  # greps for "off" reports PASS with telemetry fully enabled. Every check here
  # was run against its failing state before being written.
  if [[ "$out" == *"Telemetry: disabled"* ]]; then
    echo "gortex-telemetry: PASS (disabled)"
  else
    echo "gortex-telemetry: FAIL ($(printf '%s' "$out" | head -n 1))"
  fi

  out="$(gortex daemon status 2>&1)" || true
  state="$(printf '%s\n' "$out" | awk '$1 == "state" { print $2; exit }')"
  case "$state" in
    ready) echo "gortex-daemon: PASS (ready)" ;;
    "") echo "gortex-daemon: FAIL (no state reported — daemon not running)" ;;
    *) echo "gortex-daemon: WARN (state: $state)" ;;
  esac

  # WARN, not FAIL: `apply` deliberately backgrounds the index, so a freshly
  # started container is expected to be mid-indexing when this runs.
  if [[ "$out" == *"$(basename "$REPO_ROOT")"* ]]; then
    echo "gortex-tracked: PASS ($(basename "$REPO_ROOT"))"
  else
    echo "gortex-tracked: WARN (not yet tracked — indexing runs in background)"
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
