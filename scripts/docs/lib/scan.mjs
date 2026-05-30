// Shared scan / glob / frontmatter helpers for docs derivers.

import { readFileSync, existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(__dirname, '..', '..', '..');

export const SRC_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs']);

export async function walkFiles(dir, predicate, out = []) {
  if (!existsSync(dir)) return out;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await walkFiles(full, predicate, out);
    else if (predicate(full, e.name)) out.push(full);
  }
  return out;
}

export async function listSrcFiles() {
  return walkFiles(join(REPO_ROOT, 'src'), (full) => {
    const dot = full.lastIndexOf('.');
    if (dot < 0) return false;
    return SRC_EXTENSIONS.has(full.slice(dot));
  });
}

export async function listDossiers() {
  const dir = join(REPO_ROOT, 'docs', 'context', 'surfaces');
  if (!existsSync(dir)) return [];
  return walkFiles(dir, (full) => full.endsWith('.md'));
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n/;

export function parseFrontmatter(text) {
  const m = FRONTMATTER_RE.exec(text);
  if (!m) return { frontmatter: null, body: text };
  return { frontmatter: parseYaml(m[1]), body: text.slice(m[0].length) };
}

// Tiny purpose-built YAML subset parser. Supports: scalar string, list of
// strings (`- foo` or `[a, b]`), nested object one level deep.
function parseYaml(src) {
  const out = {};
  const lines = src.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }
    const m = /^([a-z_][a-z0-9_]*):\s*(.*)$/i.exec(line);
    if (!m) { i++; continue; }
    const key = m[1];
    const rest = m[2].trim();
    if (rest !== '') {
      out[key] = parseScalarOrList(rest);
      i++;
      continue;
    }
    const childLines = [];
    i++;
    while (i < lines.length && (/^\s+/.test(lines[i]) || /^\s*$/.test(lines[i]))) {
      childLines.push(lines[i]);
      i++;
    }
    if (childLines.length === 0) {
      out[key] = {};
      continue;
    }
    const dashCount = childLines.filter((l) => /^\s*-\s/.test(l)).length;
    const colonCount = childLines.filter((l) => /^\s+[a-z_][a-z0-9_]*:/i.test(l)).length;
    if (dashCount > 0 && colonCount === 0) {
      out[key] = childLines
        .map((l) => /^\s*-\s*(.*)$/.exec(l))
        .filter(Boolean)
        .map((m) => stripQuotes(m[1].trim()))
        .filter(Boolean);
    } else {
      out[key] = parseNestedObject(childLines);
    }
  }
  return out;
}

function parseNestedObject(childLines) {
  const child = {};
  let j = 0;
  while (j < childLines.length) {
    const cl = childLines[j];
    if (/^\s*$/.test(cl)) { j++; continue; }
    const cm = /^\s+([a-z_][a-z0-9_]*):\s*(.*)$/i.exec(cl);
    if (!cm) { j++; continue; }
    const ckey = cm[1];
    const crest = cm[2].trim();
    if (crest !== '') {
      child[ckey] = parseScalarOrList(crest);
      j++;
      continue;
    }
    const baseIndent = (cl.match(/^\s+/) ?? [''])[0].length;
    const grandChildLines = [];
    j++;
    while (j < childLines.length) {
      const gl = childLines[j];
      const ind = (gl.match(/^\s+/) ?? [''])[0].length;
      if (gl.trim() === '' || ind > baseIndent) {
        grandChildLines.push(gl);
        j++;
      } else {
        break;
      }
    }
    const dashCount = grandChildLines.filter((l) => /^\s*-\s/.test(l)).length;
    const colonCount = grandChildLines.filter((l) => /^\s+[a-z_][a-z0-9_]*:/i.test(l)).length;
    if (dashCount > 0 && colonCount === 0) {
      child[ckey] = grandChildLines
        .map((l) => /^\s*-\s*(.*)$/.exec(l))
        .filter(Boolean)
        .map((m) => stripQuotes(m[1].trim()))
        .filter(Boolean);
    } else {
      child[ckey] = parseNestedObject(grandChildLines);
    }
  }
  return child;
}

function parseScalarOrList(s) {
  if (s.startsWith('[') && s.endsWith(']')) {
    return s.slice(1, -1).split(',').map((x) => stripQuotes(x.trim())).filter(Boolean);
  }
  return stripQuotes(s);
}

function stripQuotes(s) {
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
}

export function readDossier(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(text);
  return { path: filePath, relPath: relative(REPO_ROOT, filePath), text, frontmatter, body };
}

export function matchGlob(pattern, relPath) {
  const re = globToRegExp(pattern);
  return re.test(relPath);
}

export function globToRegExp(pattern) {
  let re = '^';
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') {
      re += '.*';
      i += 2;
      if (pattern[i] === '/') i++;
    } else if (c === '*') {
      re += '[^/]*';
      i++;
    } else if (c === '?') {
      re += '[^/]';
      i++;
    } else if ('.+^$|()[]{}\\'.includes(c)) {
      re += '\\' + c;
      i++;
    } else {
      re += c;
      i++;
    }
  }
  re += '$';
  return new RegExp(re);
}

export async function statSafe(file) {
  try { return await stat(file); } catch { return null; }
}
