#!/usr/bin/env node
// Enforces the exact-pinning directive in AGENTS.md: every dependency in every
// workspace package.json must be an exact version — no ^, ~, >=, x-ranges, *,
// or dist-tags. Without this gate the directive is decorative: one `pnpm add`
// re-introduces a caret and nobody notices until a transitive bump breaks a
// build that "changed nothing".
//
// Allowed non-exact specifiers are protocol links, which name a location rather
// than a version and cannot carry a range.
import { existsSync, globSync, readFileSync } from 'node:fs';

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
const PROTOCOL = /^(workspace|link|file|catalog|npm|git|github|https?):/;
const EXACT = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

// `npx pkg@latest` inside a script is a dependency too — it just isn't declared
// as one, so the loops below never saw it. It resolves at run time, which means
// two people running the same script on the same commit get different bytes:
// exactly the failure the directive exists to prevent, arriving through the one
// door the gate left open.
//
// Leading flags are skipped (`npx -y pkg@1.2.3`, `npx --package=x pkg@1.2.3`).
// An invocation with no `@` carries no version to check and is left alone —
// this gate is about loose pins, and flagging every unversioned `npx tsc`
// would be noise.
//
// The version class must include the range operators. Matching only
// `[\w.+-]` looks right and passes on `@latest`, but silently fails to match
// `pkg@^2.0.0` at all — so the one specifier shape this gate most exists to
// catch would sail through as "no match, nothing to flag".
const DLX =
  /\b(?:npx|npm exec|pnpm dlx|yarn dlx|bunx)\s+(?:-{1,2}[\w-]+(?:[= ][\w./-]+)?\s+)*(@?[\w./-]+)@([\w.\-+^~<>=|*]+)/g;

// DLX is the only regex here complex enough to be wrong in a way that looks
// right, and its failure mode is silent: a pattern that stops matching flags
// nothing and reports success. So it checks itself on every run — no I/O, no
// framework, microseconds, and no way to skip it. Each `null` case is a
// false-positive guard; each pair is a shape that must keep matching.
const DLX_CASES = [
  ['npx -y bmad-method@latest install', 'bmad-method@latest'],
  ['pnpm dlx @scope/tool@1.2.3 run', '@scope/tool@1.2.3'],
  ['npx --package=foo bar@^2.0.0', 'bar@^2.0.0'],
  ['npx foo@>=1.0.0', 'foo@>=1.0.0'],
  ['npx foo@~1.2.0', 'foo@~1.2.0'],
  ['npx foo@*', 'foo@*'],
  ['bunx create-thing@next', 'create-thing@next'],
  ['npx foo@1.2.3 | tee log', 'foo@1.2.3'],
  ['npx tsc --noEmit', null],
  ['git clone git@github.com:o/r.git', null],
  ['ssh user@host echo hi', null],
];

for (const [input, want] of DLX_CASES) {
  const [m] = [...input.matchAll(DLX)];
  const got = m ? `${m[1]}@${m[2]}` : null;
  if (got !== want) {
    console.error(
      `verify-exact-deps.mjs: the DLX pattern is broken — it is no longer detecting what it claims to.\n` +
        `  input:    ${input}\n  expected: ${want}\n  got:      ${got}\n` +
        `Fix the pattern before trusting this gate; as-is it can pass while unpinned invocations exist.`,
    );
    process.exit(2);
  }
}

// Actions are dependencies too, and the loosest ones in the repo: `uses: foo/bar@v4`
// re-resolves on every run to whatever that tag points at right now, and a tag is
// mutable — the owner can move it, delete it, or lose the account. This gate only
// ever read package.json, so the exact-pinning directive stopped at the repo
// boundary while third-party code ran with write access to the checkout. A 40-hex
// commit SHA is the only ref GitHub cannot repoint.
//
// Local actions (`./...`) are skipped: they are this repo's own files at this
// repo's own commit, already pinned by the checkout that fetched them.
// Case-insensitive on purpose: git parses object IDs in either case and GitHub
// resolves an uppercase ref (normalizing to lowercase), so a hand-pasted
// uppercase SHA is a valid pin. Rejecting it would fail with "must be a
// 40-character commit SHA" against something that already is one.
const SHA = /^[0-9a-f]{40}$/i;
const USES = /^\s*(?:-\s+)?uses:\s+['"]?([^'"\s]+)/;

// Same reasoning as DLX_CASES: a pattern that quietly stops matching reports zero
// violations, which is indistinguishable from a clean repo. Each `null` is a
// false-positive guard; each pair is a shape that must keep matching.
const USES_CASES = [
  [
    `      - uses: actions/checkout@${'a'.repeat(40)} # v7.0.1`,
    `actions/checkout@${'a'.repeat(40)}`,
  ],
  ['        uses: snyk/actions/node@master', 'snyk/actions/node@master'],
  ['      - uses: "docker/login-action@v4"', 'docker/login-action@v4'],
  ['      - uses: ./.github/actions/setup', './.github/actions/setup'],
  ['        run: echo uses: not-an-action@v1', null],
  ['      # uses: actions/checkout@v7', null],
];

for (const [input, want] of USES_CASES) {
  const m = USES.exec(input);
  const got = m ? m[1] : null;
  if (got !== want) {
    console.error(
      `verify-exact-deps.mjs: the USES pattern is broken — it is no longer detecting what it claims to.\n` +
        `  input:    ${input}\n  expected: ${want}\n  got:      ${got}\n` +
        `Fix the pattern before trusting this gate; as-is it can pass while unpinned actions exist.`,
    );
    process.exit(2);
  }
}

// pnpm overrides pin transitive dependencies; a range here defeats the point of
// the override. The KEY may be a range (it is a selector, e.g. "postcss@<8.5.10");
// only the VALUE it resolves to must be exact.
//
// They live in pnpm-workspace.yaml as of pnpm 11 — this gate used to read
// `pkg.pnpm.overrides`, a field pnpm no longer reads either. Left alone it would
// have gone on reporting success while checking nothing, which is the exact
// failure mode that moving the settings was meant to end.
//
// A YAML dependency for one flat map is not worth it. Selectors may be quoted
// and may contain spaces, `@`, `<` and `>=`, but never a colon — so the first
// colon always separates key from value.
const unquote = (s) => {
  const t = s.trim();
  const q = t[0];
  if (q === "'" || q === '"') return t.slice(1, t.indexOf(q, 1));
  return t.split(/\s/)[0]; // bare scalar: stop at whitespace, dropping any trailing comment
};

const parseOverrides = (yaml) => {
  const out = {};
  let inBlock = false;
  for (const line of yaml.split('\n')) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    if (/^overrides:\s*$/.test(line)) {
      inBlock = true;
      continue;
    }
    if (!inBlock) continue;
    if (!/^\s/.test(line)) break; // next top-level key ends the block
    const i = line.indexOf(':');
    if (i !== -1) out[unquote(line.slice(0, i))] = unquote(line.slice(i + 1));
  }
  return out;
};

// Same reasoning as DLX_CASES and USES_CASES: a parser that quietly stops
// matching yields zero overrides, which is indistinguishable from having none.
const OVERRIDES_CASES = [
  ['overrides:\n  a: 1.0.0\n', { a: '1.0.0' }],
  ["overrides:\n  'p@<8.5.18': '8.5.18'\n", { 'p@<8.5.18': '8.5.18' }],
  ["overrides:\n  'b@>=2.0.0 <5.0.8': '5.0.8'\n", { 'b@>=2.0.0 <5.0.8': '5.0.8' }],
  ['overrides:\n  a: 1.0.0 # trailing comment\n', { a: '1.0.0' }],
  ['overrides:\n  # comment\n  a: ^1.0.0\n\nnodeLinker: hoisted\n', { a: '^1.0.0' }],
  ['nodeLinker: hoisted\n', {}],
];

for (const [input, want] of OVERRIDES_CASES) {
  const got = parseOverrides(input);
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    console.error(
      `verify-exact-deps.mjs: the overrides parser is broken — it is no longer reading what it claims to.\n` +
        `  input:    ${JSON.stringify(input)}\n  expected: ${JSON.stringify(want)}\n  got:      ${JSON.stringify(got)}\n` +
        `Fix it before trusting this gate; as-is it can pass while loose overrides exist.`,
    );
    process.exit(2);
  }
}

// `exclude` prunes the walk rather than filtering afterwards, which matters:
// without it the glob descends into every node_modules directory. It receives
// string paths on the Node versions this repo pins (verified on 24.x), but the
// option also accepts a Dirent shape, so normalize instead of assuming — a
// wrong assumption here would silently widen what gets scanned.
const skip = (entry) => {
  const name = typeof entry === 'string' ? entry : entry.name;
  return name.includes('node_modules') || name.includes('.next') || name.includes('.remember');
};

const files = globSync('**/package.json', { exclude: skip });
const workflows = globSync('.github/workflows/*').filter((f) => /\.ya?ml$/.test(f));

const violations = [];

for (const file of files.sort()) {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    continue;
  }

  for (const field of DEP_FIELDS) {
    for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
      if (typeof spec !== 'string' || PROTOCOL.test(spec)) continue;
      if (!EXACT.test(spec)) violations.push(`${file}  ${field}.${name} = "${spec}"`);
    }
  }

  for (const [name, script] of Object.entries(pkg.scripts ?? {})) {
    if (typeof script !== 'string') continue;
    for (const [, tool, spec] of script.matchAll(DLX)) {
      if (!EXACT.test(spec)) violations.push(`${file}  scripts.${name} runs ${tool}@${spec}`);
    }
  }
}

for (const file of workflows.sort()) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const m = USES.exec(line);
      if (!m || m[1].startsWith('./')) return;
      // No `@` at all leaves the whole ref, which is never 40-hex — also a violation.
      if (!SHA.test(m[1].slice(m[1].lastIndexOf('@') + 1))) {
        violations.push(`${file}:${i + 1}  uses: ${m[1]}`);
      }
    });
}

// MCP servers are dependencies with an unusually short path to execution: Claude
// Code spawns `command args...` directly, so `npx -y pkg@latest` here runs
// whatever was published minutes ago, with the developer's environment and
// credentials, and no review anywhere in between. The invocation is the same
// shape the DLX pattern already reads — it is just split across two JSON fields
// instead of sitting in one script string, which is the only reason this file
// was invisible to the gate.
//
// Absent file means no MCP servers, which is legitimate for a stripped-down
// fork. Present but unreadable is not: that is the silent-success case the
// overrides cross-check below also guards against.
const MCP = '.mcp.json';
let mcpServers = {};
if (existsSync(MCP)) {
  try {
    mcpServers = JSON.parse(readFileSync(MCP, 'utf8')).mcpServers ?? {};
  } catch (err) {
    console.error(
      `verify-exact-deps.mjs: ${MCP} exists but could not be parsed — ${err.message}\n` +
        'Refusing to report success on MCP servers this gate did not actually read.',
    );
    process.exit(2);
  }
}

for (const [name, server] of Object.entries(mcpServers)) {
  if (typeof server?.command !== 'string') continue; // http/sse servers run no command
  const invocation = [server.command, ...(server.args ?? [])].join(' ');
  for (const [, tool, spec] of invocation.matchAll(DLX)) {
    if (!EXACT.test(spec)) violations.push(`${MCP}  mcpServers.${name} runs ${tool}@${spec}`);
  }
}

const WORKSPACE = 'pnpm-workspace.yaml';
const workspaceYaml = readFileSync(WORKSPACE, 'utf8');
const overrides = parseOverrides(workspaceYaml);

// The parser returning nothing is indistinguishable from there being nothing to
// return, so cross-check the one thing that can tell them apart.
if (/^overrides:\s*$/m.test(workspaceYaml) && Object.keys(overrides).length === 0) {
  console.error(
    `verify-exact-deps.mjs: ${WORKSPACE} declares an \`overrides:\` block but none were parsed.\n` +
      'Refusing to report success on overrides this gate did not actually read.',
  );
  process.exit(2);
}

for (const [selector, spec] of Object.entries(overrides)) {
  if (PROTOCOL.test(spec)) continue;
  if (!EXACT.test(spec)) violations.push(`${WORKSPACE}  overrides["${selector}"] = "${spec}"`);
}

if (violations.length > 0) {
  console.error('Dependencies must be pinned to an exact version (see AGENTS.md):\n');
  for (const v of violations) console.error('  ' + v);
  console.error(
    `\n${violations.length} loose specifier(s). For a declared dependency, use the version pnpm` +
      '\nresolved (`pnpm why <pkg>` or the pnpm-lock.yaml importer entry) and re-run `pnpm install`.' +
      '\nFor an `npx`/`dlx` invocation there is nothing installed to inspect — take the version from' +
      '\n`npm view <pkg> version` and pin it in the script.' +
      '\nFor a workflow `uses:` ref, resolve the tag to the commit it points at with' +
      '\n`gh api repos/<owner>/<repo>/commits/<tag> --jq .sha` and keep the tag as a trailing' +
      '\ncomment (`@<sha> # v4.1.2`) — Renovate reads that comment to bump the pin later.',
  );
  process.exit(1);
}

console.log(
  `All dependency specifiers are exact (${files.length} package.json, ${workflows.length} workflow files, ` +
    `${Object.keys(overrides).length} pnpm overrides, ${Object.keys(mcpServers).length} MCP servers checked).`,
);
