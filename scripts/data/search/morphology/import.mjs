#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadSourceCatalog } from '../../sources/catalog.mjs'
import { sha256Hex, stableJson } from '../abi-writer.mjs'
import { SEARCH_NORMALIZER_VERSION } from '../normalizer.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = join(__dirname, '..', '..', '..', '..')
export const QAC_SOURCE_ID = 'search-qac-morphology-0-4'
export const QAC_TRANSFORM_VERSION = 1
export const NORMALIZED_MORPHOLOGY_PATH = join(
  REPO_ROOT,
  'data',
  'normalized',
  'search',
  'qac',
  'qac-morphology-0.4.normalized.json',
)

const ROW_RE = /^\((\d+):(\d+):(\d+):(\d+)\)\t([^\t]*)\t([^\t]*)\t(.*)$/
const FIELD_VALUE_RE = /(?:^|\|)(LEM|ROOT):([^|]+)/g
const SAFE_VALUE_RE = /^[^\s|]+$/

export async function importQacMorphologySource({
  catalogDir = join(REPO_ROOT, 'data', 'catalog'),
  write = false,
} = {}) {
  const catalog = await loadSourceCatalog(catalogDir)
  const metadata = readMorphologyCatalog(catalog)
  const sourcePath = join(REPO_ROOT, metadata.sourcePath)
  const text = await readFile(sourcePath, 'utf8')
  const checksum = sha256Hex(Buffer.from(text))
  if (!metadata.acceptedSha256.includes(checksum)) {
    throw new Error(`QAC morphology checksum mismatch: ${checksum}`)
  }

  const parsed = parseQacMorphology(text)
  validateParsedMorphology(parsed, metadata)

  const output = {
    schemaVersion: 1,
    transformVersion: QAC_TRANSFORM_VERSION,
    normalizerVersion: SEARCH_NORMALIZER_VERSION,
    sourceId: QAC_SOURCE_ID,
    sourceVersion: metadata.expectedVersion,
    sourcePath: metadata.sourcePath,
    sourceUrl: metadata.sourceUrl,
    sourceSha256: checksum,
    acceptedSha256: metadata.acceptedSha256,
    licenseIds: [metadata.licenseId],
    sourceAvailability: metadata.sourceAvailability,
    transformedDataNotes: metadata.transformedDataNotes,
    requiredNotice: metadata.requiredNotice,
    coverage: parsed.coverage,
    rows: parsed.rows,
    words: parsed.words,
  }

  if (write) {
    await mkdir(dirname(NORMALIZED_MORPHOLOGY_PATH), { recursive: true })
    await writeFile(NORMALIZED_MORPHOLOGY_PATH, `${stableJson(output)}\n`)
  }

  return output
}

export function readMorphologyCatalog(catalog) {
  const source = catalog.searchSources.find((entry) => entry.id === QAC_SOURCE_ID)
  if (!source) throw new Error(`missing Search morphology source ${QAC_SOURCE_ID}`)
  const verification = catalog.searchVerification?.morphology
  if (!verification || verification.sourceId !== QAC_SOURCE_ID) {
    throw new Error(`missing Search morphology verification for ${QAC_SOURCE_ID}`)
  }
  const license = catalog.searchLicenses.find((entry) => entry.id === source.licenseId)
  if (!license) throw new Error(`missing Search morphology license ${source.licenseId}`)
  const sourcePath = source.manualSource?.dropPath
  if (typeof sourcePath !== 'string' || !sourcePath) throw new Error('QAC morphology source path is not cataloged')
  const filename = sourcePath.split('/').pop()
  if (!verification.approvedFilenames?.includes(filename)) {
    throw new Error(`QAC morphology filename is not approved: ${filename}`)
  }
  if (source.licenseDecision?.status !== 'resolved' || source.licenseDecision?.mayShipDerivedFeature !== true) {
    throw new Error('QAC morphology license gate is not resolved for derived Search features')
  }
  if (source.licenseDecision?.sourceAvailabilityRequired !== true || !source.sourceAvailability) {
    throw new Error('QAC morphology source availability notes are required')
  }
  if (!existsSync(join(REPO_ROOT, sourcePath))) {
    throw new Error(`missing QAC morphology source file ${sourcePath}`)
  }
  return {
    acceptedSha256: verification.acceptedSha256,
    expectedCoverage: catalog.searchVerification.expectedCoverage?.[QAC_SOURCE_ID] ?? source.coverage,
    expectedVersion: verification.expectedVersion,
    licenseId: source.licenseId,
    requiredNotice: source.licenseDecision.requiredNotice,
    sourceAvailability: source.sourceAvailability,
    sourcePath,
    sourceUrl: source.sourceUrl,
    transformedDataNotes: source.transformedDataNotes,
  }
}

export function parseQacMorphology(text) {
  const rows = []
  const wordsByKey = new Map()
  const ayahs = new Set()
  const surahs = new Set()
  const segmentKeys = new Set()

  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || line === 'LOCATION\tFORM\tTAG\tFEATURES') continue
    const match = line.match(ROW_RE)
    if (!match) throw new Error(`invalid QAC morphology row: ${line.slice(0, 80)}`)
    const [, surahText, ayahText, wordText, segmentText, transliteration, pos, features] = match
    const surah = Number(surahText)
    const ayah = Number(ayahText)
    const word = Number(wordText)
    const segment = Number(segmentText)
    const segmentKey = `${surah}:${ayah}:${word}:${segment}`
    if (segmentKeys.has(segmentKey)) throw new Error(`duplicate QAC morphology segment ${segmentKey}`)
    segmentKeys.add(segmentKey)
    ayahs.add(`${surah}:${ayah}`)
    surahs.add(String(surah))

    const parsedFeatures = featureValues(features)
    const row = { surah, ayah, word, segment, transliteration, pos, features, lemma: parsedFeatures.lemma, root: parsedFeatures.root }
    rows.push(row)

    const wordKey = `${surah}:${ayah}:${word}`
    const current = wordsByKey.get(wordKey) ?? {
      ref: `${surah}:${ayah}`,
      surah,
      ayah,
      word,
      tokenOrdinal: word - 1,
      root: null,
      lemma: null,
      transliteration: '',
      segments: [],
    }
    current.segments.push({ segment, transliteration, pos, features, lemma: parsedFeatures.lemma, root: parsedFeatures.root })
    if (!current.root && parsedFeatures.root) current.root = parsedFeatures.root
    if (!current.lemma && parsedFeatures.lemma) current.lemma = parsedFeatures.lemma
    current.transliteration += transliteration
    wordsByKey.set(wordKey, current)
  }

  const words = [...wordsByKey.values()].sort((a, b) => (
    a.surah - b.surah || a.ayah - b.ayah || a.word - b.word
  ))
  return {
    rows,
    words,
    coverage: {
      surahs: surahs.size,
      ayahs: ayahs.size,
      tokens: words.length,
      rows: rows.length,
    },
  }
}

export function validateParsedMorphology(parsed, metadata) {
  const errors = []
  const expected = metadata.expectedCoverage ?? {}
  for (const field of ['surahs', 'ayahs', 'tokens', 'rows']) {
    if (Number.isInteger(expected[field]) && parsed.coverage[field] !== expected[field]) {
      errors.push(`QAC morphology ${field} coverage expected ${expected[field]}, got ${parsed.coverage[field]}`)
    }
  }
  for (const row of parsed.rows) {
    if (!Number.isInteger(row.surah) || row.surah < 1 || row.surah > 114) errors.push(`invalid surah ${row.surah}`)
    if (!Number.isInteger(row.ayah) || row.ayah < 1) errors.push(`invalid ayah ${row.surah}:${row.ayah}`)
    if (!Number.isInteger(row.word) || row.word < 1) errors.push(`invalid word ${row.surah}:${row.ayah}:${row.word}`)
    if (!Number.isInteger(row.segment) || row.segment < 1) errors.push(`invalid segment ${row.surah}:${row.ayah}:${row.word}:${row.segment}`)
    if (row.root && !SAFE_VALUE_RE.test(row.root)) errors.push(`invalid root ${row.root}`)
    if (row.lemma && !SAFE_VALUE_RE.test(row.lemma)) errors.push(`invalid lemma ${row.lemma}`)
  }
  if (!metadata.licenseId || !metadata.requiredNotice || !metadata.sourceAvailability) {
    errors.push('QAC morphology license metadata is incomplete')
  }
  if (errors.length) throw new Error(errors.slice(0, 5).join('; '))
}

function featureValues(features) {
  let lemma = null
  let root = null
  for (const match of features.matchAll(FIELD_VALUE_RE)) {
    if (match[1] === 'LEM' && !lemma) lemma = match[2]
    if (match[1] === 'ROOT' && !root) root = match[2]
  }
  return { lemma, root }
}

export async function main(argv = process.argv.slice(2)) {
  const write = argv.includes('--write')
  const output = await importQacMorphologySource({ write })
  if (write) {
    console.log(`Generated ${relative(REPO_ROOT, NORMALIZED_MORPHOLOGY_PATH)}`)
  } else {
    console.log(`Validated QAC morphology ${output.sourceVersion}: ${output.coverage.rows} rows`)
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
