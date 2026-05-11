#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildManifestPayload } from '../manifest/inventory.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')
const CATALOG_PATH = join(REPO_ROOT, 'data', 'catalog', 'riwayah-packages.json')
const DATASET_DIR = join(REPO_ROOT, 'public', 'dataset')
const OUT_PATH = join(DATASET_DIR, 'indexes', 'riwayah-packages.json')
const RIWAYAT = ['qaloon', 'hafs', 'warsh']
const SURAH_COUNT = 114

function argValue(argv, name, fallback = null) {
  const flag = argv.find((arg) => arg.startsWith(`--${name}=`))
  return flag ? flag.slice(name.length + 3) : fallback
}

function ensure(condition, message) {
  if (!condition) throw new Error(message)
}

function pad3(value) {
  return String(value).padStart(3, '0')
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function fileBytes(path) {
  return (await stat(path)).size
}

function datasetUrl(path) {
  ensure(!path.includes('..') && !path.includes('://'), `Invalid dataset path: ${path}`)
  return `/dataset/${path}`
}

async function loadCatalog() {
  const catalog = await readJson(CATALOG_PATH)
  ensure(catalog.version === 1, 'Riwayah package catalog version must be 1')
  ensure(catalog.defaultRiwayah === 'qaloon', 'Riwayah package catalog default must be qaloon')
  ensure(catalog.baselineRiwayah === 'qaloon', 'Riwayah package catalog baseline must be qaloon')
  for (const riwayah of RIWAYAT) {
    ensure(typeof catalog.riwayat?.[riwayah]?.optional === 'boolean', `Riwayah package catalog missing ${riwayah}`)
  }
  return catalog
}

async function textAssetsFor(riwayah) {
  const urls = []
  let totalBytes = 0
  for (let surah = 1; surah <= SURAH_COUNT; surah += 1) {
    const relPath = `riwayat/${riwayah}/${pad3(surah)}.json`
    const fullPath = join(DATASET_DIR, relPath)
    if (!existsSync(fullPath)) {
      return { urls: [], totalBytes: 0, available: false }
    }
    urls.push(datasetUrl(relPath))
    totalBytes += await fileBytes(fullPath)
  }
  return { urls, totalBytes, available: true }
}

async function pageAssetsFor(riwayah) {
  const manifestRelPath = `mushaf-pages/${riwayah}/manifest.json`
  const manifestPath = join(DATASET_DIR, manifestRelPath)
  if (!existsSync(manifestPath)) {
    return {
      manifestUrl: datasetUrl(manifestRelPath),
      urls: [],
      totalBytes: 0,
      available: false,
    }
  }

  const manifest = await readJson(manifestPath)
  ensure(manifest.version === 1, `Mushaf page manifest for ${riwayah} must be version 1`)
  ensure(manifest.riwayah === riwayah, `Mushaf page manifest riwayah mismatch for ${riwayah}`)
  ensure(Number.isInteger(manifest.pageCount) && manifest.pageCount > 0, `Invalid Mushaf page count for ${riwayah}`)
  ensure(Array.isArray(manifest.pages), `Mushaf page manifest pages missing for ${riwayah}`)
  ensure(manifest.pages.length === manifest.pageCount, `Mushaf page manifest incomplete for ${riwayah}`)

  const urls = []
  let totalBytes = await fileBytes(manifestPath)
  for (let index = 0; index < manifest.pages.length; index += 1) {
    const page = manifest.pages[index]
    const expectedPage = index + 1
    ensure(page.page === expectedPage, `Mushaf page manifest is not contiguous for ${riwayah}`)
    ensure(page.assetPath === `pages/${pad3(expectedPage)}.svg`, `Invalid Mushaf page asset path for ${riwayah} page ${expectedPage}`)
    const relPath = `mushaf-pages/${riwayah}/${page.assetPath}`
    const fullPath = join(DATASET_DIR, relPath)
    if (!existsSync(fullPath)) {
      return {
        manifestUrl: datasetUrl(manifestRelPath),
        urls: [],
        totalBytes: 0,
        available: false,
      }
    }
    urls.push(datasetUrl(relPath))
    totalBytes += await fileBytes(fullPath)
  }

  return {
    manifestUrl: datasetUrl(manifestRelPath),
    urls,
    totalBytes,
    available: true,
  }
}

async function packageFor(riwayah, catalog) {
  const text = await textAssetsFor(riwayah)
  const pages = await pageAssetsFor(riwayah)
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
  const packages = []
  for (const riwayah of RIWAYAT) {
    packages.push(await packageFor(riwayah, catalog))
  }

  const qaloon = packages.find((entry) => entry.riwayah === 'qaloon')
  if (profile === 'baseline') {
    ensure(qaloon?.available, 'Baseline dataset must include complete Qaloon text and page assets')
  }

  const index = {
    version: 1,
    defaultRiwayah: 'qaloon',
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
