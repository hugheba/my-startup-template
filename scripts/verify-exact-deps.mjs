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

if (violations.length > 0) {
  console.error('Dependencies must be pinned to an exact version (see AGENTS.md):\n');
  for (const v of violations) console.error('  ' + v);
  console.error(
    `\n${violations.length} loose specifier(s). For a declared dependency, use the version pnpm` +
      '\nresolved (`pnpm why <pkg>` or the pnpm-lock.yaml importer entry) and re-run `pnpm install`.' +
      '\nFor an `npx`/`dlx` invocation there is nothing installed to inspect — take the version from' +
      '\n`npm view <pkg> version` and pin it in the script.',
  );
  process.exit(1);
}

console.log(`All dependency specifiers are exact (${files.length} package.json files checked).`);
