#!/usr/bin/env node
// Generate docs/context/module-graph.md from src/ import scan.
//
// Per top-level src/<dir>: imports-from / imported-by tables + mermaid graph.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './lib/scan.mjs';
import { scanImports, dirOf } from './lib/source-scan.mjs';

const OUT = join(REPO_ROOT, 'docs', 'context', 'module-graph.md');

function resolveSpec(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const fromDir = fromFile.split('/').slice(0, -1).join('/');
  const parts = (fromDir + '/' + spec).split('/');
  const stack = [];
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '..') stack.pop();
    else stack.push(p);
  }
  return stack.join('/');
}

async function main() {
  const importsByFile = await scanImports();

  const dirGraph = new Map();
  const fileToDir = new Map();
  for (const file of importsByFile.keys()) {
    fileToDir.set(file, dirOf(file));
  }

  for (const [file, specs] of importsByFile) {
    const fromDir = fileToDir.get(file);
    if (!dirGraph.has(fromDir)) dirGraph.set(fromDir, { imports: new Set(), importedBy: new Set() });
    for (const spec of specs) {
      const resolved = resolveSpec(file, spec);
      if (!resolved) continue;
      let toDir = null;
      for (const candidate of [
        resolved + '.ts', resolved + '.js', resolved + '.svelte',
        resolved + '/index.ts', resolved + '/index.js',
      ]) {
        if (fileToDir.has(candidate)) { toDir = fileToDir.get(candidate); break; }
      }
      if (!toDir) {
        const parts = resolved.split('/');
        if (parts[0] === 'src' && parts.length > 1) toDir = `src/${parts[1]}`;
      }
      if (!toDir || toDir === fromDir) continue;
      dirGraph.get(fromDir).imports.add(toDir);
      if (!dirGraph.has(toDir)) dirGraph.set(toDir, { imports: new Set(), importedBy: new Set() });
      dirGraph.get(toDir).importedBy.add(fromDir);
    }
  }

  const dirs = [...dirGraph.keys()].sort();

  let out = '';
  out += '# Module graph\n\n';
  out += '> AUTO-GENERATED from `src/**/*.{ts,js,svelte}` import statements. Run `pnpm run docs` to regenerate.\n\n';
  out += `Top-level src directories: **${dirs.length}**.\n\n`;

  out += '## Mermaid (top-level)\n\n';
  out += '<!-- AUTO-GENERATED:mermaid START -->\n';
  out += '```mermaid\ngraph LR\n';
  const safe = (s) => s.replace(/[^a-zA-Z0-9_]/g, '_');
  for (const d of dirs) out += `  ${safe(d)}["${d}"]\n`;
  for (const d of dirs) {
    const imps = [...dirGraph.get(d).imports].sort();
    for (const t of imps) out += `  ${safe(d)} --> ${safe(t)}\n`;
  }
  out += '```\n';
  out += '<!-- AUTO-GENERATED:mermaid END -->\n\n';

  out += '## Per-directory\n\n';
  out += '<!-- AUTO-GENERATED:dirs START -->\n';
  for (const d of dirs) {
    const node = dirGraph.get(d);
    const imps = [...node.imports].sort();
    const ibs = [...node.importedBy].sort();
    out += `### \`${d}\`\n\n`;
    out += `- **Imports from:** ${imps.length === 0 ? '_(none)_' : imps.map((x) => `\`${x}\``).join(', ')}\n`;
    out += `- **Imported by:** ${ibs.length === 0 ? '_(none)_' : ibs.map((x) => `\`${x}\``).join(', ')}\n\n`;
  }
  out += '<!-- AUTO-GENERATED:dirs END -->\n';

  writeFileSync(OUT, out);
  process.stdout.write(`derive-module-graph: wrote ${OUT.replace(REPO_ROOT + '/', '')} — ${dirs.length} dirs\n`);
}

main().catch((err) => {
  process.stderr.write(`derive-module-graph: ${err?.stack ?? err}\n`);
  process.exit(1);
});
