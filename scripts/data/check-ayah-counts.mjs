#!/usr/bin/env node

/**
 * Quran ayah-count invariants for `data -- check`.
 *
 * The TS-side list (src/continuity/verse-key.ts QURAN_AYAH_COUNTS) must equal
 * the build-side canonical list (scripts/data/lib/ayah.mjs HAFS_AYAH_COUNTS).
 * Node cannot import the TS module, so the literal is text-parsed.
 */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { HAFS_AYAH_COUNTS } from './lib/ayah.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')
const VERSE_KEY_TS = join(REPO_ROOT, 'src', 'continuity', 'verse-key.ts')
const SURAH_COUNT = 114
const TOTAL_AYAT = 6236

function fail(message) {
  console.error(`[check-ayah-counts] FAIL: ${message}`)
  process.exit(1)
}

let verseKeySource
try {
  verseKeySource = await readFile(VERSE_KEY_TS, 'utf8')
} catch (error) {
  fail(`cannot read ${VERSE_KEY_TS}: ${error.message}`)
}
const countsMatch = /export const QURAN_AYAH_COUNTS = \[([\s\S]*?)\] as const/.exec(verseKeySource)
if (!countsMatch) fail(`cannot find the QURAN_AYAH_COUNTS array literal in ${VERSE_KEY_TS}`)
const tsCounts = countsMatch[1]
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map(Number)
if (tsCounts.some((count) => !Number.isInteger(count) || count < 1)) {
  fail(`QURAN_AYAH_COUNTS in ${VERSE_KEY_TS} contains a non-positive-integer entry`)
}
if (tsCounts.length !== SURAH_COUNT) {
  fail(`QURAN_AYAH_COUNTS has ${tsCounts.length} entries, expected ${SURAH_COUNT}`)
}
if (HAFS_AYAH_COUNTS.length !== SURAH_COUNT) {
  fail(`HAFS_AYAH_COUNTS has ${HAFS_AYAH_COUNTS.length} entries, expected ${SURAH_COUNT}`)
}
for (const [index, count] of tsCounts.entries()) {
  if (count !== HAFS_AYAH_COUNTS[index]) {
    fail(`ayah count mismatch at surah ${index + 1}: verse-key.ts ${count} !== lib/ayah.mjs ${HAFS_AYAH_COUNTS[index]}`)
  }
}
const total = tsCounts.reduce((sum, count) => sum + count, 0)
if (total !== TOTAL_AYAT) fail(`ayah counts sum to ${total}, expected ${TOTAL_AYAT}`)

console.log(`[check-ayah-counts] ayah counts OK (${SURAH_COUNT} entries match lib/ayah.mjs, ${TOTAL_AYAT} total)`)
