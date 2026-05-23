#!/usr/bin/env node
/**
 * @layer enforcement.
 *
 * Every CSS file in src/styles/ (excluding reset.css + base.css + index.css)
 * must wrap rules in an @layer block. Bare rules outside @layer beat layered
 * rules regardless of specificity — catastrophic for the cascade model.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, relative } from 'node:path'

const ALLOW_BARE = new Set(['reset.css', 'base.css', 'index.css'])

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

export function checkAtLayer(css, fileName) {
  const base = fileName.split('/').pop()
  if (ALLOW_BARE.has(base)) return { errors: [] }

  let remainder = stripComments(css)
  remainder = remainder.replace(/@layer[^;{]*;/g, '')
  remainder = remainder.replace(/@import[^;]*;/g, '')

  while (/@layer[^{]*\{/.test(remainder)) {
    const start = remainder.search(/@layer[^{]*\{/)
    const braceOpen = remainder.indexOf('{', start)
    let depth = 1
    let i = braceOpen + 1
    while (depth > 0 && i < remainder.length) {
      if (remainder[i] === '{') depth++
      else if (remainder[i] === '}') depth--
      i++
    }
    remainder = remainder.slice(0, start) + remainder.slice(i)
  }

  const bare = remainder.trim()
  if (bare.length > 0) {
    return { errors: [`bare rule outside @layer in ${fileName}: ${bare.slice(0, 120)}`] }
  }
  return { errors: [] }
}

function walk(dir, exts) {
  const out = []
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const isMain = process.argv[1] === __filename

if (isMain) {
  const repoRoot = resolve(__dirname, '..')
  const cssFiles = listStyleCheckFiles(repoRoot).map((path) => resolve(repoRoot, path))
  let anyError = false
  for (const path of cssFiles) {
    const rel = relative(repoRoot, path)
    const css = readFileSync(path, 'utf8')
    const { errors } = checkAtLayer(css, rel)
    for (const e of errors) {
      console.error(`[at-layer] ${e}`)
      anyError = true
    }
  }
  if (anyError) process.exit(1)
  console.log(`[at-layer] OK (${cssFiles.length} files scanned)`)
}
