#!/usr/bin/env node
// Enforces the exact-pinning directive in AGENTS.md: every dependency in every
// workspace package.json must be an exact version — no ^, ~, >=, x-ranges, *,
// or dist-tags. Without this gate the directive is decorative: one `pnpm add`
// re-introduces a caret and nobody notices until a transitive bump breaks a
// build that "changed nothing".
//
// Allowed non-exact specifiers are protocol links, which name a location rather
// than a version and cannot carry a range.
import { globSync, readFileSync } from 'node:fs';

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

  // pnpm overrides pin transitive dependencies; a range here defeats the point
  // of the override. The KEY may be a range (it is a selector, e.g.
  // "postcss@<8.5.10"); only the VALUE it resolves to must be exact.
  for (const [selector, spec] of Object.entries(pkg.pnpm?.overrides ?? {})) {
    if (typeof spec !== 'string' || PROTOCOL.test(spec)) continue;
    if (!EXACT.test(spec)) violations.push(`${file}  pnpm.overrides["${selector}"] = "${spec}"`);
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
      '\ncomment (`@<sha> # v4.1.2`) — Dependabot reads that comment to bump the pin later.',
  );
  process.exit(1);
}

console.log(
  `All dependency specifiers are exact (${files.length} package.json, ${workflows.length} workflow files checked).`,
);
