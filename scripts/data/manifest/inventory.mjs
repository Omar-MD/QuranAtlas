import { stat } from 'node:fs/promises'
import { dirname, relative } from 'node:path'

import { listFiles } from '../lib/fs.mjs'

const LANE_KEYS = ['text', 'knowledge', 'reflection', 'search', 'pages']

function classifyDatasetFile(path) {
  if (path.startsWith('riwayat/')) {
    return { lane: 'text', category: 'text-riwayah' }
  }
  if (path.startsWith('quran-text/')) {
    return { lane: 'text', category: 'text-riwayah' }
  }
  if (path.startsWith('translations/') && !path.startsWith('translations/_')) {
    return { lane: 'text', category: 'text-translation' }
  }
  if (path === 'translations/_verse-map.json' || path === 'translations/_verse-aliases.json') {
    return { lane: 'text', category: 'text-core' }
  }
  if (path.startsWith('tafsir/')) {
    return { lane: 'text', category: 'text-tafsir' }
  }
  if (path === 'surahs.json' || path === 'juz.json') {
    return { lane: 'text', category: 'text-core' }
  }
  if (
    path === 'indexes/sources.json' ||
    path === 'indexes/riwayah-packages.json' ||
    path === 'indexes/text-assets.json' ||
    path === 'indexes/mushaf-assets.json' ||
    path === 'provenance.json'
  ) {
    return { lane: 'text', category: 'text-index' }
  }
  if (path === 'indexes/source-assets.json') {
    return { lane: 'text', category: 'text-index' }
  }
  if (path.startsWith('knowledge/ayah/')) {
    return { lane: 'knowledge', category: 'knowledge-ayah' }
  }
  if (path.startsWith('knowledge/passages/')) {
    return { lane: 'knowledge', category: 'knowledge-passages' }
  }
  if (path.startsWith('knowledge/indexes/')) {
    return { lane: 'knowledge', category: 'knowledge-index' }
  }
  if (path.startsWith('mushaf-pages/')) {
    return { lane: 'pages', category: 'pages' }
  }
  if (path.startsWith('reflection/prompts/')) {
    return { lane: 'reflection', category: 'reflection-prompts' }
  }
  if (path.startsWith('reflection/indexes/')) {
    return { lane: 'reflection', category: 'reflection-index' }
  }
  if (path === 'search-index.json' || path.startsWith('search/')) {
    return { lane: 'search', category: 'search-index' }
  }
  throw new Error(`Unclassified dataset file for manifest inventory: ${path}`)
}

function createLaneSummary(files) {
  return Object.fromEntries(
    LANE_KEYS.map((lane) => {
      const laneFiles = files.filter((entry) => entry.lane === lane)
      return [lane, {
        enabled: laneFiles.length > 0,
        files: laneFiles.length,
        bytes: laneFiles.reduce((sum, entry) => sum + entry.bytes, 0),
      }]
    }),
  )
}

export async function buildManifestPayload({
  datasetDir,
  riwayatDir,
  translationsDir,
  provenance,
  packageVersion,
  profileName,
  manifestTextSources = null,
}) {
  const allFiles = await listFiles(datasetDir)
  const files = []

  for (const fullPath of allFiles) {
    const path = relative(datasetDir, fullPath).replace(/\\/g, '/')
    if (path === 'manifest.json') continue
    if (dirname(fullPath) === riwayatDir) continue
    if (dirname(fullPath) === translationsDir) continue
    if (profileName === 'catalog' && path.startsWith('mushaf-pages/')) {
      continue
    }
    if (
      manifestTextSources
      && (
        (path.startsWith('translations/') && !path.startsWith('translations/_') && !manifestTextSources.has(path.split('/')[1]))
        || (path.startsWith('tafsir/') && !manifestTextSources.has(path.split('/')[1]))
      )
    ) {
      continue
    }
    const { lane, category } = classifyDatasetFile(path)
    files.push({
      path,
      lane,
      category,
      bytes: (await stat(fullPath)).size,
    })
  }

  files.sort((a, b) => a.path.localeCompare(b.path))

  return {
    packageVersion,
    profile: profileName,
    builtAt: provenance.builtAt,
    lanes: createLaneSummary(files),
    files,
  }
}
