#!/usr/bin/env node
// Fails if any file under src/ (excluding allow-listed dirs/files)
// declares a top-level mutable `let` or `var` at column 0.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'src'
const ALLOW_LIST = new Set([
  // Screen-reader live-region DOM element ref
  'src/a11y/announcer.js',
  // Surah meta cache and handler refs for reader actions
  'src/navigate/reader-actions.js',
  // DOM element refs for shortcuts sheet
  'src/navigate/shortcuts-sheet.js',
])
const SKIP_DIRS = new Set(['state', 'core', 'offline', 'service-worker'])
const SKIP_FILES = new Set(['sw.js', 'sw-handlers.js'])

const offenders = []

function walk(dir) {
  // Dirent objects carry .isDirectory() so we don't need a separate statSync —
  // avoids a TOCTOU race between stat + readFile.
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const name = entry.name
    const path = join(dir, name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue
      walk(path)
    } else if (name.endsWith('.js') && !SKIP_FILES.has(name) && !ALLOW_LIST.has(path)) {
      const text = readFileSync(path, 'utf8')
      // Top-level let/var = declaration at column 0 (no leading whitespace)
      const matches = text.match(/^(let|var)\s+\w+/gm)
      if (matches) offenders.push({ path, matches })
    }
  }
}

walk(ROOT)

if (offenders.length) {
  console.error('❌ Top-level mutable state in feature modules:')
  for (const { path, matches } of offenders) {
    console.error(`  ${path}: ${matches.join(', ')}`)
  }
  process.exit(1)
}
console.log('✅ no top-level mutable state in feature modules')
