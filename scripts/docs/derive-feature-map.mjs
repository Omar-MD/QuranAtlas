#!/usr/bin/env node
// Generate docs/context/feature-map.md as an auto-generated index of all
// surface dossiers.

import { writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { REPO_ROOT, listDossiers, readDossier } from './lib/scan.mjs';

const OUT = join(REPO_ROOT, 'docs', 'context', 'feature-map.md');

function firstHeading(body) {
  const m = /^#\s+(.+)$/m.exec(body);
  return m ? m[1] : '';
}

function firstBlockquote(body) {
  const m = /^>\s+(.+)$/m.exec(body);
  return m ? m[1] : '';
}

async function main() {
  const dossiers = await listDossiers();
  const rows = dossiers.map((p) => {
    const d = readDossier(p);
    const surface = d.frontmatter?.surface ?? basename(p, '.md');
    const heading = firstHeading(d.body);
    const blurb = firstBlockquote(d.body);
    return { surface, heading, blurb, file: `surfaces/${basename(p)}` };
  }).sort((a, b) => a.surface.localeCompare(b.surface));

  let out = '';
  out += '# Feature map\n\n';
  out += '> AUTO-GENERATED index of surface dossiers. Each dossier owns its own surface inventory + behavior + invariants. Run `pnpm run docs` to regenerate.\n\n';
  out += '<!-- AUTO-GENERATED:dossier-index START -->\n';
  out += '| Surface | Dossier | Purpose |\n';
  out += '| --- | --- | --- |\n';
  if (rows.length === 0) {
    out += '| _(no dossiers yet)_ | | |\n';
  } else {
    for (const r of rows) {
      out += `| **${r.surface}** | [\`${r.file}\`](${r.file}) | ${r.blurb || r.heading || ''} |\n`;
    }
  }
  out += '<!-- AUTO-GENERATED:dossier-index END -->\n';

  writeFileSync(OUT, out);
  process.stdout.write(`derive-feature-map: wrote ${OUT.replace(REPO_ROOT + '/', '')} — ${rows.length} dossier(s)\n`);
}

main().catch((err) => {
  process.stderr.write(`derive-feature-map: ${err?.stack ?? err}\n`);
  process.exit(1);
});
