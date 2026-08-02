#!/usr/bin/env bash
#
# Devcontainer lifecycle phase runner.
#
#   bash .devcontainer/scripts/devcontainer-phase.sh <postcreate|poststart> [check]
#
# devcontainer.json calls this once per phase instead of chaining commands with
# `&&`. The chain has one fatal property: the first non-zero exit skips every
# command after it, so one hiccup silently leaves the rest of the container
# unconfigured while the phase still looks like it ran to completion. Here every
# step runs, each reports its own exit code and duration, and the phase exits
# non-zero if any of them failed.
#
# Pass `check` as the second argument to run only the read-only assertions —
# no apply. That is the health-check entry point for CI's build-and-boot job
# and for "why is my container broken" from inside a running one.
#
# Membership and order live in the arrays below, NOT in a glob of the .d/
# directory. The array is the reviewable statement of what a phase does, and a
# new file cannot reorder existing steps by accident of its name.
#
# Skip steps with a comma-separated substring list:
#   DEVCONTAINER_SKIP=gortex,003
# A skipped step is announced and counted, never silently absent. The exec bit
# is NOT a toggle — steps are invoked `bash <path>`, so mode bits do nothing.
#
# ---------------------------------------------------------------------------
# Adding a step: drop it in <phase>.d/ and add it to the array below. It must
# accept two arguments and do nothing else on its own:
#
#   apply   do the thing (the default)
#   check   read-only; print one line per assertion, in the form
#             <name>: PASS|WARN|FAIL (<detail>)
#
# Severity: something that leaves the container wrong or unsafe is FAIL;
# something merely inconvenient is WARN. A step that no-ops on purpose still
# reports WARN in check mode rather than going quiet — a check that prints
# nothing is indistinguishable from a check that was never wired up.
#
# Write every check against its FAILING state before trusting it. Grepping
# human-readable CLI output for a word that appears in both the good and bad
# case yields a check that always passes; each check here was verified by
# breaking the thing it asserts.
# ---------------------------------------------------------------------------

# Deliberately no `set -e`: continue-and-report is the entire point. `set -u`
# catches typo'd variables, and `pipefail` keeps `| tee` from swallowing a
# failure (see the PIPESTATUS note at the bottom).
set -uo pipefail

POSTCREATE_STEPS=(
  001-mise-trust.sh
  002-node-deps.sh
  003-python-deps.sh
)

POSTSTART_STEPS=(
  001-gortex.sh
)

PHASE="${1:-}"
MODE="${2:-all}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
export REPO_ROOT

case "$PHASE" in
  postcreate) STEPS=("${POSTCREATE_STEPS[@]}") ;;
  poststart) STEPS=("${POSTSTART_STEPS[@]}") ;;
  *)
    echo "usage: $0 <postcreate|poststart> [check]" >&2
    exit 2
    ;;
esac

case "$MODE" in
  all | check) ;;
  *)
    echo "usage: $0 <postcreate|poststart> [check]" >&2
    exit 2
    ;;
esac

STEP_DIR="$SCRIPT_DIR/$PHASE.d"
LOG_DIR="/tmp/$(basename "$REPO_ROOT")-devcontainer"
LOG="$LOG_DIR/$PHASE.log"

# Substring match against DEVCONTAINER_SKIP so both "gortex" and
# "001-gortex.sh" select the same step.
skip_matches() {
  local step="$1" entry
  local IFS=,
  for entry in ${DEVCONTAINER_SKIP:-}; do
    [ -n "$entry" ] || continue
    case "$step" in *"$entry"*) return 0 ;; esac
  done
  return 1
}

run_phase() {
  local step path rc dur start out
  local ran=0 skipped=0 failed=0
  local pass=0 warn=0 fail=0

  echo "=== $PHASE ($MODE) — $(date -u '+%Y-%m-%dT%H:%M:%SZ') ==="
  cd "$REPO_ROOT" || return 1

  if [ "$MODE" = all ]; then
    for step in "${STEPS[@]}"; do
      path="$STEP_DIR/$step"

      if [ ! -f "$path" ]; then
        # Listed in the array but absent from disk. Loud, because the usual
        # cause is a step that never got committed.
        echo "[FAIL] $step — not found at $path"
        failed=$((failed + 1))
        continue
      fi

      if skip_matches "$step"; then
        echo "[SKIP] $step (DEVCONTAINER_SKIP)"
        skipped=$((skipped + 1))
        continue
      fi

      echo "--- $step"
      start=$SECONDS
      rc=0
      bash "$path" apply || rc=$?
      dur=$((SECONDS - start))

      if [ "$rc" -eq 0 ]; then
        echo "[ OK ] $step (${dur}s)"
      else
        echo "[FAIL] $step (exit $rc, ${dur}s)"
        failed=$((failed + 1))
      fi
      ran=$((ran + 1))
    done
    echo
  fi

  echo "--- checks"
  for step in "${STEPS[@]}"; do
    path="$STEP_DIR/$step"
    [ -f "$path" ] || continue

    if skip_matches "$step"; then
      echo "  SKIP $step (DEVCONTAINER_SKIP)"
      continue
    fi

    # Checks are diagnostic: a check that fails or crashes never changes the
    # phase's exit code. Only apply failures do.
    out="$(bash "$path" check 2>&1)" || true
    [ -n "$out" ] || out="(no output)"
    printf '%s\n' "$out" | sed 's/^/  /'

    # Capture into a variable and match that, rather than piping into
    # `grep -q`: -q exits on the first match while the producer is still
    # writing, and under `pipefail` the producer's SIGPIPE becomes the
    # pipeline's exit code — an intermittent, load-dependent false failure.
    pass=$((pass + $(printf '%s\n' "$out" | grep -c ': PASS' || true)))
    warn=$((warn + $(printf '%s\n' "$out" | grep -c ': WARN' || true)))
    fail=$((fail + $(printf '%s\n' "$out" | grep -c ': FAIL' || true)))
  done

  echo
  if [ "$MODE" = all ]; then
    echo "=== $PHASE: $ran ran, $skipped skipped, $failed failed" \
      "| checks ${pass} PASS ${warn} WARN ${fail} FAIL ==="
  else
    echo "=== $PHASE checks: ${pass} PASS ${warn} WARN ${fail} FAIL ==="
  fi

  return "$failed"
}

mkdir -p "$LOG_DIR"

# `run_phase | tee` runs the left side in a subshell, so its return value is
# invisible to `$?` after the pipe — every phase reported success. PIPESTATUS[0]
# is the left side's real exit code.
run_phase 2>&1 | tee "$LOG"
exit "${PIPESTATUS[0]}"
