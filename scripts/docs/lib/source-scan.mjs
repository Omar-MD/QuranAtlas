// Source-code scanner for events + imports.

import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { REPO_ROOT, listSrcFiles } from './scan.mjs';

const EMIT_RE = /\bemit\(\s*Events\.([A-Z_]+)\s*[,)]/g;
const ON_RE = /\bon\(\s*Events\.([A-Z_]+)\s*,/g;
const IMPORT_RE = /^\s*import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/gm;

export async function scanEvents() {
  const files = await listSrcFiles();
  const emits = new Map();
  const listens = new Map();
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(REPO_ROOT, file);
    pushMatches(text, EMIT_RE, rel, emits);
    pushMatches(text, ON_RE, rel, listens);
  }
  return { emits, listens };
}

function pushMatches(text, re, rel, out) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text))) {
    const key = m[1];
    const line = lineOf(text, m.index);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push({ file: rel, line });
  }
}

function lineOf(text, idx) {
  let line = 1;
  for (let i = 0; i < idx; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

export function loadEventsConstant() {
  const path = `${REPO_ROOT}/src/core/constants.ts`;
  const text = readFileSync(path, 'utf8');
  const start = text.indexOf('export const Events');
  if (start < 0) return new Map();
  const open = text.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  const body = text.slice(open + 1, end);
  const out = new Map();
  const re = /([A-Z_][A-Z0-9_]*)\s*:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(body))) {
    out.set(m[1], m[2]);
  }
  return out;
}

export async function scanImports() {
  const files = await listSrcFiles();
  const result = new Map();
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(REPO_ROOT, file);
    const imports = [];
    IMPORT_RE.lastIndex = 0;
    let m;
    while ((m = IMPORT_RE.exec(text))) imports.push(m[1]);
    result.set(rel, imports);
  }
  return result;
}

export function dirOf(rel) {
  const parts = rel.split('/');
  if (parts[0] === 'src' && parts.length > 2) return `src/${parts[1]}`;
  return parts.slice(0, -1).join('/') || '.';
}
