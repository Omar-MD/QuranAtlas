#!/usr/bin/env node
import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { writeJson, readJson } from '../lib/json.mjs'
import { loadSourceCatalog, validateSourceCatalog } from './catalog.mjs'
import { normalizeQuranDbTranslation } from './providers/quran-db-translation.mjs'
import { fetchQulTafsirSource, normalizeQulTafsirEntries } from './providers/qul-tafsir.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')
const UA = 'QuranAtlas-fetch/1.0 (https://quranatlas.org)'

function repoPath(path) {
  return resolve(REPO_ROOT, path)
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

async function fetchSourcePayload(source, inputPath) {
  if (inputPath) return readJson(inputPath)
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
  }
}

export async function main() {
  const { key, inputPath } = parseArgs(process.argv.slice(2))
  if (!key) throw new Error('Usage: node scripts/data/fetch-source.mjs type:id [--input=/path/source.json]')

  const source = await loadSource(key)
  const payload = await fetchSourcePayload(source, inputPath)
  const normalized = normalizeSourcePayload(source, payload)
  const outPath = repoPath(source.fetch.normalizedPath)

  await mkdir(dirname(outPath), { recursive: true })
  await writeJson(outPath, normalized)
  console.log(`[fetch-source] wrote ${source.fetch.normalizedPath}`)
}
