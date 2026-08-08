#!/usr/bin/env node
// Regenerates two files under .devcontainer/homepage/ from declarations that
// already exist — no new manifest, no new metadata format:
//
//   services.yaml    the `Services` group, from devcontainer.json forwardPorts
//   bookmarks.yaml   the repo link, from the `origin` git remote
//
// Only services.yaml is drift-gated by `--check`; bookmarks.yaml differs per
// fork by design, and the reason is recorded beside the code that writes it.
//
// WHY devcontainer.json AND NOT THE PACKAGE MANIFESTS
// ---------------------------------------------------
// This container runs Node, JVM (Java/Kotlin/Quarkus), Rust and Python apps.
// Deriving ports from each ecosystem's own manifest would mean parsing
// package.json AND build.gradle AND Cargo.toml AND pyproject.toml, and getting a
// different answer from each about how a port is spelled. `forwardPorts` is the
// one place every one of them is already declared, in one syntax, because it is
// what VS Code itself reads to make the port reachable at all.
//
// So the rule is: if a service is worth forwarding, it is worth a tile, and it
// gets one for free. Nothing here is Node-specific.
//
// There is no runtime API to ask VS Code which ports it has forwarded from
// inside the container — forwarding is managed host-side. devcontainer.json is
// the declaration that drives it, which makes reading it equivalent, and it has
// the advantage of being committed and reviewable.
//
// ONLY STANDARD FIELDS ARE READ
// -----------------------------
// `portsAttributes` accepts a fixed schema (label, protocol, onAutoForward,
// requireLocalPort, elevateIfNeeded). Inventing extra keys there would work at
// runtime but put a permanent warning squiggle in devcontainer.json, so
// everything else this script needs is derived from docker-compose.yml instead.
//
//   label      -> the tile's name. Required; a tile with no name is worse than
//                 no tile, so a forwarded port without one is an error.
//   protocol   -> "http"/"https" makes the tile clickable and monitored.
//                 Absent means informational, which is what you want for
//                 Postgres, where a browser link would be meaningless.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const DEVCONTAINER = '.devcontainer/devcontainer.json';
const COMPOSE = '.devcontainer/docker-compose.yml';
const EXTRA = '.devcontainer/homepage/services.extra.yaml';
const OUT = '.devcontainer/homepage/services.yaml';
const BOOKMARKS = '.devcontainer/homepage/bookmarks.yaml';

// The dashboard does not list itself. Keyed on the SERVICE, not a port number:
// the port is a detail that can move, the service is the identity.
const SELF_SERVICE = 'homepage';

// Compose service name for the workspace container — the host for any entry
// written as a bare port number, i.e. a dev server running inside the workspace
// itself rather than in a sidecar.
const WORKSPACE_SERVICE = 'app';

// Line-based rather than a regex over the whole file. The comment-stripping
// pattern used elsewhere in this repo backtracks super-linearly on long inputs,
// and a loop is both faster and easier to be sure about.
function stripJsonComments(text) {
  const out = [];
  let inBlock = false;
  for (const line of text.split('\n')) {
    let result = '';
    let i = 0;
    let inString = false;
    while (i < line.length) {
      const two = line.slice(i, i + 2);
      if (inBlock) {
        if (two === '*/') {
          inBlock = false;
          i += 2;
        } else i += 1;
        continue;
      }
      const ch = line[i];
      if (inString) {
        if (ch === '\\') {
          result += line.slice(i, i + 2);
          i += 2;
          continue;
        }
        if (ch === '"') inString = false;
        result += ch;
        i += 1;
        continue;
      }
      if (ch === '"') {
        inString = true;
        result += ch;
        i += 1;
        continue;
      }
      if (two === '//') break; // rest of line is a comment
      if (two === '/*') {
        inBlock = true;
        i += 2;
        continue;
      }
      result += ch;
      i += 1;
    }
    out.push(result);
  }
  return out.join('\n');
}

const fail = (msg) => {
  console.error(`generate-dashboard.mjs: ${msg}`);
  process.exit(2);
};

// --- forwarded ports -------------------------------------------------------
let config;
try {
  config = JSON.parse(stripJsonComments(readFileSync(DEVCONTAINER, 'utf8')));
} catch (err) {
  fail(
    `could not parse ${DEVCONTAINER} — ${err.message}\n` +
      '  Refusing to write a dashboard from a file this script did not actually read.',
  );
}

const forwarded = config.forwardPorts ?? [];
const attrs = config.portsAttributes ?? {};

// FAIL CLOSED on an empty set: zero forwarded ports means either the key was
// renamed or the parse silently produced nothing, and a dashboard with no tiles
// looks identical to one that is simply not finished yet.
if (forwarded.length === 0) {
  fail(
    `${DEVCONTAINER} declares no forwardPorts.\n` +
      '  Refusing to write an empty dashboard — indistinguishable from a broken read.',
  );
}

// --- reading a forwardPorts entry ------------------------------------------
// Two forms, per the devcontainer spec: a bare number is a port in the PRIMARY
// container, and "service:port" is a port in a sibling Compose service. The
// distinction is the whole reason this function exists — a sidecar written as a
// bare number is forwarded from the primary container, where nothing listens,
// and nothing anywhere reports it.
function parseEntry(entry) {
  if (typeof entry === 'number') {
    return { key: String(entry), service: WORKSPACE_SERVICE, port: entry };
  }
  const m = /^([A-Za-z0-9._-]+):(\d{2,5})$/.exec(String(entry));
  if (!m) {
    fail(
      `forwardPorts entry ${JSON.stringify(entry)} is neither a port number nor "service:port".\n` +
        '  Use 3000 for the workspace container, or "adminer:8080" for a sidecar.',
    );
  }
  return { key: String(entry), service: m[1], port: Number(m[2]) };
}

// --- what compose actually publishes ---------------------------------------
// Not used to GUESS which service owns a port any more — the entry says so
// outright. This is the cross-check: it catches a `service:` that no longer
// exists, and a host/container port mismatch. Both render a permanently grey
// tile whose cause is invisible from the dashboard itself.
function composePublishes(text) {
  const pubs = new Map();
  let service = null;
  for (const line of text.split('\n')) {
    const svc = /^ {2}([A-Za-z0-9._-]+):\s*$/.exec(line);
    if (svc) {
      service = svc[1];
      continue;
    }
    const pub = /^\s*-\s*['"]?(?:[\d.]+:)?(\d{2,5}):(\d{2,5})['"]?\s*$/.exec(line);
    if (pub && service) {
      if (!pubs.has(service)) pubs.set(service, []);
      pubs.get(service).push([Number(pub[1]), Number(pub[2])]);
    }
  }
  return pubs;
}

// Self-test, same convention as the gate scripts here: a pattern that quietly
// stops matching would disable the cross-check rather than fail it, and a gate
// that silently stops checking is indistinguishable from one that passes.
const PUBLISH_CASES = [
  ["  adminer:\n    ports:\n      - '127.0.0.1:8080:8080'", [['adminer', [[8080, 8080]]]]],
  ["  homepage:\n    ports:\n      - '127.0.0.1:8081:8081'", [['homepage', [[8081, 8081]]]]],
  ['  db:\n    ports:\n      - "5432:5432"', [['db', [[5432, 5432]]]]],
  // Host and container deliberately differing — the parser must keep both, or
  // the mismatch check below can never fire.
  ["  odd:\n    ports:\n      - '127.0.0.1:8081:3000'", [['odd', [[8081, 3000]]]]],
  ['  app:\n    build:\n      context: ..', []],
];
for (const [input, want] of PUBLISH_CASES) {
  const got = [...composePublishes(input).entries()];
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    fail(
      `the compose publish parser is broken.\n` +
        `  input:    ${JSON.stringify(input)}\n` +
        `  expected: ${JSON.stringify(want)}\n  got:      ${JSON.stringify(got)}`,
    );
  }
}

if (!existsSync(COMPOSE)) fail(`${COMPOSE} not found — cannot cross-check service hosts.`);
const publishes = composePublishes(readFileSync(COMPOSE, 'utf8'));

// --- build the tiles -------------------------------------------------------
const missingLabels = [];
const tiles = [];

for (const entry of forwarded) {
  const { key, service, port } = parseEntry(entry);
  if (service === SELF_SERVICE) continue;

  // Cross-check every sidecar against compose. `app` is exempt: it publishes
  // nothing — VS Code forwards straight out of the primary container.
  if (service !== WORKSPACE_SERVICE) {
    const published = publishes.get(service);
    if (!published) {
      fail(
        `forwardPorts declares "${key}", but ${COMPOSE} has no service "${service}" publishing ports.\n` +
          '  A forward to a service that does not exist leaves a permanently grey tile\n' +
          '  and an unreachable URL, with nothing anywhere reporting why.',
      );
    }
    const mapping = published.find(([, container]) => container === port);
    if (!mapping) {
      fail(
        `forwardPorts declares "${key}", but service "${service}" publishes no container port ${port}.\n` +
          `  It publishes: ${published.map(([h, c]) => `${h}:${c}`).join(', ')}`,
      );
    }
    if (mapping[0] !== port) {
      fail(
        `"${key}" is published as ${mapping[0]}:${mapping[1]} in ${COMPOSE}.\n` +
          '  Host and container port must MATCH for a sidecar. Two routes reach it —\n' +
          `  Docker's published port (${mapping[0]}) and the devcontainer forward (${mapping[1]}) —\n` +
          '  and if they differ, the working URL depends on how you opened it.',
      );
    }
  }

  const a = attrs[key] ?? {};
  if (!a.label) {
    missingLabels.push(key);
    continue;
  }

  const browsable = a.protocol === 'http' || a.protocol === 'https';
  const scheme = a.protocol === 'https' ? 'https' : 'http';
  const served =
    service === WORKSPACE_SERVICE
      ? 'process in the workspace container'
      : `container \`${service}\``;

  // Two different hosts per tile, and getting them the wrong way round is the
  // easiest mistake here:
  //   href        opened by YOUR BROWSER, outside the container network.
  //               `localhost:<port>` works locally, and in a Codespace VS Code
  //               rewrites it to the forwarded URL automatically.
  //   siteMonitor fetched by the HOMEPAGE CONTAINER, inside that network, where
  //               `localhost` means Homepage itself. It must use the service
  //               name resolved above.
  const link = browsable
    ? `        href: ${scheme}://localhost:${port}\n` +
      `        siteMonitor: ${scheme}://${service}:${port}\n`
    : '';

  tiles.push(`    - ${a.label}:\n${link}        description: port ${port} — ${served}\n`);
}

if (missingLabels.length > 0) {
  fail(
    `forwarded port(s) ${missingLabels.join(', ')} have no label.\n` +
      `  Add one under "portsAttributes" in ${DEVCONTAINER}:\n` +
      `    "${missingLabels[0]}": { "label": "My Service", "protocol": "http" }\n` +
      '  The key must match the forwardPorts entry exactly, including any\n' +
      '  "service:" prefix. A tile with no name is worse than no tile.',
  );
}

// Hand-authored groups are appended verbatim. The generator owns exactly one
// group, so anything that is not a forwarded port — a connection string, a
// runbook link — has a home a regeneration cannot clobber.
const extra = existsSync(EXTRA) ? readFileSync(EXTRA, 'utf8') : '';

const header = [
  '# GENERATED by scripts/generate-dashboard.mjs — do not edit the Services group.',
  '#',
  '# Regenerate with `pnpm dashboard:sync`. Tiles come from forwardPorts and',
  `# portsAttributes in ${DEVCONTAINER}, so a dev server in ANY language appears`,
  '# just by being forwarded and labelled. Set `protocol` to make a tile',
  '# clickable and monitored; leave it off for non-HTTP services like Postgres.',
  `# Everything after the Services group is copied verbatim from ${EXTRA}.`,
  '',
].join('\n');

const doc =
  `${header}\n- Services:\n${tiles.join('')}` + (extra.trim() ? `\n${extra.trimEnd()}\n` : '');

// --- bookmarks -------------------------------------------------------------
// The one link on this dashboard that points OUTSIDE the container, so it is
// the only thing here that has to name a real repository.
//
// It is derived from `origin` rather than written down, because both of the
// obvious alternatives are wrong. A hardcoded owner survives
// `pnpm rename:project` — that rewrites the repo NAME and has no idea who the
// new owner is — so every fork gets a link to somebody else's repository,
// silently and plausibly enough that nobody re-checks it. A placeholder is
// honest but simply does not resolve, which is how this ended up being noticed.
//
// Deriving it makes the link correct for whoever runs the generator, fork
// included, with no per-fork edit to remember.
// Returns the browse base — HOST included. Taking only owner/repo and pasting
// it after a hardcoded github.com would send anyone on GitHub Enterprise to a
// github.com URL that either 404s or, worse, resolves to an unrelated public
// repo of the same name. That is the same "confidently wrong link" this whole
// function exists to avoid, just one level further in.
function originBase() {
  let url;
  try {
    url = execFileSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null; // no git, no remote, or a shallow/exported tree
  }
  // Every remote spelling git accepts, not just the two common ones: scp-like
  // (git@host:owner/repo.git), URL (https://host/owner/repo), and URL-with-
  // scheme-and-user (ssh://git@host/owner/repo.git), which GitHub Enterprise
  // hands out and which an owner/repo-shaped regex silently misses.
  //
  // An SSH port is captured and DISCARDED on purpose: `ssh://git@host:2222/...`
  // means git talks on 2222, while the web UI it is being linked to is on 443.
  // Carrying the port into the href would break every Enterprise link.
  const stripped = url.replace(/\.git$/, '');
  const m = /^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^@/]+@)?([^/:]+)(?::\d+)?[:/](.+)$/i.exec(stripped);
  if (!m) return null; // a local path, not a hosted remote
  const parts = m[2].split('/').filter(Boolean);
  return parts.length >= 2 ? `${m[1]}/${parts.slice(-2).join('/')}` : null;
}

const base = originBase();
const bookmarksDoc = [
  '# GENERATED by scripts/generate-dashboard.mjs — regenerate with `pnpm dashboard:sync`.',
  '#',
  '# Bookmarks are static links, not services: no status dot, no monitor. The URL',
  '# below is derived from your `origin` remote, so it stays correct in a fork',
  '# without anyone remembering to edit it.',
  '#',
  '# Deliberately NOT covered by `pnpm verify:dashboard`. The value depends on',
  '# which repository you cloned, so gating it would fail CI for every fork of',
  '# this template — a drift check only makes sense over something identical for',
  '# everyone, which this is not.',
  '- Project:',
  '    - AGENTS.md:',
  '        - abbr: AG',
  `          href: https://${base ?? 'github.com/your-org/your-repo'}/blob/main/AGENTS.md`,
  '',
].join('\n');

// `--check` makes this a gate as well as a generator, the same apply/check pair
// the devcontainer lifecycle steps use. The output is committed, so it can go
// stale the moment someone forwards a port without re-running — and a stale
// dashboard is worse than none, because it is confidently wrong about where a
// service lives. CI runs this in the required Lint + Typecheck + Build + Test
// job, which makes that unmergeable.
//
// Only services.yaml is compared — see the note above bookmarksDoc.
if (process.argv.includes('--check')) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current !== doc) {
    fail(
      `${OUT} is out of date with ${DEVCONTAINER}.\n` +
        '  Run `pnpm dashboard:sync` and commit the result.',
    );
  }
  console.log(`${OUT} is in sync with ${DEVCONTAINER} (${tiles.length} tile(s)).`);
  process.exit(0);
}

writeFileSync(OUT, doc);
console.log(`${OUT} regenerated — ${tiles.length} tile(s) from ${DEVCONTAINER}`);

writeFileSync(BOOKMARKS, bookmarksDoc);
if (base) {
  console.log(`${BOOKMARKS} regenerated — repo link points at ${base}`);
} else {
  console.warn(
    `${BOOKMARKS}: no readable "origin" remote, so the repo link is a placeholder.\n` +
      '  Re-run `pnpm dashboard:sync` once the remote is set.',
  );
}
