#!/usr/bin/env node
/**
 * Generic source fetcher for normalized QuranAtlas data packs.
 *
 * Usage:
 *   node scripts/data/fetch-source.mjs translation:saheeh [--update-pin]
 *   node scripts/data/fetch-source.mjs tafsir:muyassar [--update-pin]
 *   node scripts/data/fetch-source.mjs translation:saheeh --input=/tmp/source.json --update-pin
 *
 * Source-specific URLs, provider adapters, field names, output paths, and pin
 * files live in data/catalog/*.json. This script owns provider adapters only.
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSourceCatalog, validateSourceCatalog } from './source-catalog.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')
const UA = 'QuranAtlas-fetch/1.0 (https://quranatlas.org)'

const HAFS_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98,
  135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75,
  85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29,
  19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9,
  5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
]

const PAD3 = (n) => String(n).padStart(3, '0')

function repoPath(path) {
  return resolve(REPO_ROOT, path)
}

function stableDigest(value) {
  const { fetchedAt: _ignored, ...canonical } = value
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}

function decodeHtmlEntities(text) {
  return String(text)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeQuranDbTranslation(source, options) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Quran DB translation source must be an object keyed by surah number')
  }
  if (!options?.id || !options?.field) {
    throw new Error('Quran DB translation normalization requires id and field')
  }

  const surahNumbers = Object.keys(source).map(Number).filter(Number.isInteger).sort((a, b) => a - b)
  const surahs = {}
  let totalVerses = 0

  for (const surahNo of surahNumbers) {
    const rawSurah = source[String(surahNo)]
    if (!rawSurah || typeof rawSurah !== 'object' || Array.isArray(rawSurah)) {
      throw new Error(`Quran DB surah ${surahNo} must be an object`)
    }
    const ayahs = rawSurah.Ayahs
    if (!ayahs || typeof ayahs !== 'object' || Array.isArray(ayahs)) {
      throw new Error(`Quran DB surah ${surahNo} missing Ayahs object`)
    }

    const ayahNumbers = Object.keys(ayahs).map(Number).filter(Number.isInteger).sort((a, b) => a - b)
    if (ayahNumbers.length === 0) {
      throw new Error(`Quran DB surah ${surahNo} has no ayahs`)
    }

    const verses = ayahNumbers.map((ayahNo, index) => {
      if (ayahNo !== index + 1) {
        throw new Error(`Quran DB surah ${surahNo} ayah keys must be contiguous from 1`)
      }
      const row = ayahs[String(ayahNo)]
      const text = row?.[options.field]
      if (typeof text !== 'string' || !text.trim()) {
        throw new Error(`Quran DB surah ${surahNo}:${ayahNo} missing ${options.field}`)
      }
      return { key: `${surahNo}:${ayahNo}`, text: decodeHtmlEntities(text) }
    })

    surahs[PAD3(surahNo)] = {
      intro: [],
      verses,
      footnotes: {},
      source: {
        transliteratedName: rawSurah.SurahTransliteratedName ?? '',
        arabicName: rawSurah.SurahArabicName ?? '',
        englishNames: rawSurah.SurahEnglishNames ?? '',
      },
    }
    totalVerses += verses.length
  }

  return {
    translationId: options.id,
    translationVersion: options.translationVersion,
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
    source: {
      provider: 'quran_db',
      name: options.field,
      author: options.author ?? options.label,
      language: options.language ?? 'en',
      sourceUrl: options.sourceUrl,
    },
    counts: {
      surahs: surahNumbers.length,
      verses: totalVerses,
      footnotes: 0,
    },
    surahs,
  }
}

export function normalizeQulTafsirEntries(source, options) {
  if (!Array.isArray(source)) {
    throw new Error('QUL tafsir normalization requires an array of tafsir rows')
  }
  const byId = new Map()
  for (const tafsir of source) {
    const verses = Array.isArray(tafsir.verses) ? tafsir.verses : []
    if (verses.length === 0) continue
    byId.set(verses[0], {
      id: verses[0],
      startKey: verses[0],
      endKey: verses[verses.length - 1],
      ayahKeys: verses,
      sourceGranularity: verses.length > 1 ? 'range' : 'ayah',
      text: String(tafsir.text ?? ''),
    })
  }
  const entries = [...byId.values()].sort((a, b) => {
    const [as, aa] = a.startKey.split(':').map(Number)
    const [bs, ba] = b.startKey.split(':').map(Number)
    return as - bs || aa - ba
  })
  const normalized = {
    tafsirId: options.id,
    tafsirVersion: options.tafsirVersion,
    language: options.language ?? 'ar',
    source: {
      provider: 'Quranic Universal Library',
      resourceUrl: options.resourceUrl,
      resourceId: options.resourceId,
      contentResourceId: options.contentResourceId,
    },
    entries,
  }
  normalized.sourceChecksum = {
    algorithm: 'sha256',
    value: createHash('sha256').update(JSON.stringify(normalized)).digest('hex'),
  }
  return normalized
}

async function readJsonFile(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return await res.json()
}

async function fetchQulTafsirSource(fetchConfig) {
  const apiBase = `https://qul.tarteel.ai/api/v1/tafsirs/${fetchConfig.contentResourceId}/by_range.json`
  const rows = []
  for (let surahNo = 1; surahNo <= 114; surahNo++) {
    const params = new URLSearchParams({
      from: `${surahNo}:1`,
      to: `${surahNo}:${HAFS_COUNTS[surahNo - 1]}`,
      per_page: '200',
    })
    const json = await fetchJson(`${apiBase}?${params}`)
    if (!Array.isArray(json.tafsirs)) {
      throw new Error(`QUL tafsir response missing tafsirs array for surah ${surahNo}`)
    }
    rows.push(...json.tafsirs)
  }
  return rows
}

async function fetchSourcePayload(source, inputPath) {
  if (inputPath) return readJsonFile(inputPath)
  if (source.fetch.provider === 'quran-db-translation') return fetchJson(source.fetch.url)
  if (source.fetch.provider === 'qul-tafsir') return fetchQulTafsirSource(source.fetch)
  throw new Error(`Unsupported fetch provider: ${source.fetch.provider}`)
}

function normalizeSourcePayload(source, payload) {
  if (source.fetch.provider === 'quran-db-translation') {
    return normalizeQuranDbTranslation(payload, {
      id: source.id,
      field: source.fetch.field,
      label: source.label,
      author: source.fetch.author,
      language: source.language,
      translationVersion: source.fetch.version,
      sourceUrl: source.fetch.url,
    })
  }
  if (source.fetch.provider === 'qul-tafsir') {
    return normalizeQulTafsirEntries(payload, {
      id: source.id,
      tafsirVersion: `qul-resource-${source.fetch.resourceId}`,
      language: source.language,
      resourceUrl: source.fetch.resourceUrl,
      resourceId: source.fetch.resourceId,
      contentResourceId: source.fetch.contentResourceId,
    })
  }
  throw new Error(`Unsupported fetch provider: ${source.fetch.provider}`)
}

async function loadSource(key) {
  const [type, id] = key.split(':')
  if (!type || !id) throw new Error('Expected source key in form type:id, e.g. translation:saheeh')
  const catalog = await loadSourceCatalog()
  const result = validateSourceCatalog(catalog)
  if (!result.ok) throw new Error(`source catalog invalid:\n${result.errors.join('\n')}`)
  const source = catalog.sources.find((item) => item.type === type && item.id === id)
  if (!source) throw new Error(`Unknown source: ${key}`)
  if (!source.fetch || typeof source.fetch !== 'object') throw new Error(`Source ${key} has no fetch configuration`)
  return source
}

function parseArgs(argv) {
  const key = argv.find((arg) => !arg.startsWith('--'))
  const inputArg = argv.find((arg) => arg.startsWith('--input='))
  return {
    key,
    inputPath: inputArg ? resolve(inputArg.slice('--input='.length)) : null,
    updatePin: argv.includes('--update-pin'),
  }
}

async function main() {
  const { key, inputPath, updatePin } = parseArgs(process.argv.slice(2))
  if (!key) throw new Error('Usage: node scripts/data/fetch-source.mjs type:id [--input=/path/source.json] [--update-pin]')

  const source = await loadSource(key)
  const payload = await fetchSourcePayload(source, inputPath)
  const normalized = normalizeSourcePayload(source, payload)
  const digest = stableDigest(normalized)
  const pinPath = repoPath(source.fetch.pinPath)
  const outPath = repoPath(source.fetch.normalizedPath)
  const pinExists = existsSync(pinPath)
  const expected = pinExists ? (await readFile(pinPath, 'utf8')).trim() : null

  if (updatePin || !pinExists) {
    await mkdir(dirname(pinPath), { recursive: true })
    await writeFile(pinPath, `${digest}\n`, 'utf8')
    console.log(`[fetch-source] ${pinExists ? 'updated' : 'created'} pin ${source.fetch.pinPath}`)
  } else if (expected !== digest) {
    throw new Error(`Source ${key} digest ${digest} does not match pinned ${expected}; rerun with --update-pin after review`)
  }

  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(normalized)}\n`, 'utf8')
  console.log(`[fetch-source] wrote ${source.fetch.normalizedPath}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
