#!/usr/bin/env node
/**
 * Theme parity check.
 *
 * Parses src/styles/tokens/semantic.css. For every token defined inside a
 * `html[data-theme="..."] { ... }` block, verifies the token exists in
 * `:root { ... }`. Orphan overrides are errors.
 *
 * Exports checkThemeParity(css) -> { errors } for testing.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

function extractTokens(blockBody) {
  const tokens = new Set()
  for (const m of blockBody.matchAll(/--([a-zA-Z0-9-]+)\s*:/g)) {
    tokens.add(m[1])
  }
  return tokens
}

function findBlocks(css, selectorRegex) {
  const blocks = []
  const lines = css.split('\n')
  let depth = 0
  let currentSelector = null
  let currentBody = []
  let currentStartLine = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (depth === 0 && selectorRegex.test(trimmed) && line.includes('{')) {
      currentSelector = trimmed.replace(/\s*\{.*/, '')
      currentStartLine = i + 1
      currentBody = []
      depth = 1
      const afterBrace = line.slice(line.indexOf('{') + 1)
      for (const ch of afterBrace) {
        if (ch === '{') depth++
        else if (ch === '}') depth--
      }
      if (depth > 0) {
        if (afterBrace.trim()) currentBody.push(afterBrace)
      } else {
        // Block opened + closed on same line.
        const closeIdx = afterBrace.lastIndexOf('}')
        currentBody.push(afterBrace.slice(0, closeIdx))
        blocks.push({
          selector: currentSelector,
          body: currentBody.join('\n'),
          startLine: currentStartLine,
        })
        currentSelector = null
        currentBody = []
      }
      continue
    }

    if (depth > 0) {
      for (const ch of line) {
        if (ch === '{') depth++
        else if (ch === '}') depth--
      }
      if (depth > 0) {
        currentBody.push(line)
      } else {
        blocks.push({
          selector: currentSelector,
          body: currentBody.join('\n'),
          startLine: currentStartLine,
        })
        currentSelector = null
        currentBody = []
      }
    }
  }

  return blocks
}

export function checkThemeParity(css) {
  const rootBlocks = findBlocks(css, /^:root\s*\{/)
  const themeBlocks = findBlocks(css, /^html\[data-theme="[^"]+"\]\s*\{/)

  const rootTokens = new Set()
  for (const b of rootBlocks) {
    for (const t of extractTokens(b.body)) rootTokens.add(t)
  }

  const errors = []
  for (const tb of themeBlocks) {
    const themeName = tb.selector.match(/data-theme="([^"]+)"/)?.[1] ?? 'unknown'
    const themeTokens = extractTokens(tb.body)
    for (const token of themeTokens) {
      if (!rootTokens.has(token)) {
        errors.push(
          `--${token} defined in ${themeName} override but not defined in :root (${tb.selector} @ line ${tb.startLine})`,
        )
      }
    }
  }

  return { errors }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const isMain = process.argv[1] === __filename

if (isMain) {
  const semanticPath = resolve(__dirname, '../src/styles/tokens/semantic.css')
  const css = readFileSync(semanticPath, 'utf8')
  const { errors } = checkThemeParity(css)
  if (errors.length > 0) {
    for (const e of errors) console.error(`[theme-parity] ${e}`)
    process.exit(1)
  }
  console.log('[theme-parity] OK')
}
