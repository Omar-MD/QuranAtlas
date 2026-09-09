#!/usr/bin/env node

/**
 * Juz/hizb index invariants for `data -- check`.
 *
 * Guards the canonical division tables against drift (audit bugs #2 and #14):
 *   1. hizb 2N−1 must start exactly at juz N's start ayah (N = 1..30);
 *   2. the src juz table must equal the canonical 30-entry list, explicitly
 *      pinning the two historically drifted entries (juz 4 = 3:93,
 *      juz 11 = 9:94);
 *   3. generated public/dataset/juz.json must match the src juz table;
 *   4. the src modules must still consume the shared JSON tables, so the
 *      division tables stay single-sourced.
 *
 * The canonical list below is embedded on purpose: it is the independent
 * reference the src tables and the generator output are compared against, so
 * flipping any invariant input fails `data -- check`.
 */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')

// Canonical juz starts as [surah, verse] pairs, juz N at index N - 1.
const CANONICAL_JUZ_STARTS = [
  [1, 1],
  [2, 142],
  [2, 253],
  [3, 93],
  [4, 24],
  [4, 148],
  [5, 82],
  [6, 111],
  [7, 88],
  [8, 41],
  [9, 94],
  [11, 6],
  [12, 53],
  [15, 1],
  [17, 1],
  [18, 75],
  [21, 1],
  [23, 1],
  [25, 21],
  [27, 56],
  [29, 46],
  [33, 31],
  [36, 28],
  [39, 32],
  [41, 47],
  [46, 1],
  [51, 31],
  [58, 1],
  [67, 1],
  [78, 1],
]

function fail(message) {
  console.error(`[check-juz-hizb] FAIL: ${message}`)
  process.exit(1)
}

async function readJsonFile(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    return fail(`cannot read ${path}: ${error.message}`)
  }
}

async function readTextFile(path) {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    return fail(`cannot read ${path}: ${error.message}`)
  }
}

const srcJuz = await readJsonFile(join(REPO_ROOT, 'src', 'data', 'juz-starts.json'))
const srcHizb = await readJsonFile(join(REPO_ROOT, 'src', 'data', 'hizb-starts.json'))

// 1. src juz table equals the canonical 30-entry list.
if (!Array.isArray(srcJuz) || srcJuz.length !== 30) {
  fail(`src juz table must have exactly 30 entries, got ${Array.isArray(srcJuz) ? srcJuz.length : 'non-array'}`)
}
for (let i = 0; i < 30; i++) {
  const [surah, verse] = CANONICAL_JUZ_STARTS[i]
  const entry = srcJuz[i]
  if (!Array.isArray(entry) || entry.length !== 2 || entry[0] !== surah || entry[1] !== verse) {
    fail(`src juz ${i + 1} start is ${JSON.stringify(entry)}, canonical is ${surah}:${verse}`)
  }
}
// Explicit pins for the two entries that historically drifted.
if (srcJuz[3][0] !== 3 || srcJuz[3][1] !== 93) {
  fail(`juz 4 must start at 3:93 (canonical), got ${srcJuz[3][0]}:${srcJuz[3][1]}`)
}
if (srcJuz[10][0] !== 9 || srcJuz[10][1] !== 94) {
  fail(`juz 11 must start at 9:94 (canonical), got ${srcJuz[10][0]}:${srcJuz[10][1]}`)
}

// 2. hizb invariant: hizb[2N - 1].start == juz[N].start for N = 1..30.
if (!Array.isArray(srcHizb) || srcHizb.length !== 60) {
  fail(`src hizb table must have exactly 60 entries, got ${Array.isArray(srcHizb) ? srcHizb.length : 'non-array'}`)
}
for (let n = 1; n <= 30; n++) {
  const hizb = srcHizb[2 * n - 2]
  const [surah, verse] = srcJuz[n - 1]
  if (!Array.isArray(hizb) || hizb.length !== 2 || hizb[0] !== surah || hizb[1] !== verse) {
    fail(`hizb ${2 * n - 1} must start at juz ${n}'s start ${surah}:${verse}, got ${JSON.stringify(hizb)}`)
  }
}

// 3. generated juz.json juz starts match the src juz table.
const generatedJuz = await readJsonFile(join(REPO_ROOT, 'public', 'dataset', 'juz.json'))
if (!Array.isArray(generatedJuz) || generatedJuz.length !== 30) {
  fail(
    `public/dataset/juz.json must have exactly 30 entries, got ${
      Array.isArray(generatedJuz) ? generatedJuz.length : 'non-array'
    }`,
  )
}
for (let n = 1; n <= 30; n++) {
  const row = generatedJuz[n - 1]
  const [surah, verse] = srcJuz[n - 1]
  const genSurah = row?.start?.surah
  const genVerse = row?.start?.verse ?? row?.start?.ayah
  if (row?.n !== n || genSurah !== surah || genVerse !== verse) {
    fail(`public/dataset/juz.json juz ${n} start is ${genSurah}:${genVerse}, src table says ${surah}:${verse}`)
  }
}

// 4. single-source wiring: the src modules must still consume the shared tables.
const wiring = [
  ['src/data/juz-index.ts', 'juz-starts.json'],
  ['src/data/hizb-index.ts', 'hizb-starts.json'],
  ['src/continuity/wird/metadata.ts', 'data/juz-index'],
  ['src/continuity/wird/metadata.ts', 'data/hizb-index'],
]
for (const [file, marker] of wiring) {
  const text = await readTextFile(join(REPO_ROOT, file))
  if (!text.includes(marker)) {
    fail(`${file} no longer references ${marker} — the division tables must stay single-sourced`)
  }
}

console.log('[check-juz-hizb] juz/hizb invariants OK (30 juz, 60 hizb, hizb[2N-1] == juz[N])')
