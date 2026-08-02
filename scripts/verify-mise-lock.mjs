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
  const m = /^("([^"]+)"|[A-Za-z0-9_.:@/-]+)\s*=\s*"([^"]*)"/.exec(line);
  if (!m) {
    // Same reasoning as above: an entry shaped differently than this regex
    // expects (`node = { version = "24" }`, say) must not be skipped into
    // invisibility — that drops a tool out of the gate without a word.
    unresolved.push(`cannot parse [tools] entry: ${line}`);
    continue;
  }
  const name = m[2] ?? m[1];
  const spec = m[3];

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

console.log(
  `mise.lock is in sync with ${ENV_FILE} ` +
    `(${declared.size} tools × ${PLATFORMS.length} platforms verified).`,
);
