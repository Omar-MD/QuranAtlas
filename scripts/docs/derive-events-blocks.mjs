#!/usr/bin/env node
// Per-dossier `events-emit` + `events-listen` blocks. Filters the global
// event scan by `src_paths` to show events emitted/listened from this surface.

import { REPO_ROOT, listDossiers, readDossier, matchGlob } from './lib/scan.mjs';
import { scanEvents, loadEventsConstant } from './lib/source-scan.mjs';
import { loadManifest, saveManifest, writeBlockToFile } from './lib/blocks.mjs';

async function main() {
  const dossiers = await listDossiers();
  const events = loadEventsConstant();
  const { emits, listens } = await scanEvents();
  const manifest = loadManifest();

  function filterSitesByPatterns(sitesMap, patterns) {
    const out = [];
    for (const [key, sites] of sitesMap) {
      const owned = sites.filter((s) => patterns.some((p) => matchGlob(p, s.file)));
      if (owned.length === 0) continue;
      out.push({ key, eventName: events.get(key) ?? '_(undeclared)_`', sites: owned });
    }
    return out.sort((a, b) => a.key.localeCompare(b.key));
  }

  for (const path of dossiers) {
    const d = readDossier(path);
    if (!d.frontmatter?.src_paths) continue;
    const patterns = Array.isArray(d.frontmatter.src_paths) ? d.frontmatter.src_paths : [d.frontmatter.src_paths];

    const e = filterSitesByPatterns(emits, patterns);
    const l = filterSitesByPatterns(listens, patterns);

    let emitBody = '| Event | Constant | Sites |\n| --- | --- | --- |\n';
    if (e.length === 0) emitBody += '| _(none)_ | | |\n';
    else for (const r of e) emitBody += `| \`${r.eventName}\` | \`Events.${r.key}\` | ${r.sites.map((s) => `\`${s.file}:${s.line}\``).join(', ')} |\n`;

    let listenBody = '| Event | Constant | Sites |\n| --- | --- | --- |\n';
    if (l.length === 0) listenBody += '| _(none)_ | | |\n';
    else for (const r of l) listenBody += `| \`${r.eventName}\` | \`Events.${r.key}\` | ${r.sites.map((s) => `\`${s.file}:${s.line}\``).join(', ')} |\n`;

    writeBlockToFile(d.path, 'events-emit', emitBody, manifest);
    writeBlockToFile(d.path, 'events-listen', listenBody, manifest);
  }

  saveManifest(manifest);
  process.stdout.write(`derive-events-blocks: ${dossiers.length} dossier(s) scanned\n`);
}

main().catch((err) => {
  process.stderr.write(`derive-events-blocks: ${err?.stack ?? err}\n`);
  process.exit(1);
});
