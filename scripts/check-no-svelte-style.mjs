#!/usr/bin/env node
/**
 * Enforce: no `<style>` blocks inside any `.svelte` file.
 *
 * All per-surface CSS lives under `src/styles/surfaces/*.css`. This gate
 * prevents component-scoped style regressions post PR 13.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, relative } from 'node:path'

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
    const full = `${dir}/${entry}`
    const s = statSync(full)
    if (s.isDirectory()) walk(full, out)
    else if (full.endsWith('.svelte')) out.push(full)
  }
  return out
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')
const files = walk(resolve(repoRoot, 'src'))

const offenders = []
for (const f of files) {
  const content = readFileSync(f, 'utf8')
  if (/^<style[>\s]/m.test(content)) {
    offenders.push(relative(repoRoot, f))
  }
}

if (offenders.length > 0) {
  console.error('[no-svelte-style] `<style>` blocks found in:')
  for (const o of offenders) console.error(`  - ${o}`)
  console.error('\nAll per-surface CSS must live under src/styles/surfaces/*.css.')
  process.exit(1)
}
console.log(`[no-svelte-style] OK (${files.length} .svelte files scanned)`)
