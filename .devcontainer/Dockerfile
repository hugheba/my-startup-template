# EVERY VERSION IN THIS FILE COMES FROM .devcontainer/.env.
#
# Docker Compose auto-loads that file (it sits beside docker-compose.yml and is
# literally named `.env`) and passes each entry through
# `build.args: { NAME: ${NAME} }`, which is what reaches the ARGs below. There
# is deliberately no version literal anywhere in this Dockerfile — one manifest,
# no second place to drift. See AGENTS.md, "Toolchain (mise)".
#
# Building this Dockerfile directly with `docker build` and no --build-arg
# FAILS rather than silently producing an image with unpinned or missing
# packages. It fails in one of two places depending on what is absent:
#
#   * BASE_IMAGE_TAG / BASE_IMAGE_DIGEST missing — at the FROM below, before any
#     layer is built:
#       failed to parse stage name "mcr.microsoft.com/devcontainers/base:@":
#       invalid reference format
#   * any other pin missing — at the explicit guard further down, which names
#     the offending args.
#
# Build it through docker-compose.yml (or the devcontainer CLI, which uses
# compose) so the manifest is applied.

# ARGs consumed by FROM must be declared before it, and are out of scope after —
# hence the re-declarations further down.
ARG BASE_IMAGE_TAG
ARG BASE_IMAGE_DIGEST
FROM mcr.microsoft.com/devcontainers/base:${BASE_IMAGE_TAG}@${BASE_IMAGE_DIGEST}

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

# apt versions are pinned via build args (supply-chain hygiene; also satisfies
# IaC scanners' "Apt Get Install Pin Version Not Defined"). They track the
# ubuntu:24.04 archive for BASE_IMAGE_DIGEST; bump them together — a superseded
# security patch is dropped from the archive and will fail the pinned install,
# which is the intended signal to refresh the base image and these pins as a
# pair.
#
# Deliberately SHORT list. devcontainers/base:ubuntu24.04 ALREADY ships git,
# zsh, gnupg2, openssh-client, ca-certificates and — of the network tools —
# curl, wget, net-tools (ifconfig/netstat), iproute2 (ip/ss), lsof and jq; mise
# (below) owns every language and CLI. Re-pinning what is already present would
# only add stale-pin build failures. The rationale for each package that
# remains is documented in .devcontainer/.env beside its pin.
ARG APT_BUILD_ESSENTIAL_VERSION
ARG APT_ZLIB1G_DEV_VERSION
ARG APT_UNZIP_VERSION
ARG APT_ZIP_VERSION
ARG APT_IPUTILS_PING_VERSION
ARG APT_DNSUTILS_VERSION
ARG APT_NETCAT_OPENBSD_VERSION
ARG APT_TRACEROUTE_VERSION
ARG MISE_VERSION
ARG CLAUDE_CODE_VERSION

# Fail loud, immediately, if the manifest did not reach this build. Without
# this an unset ARG expands to empty and `apt-get install build-essential=`
# fails with a confusing parse error thirty lines of output later — or worse, a
# missing MISE_VERSION silently installs whatever mise is latest, defeating the
# pin.
RUN set -e; \
    missing=""; \
    for v in APT_BUILD_ESSENTIAL_VERSION="${APT_BUILD_ESSENTIAL_VERSION}" \
             APT_ZLIB1G_DEV_VERSION="${APT_ZLIB1G_DEV_VERSION}" \
             APT_UNZIP_VERSION="${APT_UNZIP_VERSION}" \
             APT_ZIP_VERSION="${APT_ZIP_VERSION}" \
             APT_IPUTILS_PING_VERSION="${APT_IPUTILS_PING_VERSION}" \
             APT_DNSUTILS_VERSION="${APT_DNSUTILS_VERSION}" \
             APT_NETCAT_OPENBSD_VERSION="${APT_NETCAT_OPENBSD_VERSION}" \
             APT_TRACEROUTE_VERSION="${APT_TRACEROUTE_VERSION}" \
             MISE_VERSION="${MISE_VERSION}" \
             CLAUDE_CODE_VERSION="${CLAUDE_CODE_VERSION}"; do \
      case "$v" in *=) missing="$missing ${v%=}";; esac; \
    done; \
    if [ -n "$missing" ]; then \
      echo "ERROR: build arg(s) not set:$missing" >&2; \
      echo "Build via .devcontainer/docker-compose.yml so .devcontainer/.env is applied." >&2; \
      exit 1; \
    fi

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential="${APT_BUILD_ESSENTIAL_VERSION}" \
      zlib1g-dev="${APT_ZLIB1G_DEV_VERSION}" \
      unzip="${APT_UNZIP_VERSION}" \
      zip="${APT_ZIP_VERSION}" \
      iputils-ping="${APT_IPUTILS_PING_VERSION}" \
      dnsutils="${APT_DNSUTILS_VERSION}" \
      netcat-openbsd="${APT_NETCAT_OPENBSD_VERSION}" \
      traceroute="${APT_TRACEROUTE_VERSION}" \
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
# curl/tar/sha256sum blocks in this Dockerfile — mise.lock pins every one to an
# exact asset URL + SHA256 per platform (and verifies SLSA provenance where
# published), which is both stronger and mechanically refreshable.
#
# The installer is version-pinned too: it is the one binary that installs every
# other binary, so leaving it floating would undermine everything below it.
RUN curl -fsSL https://mise.run | MISE_VERSION="${MISE_VERSION}" sh \
 && echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc \
 && echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc

ENV PATH="/home/vscode/.local/bin:/home/vscode/.local/share/mise/shims:${PATH}"

# COPY defaults to root:root ownership regardless of the active USER, so
# --chown is required or `mise install` cannot write into /workspace. THREE
# files are needed, not two: mise.toml declares the tools, mise.lock supplies
# the checksums each download is verified against, and .devcontainer/.env
# supplies the VERSIONS mise.toml templates from — without it every
# `{{ env.X }}` is undefined and mise exits 1 naming the missing field. The
# relative path is preserved because mise resolves `_.file` against the
# location of mise.toml, not the working directory.
#
# Pre-installing at build time means container start does not re-download a
# ~1 GB toolchain. At runtime the repo mounts at /workspaces/<name>; mise reads
# that copy and, since the locked versions already exist in
# ~/.local/share/mise, re-resolves without downloading (postCreateCommand runs
# `mise trust` first — trust is path-keyed, so the build-time trust of
# /workspace does not cover the runtime mount point).
# kics-scan ignore-line
COPY --chown=vscode:vscode mise.toml mise.lock ./
# kics-scan ignore-line
COPY --chown=vscode:vscode .devcontainer/.env ./.devcontainer/.env
RUN mise trust && mise install

# Give the shims a global fallback for Python.
#
# A mise shim resolves its version from the mise.toml governing its CALLER'S
# working directory. Invoked from anywhere outside the repo it finds no config
# and no global default, and then it does the worst possible thing: writes
# `mise ERROR No version is set for shim: python` to STDERR, leaves STDOUT
# EMPTY, and exits 1. Anything capturing stdout sees a Python that ran and said
# nothing rather than one that failed.
#
# `pet` — the Rust locator behind ms-python.vscode-python-envs — probes every
# `python*` on PATH from its own cwd, so it hit exactly this, 42 times per
# window, logged only as `produced an output "" without a separator`. Global
# discovery therefore found ZERO interpreters and the Python Environments view
# offered to install Python into a container that already had it.
#
# The version is READ FROM mise.toml (`mise current`), never typed here, so
# this cannot become a second place the pin drifts — it is regenerated from the
# same manifest on every build. Repo config still wins inside the repo; this
# only supplies an answer where there previously was none.
# The JVM trio and Rust are here for the same reason and read from the same
# manifest. Each has something that spawns it from outside the repo: the Java and
# Kotlin language servers (the extension host launches them from its own cwd, not
# the workspace), the Gradle daemon, which forks a fresh JVM, and rust-analyzer,
# which shells out to `cargo` for metadata and check runs. Without a global
# default each hits the empty-stdout failure described above.
#
# `node` is here despite Node being the repo's own runtime, and it is the easiest
# one to leave out by accident — everything that exercises it day to day runs
# with the repo as its cwd, where mise.toml answers, so the gap is invisible from
# a normal terminal. It shows up only from outside: `cd /tmp && node --version`
# fails with `No version is set for shim: node`, and so does anything the editor
# or a global npm CLI forks from its own working directory.
RUN mise use -g "python@$(mise current python)" \
                "node@$(mise current node)" \
                "java@$(mise current java)" \
                "kotlin@$(mise current kotlin)" \
                "gradle@$(mise current gradle)" \
                "rust@$(mise current rust)"

# JAVA_HOME, resolved to the mise install rather than left to the shims.
#
# `ENV`, not a compose value, for the reason docker-compose.yml spells out: this
# is not per-environment tunable. Everything JVM here — Gradle, the Kotlin
# language server, any `java` a tool forks — reads JAVA_HOME before it looks at
# PATH, and a container without it silently falls back to whatever the base
# image has (nothing) or to a shim that cannot resolve.
#
# Points at mise's floating `-latest` alias symlink, matching the SonarLint
# paths in devcontainer.json, so bumping JAVA_VERSION does not have to be
# re-typed here. The tradeoff is the same one documented there: a change to
# mise's on-disk layout breaks this silently.
ENV JAVA_HOME="/home/vscode/.local/share/mise/installs/java/graalvm-community-latest"

# pnpm is NOT a mise tool: package.json pins it via `packageManager`
# (pnpm@11.20.0) and Corepack — shipped with the Node mise installs —
# materializes exactly that version. A second pin would drift from it.
RUN corepack enable

# Claude Code CLI — the one tool that cannot come from mise. mise's npm backend
# installs with --ignore-scripts / --omit=optional, so the package's postinstall
# never runs and its platform-native binary is never fetched; `claude` then dies
# at runtime with "claude native binary not installed". `npm install -g` runs the
# postinstall properly. `mise reshim` publishes the `claude` shim onto PATH —
# mise does not auto-shim ad-hoc `npm -g` binaries.
RUN npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" && mise reshim

# Stops the Claude Code CLI (and its plugins) self-updating away from the pin
# above.
ENV DISABLE_AUTOUPDATER=1

# Gortex telemetry is HARDCODED OFF in the image, not passed in per-environment.
# GORTEX_TELEMETRY is Gortex's highest-precedence control (above DO_NOT_TRACK,
# above a saved CLI choice, above its off-by-default), so setting it here means
# every container built from this image has telemetry off with nothing to
# remember and nothing to configure. It is deliberately NOT a compose
# `environment` entry — that would imply it is tunable per environment and would
# silently do nothing for anyone running this image outside this compose file.
# postCreateCommand additionally runs `gortex telemetry off` (CLI-level,
# belt-and-suspenders) so the on-disk state agrees with the env var.
ENV GORTEX_TELEMETRY=0

# Pre-create the state dirs that named volumes mount over, owned by vscode. If a
# named volume is later mounted at any of these paths to persist state across
# rebuilds, Docker initializes it from the image directory's ownership — an
# unseeded volume would mount root:root and leave the tools, running as vscode,
# unable to write. ~/.gortex holds the sqlite graph store and downloaded models;
# ~/.gradle holds the Gradle dependency cache and its daemon state. Both are
# machine-local caches, never the repo.
RUN mkdir -p /home/vscode/.claude /home/vscode/.gortex /home/vscode/.gradle

# Liveness probe. `node` resolves via the mise shim on PATH (set above); a
# working node means the pinned toolchain is usable inside the dev container.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node --version >/dev/null 2>&1 || exit 1
