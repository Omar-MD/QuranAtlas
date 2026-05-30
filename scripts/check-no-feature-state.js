#!/usr/bin/env node
// Fails if any file under src/ (excluding allow-listed dirs/files)
// declares a top-level mutable `let` or `var` at column 0.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'src'
const ALLOW_LIST = new Set([
  // Small module-level browser integration handles are allowed when documented.
  'src/app/settings-overlay-events.ts',
  'src/app/routes/settings/pwa-install.ts',
  'src/components/navigation/nav-drawer-controller.ts',
  'src/continuity/recent-surahs.ts',
  'src/continuity/wird/use-wird-reminder-scheduler.ts',
  'src/storage/db.ts',
])
const SKIP_DIRS = new Set([])
const SKIP_FILES = new Set([])

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
    } else if (/\.(js|ts|tsx)$/.test(name) && !SKIP_FILES.has(name) && !ALLOW_LIST.has(path)) {
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
