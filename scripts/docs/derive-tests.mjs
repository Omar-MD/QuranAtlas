#!/usr/bin/env node
// Per-dossier `tests` block: glob test_paths.{unit,e2e} and emit list.

import { relative } from 'node:path';
import { join } from 'node:path';
import { REPO_ROOT, listDossiers, readDossier, walkFiles, matchGlob } from './lib/scan.mjs';
import { loadManifest, saveManifest, writeBlockToFile } from './lib/blocks.mjs';

async function listTestFiles() {
  const dir = join(REPO_ROOT, 'tests');
  return walkFiles(dir, (full) => /\.(test|spec)\.[jt]sx?$/.test(full));
}

async function main() {
  const dossiers = await listDossiers();
  const allTests = (await listTestFiles()).map((f) => relative(REPO_ROOT, f));
  const manifest = loadManifest();

  for (const path of dossiers) {
    const d = readDossier(path);
    const tp = d.frontmatter?.test_paths;
    if (!tp) continue;

    const unitGlobs = Array.isArray(tp.unit) ? tp.unit : (tp.unit ? [tp.unit] : []);
    const e2eGlobs = Array.isArray(tp.e2e) ? tp.e2e : (tp.e2e ? [tp.e2e] : []);
    const unit = allTests.filter((f) => unitGlobs.some((p) => matchGlob(p, f))).sort();
    const e2e = allTests.filter((f) => e2eGlobs.some((p) => matchGlob(p, f))).sort();

    let body = '';
    body += `**Unit (${unit.length}):**\n\n`;
    body += unit.length === 0 ? '_(none)_\n' : unit.map((f) => `- \`${f}\``).join('\n') + '\n';
    body += `\n**E2E (${e2e.length}):**\n\n`;
    body += e2e.length === 0 ? '_(none)_\n' : e2e.map((f) => `- \`${f}\``).join('\n') + '\n';

    writeBlockToFile(d.path, 'tests', body, manifest);
  }

  saveManifest(manifest);
  process.stdout.write(`derive-tests: ${dossiers.length} dossier(s) scanned\n`);
}

main().catch((err) => {
  process.stderr.write(`derive-tests: ${err?.stack ?? err}\n`);
  process.exit(1);
});
