#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { HAFS_AYAH_COUNTS, assertCompleteHafsAyahCoverage } from '../../lib/ayah.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..', '..')
const OUT_PATH = join(REPO_ROOT, 'data', 'normalized', 'search', 'tanzil', 'hafs.json')
const UA = 'QuranAtlas-fetch/1.0 (https://quranatlas.org)'

const TANZIL_DOWNLOAD_URLS = {
  simpleClean: 'https://tanzil.net/pub/download/index.php?quranType=simple-clean&outType=txt-2&agree=true',
  uthmani: 'https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true',
}

async function fetchTanzilText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/plain' } })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

function parseTanzilNumberedText(text, label) {
  const rows = []
  for (const [lineIndex, line] of String(text).split(/\r?\n/).entries()) {
    if (!line.trim()) continue
    if (line.startsWith('#')) continue
    const [surahText, ayahText, ...textParts] = line.split('|')
    if (textParts.length === 0) throw new Error(`${label}: line ${lineIndex + 1} is not surah|ayah|text`)
    const surah = Number(surahText)
    const ayah = Number(ayahText)
    const verseText = textParts.join('|').trim()
    if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Number.isInteger(ayah) || ayah < 1) {
      throw new Error(`${label}: line ${lineIndex + 1} has invalid ref ${surahText}:${ayahText}`)
    }
    if (!verseText) throw new Error(`${label}: ${surah}:${ayah} has empty text`)
    rows.push({ surah, ayah, text: verseText })
  }
  return rows
}

export function normalizeTanzilHafsSearchRows({ simpleCleanText, uthmaniText }) {
  const simpleRows = parseTanzilNumberedText(simpleCleanText, 'Tanzil simple-clean')
  const uthmaniRows = parseTanzilNumberedText(uthmaniText, 'Tanzil Uthmani')
  if (simpleRows.length !== 6236) throw new Error(`Tanzil simple-clean row count ${simpleRows.length}, expected 6236`)
  if (uthmaniRows.length !== 6236) throw new Error(`Tanzil Uthmani row count ${uthmaniRows.length}, expected 6236`)

  const rows = simpleRows.map((simple, index) => {
    const uthmani = uthmaniRows[index]
    if (!uthmani || uthmani.surah !== simple.surah || uthmani.ayah !== simple.ayah) {
      throw new Error(`Tanzil source order mismatch at row ${index + 1}`)
    }
    const expectedAyah = HAFS_AYAH_COUNTS[simple.surah - 1]
    if (!Number.isInteger(expectedAyah) || simple.ayah > expectedAyah) {
      throw new Error(`Tanzil source ${simple.surah}:${simple.ayah} exceeds expected Hafs ayah count`)
    }
    return {
      id: index + 1,
      sora: simple.surah,
      aya_no: simple.ayah,
      aya_text: uthmani.text,
      aya_text_emlaey: simple.text,
    }
  })
  assertCompleteHafsAyahCoverage(rows.map((row) => `${row.sora}:${row.aya_no}`), 'Tanzil Hafs Search text')
  return rows
}

export async function importTanzilHafsSearchText() {
  const [simpleCleanText, uthmaniText] = await Promise.all([
    fetchTanzilText(TANZIL_DOWNLOAD_URLS.simpleClean),
    fetchTanzilText(TANZIL_DOWNLOAD_URLS.uthmani),
  ])
  const rows = normalizeTanzilHafsSearchRows({ simpleCleanText, uthmaniText })
  await mkdir(dirname(OUT_PATH), { recursive: true })
  await writeFile(OUT_PATH, JSON.stringify(rows), 'utf8')
  return { outputPath: OUT_PATH, rows: rows.length }
}

export async function main() {
  const result = await importTanzilHafsSearchText()
  console.log(`[search:tanzil] wrote ${result.rows} rows to ${result.outputPath}`)
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
