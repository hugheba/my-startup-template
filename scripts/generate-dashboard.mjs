#!/usr/bin/env node
// Regenerates the `Services` group of .devcontainer/homepage/services.yaml from
// declarations that already exist — no new manifest, no new metadata format.
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
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const DEVCONTAINER = '.devcontainer/devcontainer.json';
const COMPOSE = '.devcontainer/docker-compose.yml';
const EXTRA = '.devcontainer/homepage/services.extra.yaml';
const OUT = '.devcontainer/homepage/services.yaml';

// The dashboard does not list itself.
const SELF_PORT = 8081;

// Compose service name for the workspace container — the fallback host for any
// port not published by a sidecar, i.e. served by a dev server running inside
// the workspace itself.
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

// --- which host serves each port -------------------------------------------
// Derived from compose rather than declared twice. A published mapping like
// `- '127.0.0.1:8080:8080'` means host port 8080 is served by that service, so
// the health check must address the SERVICE, not localhost.
function composePortOwners(text) {
  const owners = new Map();
  let service = null;
  for (const line of text.split('\n')) {
    const svc = /^ {2}([A-Za-z0-9._-]+):\s*$/.exec(line);
    if (svc) {
      service = svc[1];
      continue;
    }
    const pub = /^\s*-\s*['"]?(?:[\d.]+:)?(\d{2,5}):(\d{2,5})['"]?\s*$/.exec(line);
    if (pub && service) owners.set(Number(pub[1]), service);
  }
  return owners;
}

// Self-test, same convention as the gate scripts here: a pattern that quietly
// stops matching would send every health check to the wrong host, and the tiles
// would just sit grey with no explanation.
const OWNER_CASES = [
  ["  adminer:\n    ports:\n      - '127.0.0.1:8080:8080'", [[8080, 'adminer']]],
  ["  homepage:\n    ports:\n      - '127.0.0.1:8081:3000'", [[8081, 'homepage']]],
  ['  db:\n    ports:\n      - "5432:5432"', [[5432, 'db']]],
  ['  app:\n    build:\n      context: ..', []],
];
for (const [input, want] of OWNER_CASES) {
  const got = [...composePortOwners(input).entries()];
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    fail(
      `the compose port-owner parser is broken.\n` +
        `  input:    ${JSON.stringify(input)}\n` +
        `  expected: ${JSON.stringify(want)}\n  got:      ${JSON.stringify(got)}`,
    );
  }
}

if (!existsSync(COMPOSE)) fail(`${COMPOSE} not found — cannot resolve service hosts.`);
const owners = composePortOwners(readFileSync(COMPOSE, 'utf8'));

// --- build the tiles -------------------------------------------------------
const missingLabels = [];
const tiles = [];

for (const port of forwarded) {
  if (port === SELF_PORT) continue;
  const a = attrs[String(port)] ?? {};
  if (!a.label) {
    missingLabels.push(port);
    continue;
  }

  const browsable = a.protocol === 'http' || a.protocol === 'https';
  const scheme = a.protocol === 'https' ? 'https' : 'http';
  const owner = owners.get(port) ?? WORKSPACE_SERVICE;
  const served =
    owner === WORKSPACE_SERVICE ? 'process in the workspace container' : `container \`${owner}\``;

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
      `        siteMonitor: ${scheme}://${owner}:${port}\n`
    : '';

  tiles.push(`    - ${a.label}:\n${link}        description: port ${port} — ${served}\n`);
}

if (missingLabels.length > 0) {
  fail(
    `forwarded port(s) ${missingLabels.join(', ')} have no label.\n` +
      `  Add one under "portsAttributes" in ${DEVCONTAINER}:\n` +
      `    "${missingLabels[0]}": { "label": "My Service", "protocol": "http" }\n` +
      '  A tile with no name is worse than no tile.',
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

// `--check` makes this a gate as well as a generator, the same apply/check pair
// the devcontainer lifecycle steps use. The output is committed, so it can go
// stale the moment someone forwards a port without re-running — and a stale
// dashboard is worse than none, because it is confidently wrong about where a
// service lives. CI can run this to make that unmergeable.
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
