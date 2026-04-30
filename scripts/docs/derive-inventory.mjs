#!/usr/bin/env node
// Per-dossier `inventory` block: glob src_paths from frontmatter, emit table
// with file path + one-line role from leading file comment.

import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO_ROOT, listDossiers, readDossier, listSrcFiles, matchGlob } from './lib/scan.mjs';
import { loadManifest, saveManifest, writeBlockToFile } from './lib/blocks.mjs';

function leadingComment(text) {
  const lines = text.split('\n').slice(0, 30);
  for (const line of lines) {
    const m = /^\s*(?:\/\*\*?\s*|\*\s*|\/\/\s*)(.+?)\s*\*?\/?$/.exec(line);
    if (m && !m[1].startsWith('eslint') && !/^\s*$/.test(m[1])) {
      const txt = m[1].replace(/[*/]+$/, '').trim();
      if (txt.length > 3) return txt.length > 100 ? txt.slice(0, 97) + '...' : txt;
    }
    if (/^(import |export |const |function |class |type )/.test(line)) break;
  }
  return '';
}

async function main() {
  const dossiers = await listDossiers();
  const srcFiles = (await listSrcFiles()).map((f) => relative(REPO_ROOT, f));
  const manifest = loadManifest();
  let changed = 0;

  for (const path of dossiers) {
    const d = readDossier(path);
    if (!d.frontmatter?.src_paths) continue;
    const patterns = Array.isArray(d.frontmatter.src_paths) ? d.frontmatter.src_paths : [d.frontmatter.src_paths];
    const matched = srcFiles.filter((f) => patterns.some((p) => matchGlob(p, f))).sort();

    let body = '| Path | Role |\n| --- | --- |\n';
    if (matched.length === 0) {
      body += '| _(no files match `src_paths`)_ | |\n';
    } else {
      for (const f of matched) {
        const text = readFileSync(join(REPO_ROOT, f), 'utf8');
        const role = leadingComment(text) || '_(no leading comment)_';
        body += `| \`${f}\` | ${role} |\n`;
      }
    }

    const result = writeBlockToFile(path, 'inventory', body, manifest);
    if (result.changed) changed++;
  }

  saveManifest(manifest);
  process.stdout.write(`derive-inventory: ${dossiers.length} dossier(s) scanned, ${changed} block(s) updated\n`);
}

main().catch((err) => {
  process.stderr.write(`derive-inventory: ${err?.stack ?? err}\n`);
  process.exit(1);
});
