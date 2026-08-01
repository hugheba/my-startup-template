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
}

if (violations.length > 0) {
  console.error('Dependencies must be pinned to an exact version (see AGENTS.md):\n');
  for (const v of violations) console.error('  ' + v);
  console.error(
    `\n${violations.length} loose specifier(s). Replace each with the version pnpm resolved` +
      '\n(`pnpm why <pkg>` or the pnpm-lock.yaml importer entry), then re-run `pnpm install`.',
  );
  process.exit(1);
}

console.log(`All dependency specifiers are exact (${files.length} package.json files checked).`);
