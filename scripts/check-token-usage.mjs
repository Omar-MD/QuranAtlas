#!/usr/bin/env node
/**
 * Token usage check.
 *
 * For every var(--qa-...) reference in CSS surface files + all .svelte files,
 * verify the token is declared in src/styles/tokens/semantic.css.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, relative } from 'node:path'

function walk(dir, exts) {
  const out = []
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
    const full = `${dir}/${entry}`
    const s = statSync(full)
    if (s.isDirectory()) out.push(...walk(full, exts))
    else if (exts.some(e => full.endsWith(e))) out.push(full)
  }
  return out
}

export function listStyleCheckFiles(repoRoot) {
  return walk(resolve(repoRoot, 'src/styles'), ['.css'])
    .map((path) => relative(repoRoot, path))
    .sort()
}

export function checkTokenUsage({ semantic, surfaceFiles }) {
  // Global declared set — from token CSS sources passed via `semantic`
  // (caller may concatenate primitives + motion + semantic). Also include
  // any `style:--X={...}` directives found in Svelte files, since those set
  // custom properties that global CSS can legitimately `var(--X)` against.
  const globalDeclared = new Set()
  for (const m of semantic.matchAll(/--(qa-[a-zA-Z0-9-]+)\s*:/g)) {
    globalDeclared.add(m[1])
  }
  for (const { path, content } of surfaceFiles) {
    if (!path.endsWith('.svelte')) continue
    // Svelte files may set custom properties via style:--X={} directive or
    // `style="--X: …"` / `style={`--X: …`}` attribute forms. Any --qa-X: or
    // style:--qa-X= appearing in a .svelte file is a legitimate declaration
    // that global surface CSS can legitimately consume via var(--qa-X).
    for (const m of content.matchAll(/style:--(qa-[a-zA-Z0-9-]+)\s*=/g)) {
      globalDeclared.add(m[1])
    }
    for (const m of content.matchAll(/--(qa-[a-zA-Z0-9-]+)\s*:/g)) {
      globalDeclared.add(m[1])
    }
  }

  const errors = []
  for (const { path, content } of surfaceFiles) {
    // File-local tokens: any --qa-* declared in the file itself (scoped custom
    // property pattern, e.g. style="--qa-chip-hue: red" or a --qa-x: foo rule
    // inside a <style>). Those are legitimate and don't need to live in
    // semantic.css.
    const localDeclared = new Set()
    // CSS `--foo: val;` form.
    for (const m of content.matchAll(/--(qa-[a-zA-Z0-9-]+)\s*:/g)) {
      localDeclared.add(m[1])
    }
    // Svelte `style:--foo={...}` directive form.
    for (const m of content.matchAll(/style:--(qa-[a-zA-Z0-9-]+)\s*=/g)) {
      localDeclared.add(m[1])
    }
    // Inline `style="--foo: val"` attribute — already caught by the CSS form above.

    const seen = new Set()
    for (const match of content.matchAll(/var\(\s*(--qa-[a-zA-Z0-9-]+)/g)) {
      const name = match[1].slice(2)
      if (seen.has(name)) continue
      seen.add(name)
      if (!globalDeclared.has(name) && !localDeclared.has(name)) {
        errors.push(`--${name} referenced in ${path} but not declared in token CSS or file-local scope`)
      }
    }
  }

  return { errors }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const isMain = process.argv[1] === __filename

if (isMain) {
  const repoRoot = resolve(__dirname, '..')
  const tokenSources = [
    'src/styles/tokens/primitives.css',
    'src/styles/tokens/motion.css',
    'src/styles/tokens/semantic.css',
  ].map(p => readFileSync(resolve(repoRoot, p), 'utf8')).join('\n')

  const cssFiles = listStyleCheckFiles(repoRoot).map((path) => resolve(repoRoot, path))
  const svelteFiles = walk(resolve(repoRoot, 'src'), ['.svelte'])

  const surfaceFiles = [
    ...cssFiles.map(p => ({ path: relative(repoRoot, p), content: readFileSync(p, 'utf8') })),
    ...svelteFiles.map(p => ({ path: relative(repoRoot, p), content: readFileSync(p, 'utf8') })),
  ]

  const { errors } = checkTokenUsage({ semantic: tokenSources, surfaceFiles })
  if (errors.length > 0) {
    for (const e of errors) console.error(`[token-usage] ${e}`)
    process.exit(1)
  }
  console.log(`[token-usage] OK (${surfaceFiles.length} files scanned)`)
}
