#!/usr/bin/env node
// Fails if any file under src/ (excluding allow-listed dirs/files)
// declares a top-level mutable `let` or `var` at column 0.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'src'
const ALLOW_LIST = new Set([
  // DOM-handle plumbing — permitted module-scoped lets per spec section 5
  'src/reader/index.js',
  'src/reader/edge-indicators.js',
  // Scroll observer handles and working position state
  'src/reader/scroll-tracker.js',
  // Media query refs for theme auto-detection
  'src/settings/theme.js',
  // DOM element refs for settings panel sheet
  'src/settings/panel.js',
  // Marks cache for verse indicator decoration
  'src/marks/indicator.js',
  // DOM modal refs and call-ID sequencing for mark editor
  'src/marks/editor.js',
  // Init sequence counter to prevent stale renders
  'src/about/index.js',
  // Deferred browser install prompt ref
  'src/about/pwa-install.js',
  // BroadcastChannel handlers and banner DOM ref
  'src/safety/sync.js',
  // Runtime working arrays (loaded marks cache) and handler refs
  'src/review/hub.js',
  // Screen-reader live-region DOM element ref
  'src/a11y/announcer.js',
  // Init sequence counter to prevent stale renders
  'src/surahs/list.js',
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
