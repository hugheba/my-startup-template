#!/usr/bin/env node
// Asserts mise.lock is in sync with the pin manifest.
//
// WHAT THIS GUARDS
// ----------------
// Tool versions live in .devcontainer/.env and are templated into mise.toml.
// mise.lock holds the per-platform URL + SHA256 each download is verified
// against. Those two can silently desync: bumping a version in .env DOES take
// effect (an exact request wins over a stale lock), but the old lock entry
// orphans and that tool's next install has no reviewed hash to check against —
// mise records whatever it downloads. That is a fail-OPEN supply-chain gap.
//
// WHY THIS IS NOT `mise lock && git diff --exit-code`
// ---------------------------------------------------
// That was the first implementation and it is wrong: `mise lock` verifies SLSA
// provenance only for the platform it runs on and writes
// `provenance_verified = true` onto that platform's entry alone. A lock
// generated on macos-arm64 therefore differs by exactly that line from one
// generated on CI's linux-x64 — so the diff gate failed on a lockfile that was
// completely correct, and would have failed forever for every contributor not
// on the runner's platform. A gate that fails on correct input is worse than no
// gate. (Observed on PR #70.)
//
// So this checks the INVARIANT rather than the bytes: every tool mise.toml
// declares must have a lock entry at exactly the version the manifest pins, on
// every platform the fleet builds for. That is platform-independent, needs no
// network, and fails precisely when someone bumps .env without re-locking.
import { readFileSync } from 'node:fs';

const ENV_FILE = '.devcontainer/.env';
const TOML = 'mise.toml';
const LOCK = 'mise.lock';

// The platforms `mise lock -p ...` is run for. A tool missing one of these has
// no checksum for whoever builds there.
const PLATFORMS = ['linux-x64', 'linux-arm64', 'macos-arm64', 'macos-x64'];

// Tools whose backend cannot produce per-platform checksums, so the
// checksum half of this gate is skipped for them BY NAME. The version half is
// not: a bump in .devcontainer/.env with a stale mise.lock still fails, which is
// the drift this file mostly exists to catch.
//
// This list must stay short and each entry must be justified here. An unexplained
// name is a hole, and a hole nobody wrote down is the failure mode this whole
// script is a reaction to.
//
//   rust — mise's `core:rust` backend delegates to rustup, which resolves and
//   downloads toolchains itself from static.rust-lang.org. mise never sees an
//   asset URL, so `mise lock` reports "0 platform entries (4 skipped)" and
//   writes a version-only entry no matter which backend is chosen (the
//   asdf:code-lever/asdf-rust alternative behaves identically — both were
//   tested). Integrity is therefore rustup's job rather than mise.lock's:
//   rustup verifies what it downloads against the signed channel manifests it
//   fetches over TLS. That is a real guarantee, but it is NOT the one the rest
//   of this lockfile provides, and the difference is why this is a named
//   exception rather than a silently relaxed rule.
const NO_PLATFORM_CHECKSUMS = new Set(['rust']);

const read = (p) => {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    console.error(`Cannot read ${p}`);
    process.exit(1);
  }
};

// --- the manifest ----------------------------------------------------------
const env = {};
for (const line of read(ENV_FILE).split('\n')) {
  const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].trim();
}

// --- declared tools --------------------------------------------------------
// Only the [tools] table. Stop at the next top-level table so an [env] or
// [settings] entry can never be mistaken for a tool.
const tomlSrc = read(TOML);

// FAIL CLOSED when the table cannot be found. Falling back to an empty section
// would leave `declared` empty, `problems` empty, and print
// "0 tools × 4 platforms verified" on the way to exit 0 — the gate silently
// disabling itself the moment the table is renamed or restructured. That is
// the same fail-open class this file exists to close.
const sections = tomlSrc.split(/^\[tools\]\s*$/m);
if (sections.length < 2) {
  console.error(`${TOML} has no [tools] table — nothing to verify.`);
  console.error('If the table moved or was renamed, update this script to match.');
  process.exit(1);
}
const toolsSection = sections[1].split(/^\[/m)[0];

const declared = new Map(); // name -> resolved version
const unresolved = [];

for (const raw of toolsSection.split('\n')) {
  const line = raw.replace(/#.*$/, '').trim();
  if (!line) continue;
  // Split on the FIRST `=` rather than matching the whole line with one
  // pattern. A tool name cannot contain `=`, so the first one is always the
  // top-level separator — which keeps this correct for the inline-table form
  // below, whose value contains further `=` signs. Doing it by index also
  // avoids an alternation followed by a greedy tail, which backtracks.
  const eq = line.indexOf('=');
  if (eq === -1) {
    // Same reasoning as above: an entry shaped differently than expected must
    // not be skipped into invisibility — that drops a tool out of the gate
    // without a word.
    unresolved.push(`cannot parse [tools] entry: ${line}`);
    continue;
  }
  const rawName = line.slice(0, eq).trim();
  const rhs = line.slice(eq + 1).trim();

  const quoted = /^"([^"]+)"$/.exec(rawName);
  const bare = /^[\w.:@/-]+$/.test(rawName);
  if (!quoted && !bare) {
    unresolved.push(`cannot parse [tools] entry: ${line}`);
    continue;
  }
  const name = quoted ? quoted[1] : rawName;

  // Two shapes are legal, and BOTH have to be read here rather than one being
  // quietly ignored:
  //   node = "24"                                   — plain version
  //   rust = { version = "1.97.1", components = … }  — inline table, which mise
  //                                                    requires once a tool
  //                                                    carries options
  // The table form previously landed in `unresolved`, which was right at the
  // time (nothing used it) but would now fail the gate on a correct manifest.
  // A table WITHOUT a version key still fails: that is a tool with no pin, the
  // exact thing this file exists to refuse.
  let spec;
  if (rhs.startsWith('{')) {
    const v = /\bversion\s*=\s*"([^"]*)"/.exec(rhs);
    if (!v) {
      unresolved.push(`${name}: inline table declares no version — ${line}`);
      continue;
    }
    spec = v[1];
  } else {
    const s = /^"([^"]*)"/.exec(rhs);
    if (!s) {
      unresolved.push(`cannot parse [tools] entry: ${line}`);
      continue;
    }
    spec = s[1];
  }

  const tpl = /^\{\{\s*env\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}$/.exec(spec);
  if (!tpl) {
    // A literal version here defeats the single-manifest rule.
    unresolved.push(`${name} = "${spec}" — hardcoded; move it to ${ENV_FILE} and template it`);
    continue;
  }
  const key = tpl[1];
  if (!(key in env)) {
    unresolved.push(`${name} templates {{ env.${key} }}, but ${key} is not set in ${ENV_FILE}`);
    continue;
  }
  declared.set(name, env[key]);
}

// Last fail-closed backstop: a [tools] table that yields no tools is either a
// mangled parse or an emptied toolchain. Neither is a passing state.
if (declared.size === 0) unresolved.push(`no tools parsed from [tools] in ${TOML}`);

// --- the lockfile ----------------------------------------------------------
// [[tools.NAME]] / [[tools."NAME"]] then `version = "..."`, and
// [tools.NAME."platforms.P"] section headers.
const lockSrc = read(LOCK);

const locked = new Map(); // name -> { versions:Set, platforms: Map<version,Set> }
let current = null;

for (const raw of lockSrc.split('\n')) {
  const line = raw.trim();

  const head = /^\[\[tools\.(?:"([^"]+)"|([^\]]+))\]\]$/.exec(line);
  if (head) {
    const name = head[1] ?? head[2];
    if (!locked.has(name)) locked.set(name, { versions: new Set(), platforms: new Map() });
    current = { name, version: null };
    continue;
  }

  if (current && !current.version) {
    const v = /^version\s*=\s*"([^"]+)"$/.exec(line);
    if (v) {
      current.version = v[1];
      locked.get(current.name).versions.add(v[1]);
      if (!locked.get(current.name).platforms.has(v[1]))
        locked.get(current.name).platforms.set(v[1], new Set());
      continue;
    }
  }

  const plat = /^\[tools\.(?:"([^"]+)"|([^.\]]+))\."platforms\.([^"]+)"\]$/.exec(line);
  if (plat) {
    const name = plat[1] ?? plat[2];
    const entry = locked.get(name);
    // Platform sections follow their [[tools.NAME]] block, so the most recent
    // version parsed for that tool is the one they belong to.
    if (entry && current && current.name === name && current.version)
      entry.platforms.get(current.version)?.add(plat[3]);
  }
}

// --- compare ---------------------------------------------------------------
const problems = [...unresolved];

for (const [name, version] of declared) {
  const entry = locked.get(name);
  if (!entry) {
    problems.push(`${name}: declared at ${version} but has NO entry in ${LOCK}`);
    continue;
  }
  if (!entry.versions.has(version)) {
    problems.push(
      `${name}: manifest pins ${version} but ${LOCK} has ${[...entry.versions].join(', ') || 'nothing'}`,
    );
    continue;
  }
  if (NO_PLATFORM_CHECKSUMS.has(name)) continue;
  const have = entry.platforms.get(version) ?? new Set();
  const missing = PLATFORMS.filter((p) => !have.has(p));
  if (missing.length > 0)
    problems.push(`${name}@${version}: no checksum for ${missing.join(', ')}`);
}

if (problems.length > 0) {
  console.error(`${LOCK} is out of sync with ${ENV_FILE}:\n`);
  for (const p of problems) console.error('  ' + p);
  console.error(
    '\nRegenerate and commit both files:\n' + '  mise lock -p ' + PLATFORMS.join(',') + '\n',
  );
  process.exit(1);
}

// --- second consumer: the gitleaks image tag in CI -------------------------
// gitleaks is the one tool pinned in TWO places, because it runs in two: the
// pre-commit hook resolves it through mise, and the CI job runs it as a
// container. If those drift, "it passed locally" silently stops being a claim
// about CI — both keep working, just as different scanners. Nothing else
// catches that, so it is checked here rather than left to a comment.
const SECURITY_WF = '.github/workflows/security.yml';
const tag = /zricethezav\/gitleaks:v(\d+\.\d+\.\d+)@sha256:/.exec(read(SECURITY_WF))?.[1];

if (tag !== env.GITLEAKS_VERSION) {
  console.error(
    `gitleaks pin mismatch:\n` +
      `  ${ENV_FILE} pins GITLEAKS_VERSION=${env.GITLEAKS_VERSION}\n` +
      `  ${SECURITY_WF} runs ${tag ? `v${tag}` : 'no pinned zricethezav/gitleaks image'}\n\n` +
      `The hook and the CI job must be the same scanner. Bump both — and when\n` +
      `bumping the workflow, re-resolve its digest, since the tag is pinned by one.\n`,
  );
  process.exit(1);
}

// The exempt tools are NAMED in the success line, not quietly subtracted. A
// gate that reports "12 tools verified" while two of them were skipped is how a
// hole stops being visible — the number would keep going up as coverage went
// down.
const exempt = [...declared.keys()].filter((n) => NO_PLATFORM_CHECKSUMS.has(n));
console.log(
  `mise.lock is in sync with ${ENV_FILE} ` +
    `(${declared.size - exempt.length} tools × ${PLATFORMS.length} platforms verified` +
    (exempt.length > 0 ? `; ${exempt.join(', ')} version-only, see NO_PLATFORM_CHECKSUMS` : '') +
    `), and ${SECURITY_WF} runs gitleaks v${tag} as pinned.`,
);
