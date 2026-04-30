#!/usr/bin/env node
// Per-dossier `data-owned` + `data-read` blocks. Also writes the cross-cutting
// store→owner index in docs/context/data-model.md.

import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO_ROOT, listDossiers, readDossier, listSrcFiles, matchGlob } from './lib/scan.mjs';
import { loadManifest, saveManifest, writeBlockToFile } from './lib/blocks.mjs';

const STORE_REF_RE = (store) =>
  new RegExp(`(?:openStore|tx\\.objectStore|getStore|fromStore)\\(\\s*['"]${store}['"]\\s*\\)|['"]${store}['"]\\s*as\\s+const`, 'g');

async function main() {
  const dossiers = await listDossiers();
  const allDossiers = dossiers.map(readDossier);
  const srcFiles = (await listSrcFiles()).map((f) => relative(REPO_ROOT, f));
  const manifest = loadManifest();

  const ownership = new Map();
  for (const d of allDossiers) {
    const owns = d.frontmatter?.owns_stores;
    if (!owns) continue;
    const stores = Array.isArray(owns) ? owns : [owns];
    for (const s of stores) {
      if (ownership.has(s)) {
        process.stderr.write(`derive-data: WARNING — store '${s}' owned by both ${ownership.get(s).frontmatter.surface} and ${d.frontmatter.surface}\n`);
      }
      ownership.set(s, d);
    }
  }

  for (const d of allDossiers) {
    if (!d.frontmatter?.surface) continue;
    const surface = d.frontmatter.surface;
    const owns = Array.isArray(d.frontmatter?.owns_stores)
      ? d.frontmatter.owns_stores
      : (d.frontmatter?.owns_stores ? [d.frontmatter.owns_stores] : []);

    let ownedBody = owns.length === 0
      ? '_(none)_'
      : owns.map((s) => `- \`${s}\``).join('\n');

    const reads = new Map();
    const srcPaths = d.frontmatter?.src_paths;
    if (srcPaths) {
      const patterns = Array.isArray(srcPaths) ? srcPaths : [srcPaths];
      const matched = srcFiles.filter((f) => patterns.some((p) => matchGlob(p, f)));
      for (const [storeName, ownerDossier] of ownership) {
        if (ownerDossier.frontmatter.surface === surface) continue;
        for (const f of matched) {
          const text = readFileSync(join(REPO_ROOT, f), 'utf8');
          const re = STORE_REF_RE(storeName);
          if (re.test(text)) {
            if (!reads.has(storeName)) reads.set(storeName, []);
            reads.get(storeName).push(f);
            break;
          }
        }
      }
    }

    let readBody = reads.size === 0
      ? '_(no cross-surface reads detected)_'
      : [...reads.entries()].map(([s, files]) =>
          `- \`${s}\` (owner: \`${ownership.get(s).frontmatter.surface}\`) — read at ${files.map((f) => `\`${f}\``).join(', ')}`,
        ).join('\n');

    writeBlockToFile(d.path, 'data-owned', ownedBody, manifest);
    writeBlockToFile(d.path, 'data-read', readBody, manifest);
  }

  // Write cross-cutting store→owner index in data-model.md.
  const dataModelPath = join(REPO_ROOT, 'docs', 'context', 'data-model.md');
  const stores = [...ownership.keys()].sort();
  let indexBody = '| Store | Owner dossier |\n| --- | --- |\n';
  if (stores.length === 0) {
    indexBody += '| _(no dossiers declare `owns_stores` yet)_ | |\n';
  } else {
    for (const s of stores) {
      const owner = ownership.get(s).frontmatter.surface;
      indexBody += `| \`${s}\` | [\`${owner}\`](surfaces/${owner}.md) |\n`;
    }
  }
  writeBlockToFile(dataModelPath, 'store-owner-index', indexBody, manifest);

  saveManifest(manifest);
  process.stdout.write(`derive-data: ${dossiers.length} dossier(s), ${stores.length} store(s) indexed\n`);
}

main().catch((err) => {
  process.stderr.write(`derive-data: ${err?.stack ?? err}\n`);
  process.exit(1);
});
