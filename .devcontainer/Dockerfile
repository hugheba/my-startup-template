FROM mcr.microsoft.com/devcontainers/base:ubuntu24.04

# Force apt over HTTPS. Outbound plain-HTTP (port 80) to the Ubuntu package
# mirrors is flaky from some networks — connections to ports.ubuntu.com:80
# (arm64) / archive.ubuntu.com:80 (amd64) time out while HTTPS (443) is
# reliable, which is what makes the `docker-in-docker` devcontainer feature's
# apt-get fail (exit 100, "Failed to fetch ... connection timed out").
# Rewriting the mirror URIs BEFORE any apt-get makes every fetch — ours AND the
# feature's, layered on top of this image — use TLS. The base image already
# ships ca-certificates, so https works immediately. 24.04 uses the deb822
# layout (/etc/apt/sources.list.d/ubuntu.sources); the legacy sources.list is
# only a stub here but is rewritten too for safety.
RUN set -e; \
    for f in /etc/apt/sources.list.d/ubuntu.sources /etc/apt/sources.list; do \
      [ -f "$f" ] && sed -i 's|http://|https://|g' "$f"; \
    done; \
    true

# apt versions are pinned (supply-chain hygiene; also satisfies IaC scanners'
# "Apt Get Install Pin Version Not Defined"). These track the ubuntu:24.04
# archive; bump them when the base image rolls forward — a superseded security
# patch is dropped from the archive and will fail the pinned install, which is
# the intended signal to refresh the base image and these pins together.
#
# Deliberately SHORT list. devcontainers/base:ubuntu24.04 ALREADY ships git,
# zsh, gnupg2, openssh-client, ca-certificates and — of the network tools —
# curl, wget, net-tools (ifconfig/netstat), iproute2 (ip/ss), lsof and jq; mise
# (below) owns every language and CLI. Re-pinning what is already present would
# only add stale-pin build failures. What remains is what neither provides:
#
#   build-essential — C toolchain for node-gyp native deps
#   zlib1g-dev      — GraalVM `native-image` links against libz at build time;
#                     without the headers a native-image build fails at link
#   unzip/zip       — archive handling for tooling and CI scripts
#   iputils-ping    — ping (absent from the base image)
#   dnsutils        — dig / nslookup, for debugging service resolution
#   netcat-openbsd  — nc, for "is that port actually open" checks
#   traceroute      — path/MTU debugging
#
# Every version below was read from `apt-cache policy` against this exact base
# image, so they are the current archive candidates rather than copied guesses.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential=12.10ubuntu1 \
      zlib1g-dev=1:1.3.dfsg-3.1ubuntu2.1 \
      unzip=6.0-28ubuntu4.1 \
      zip=3.0-13ubuntu0.2 \
      iputils-ping=3:20240117-1ubuntu0.1 \
      dnsutils=1:9.18.39-0ubuntu0.24.04.5 \
      netcat-openbsd=1.226-1ubuntu2 \
      traceroute=1:2.1.5-1 \
 && rm -rf /var/lib/apt/lists/*

# Everything below installs into the remote user's own home directory —
# devcontainer.json's remoteUser is "vscode", so postCreateCommand and every
# terminal/exec run as vscode, not root. Installing as root under /root would
# leave it unreachable (/root is 0700) and every tool invocation would fail with
# EACCES.
USER vscode
WORKDIR /workspace

# mise — the single polyglot version manager. It owns the toolchain: Node,
# Python, GraalVM (with native-image), uv, gh, the AWS CLI, Gortex, opencode
# and rtk. (The Claude Code CLI is the exception — see the npm install -g
# below for why it cannot come from mise.) There are deliberately no per-tool
# curl/tar/sha256sum blocks in this Dockerfile any more — mise.lock pins every
# one to an exact asset URL + SHA256 per platform (and verifies SLSA provenance
# where published), which is both stronger and mechanically refreshable.
RUN curl -fsSL https://mise.run | sh \
 && echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc \
 && echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc

ENV PATH="/home/vscode/.local/bin:/home/vscode/.local/share/mise/shims:${PATH}"

# COPY defaults to root:root ownership regardless of the active USER, so
# --chown is required or `mise install` cannot write into /workspace. Both files
# are needed: mise.toml declares the tools, mise.lock supplies the checksums it
# verifies each download against. mise only honours a lockfile that EXISTS, so
# copying it is what makes the build integrity-checked rather than
# resolve-whatever-is-latest.
#
# Pre-installing at build time means container start does not re-download a
# ~1 GB toolchain. At runtime the repo mounts at /workspaces/<name>; mise reads
# that copy and, since the locked versions already exist in
# ~/.local/share/mise, re-resolves without downloading (postCreateCommand runs
# `mise trust` first — trust is path-keyed, so the build-time trust of
# /workspace does not cover the runtime mount point).
# kics-scan ignore-line
COPY --chown=vscode:vscode mise.toml mise.lock ./
RUN mise trust && mise install

# pnpm is NOT a mise tool: package.json pins it via `packageManager`
# (pnpm@9.15.0) and Corepack — shipped with the Node mise installs —
# materializes exactly that version. A second pin would drift from it.
RUN corepack enable

# Claude Code CLI — the one tool that cannot come from mise. mise's npm backend
# installs with --ignore-scripts / --omit=optional, so the package's postinstall
# never runs and its platform-native binary is never fetched; `claude` then dies
# at runtime with "claude native binary not installed". `npm install -g` runs the
# postinstall properly. `mise reshim` publishes the `claude` shim onto PATH —
# mise does not auto-shim ad-hoc `npm -g` binaries. Exact version, bumped
# deliberately.
RUN npm install -g @anthropic-ai/claude-code@2.1.220 && mise reshim

# Stops the Claude Code CLI (and its plugins) self-updating away from the pin
# above.
ENV DISABLE_AUTOUPDATER=1

# Gortex telemetry is HARDCODED OFF in the image, not passed in per-environment.
# GORTEX_TELEMETRY is Gortex's highest-precedence control (above DO_NOT_TRACK,
# above a saved CLI choice, above its off-by-default), so setting it here means
# every container built from this image has telemetry off with nothing to
# remember and nothing to configure. It is deliberately NOT a devcontainer.json
# `remoteEnv` entry — that would imply it is tunable per environment and would
# silently do nothing for anyone running this image outside devcontainers.
# postCreateCommand additionally runs `gortex telemetry off` (CLI-level,
# belt-and-suspenders) so the on-disk state agrees with the env var.
ENV GORTEX_TELEMETRY=0

# Pre-create Claude Code's and Gortex's state dirs owned by vscode. If a named
# volume is later mounted at either path to persist state across rebuilds,
# Docker initializes it from the image directory's ownership — an unseeded
# volume would mount root:root and leave the tools, running as vscode, unable to
# write. ~/.gortex holds the sqlite graph store and downloaded models: a
# machine-local cache, never the repo.
RUN mkdir -p /home/vscode/.claude /home/vscode/.gortex

# Liveness probe. `node` resolves via the mise shim on PATH (set above); a
# working node means the pinned toolchain is usable inside the dev container.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node --version >/dev/null 2>&1 || exit 1
