import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { assertAyahExists, compareAyahKeys, pad3 } from '../lib/ayah.mjs'
import { readJson, writeJson } from '../lib/json.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')

const DATASET_DIR = join(REPO_ROOT, 'public', 'dataset')
const SURAHS_PATH = join(DATASET_DIR, 'surahs.json')
const HAFS_SOURCE_PATH = join(REPO_ROOT, 'data', 'normalized', 'quran', 'riwayat', 'hafs.json')

const THEMES_SOURCE_PATH = join(REPO_ROOT, 'data', 'taxonomy', 'themes.json')
const PASSAGES_SOURCE_PATH = join(REPO_ROOT, 'data', 'normalized', 'knowledge', 'passages.json')
const AYAH_THEMES_SOURCE_PATH = join(REPO_ROOT, 'data', 'normalized', 'knowledge', 'ayah-themes.json')

const KNOWLEDGE_OUTPUT_DIR = join(DATASET_DIR, 'knowledge')
const KNOWLEDGE_AYAH_DIR = join(KNOWLEDGE_OUTPUT_DIR, 'ayah')
const KNOWLEDGE_PASSAGES_DIR = join(KNOWLEDGE_OUTPUT_DIR, 'passages')
const KNOWLEDGE_INDEXES_DIR = join(KNOWLEDGE_OUTPUT_DIR, 'indexes')

const THEME_ID_RE = /^[a-z][a-z0-9-]*$/
const REVIEW_STATUSES = new Set(['draft', 'approved', 'deprecated'])
const CERTAINTY_VALUES = new Set(['high', 'medium', 'low'])
const AYAH_THEME_SOURCES = new Set(['curated'])

export const KNOWLEDGE_VERSION = 'knowledge-v1'

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

export async function loadSurahAyahCounts() {
  if (existsSync(SURAHS_PATH)) {
    const surahs = await readJson(SURAHS_PATH)
    ensure(Array.isArray(surahs) && surahs.length === 114, 'public/dataset/surahs.json must contain 114 entries')
    return surahs.map((entry, index) => {
      const count = entry?.counts?.hafs
      ensure(Number.isInteger(count) && count > 0, `surahs.json entry ${index + 1} missing counts.hafs`)
      return count
    })
  }

  const hafs = await readJson(HAFS_SOURCE_PATH)
  ensure(Array.isArray(hafs), 'data/normalized/quran/riwayat/hafs.json must be an array')
  const counts = Array(114).fill(0)
  for (const row of hafs) {
    const surah = row?.sura_no ?? row?.sora
    ensure(Number.isInteger(surah) && surah >= 1 && surah <= 114, `Hafs source contains invalid surah value: ${surah}`)
    counts[surah - 1] += 1
  }
  ensure(counts.every((count) => count > 0), 'Hafs source must cover all 114 surahs')
  return counts
}

export async function loadKnowledgeSeedData() {
  const [themes, passages, ayahThemes] = await Promise.all([
    readJson(THEMES_SOURCE_PATH),
    readJson(PASSAGES_SOURCE_PATH),
    readJson(AYAH_THEMES_SOURCE_PATH),
  ])
  return { themes, passages, ayahThemes }
}

function validateThemes(themes) {
  ensure(Array.isArray(themes), 'themes.json must be an array')
  const themeById = new Map()
  for (const theme of themes) {
    ensure(isRecord(theme), 'themes.json entries must be objects')
    ensure(typeof theme.id === 'string' && theme.id.length > 0, 'theme.id is required')
    ensure(THEME_ID_RE.test(theme.id), `theme.id "${theme.id}" must match ${THEME_ID_RE}`)
    ensure(!themeById.has(theme.id), `duplicate theme.id "${theme.id}"`)
    ensure(isRecord(theme.label), `theme "${theme.id}" must provide a label object`)
    ensure(typeof theme.label.en === 'string' && theme.label.en.trim().length > 0, `theme "${theme.id}" missing label.en`)
    ensure(typeof theme.description === 'string' && theme.description.trim().length > 0, `theme "${theme.id}" missing description`)
    if (theme.parentId !== null && theme.parentId !== undefined) {
      ensure(typeof theme.parentId === 'string' && theme.parentId.length > 0, `theme "${theme.id}" parentId must be a string or null`)
    }
    if (theme.aliases !== undefined) {
      ensure(Array.isArray(theme.aliases), `theme "${theme.id}" aliases must be an array`)
      ensure(theme.aliases.every((alias) => typeof alias === 'string' && alias.length > 0), `theme "${theme.id}" aliases must be non-empty strings`)
    }
    if (theme.related !== undefined) {
      ensure(Array.isArray(theme.related), `theme "${theme.id}" related must be an array`)
      ensure(theme.related.every((id) => typeof id === 'string' && id.length > 0), `theme "${theme.id}" related ids must be strings`)
    }
    themeById.set(theme.id, theme)
  }

  for (const theme of themeById.values()) {
    if (theme.parentId) {
      ensure(themeById.has(theme.parentId), `theme "${theme.id}" parentId "${theme.parentId}" does not exist`)
    }
    for (const relatedId of theme.related ?? []) {
      ensure(themeById.has(relatedId), `theme "${theme.id}" related id "${relatedId}" does not exist`)
    }
  }

  return themeById
}

function validatePassages(passages, themeById, surahAyahCounts) {
  ensure(Array.isArray(passages), 'passages.json must be an array')
  const normalized = []
  const seenIds = new Set()
  for (const passage of passages) {
    ensure(isRecord(passage), 'passages.json entries must be objects')
    ensure(typeof passage.id === 'string' && passage.id.length > 0, 'passage.id is required')
    ensure(!seenIds.has(passage.id), `duplicate passage.id "${passage.id}"`)
    seenIds.add(passage.id)

    ensure(Number.isInteger(passage.surah) && passage.surah >= 1 && passage.surah <= 114, `passage "${passage.id}" has invalid surah`)
    ensure(typeof passage.startKey === 'string' && typeof passage.endKey === 'string', `passage "${passage.id}" must define startKey and endKey`)

    const start = assertAyahExists(passage.startKey, surahAyahCounts, `passage "${passage.id}" startKey`)
    const end = assertAyahExists(passage.endKey, surahAyahCounts, `passage "${passage.id}" endKey`)

    ensure(start.surah === end.surah, `passage "${passage.id}" range crosses surahs (${passage.startKey} -> ${passage.endKey})`)
    ensure(start.surah === passage.surah, `passage "${passage.id}" surah ${passage.surah} does not match range surah ${start.surah}`)
    ensure(start.ayah <= end.ayah, `passage "${passage.id}" startKey must be <= endKey`)

    ensure(isRecord(passage.title) && typeof passage.title.en === 'string' && passage.title.en.trim().length > 0, `passage "${passage.id}" missing title.en`)
    ensure(isRecord(passage.summary) && typeof passage.summary.en === 'string' && passage.summary.en.trim().length > 0, `passage "${passage.id}" missing summary.en`)
    ensure(typeof passage.roleInSurah === 'string' && passage.roleInSurah.trim().length > 0, `passage "${passage.id}" missing roleInSurah`)

    ensure(Array.isArray(passage.themes), `passage "${passage.id}" themes must be an array`)
    ensure(passage.themes.length > 0, `passage "${passage.id}" themes must not be empty`)
    for (const themeId of passage.themes) {
      ensure(typeof themeId === 'string' && themeId.length > 0, `passage "${passage.id}" themes must contain strings`)
      ensure(themeById.has(themeId), `passage "${passage.id}" references unknown theme id "${themeId}"`)
    }

    ensure(isRecord(passage.source), `passage "${passage.id}" source is required`)
    ensure(typeof passage.source.reviewStatus === 'string', `passage "${passage.id}" source.reviewStatus is required`)
    ensure(REVIEW_STATUSES.has(passage.source.reviewStatus), `passage "${passage.id}" has invalid reviewStatus "${passage.source.reviewStatus}"`)

    normalized.push({
      id: passage.id,
      surah: passage.surah,
      startAyah: start.ayah,
      endAyah: end.ayah,
      startKey: passage.startKey,
      endKey: passage.endKey,
      title: passage.title,
      summary: passage.summary,
      themes: [...passage.themes],
      roleInSurah: passage.roleInSurah,
      source: {
        reviewStatus: passage.source.reviewStatus,
      },
    })
  }

  for (let surah = 1; surah <= 114; surah++) {
    const ranges = normalized
      .filter((passage) => passage.surah === surah)
      .sort((a, b) => a.startAyah - b.startAyah || a.endAyah - b.endAyah || a.id.localeCompare(b.id))
    for (let i = 1; i < ranges.length; i++) {
      const prev = ranges[i - 1]
      const curr = ranges[i]
      ensure(curr.startAyah > prev.endAyah, `overlapping passages are not allowed in Phase 01 (${prev.id} overlaps ${curr.id})`)
    }
  }

  return normalized
}

function validateAyahThemes(ayahThemes, themeById, surahAyahCounts) {
  ensure(Array.isArray(ayahThemes), 'ayah-themes.json must be an array')
  const byAyah = new Map()
  for (const row of ayahThemes) {
    ensure(isRecord(row), 'ayah-themes.json entries must be objects')
    ensure(typeof row.ayahKey === 'string' && row.ayahKey.length > 0, 'ayah-themes entry missing ayahKey')
    assertAyahExists(row.ayahKey, surahAyahCounts, `ayah-themes "${row.ayahKey}"`)
    ensure(Array.isArray(row.themes), `ayah-themes "${row.ayahKey}" themes must be an array`)
    ensure(!byAyah.has(row.ayahKey), `ayah-themes has duplicate ayahKey "${row.ayahKey}"`)

    const seenThemeIds = new Set()
    const normalizedThemes = row.themes.map((theme) => {
      ensure(isRecord(theme), `ayah-themes "${row.ayahKey}" theme entries must be objects`)
      ensure(typeof theme.id === 'string' && theme.id.length > 0, `ayah-themes "${row.ayahKey}" theme.id is required`)
      ensure(themeById.has(theme.id), `ayah-themes "${row.ayahKey}" references unknown theme id "${theme.id}"`)
      ensure(!seenThemeIds.has(theme.id), `ayah-themes "${row.ayahKey}" has duplicate theme id "${theme.id}"`)
      seenThemeIds.add(theme.id)

      ensure(typeof theme.weight === 'number' && Number.isFinite(theme.weight), `ayah-themes "${row.ayahKey}" theme "${theme.id}" weight must be a number`)
      ensure(theme.weight >= 0 && theme.weight <= 1, `ayah-themes "${row.ayahKey}" theme "${theme.id}" weight must be between 0 and 1`)
      ensure(typeof theme.source === 'string' && AYAH_THEME_SOURCES.has(theme.source), `ayah-themes "${row.ayahKey}" theme "${theme.id}" source must be one of: ${[...AYAH_THEME_SOURCES].join(', ')}`)
      ensure(typeof theme.certainty === 'string' && CERTAINTY_VALUES.has(theme.certainty), `ayah-themes "${row.ayahKey}" theme "${theme.id}" certainty must be one of: high, medium, low`)

      return {
        id: theme.id,
        weight: theme.weight,
        certainty: theme.certainty,
      }
    })

    normalizedThemes.sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))
    byAyah.set(row.ayahKey, normalizedThemes)
  }
  return byAyah
}

function sortObjectKeys(input, compare = (a, b) => a.localeCompare(b)) {
  return Object.fromEntries(
    Object.entries(input).sort(([a], [b]) => compare(a, b)),
  )
}

export function buildKnowledgeArtifacts({ themes, passages, ayahThemes, surahAyahCounts }) {
  ensure(Array.isArray(surahAyahCounts) && surahAyahCounts.length === 114, 'surahAyahCounts must contain 114 entries')
  ensure(surahAyahCounts.every((count) => Number.isInteger(count) && count > 0), 'surahAyahCounts entries must be positive integers')

  const themeById = validateThemes(themes)
  const normalizedPassages = validatePassages(passages, themeById, surahAyahCounts)
  const ayahThemesMap = validateAyahThemes(ayahThemes, themeById, surahAyahCounts)

  const approvedPassages = normalizedPassages
    .filter((passage) => passage.source.reviewStatus === 'approved')
    .sort((a, b) => a.surah - b.surah || a.startAyah - b.startAyah || a.endAyah - b.endAyah || a.id.localeCompare(b.id))

  const ayahToPassageMap = new Map()
  const passageToAyahMap = new Map()
  for (const passage of approvedPassages) {
    const keys = []
    for (let ayah = passage.startAyah; ayah <= passage.endAyah; ayah++) {
      const key = `${passage.surah}:${ayah}`
      ensure(!ayahToPassageMap.has(key), `approved passages overlap at ${key}`)
      ayahToPassageMap.set(key, passage.id)
      keys.push(key)
    }
    passageToAyahMap.set(passage.id, keys)
  }

  const themeToAyahMap = new Map()
  for (const themeId of themeById.keys()) {
    themeToAyahMap.set(themeId, new Set())
  }
  for (const [ayahKey, themeRows] of ayahThemesMap.entries()) {
    for (const theme of themeRows) {
      themeToAyahMap.get(theme.id).add(ayahKey)
    }
  }

  const ayahBySurah = {}
  const passagesBySurah = {}

  for (let surah = 1; surah <= 114; surah++) {
    const key = pad3(surah)
    const ayahCount = surahAyahCounts[surah - 1]
    const ayahs = []
    for (let ayah = 1; ayah <= ayahCount; ayah++) {
      const ayahKey = `${surah}:${ayah}`
      ayahs.push({
        key: ayahKey,
        passageId: ayahToPassageMap.get(ayahKey) ?? null,
        themes: ayahThemesMap.get(ayahKey) ?? [],
      })
    }
    ayahBySurah[key] = {
      surah,
      version: KNOWLEDGE_VERSION,
      ayahs,
    }

    const surahPassages = approvedPassages
      .filter((passage) => passage.surah === surah)
      .map((passage) => ({
        id: passage.id,
        startKey: passage.startKey,
        endKey: passage.endKey,
        title: passage.title,
        summary: passage.summary,
        themes: [...passage.themes],
        roleInSurah: passage.roleInSurah,
      }))
    passagesBySurah[key] = {
      surah,
      version: KNOWLEDGE_VERSION,
      passages: surahPassages,
    }
  }

  const themeToAyah = {}
  for (const [themeId, ayahKeys] of [...themeToAyahMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    themeToAyah[themeId] = [...ayahKeys].sort(compareAyahKeys)
  }

  const ayahToPassage = {}
  for (const [ayahKey, passageId] of [...ayahToPassageMap.entries()].sort(([a], [b]) => compareAyahKeys(a, b))) {
    ayahToPassage[ayahKey] = passageId
  }

  const passageToAyah = {}
  for (const passage of approvedPassages) {
    passageToAyah[passage.id] = [...(passageToAyahMap.get(passage.id) ?? [])].sort(compareAyahKeys)
  }

  return {
    version: KNOWLEDGE_VERSION,
    ayahBySurah: sortObjectKeys(ayahBySurah),
    passagesBySurah: sortObjectKeys(passagesBySurah),
    indexes: {
      themeToAyah,
      ayahToPassage: sortObjectKeys(ayahToPassage, compareAyahKeys),
      passageToAyah: sortObjectKeys(passageToAyah),
    },
    stats: {
      themeCount: themeById.size,
      passageCount: approvedPassages.length,
      taggedAyahCount: ayahThemesMap.size,
    },
  }
}

export async function writeKnowledgeArtifacts(artifacts, outputDir = KNOWLEDGE_OUTPUT_DIR) {
  const ayahDir = join(outputDir, 'ayah')
  const passagesDir = join(outputDir, 'passages')
  const indexesDir = join(outputDir, 'indexes')

  await rm(outputDir, { recursive: true, force: true })
  await mkdir(ayahDir, { recursive: true })
  await mkdir(passagesDir, { recursive: true })
  await mkdir(indexesDir, { recursive: true })

  for (let surah = 1; surah <= 114; surah++) {
    const key = pad3(surah)
    await Promise.all([
      writeJson(join(ayahDir, `${key}.json`), artifacts.ayahBySurah[key]),
      writeJson(join(passagesDir, `${key}.json`), artifacts.passagesBySurah[key]),
    ])
  }

  await Promise.all([
    writeJson(join(indexesDir, 'theme-to-ayah.json'), artifacts.indexes.themeToAyah),
    writeJson(join(indexesDir, 'ayah-to-passage.json'), artifacts.indexes.ayahToPassage),
    writeJson(join(indexesDir, 'passage-to-ayah.json'), artifacts.indexes.passageToAyah),
  ])
}

function parseCliArgs(argv = process.argv.slice(2)) {
  return { check: argv.includes('--check') }
}

export async function main() {
  const args = parseCliArgs()
  const [surahAyahCounts, sourceData] = await Promise.all([
    loadSurahAyahCounts(),
    loadKnowledgeSeedData(),
  ])

  const artifacts = buildKnowledgeArtifacts({
    ...sourceData,
    surahAyahCounts,
  })

  if (!args.check) {
    await writeKnowledgeArtifacts(artifacts)
  }

  console.log(
    `[build-knowledge-dataset] ${args.check ? 'checked' : 'wrote'} `
      + `themes=${artifacts.stats.themeCount} passages=${artifacts.stats.passageCount} `
      + `taggedAyahs=${artifacts.stats.taggedAyahCount}`,
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
