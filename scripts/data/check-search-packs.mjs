#!/usr/bin/env node

/**
 * Search-pack contract invariants for `data -- check`.
 *
 * 1. Normalizer version contract (audit bug #4): every generated search-pack
 *    manifest under public/search-packs stamps normalizerVersion, and it must
 *    equal SEARCH_NORMALIZER_VERSION from the single-source normalizer core
 *    (shared/search/normalization-core.mjs). The same constant is asserted at
 *    pack load in src/search/pack-reader.ts; this is the build-time end, so a
 *    version bump without regenerating the packs fails the check.
 * 2. Hafs ayah counts (audit D36): the TS-side list
 *    (src/continuity/verse-key.ts QURAN_AYAH_COUNTS, re-exported by
 *    shared/search/answer-preview.ts) must equal the build-side canonical
 *    list (scripts/data/lib/ayah.mjs HAFS_AYAH_COUNTS). Node cannot import
 *    the TS module, so the literal is text-parsed.
 */

import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SEARCH_NORMALIZER_VERSION } from '../../shared/search/normalization-core.mjs'
import { HAFS_AYAH_COUNTS } from './lib/ayah.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')
const PACKS_ROOT = join(REPO_ROOT, 'public', 'search-packs', 'packs')
const VERSE_KEY_TS = join(REPO_ROOT, 'src', 'continuity', 'verse-key.ts')
const SURAH_COUNT = 114
const TOTAL_AYAT = 6236

function fail(message) {
  console.error(`[check-search-packs] FAIL: ${message}`)
  process.exit(1)
}

// 1. Every generated pack manifest stamps the core normalizer version.
let packDirs
try {
  packDirs = (await readdir(PACKS_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
} catch (error) {
  fail(`cannot list ${PACKS_ROOT}: ${error.message}`)
}
if (packDirs.length === 0) fail(`no generated search packs under ${PACKS_ROOT}`)

for (const packDir of packDirs) {
  const manifestPath = join(PACKS_ROOT, packDir, 'manifest.json')
  let manifest
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch (error) {
    fail(`cannot read ${manifestPath}: ${error.message}`)
  }
  if (manifest.normalizerVersion !== SEARCH_NORMALIZER_VERSION) {
    fail(
      `${packDir}/manifest.json normalizerVersion ${JSON.stringify(manifest.normalizerVersion)} does not match ` +
        `SEARCH_NORMALIZER_VERSION ${SEARCH_NORMALIZER_VERSION} (shared/search/normalization-core.mjs)`,
    )
  }
}

// 2. TS ayah-count literal equals the build-side canonical list.
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

console.log(
  `[check-search-packs] search packs OK (${packDirs.length} manifest normalizerVersion === ${SEARCH_NORMALIZER_VERSION}; ` +
    `${SURAH_COUNT} ayah counts match lib/ayah.mjs, ${TOTAL_AYAT} total)`,
)
