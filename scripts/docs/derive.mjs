#!/usr/bin/env node
// Orchestrator for docs derivers.
//
// Usage:
//   node scripts/docs/derive.mjs            # write mode (regenerate all)
//   node scripts/docs/derive.mjs --check    # CI mode: regenerate then fail on diff
//
// Phase 1 wires only derive-cite-check.mjs. Subsequent phases register more.

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const args = process.argv.slice(2);
const checkMode = args.includes('--check');

// Each deriver: { name, script, mode: 'check-only' | 'writer' }
// 'check-only' derivers run in both write and check modes (they only validate).
// 'writer' derivers regenerate output; check mode re-runs them then `git diff`s.
const derivers = [
  { name: 'cite-check', script: 'derive-cite-check.mjs', mode: 'check-only' },
];

function run(cmd, cmdArgs, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, cmdArgs, { stdio: 'inherit', cwd: REPO_ROOT, ...opts });
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

async function gitDiffDirty() {
  return new Promise((resolve) => {
    const child = spawn('git', ['status', '--porcelain', '--', 'docs/', 'CLAUDE.md', '.docs-derive-manifest.json'], {
      cwd: REPO_ROOT,
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.on('exit', () => resolve(out.trim()));
    child.on('error', () => resolve(''));
  });
}

async function main() {
  let failed = 0;

  for (const d of derivers) {
    process.stdout.write(`\n— ${d.name} —\n`);
    const code = await run('node', [join(__dirname, d.script)]);
    if (code !== 0) failed++;
  }

  if (checkMode) {
    const dirty = await gitDiffDirty();
    if (dirty) {
      process.stderr.write(`\nderive --check: docs are dirty after regeneration:\n${dirty}\n`);
      process.stderr.write('Run `pnpm docs:derive` and commit the result.\n');
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
