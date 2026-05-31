#!/usr/bin/env node
// Asserts .vscode/extensions.json and .devcontainer/devcontainer.json
// list the exact same extensions in the exact same order. Fails CI if they drift.

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

const stripJsonComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const loadJsonc = async (path) => JSON.parse(stripJsonComments(await readFile(path, 'utf8')));

const vscode = await loadJsonc(resolve(repoRoot, '.vscode/extensions.json'));
const devcontainer = await loadJsonc(resolve(repoRoot, '.devcontainer/devcontainer.json'));

const fromVscode = vscode.recommendations ?? [];
const fromDevcontainer = devcontainer.customizations?.vscode?.extensions ?? [];

const fmt = (arr) => arr.map((e) => `  - ${e}`).join('\n');

if (JSON.stringify(fromVscode) !== JSON.stringify(fromDevcontainer)) {
  console.error('✗ VS Code extension lists drift between .vscode/ and .devcontainer/');
  console.error('\n.vscode/extensions.json recommendations:');
  console.error(fmt(fromVscode));
  console.error('\n.devcontainer/devcontainer.json customizations.vscode.extensions:');
  console.error(fmt(fromDevcontainer));
  process.exit(1);
}

console.log(`✓ ${fromVscode.length} extensions in sync between .vscode/ and .devcontainer/`);
