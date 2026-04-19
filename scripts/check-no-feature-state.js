#!/usr/bin/env node
// Fails if any file under src/ (excluding allow-listed dirs/files)
// declares a top-level mutable `let` or `var` at column 0.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'src'
const ALLOW_LIST = new Set([
  // Deferred browser install prompt ref
  'src/about/pwa-install.ts',
  // BroadcastChannel handlers and banner DOM ref
  'src/safety/sync.js',
  // Screen-reader live-region DOM element ref
  'src/a11y/announcer.js',
  // DOM element refs for ambient pill
  'src/nav/ambient-pill.js',
  // DOM element refs for more-sheet
  'src/nav/more-sheet.js',
  // Surah meta cache and handler refs for reader actions
  'src/nav/reader-actions.js',
  // DOM element refs and handler refs for command sheet
  'src/nav/command-sheet.js',
  // DOM element refs for shortcuts sheet
  'src/nav/shortcuts-sheet.js',
  // Scroll target and handler refs for ambient dock
  'src/nav/ambient-dock.js',
  // SW message handler and pending URL refs
  'src/data/offline.js',
])
const SKIP_DIRS = new Set(['state', 'core', 'offline'])
const SKIP_FILES = new Set(['sw.js', 'sw-handlers.js'])

const offenders = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) {
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
