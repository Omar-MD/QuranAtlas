#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildManifestPayload } from '../manifest/inventory.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')
const CATALOG_PATH = join(REPO_ROOT, 'data', 'catalog', 'riwayah-packages.json')
const DATASET_DIR = join(REPO_ROOT, 'public', 'dataset')
const OUT_PATH = join(DATASET_DIR, 'indexes', 'riwayah-packages.json')
const TEXT_ASSETS_PATH = join(DATASET_DIR, 'indexes', 'text-assets.json')
const MUSHAF_ASSETS_PATH = join(DATASET_DIR, 'indexes', 'mushaf-assets.json')
const DEFAULT_PROFILE = JSON.parse(
  await readFile(join(REPO_ROOT, 'shared', 'reader-assets', 'default-profile.json'), 'utf8'),
).profile
const RIWAYAT = [DEFAULT_PROFILE.riwayah]
const SURAH_COUNT = 114
const DEFAULT_MUSHAF_EDITIONS = {
  [DEFAULT_PROFILE.riwayah]: DEFAULT_PROFILE.mushafEditionId,
}

function argValue(argv, name, fallback = null) {
  const flag = argv.find((arg) => arg.startsWith(`--${name}=`))
  return flag ? flag.slice(name.length + 3) : fallback
}

function ensure(condition, message) {
  if (!condition) throw new Error(message)
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function datasetUrl(path) {
  ensure(!path.includes('..') && !path.includes('://'), `Invalid dataset path: ${path}`)
  return `/dataset/${path}`
}

function datasetRelPathFromUrl(url) {
  ensure(typeof url === 'string' && url.startsWith('/dataset/') && !url.includes('..') && !url.includes('://'), `Invalid dataset URL: ${url}`)
  return url.slice('/dataset/'.length)
}

async function loadCatalog() {
  const catalog = await readJson(CATALOG_PATH)
  ensure(catalog.version === 1, 'Riwayah package catalog version must be 1')
  ensure(catalog.defaultRiwayah === DEFAULT_PROFILE.riwayah, `Riwayah package catalog default must be ${DEFAULT_PROFILE.riwayah}`)
  ensure(catalog.baselineRiwayah === DEFAULT_PROFILE.riwayah, `Riwayah package catalog baseline must be ${DEFAULT_PROFILE.riwayah}`)
  for (const riwayah of RIWAYAT) {
    ensure(typeof catalog.riwayat?.[riwayah]?.optional === 'boolean', `Riwayah package catalog missing ${riwayah}`)
  }
  return catalog
}

async function loadTextAssetIndex() {
  const index = await readJson(TEXT_ASSETS_PATH)
  ensure(index.version === 1, 'Text asset index version must be 1')
  ensure(index.defaults && typeof index.defaults === 'object', 'Text asset index missing defaults')
  ensure(Array.isArray(index.assets), 'Text asset index assets must be an array')
  return index
}

async function loadMushafAssetIndex() {
  const index = await readJson(MUSHAF_ASSETS_PATH)
  ensure(index.version === 1, 'Mushaf asset index version must be 1')
  ensure(index.defaults && typeof index.defaults === 'object', 'Mushaf asset index missing defaults')
  ensure(Array.isArray(index.assets), 'Mushaf asset index assets must be an array')
  return index
}

async function urlsExist(urls) {
  for (const url of urls) {
    const relPath = datasetRelPathFromUrl(url)
    const fullPath = join(DATASET_DIR, relPath)
    if (!existsSync(fullPath)) {
      return false
    }
  }
  return true
}

async function textAssetsFor(riwayah, textAssetIndex) {
  const textStyleId = textAssetIndex.defaults[riwayah]
  const asset = textAssetIndex.assets.find((entry) => entry.riwayah === riwayah && entry.textStyleId === textStyleId)
  const urls = Array.isArray(asset?.files) ? asset.files.map((file) => file.url) : []
  const available = urls.length === SURAH_COUNT && (await urlsExist(urls))
  return { urls: available ? urls : [], totalBytes: available ? asset.totalBytes : 0, available }
}

async function pageAssetsFor(riwayah, mushafAssetIndex) {
  const mushafEditionId = mushafAssetIndex.defaults[riwayah] ?? DEFAULT_MUSHAF_EDITIONS[riwayah]
  const asset = mushafAssetIndex.assets.find((entry) => entry.riwayah === riwayah && entry.mushafEditionId === mushafEditionId)
  const files = Array.isArray(asset?.files) ? asset.files : []
  const urls = files.map((file) => file.url)
  const available = typeof asset?.manifestUrl === 'string' && files.length === 605 && (await urlsExist(urls))
  return {
    manifestUrl: asset?.manifestUrl ?? datasetUrl(`mushaf-pages/${riwayah}/${mushafEditionId}/manifest.json`),
    urls: available ? urls.filter((url) => url !== asset.manifestUrl) : [],
    totalBytes: available ? asset.totalBytes : 0,
    available,
  }
}

async function packageFor(riwayah, catalog, textAssetIndex, mushafAssetIndex) {
  const text = await textAssetsFor(riwayah, textAssetIndex)
  const pages = await pageAssetsFor(riwayah, mushafAssetIndex)
  const available = text.available && pages.available
  return {
    riwayah,
    optional: catalog.riwayat[riwayah].optional,
    available,
    text,
    pages,
    totalBytes: text.totalBytes + pages.totalBytes,
  }
}

async function manifestTextSourcesFromCurrentManifest() {
  const manifestPath = join(DATASET_DIR, 'manifest.json')
  if (!existsSync(manifestPath)) return null
  const manifest = await readJson(manifestPath)
  if (!Array.isArray(manifest.files)) return null
  const ids = new Set()
  for (const file of manifest.files) {
    if (typeof file?.path !== 'string') continue
    const translation = file.path.match(/^translations\/([^/]+)\//)
    const tafsir = file.path.match(/^tafsir\/([^/]+)\//)
    if (translation) ids.add(translation[1])
    if (tafsir) ids.add(tafsir[1])
  }
  return ids
}

async function refreshDatasetManifest(profileName) {
  const provenance = await readJson(join(DATASET_DIR, 'provenance.json'))
  const manifest = await buildManifestPayload({
    datasetDir: DATASET_DIR,
    riwayatDir: join(DATASET_DIR, 'riwayat'),
    translationsDir: join(DATASET_DIR, 'translations'),
    provenance,
    packageVersion: provenance.packageVersion,
    profileName,
    manifestTextSources: await manifestTextSourcesFromCurrentManifest(),
  })
  await writeFile(join(DATASET_DIR, 'manifest.json'), JSON.stringify(manifest), 'utf8')
}

export async function buildRiwayahPackageIndex({ profile = 'baseline', check = false } = {}) {
  const catalog = await loadCatalog()
  const textAssetIndex = await loadTextAssetIndex()
  const mushafAssetIndex = await loadMushafAssetIndex()
  const packages = []
  for (const riwayah of RIWAYAT) {
    packages.push(await packageFor(riwayah, catalog, textAssetIndex, mushafAssetIndex))
  }

  const qaloon = packages.find((entry) => entry.riwayah === DEFAULT_PROFILE.riwayah)
  if (profile === 'baseline') {
    ensure(qaloon?.text.available, 'Baseline dataset must include complete Qaloon text assets')
  }

  const index = {
    version: 1,
    defaultRiwayah: DEFAULT_PROFILE.riwayah,
    packages,
  }

  if (!check) {
    await mkdir(dirname(OUT_PATH), { recursive: true })
    await writeFile(OUT_PATH, JSON.stringify(index, null, 2) + '\n', 'utf8')
    await refreshDatasetManifest(profile)
  }

  return index
}

export async function main(argv = process.argv.slice(2)) {
  const profile = argValue(argv, 'profile', 'baseline')
  const check = argv.includes('--check')
  await buildRiwayahPackageIndex({ profile, check })
  if (!check) {
    console.log('[riwayah-packages] wrote indexes/riwayah-packages.json')
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
