#!/usr/bin/env node
// Generate docs/context/events.md (full file) from src/ scan.
//
// Source of truth: src/core/constants.ts `Events` map + emit(Events.X) /
// on(Events.X) call sites across src/**.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './lib/scan.mjs';
import { scanEvents, loadEventsConstant } from './lib/source-scan.mjs';

const OUT = join(REPO_ROOT, 'docs', 'context', 'events.md');

function fmtSites(sites) {
  if (!sites || sites.length === 0) return '_(none)_';
  return sites.map((s) => `\`${s.file}:${s.line}\``).join('<br>');
}

async function main() {
  const events = loadEventsConstant();
  const { emits, listens } = await scanEvents();

  const allKeys = new Set([...events.keys(), ...emits.keys(), ...listens.keys()]);
  const rows = [...allKeys].sort().map((key) => {
    const eventName = events.get(key) ?? '_(undeclared)_';
    return {
      key,
      eventName,
      emits: emits.get(key) ?? [],
      listens: listens.get(key) ?? [],
    };
  });

  const dead = rows.filter((r) => r.emits.length === 0 && r.listens.length === 0);
  const orphanEmit = rows.filter((r) => r.emits.length > 0 && r.listens.length === 0);
  const orphanListen = rows.filter((r) => r.emits.length === 0 && r.listens.length > 0);

  let out = '';
  out += '# Events catalog\n\n';
  out += '> AUTO-GENERATED from `src/core/constants.ts` (Events map) + `emit(Events.X)` / `on(Events.X)` call sites across `src/**`. Run `pnpm docs:derive` to regenerate. Manual edits below the next paragraph are preserved (write them outside the auto-generated table).\n\n';
  out += `Total events declared: **${events.size}**. Live emits: **${emits.size}**. Live listeners: **${listens.size}**.\n\n`;
  out += `Dead (declared but neither emitted nor listened): **${dead.length}**.\n`;
  out += `Orphan emit (emitted, never listened): **${orphanEmit.length}**.\n`;
  out += `Orphan listen (listened, never emitted): **${orphanListen.length}**.\n\n`;

  out += '## Catalog\n\n';
  out += '<!-- AUTO-GENERATED:catalog START -->\n';
  out += '| Constant | Event name | Emit sites | Listen sites |\n';
  out += '| --- | --- | --- | --- |\n';
  for (const r of rows) {
    out += `| \`Events.${r.key}\` | \`${r.eventName}\` | ${fmtSites(r.emits)} | ${fmtSites(r.listens)} |\n`;
  }
  out += '<!-- AUTO-GENERATED:catalog END -->\n\n';

  if (dead.length > 0) {
    out += '## Dead events\n\n';
    out += 'Declared in `Events` but neither emitted nor listened. Candidate for deletion.\n\n';
    out += '<!-- AUTO-GENERATED:dead START -->\n';
    for (const r of dead) out += `- \`Events.${r.key}\` (\`${r.eventName}\`)\n`;
    out += '<!-- AUTO-GENERATED:dead END -->\n\n';
  }

  if (orphanEmit.length > 0) {
    out += '## Orphan emits (no listener)\n\n';
    out += '<!-- AUTO-GENERATED:orphan-emit START -->\n';
    for (const r of orphanEmit) out += `- \`Events.${r.key}\` (\`${r.eventName}\`) — emitted at ${fmtSites(r.emits)}\n`;
    out += '<!-- AUTO-GENERATED:orphan-emit END -->\n\n';
  }

  if (orphanListen.length > 0) {
    out += '## Orphan listeners (no emitter)\n\n';
    out += '<!-- AUTO-GENERATED:orphan-listen START -->\n';
    for (const r of orphanListen) out += `- \`Events.${r.key}\` (\`${r.eventName}\`) — listened at ${fmtSites(r.listens)}\n`;
    out += '<!-- AUTO-GENERATED:orphan-listen END -->\n\n';
  }

  writeFileSync(OUT, out);
  process.stdout.write(`derive-events: wrote ${OUT.replace(REPO_ROOT + '/', '')} — ${rows.length} events catalogued\n`);
}

main().catch((err) => {
  process.stderr.write(`derive-events: ${err?.stack ?? err}\n`);
  process.exit(1);
});
