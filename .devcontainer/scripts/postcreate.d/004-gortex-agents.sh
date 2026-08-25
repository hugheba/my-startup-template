#!/usr/bin/env bash
#
# Gortex agent harnesses: register the graph with Claude Code and Copilot Chat.
#
# This is the MACHINE-level half of Gortex's setup (`gortex install`), not the
# per-repo half (`gortex init`). The split matters:
#
#   gortex init     writes repo files — .mcp.json, .vscode/mcp.json, skills.
#                   Those are committed, so a clone already has them and
#                   regenerating them at boot would only produce churn.
#   gortex install  writes ~/.claude.json, user skills and user hooks. Those
#                   live OUTSIDE the bind mount, cannot be committed, and are
#                   therefore the only part a fresh container is actually
#                   missing.
#
# postcreate rather than poststart: /home/vscode/.claude is the `claude-config`
# named volume (see docker-compose.yml), so this survives a rebuild and
# re-running it on every boot would be pure cost. The daemon and the index are
# 001-gortex.sh's job in poststart, because those genuinely do not survive a
# container stop/start.
set -uo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)}"

# The two harnesses this repo actually uses, named explicitly rather than via
# `auto`. `auto` means "every registered adapter", which today would also
# configure antigravity and opencode and would silently pick up whatever
# assistants a future release adds.
#
# There is no `copilot` or `github` adapter: `vscode` IS Copilot Chat's
# harness — `gortex install --print-config vscode` writes .vscode/mcp.json and
# points at the Copilot MCP docs. Both names are validated below, so a rename
# upstream fails loudly here instead of quietly configuring nothing.
GORTEX_AGENTS="claude-code,vscode"

apply() {
  cd "$REPO_ROOT" || return 1

  local agent
  for agent in ${GORTEX_AGENTS//,/ }; do
    if ! gortex install --print-config "$agent" >/dev/null 2>&1; then
      echo "gortex-agents: unknown adapter '$agent' — refusing to run install" >&2
      return 1
    fi
  done

  # --hook-mode enrich, NOT the default deny. deny installs a PreToolUse hook
  # that redirects Grep/Glob/Read of indexed source into graph queries, which
  # changes how every agent reads this repo and fails closed when the index has
  # drifted. enrich only appends graph context after a read has run, so a stale
  # index degrades to noise rather than to a blocked read. Revisit once the
  # index has proven itself here.
  #
  # No --start / --track: 001-gortex.sh owns the daemon and the index, and two
  # owners for one daemon is how you get a race at boot.
  #
  # --yes is implied when stdin is not a TTY (which it is not, under the phase
  # runner) and is named anyway so running this by hand behaves the same.
  gortex install \
    --yes \
    --agents "$GORTEX_AGENTS" \
    --hook-mode enrich \
    --no-progress || return 1
}

check() {
  local claude_json="$HOME/.claude.json"
  local vscode_mcp="$REPO_ROOT/.vscode/mcp.json"

  # Assert the KEY, not the filename: an empty or gortex-less ~/.claude.json is
  # exactly the failure this step exists to prevent, and `[ -f ]` passes for it.
  if [ -f "$claude_json" ] && jq -e '.mcpServers.gortex' "$claude_json" >/dev/null 2>&1; then
    echo "gortex-agent-claude-code: PASS (mcpServers.gortex in ~/.claude.json)"
  else
    echo "gortex-agent-claude-code: FAIL (no mcpServers.gortex in ~/.claude.json)"
  fi

  # .vscode/mcp.json is JSONC — it carries comments explaining the duplication
  # with .mcp.json — so this strips them before parsing rather than reaching for
  # jq, which rejects the file outright.
  if [ -f "$vscode_mcp" ] && node -e '
      const fs = require("fs");
      const raw = fs.readFileSync(process.argv[1], "utf8");
      const stripped = raw.replace(
        /\\"|"(?:\\"|[^"])*"|(\/\/.*$)|(\/\*[\s\S]*?\*\/)/gm,
        (m, line, block) => (line || block ? "" : m),
      );
      process.exit(JSON.parse(stripped)?.servers?.gortex ? 0 : 1);
    ' "$vscode_mcp" >/dev/null 2>&1; then
    echo "gortex-agent-vscode: PASS (servers.gortex in .vscode/mcp.json)"
  else
    echo "gortex-agent-vscode: FAIL (no servers.gortex in .vscode/mcp.json)"
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
