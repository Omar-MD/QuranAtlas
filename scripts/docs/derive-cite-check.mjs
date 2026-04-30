#!/usr/bin/env node
// Cite-rot check. Greps backtick-fenced repo-relative paths in CLAUDE.md and
// the load-bearing context docs, fails if any cited path does not exist on disk.
//
// Scope: CLAUDE.md, docs/context/**, docs/workflow/**, docs/tech-stack.md,
// docs/product-info.md. Historical docs (docs/superpowers/{plans,specs,notes,
// verification}, docs/audits/, docs/specs/) are point-in-time artifacts; their
// cites are expected to drift and are NOT validated.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const TOP_LEVEL_DIRS = ['src', 'tests', 'docs', 'scripts', 'public', 'patches', 'data'];
const ROOT_FILES_RE = /^[A-Z][A-Z0-9_-]*\.md$|^package\.json$|^tsconfig.*\.json$|^vite\.config\.[jt]s$|^vitest\.config\.[jt]s$|^playwright\.config\.[jt]s$/;

const CITE_RE = /`([^`\n]+)`/g;

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

async function loadBearingDocs() {
  const docs = join(REPO_ROOT, 'docs');
  const out = [
    join(REPO_ROOT, 'CLAUDE.md'),
    join(docs, 'tech-stack.md'),
    join(docs, 'product-info.md'),
  ];
  for (const sub of ['context', 'workflow']) {
    const dir = join(docs, sub);
    if (existsSync(dir)) await walk(dir, out);
  }
  return out;
}

function isCheckablePath(s) {
  if (!s || s.length > 200) return false;
  if (s.includes(' ') || s.includes('\n')) return false;
  if (s.startsWith('http://') || s.startsWith('https://')) return false;
  // Template placeholders: <surface>, <Feature>, NNN, MMM, XXX, YYYY-MM-DD
  if (s.includes('<') || s.includes('>')) return false;
  if (/\b(NNN|MMM|XXX|YYY|YYYY-MM-DD)\b/.test(s)) return false;
  if (!s.includes('/')) {
    if (ROOT_FILES_RE.test(s)) return true;
    return false;
  }
  const top = s.split('/')[0];
  if (!TOP_LEVEL_DIRS.includes(top)) return false;
  if (s.includes('*') || s.includes('{') || s.includes('?')) return false;
  if (s.endsWith('/')) return false;
  if (s.includes('://')) return false;
  return /\.[a-zA-Z0-9]{1,8}$/.test(s) || s.split('/').length >= 3;
}

function stripFragment(s) {
  let r = s;
  const hashIdx = r.indexOf('#');
  if (hashIdx !== -1) r = r.slice(0, hashIdx);
  const symIdx = r.indexOf('::');
  if (symIdx !== -1) r = r.slice(0, symIdx);
  r = r.replace(/:\d+(?::\d+)?$/, '');
  return r;
}

function loadAllowlist() {
  const file = join(REPO_ROOT, 'scripts', 'docs', 'cite-check.allowlist');
  if (!existsSync(file)) return new Set();
  const text = readFileSync(file, 'utf8');
  const out = new Set();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    out.add(trimmed);
  }
  return out;
}

async function main() {
  const targets = await loadBearingDocs();
  const allowlist = loadAllowlist();
  const allowlistHits = new Set();

  const broken = [];
  let cited = 0;

  for (const file of targets) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
    let m;
    CITE_RE.lastIndex = 0;
    while ((m = CITE_RE.exec(text))) {
      const raw = m[1].trim();
      const path = stripFragment(raw);
      if (!isCheckablePath(path)) continue;
      cited++;
      const abs = join(REPO_ROOT, path);
      const exists = existsSync(abs) && (() => { try { statSync(abs); return true; } catch { return false; } })();
      if (allowlist.has(path)) {
        allowlistHits.add(path);
        if (exists) {
          process.stderr.write(
            `derive-cite-check: allowlist entry \`${path}\` now exists on disk — remove from scripts/docs/cite-check.allowlist\n`,
          );
        }
        continue;
      }
      if (!exists) {
        broken.push({ file: relative(REPO_ROOT, file), cite: path });
      }
    }
  }

  const stale = [...allowlist].filter((p) => !allowlistHits.has(p));
  if (stale.length > 0) {
    process.stderr.write(`derive-cite-check: ${stale.length} stale allowlist entry/entries (no longer cited):\n`);
    for (const p of stale) process.stderr.write(`  ${p}\n`);
  }

  if (broken.length === 0 && stale.length === 0) {
    process.stdout.write(`derive-cite-check: ${cited} cite(s) verified across ${targets.length} doc(s) — clean\n`);
    process.exit(0);
  }

  if (broken.length > 0) {
    process.stderr.write(`derive-cite-check: ${broken.length} broken cite(s) of ${cited} validated\n`);
    for (const b of broken) {
      process.stderr.write(`  ${b.file}: \`${b.cite}\`\n`);
    }
  }
  process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`derive-cite-check: error ${err?.stack ?? err}\n`);
  process.exit(2);
});
