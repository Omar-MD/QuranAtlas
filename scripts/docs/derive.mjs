#!/usr/bin/env node
// Orchestrator for docs derivers.
//
// Usage:
//   node scripts/docs/derive.mjs            # write mode (regenerate all)
//   node scripts/docs/derive.mjs --check    # CI mode: regenerate then fail on diff
//
// Phase 1 wires only derive-cite-check.mjs. Subsequent phases register more.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const args = process.argv.slice(2);
const checkMode = args.includes('--check');
const CHECK_PATHS = ['docs/', 'AGENTS.md', '.docs-derive-manifest.json'];

// Each deriver: { name, script, mode: 'check-only' | 'writer' }
// 'check-only' derivers run in both write and check modes (they only validate).
// 'writer' derivers regenerate output; check mode re-runs them then `git diff`s.
//
// Order matters: derive-events / derive-module-graph / derive-feature-map
// produce full files; per-dossier derivers (inventory, data, tests,
// events-blocks) write fence blocks and update the manifest.
const derivers = [
  { name: 'cite-check',     script: 'derive-cite-check.mjs',     mode: 'check-only' },
  { name: 'events',         script: 'derive-events.mjs',         mode: 'writer' },
  { name: 'module-graph',   script: 'derive-module-graph.mjs',   mode: 'writer' },
  { name: 'inventory',      script: 'derive-inventory.mjs',      mode: 'writer' },
  { name: 'data',           script: 'derive-data.mjs',           mode: 'writer' },
  { name: 'tests',          script: 'derive-tests.mjs',          mode: 'writer' },
  { name: 'events-blocks',  script: 'derive-events-blocks.mjs',  mode: 'writer' },
  { name: 'feature-map',    script: 'derive-feature-map.mjs',    mode: 'writer' },
];

function run(cmd, cmdArgs, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, cmdArgs, { stdio: 'inherit', cwd: REPO_ROOT, ...opts });
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

async function gitStatusSnapshot() {
  return new Promise((resolve) => {
    const child = spawn('git', ['status', '--porcelain', '--', ...CHECK_PATHS], {
      cwd: REPO_ROOT,
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.on('exit', () => resolve(out.trim()));
    child.on('error', () => resolve(''));
  });
}

async function gitLines(args) {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd: REPO_ROOT });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.on('exit', () => resolve(out.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)));
    child.on('error', () => resolve([]));
  });
}

async function fileHashSnapshot() {
  const tracked = await gitLines(['ls-files', '--', ...CHECK_PATHS]);
  const untracked = await gitLines(['ls-files', '--others', '--exclude-standard', '--', ...CHECK_PATHS]);
  const files = [...new Set([...tracked, ...untracked])].sort();
  return Object.fromEntries(files.map((file) => {
    const path = join(REPO_ROOT, file);
    if (!existsSync(path)) return [file, 'missing'];
    if (!statSync(path).isFile()) return [file, 'not-file'];
    return [file, createHash('sha256').update(readFileSync(path)).digest('hex')];
  }));
}

async function main() {
  let failed = 0;
  const before = checkMode ? await gitStatusSnapshot() : '';
  const beforeHashes = checkMode ? await fileHashSnapshot() : {};

  for (const d of derivers) {
    process.stdout.write(`\n— ${d.name} —\n`);
    const code = await run('node', [join(__dirname, d.script)]);
    if (code !== 0) failed++;
  }

  if (checkMode) {
    const after = await gitStatusSnapshot();
    const afterHashes = await fileHashSnapshot();
    if (after !== before || JSON.stringify(afterHashes) !== JSON.stringify(beforeHashes)) {
      process.stderr.write(`\nderive --check: docs changed after regeneration:\n`);
      process.stderr.write(`before:\n${before || '(clean)'}\n`);
      process.stderr.write(`after:\n${after || '(clean)'}\n`);
      process.stderr.write('Run `pnpm run docs` and commit the result.\n');
      failed++;
    }
  }

  if (failed > 0) {
    process.stderr.write(`\nderive: ${failed} step(s) failed\n`);
    process.exit(1);
  }

  process.stdout.write('\nderive: all clean\n');
}

main().catch((err) => {
  process.stderr.write(`derive: ${err?.stack ?? err}\n`);
  process.exit(1);
});
