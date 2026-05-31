#!/usr/bin/env node
/**
 * Interactive project rename script.
 *
 * Walks the repo (excluding lockfiles, build artifacts, git, docs/superpowers)
 * and rewrites every `my-startup-template` and `@my-startup-template/*` reference
 * to a user-chosen name. Then re-runs `pnpm install` so workspace links resolve
 * under the new scope.
 *
 * Usage:
 *   pnpm rename:project
 *
 * Run once after cloning the template. Safe to re-run if you need to rename again.
 */

import { execSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const OLD_NAME = 'my-startup-template';
const OLD_SCOPE = '@my-startup-template';

// Directories to skip entirely
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.turbo',
  '.vercel',
  'dist',
  'out',
  '.pnpm-store',
  '.venv',
  '__pycache__',
  '.ruff_cache',
  '.pytest_cache',
]);

// Files to skip (matched against basename)
const SKIP_FILES = new Set([
  'pnpm-lock.yaml',
  'uv.lock',
  'rename-template.mjs', // don't rewrite ourselves
]);

// Path prefixes (relative to repo root) to skip — historical/design docs
const SKIP_PATH_PREFIXES = ['docs/superpowers/'];

// npm package name validation (simplified — see https://docs.npmjs.com/cli/v10/configuring-npm/package-json#name)
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,213}$/;

const ask = async (rl, q) => (await rl.question(q)).trim();

async function validateName(name) {
  if (!name) return 'Name cannot be empty.';
  if (name === OLD_NAME) return `Name cannot be the unchanged template name (${OLD_NAME}).`;
  if (!NAME_PATTERN.test(name)) {
    return 'Name must be lowercase, 1–214 chars, start with a letter/digit, and contain only [a-z0-9-].';
  }
  return null;
}

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) continue;
      const rel = relative(REPO_ROOT, full).replace(/\\/g, '/');
      if (SKIP_PATH_PREFIXES.some((p) => rel.startsWith(p))) continue;
      yield full;
    }
  }
}

async function isBinary(filePath) {
  // Heuristic: read first 8KB, treat as binary if it contains a null byte
  try {
    const buf = await readFile(filePath);
    const sample = buf.subarray(0, 8192);
    return sample.includes(0);
  } catch {
    return true;
  }
}

async function rewriteFile(filePath, newName, newScope) {
  if (await isBinary(filePath)) return { changed: false };
  const original = await readFile(filePath, 'utf8');
  // Replace scoped references first so we don't double-replace
  let next = original.split(OLD_SCOPE).join(newScope);
  next = next.split(OLD_NAME).join(newName);
  if (next === original) return { changed: false };
  await writeFile(filePath, next);
  return { changed: true };
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('\nRename project from "my-startup-template" to your project name\n');
  console.log('This will rewrite every "my-startup-template" and "@my-startup-template/*"');
  console.log('reference across the repo (excluding lockfiles, node_modules, docs/superpowers,');
  console.log('and build artifacts), then re-run `pnpm install` to refresh workspace links.\n');

  let newName;
  while (true) {
    newName = await ask(rl, 'New project name (kebab-case, e.g. acme-app): ');
    const err = await validateName(newName);
    if (!err) break;
    console.error(`  x ${err}`);
  }

  const newScope = `@${newName}`;
  const confirm = await ask(
    rl,
    `\nReplace "${OLD_NAME}" -> "${newName}" and "${OLD_SCOPE}/*" -> "${newScope}/*"? [y/N] `,
  );
  if (confirm.toLowerCase() !== 'y') {
    console.log('Aborted. No changes made.');
    rl.close();
    process.exit(0);
  }
  rl.close();

  console.log('\nScanning files...');
  const changes = [];
  for await (const file of walk(REPO_ROOT)) {
    const result = await rewriteFile(file, newName, newScope);
    if (result.changed) {
      changes.push(relative(REPO_ROOT, file));
    }
  }

  console.log(`\nRewrote ${changes.length} file(s):`);
  for (const f of changes) console.log(`  - ${f}`);

  console.log('\nRunning `pnpm install` to refresh workspace links...');
  execSync('pnpm install', { cwd: REPO_ROOT, stdio: 'inherit' });

  console.log(`\nDone. Review the changes with \`git status\` and \`git diff\`, then commit:\n`);
  console.log(`   git add -A && git commit -m "chore: rename project to ${newName}"`);
  console.log(`\nNext: \`pnpm bmad:init\` to bootstrap BMAD.`);
}

main().catch((err) => {
  console.error('\nx Rename failed:', err);
  process.exit(1);
});
