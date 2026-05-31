#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildManifestPayload } from '../manifest/inventory.mjs'
import {
  assertThemeableSvgIntegrity,
  themeMushafSvg,
} from './theme-svg.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')
const CATALOG_PATH = join(REPO_ROOT, 'data', 'catalog', 'mushaf-pages.json')
const ASSET_CATALOG_PATH = join(REPO_ROOT, 'data', 'catalog', 'mushaf-assets.json')
const DEFAULT_PROFILE = JSON.parse(
  await readFile(join(REPO_ROOT, 'shared', 'reader-assets', 'default-profile.json'), 'utf8'),
).profile
const NORMALIZED_DIR = join(REPO_ROOT, 'data', 'normalized', 'mushaf-pages')
const RIWAYAT_SOURCE_DIR = join(REPO_ROOT, 'data', 'normalized', 'quran', 'riwayat')
const DATASET_DIR = join(REPO_ROOT, 'public', 'dataset')
const OUT_ROOT = join(DATASET_DIR, 'mushaf-pages')
const RIWAYAT = ['hafs', 'warsh', 'qaloon']
const BUILD_STAMP_VERSION = 1
const BUILD_TRANSFORM_ID = 'quranatlas-mushaf-pages-theme-v1'
const PROFILE_RIWAYAT = {
  baseline: [DEFAULT_PROFILE.riwayah],
  full: [DEFAULT_PROFILE.riwayah],
  catalog: [],
}

function pad3(n) {
  return String(n).padStart(3, '0')
}

function ensure(condition, message) {
  if (!condition) throw new Error(message)
}

function argValue(argv, name, fallback = null) {
  const flag = argv.find((arg) => arg.startsWith(`--${name}=`))
  return flag ? flag.slice(name.length + 3) : fallback
}

function argList(argv, name) {
  return argv
    .filter((arg) => arg.startsWith(`--${name}=`))
    .flatMap((arg) => arg.slice(name.length + 3).split(',').map((item) => item.trim()).filter(Boolean))
}

function sourceSurahNo(ayah) {
  return ayah.sura_no ?? ayah.sora
}

function pagesFromSourcePage(raw) {
  const text = String(raw ?? '').trim()
  const range = text.match(/^(\d+)-(\d+)$/)
  if (range) {
    const start = Number.parseInt(range[1], 10)
    const end = Number.parseInt(range[2], 10)
    ensure(Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end >= start, `Invalid Mushaf page range: ${text}`)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }
  const page = Number.parseInt(text, 10)
  ensure(Number.isInteger(page) && page >= 1 && String(page) === text, `Invalid Mushaf page metadata: ${text}`)
  return [page]
}

function validateRiwayahId(id) {
  ensure(RIWAYAT.includes(id), `Unsupported Mushaf page riwayah: ${id}`)
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function writeJson(path, value) {
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

function jsonText(value) {
  return JSON.stringify(value, null, 2) + '\n'
}

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function hashJson(hash, value) {
  hash.update(JSON.stringify(value))
  hash.update('\n')
}

export function quranWsPagePdfUrl(sourceSlug, page) {
  return `https://pdf.quran.ws/pdfs/${sourceSlug}/page/quran-${sourceSlug}-page-${page}.pdf`
}

function compactNumberLiteral(value) {
  const rounded = Number.parseFloat(value).toFixed(2)
  return (rounded === '-0.00' ? '0' : rounded).replace(/\.?0+$/, '')
}

export function optimizeSvgForDataset(text) {
  return String(text)
    .replace(/^\uFEFF/, '')
    .replace(/<\?xml[^>]*>\s*/i, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/-?\d+\.\d{3,}/g, compactNumberLiteral)
    .replace(/\s+(?=[/>])/g, '')
    .trim()
}

export function riwayatForProfile(profile = 'baseline') {
  const riwayat = PROFILE_RIWAYAT[profile]
  if (!riwayat) throw new Error(`Unsupported Mushaf page profile: ${profile}`)
  return [...riwayat]
}

export function derivePageMappings(ayat) {
  const firstVerse = new Map()
  const verseToPage = {}

  for (const ayah of ayat) {
    const pages = pagesFromSourcePage(ayah.page)
    const surah = sourceSurahNo(ayah)
    const verse = ayah.aya_no
    ensure(Number.isInteger(surah) && Number.isInteger(verse), `Invalid page metadata on ayah ${JSON.stringify(ayah)}`)

    verseToPage[`${surah}:${verse}`] = pages[0]
    for (const page of pages) {
      if (!firstVerse.has(page)) {
        firstVerse.set(page, { surah, verse })
      }
    }
  }

  return { firstVerse, verseToPage }
}

export function firstVerseByPage(ayat) {
  return derivePageMappings(ayat).firstVerse
}

export function assertSafeSvg(filename, text) {
  const decoded = decodeHtmlEntities(text)
  const cssNormalized = normalizeCssEscapes(decoded)
  if (/<!DOCTYPE\b/i.test(decoded) || /<!ENTITY\b/i.test(decoded) || /<\?xml-stylesheet\b/i.test(decoded)) {
    throw new Error(`Mushaf page ${filename} contains unsafe SVG content`)
  }
  const root = decoded.match(/<\s*([A-Za-z_][\w:.-]*)\b/)
  const rootName = root ? localName(root[1]) : ''
  if (rootName !== 'svg' || !/<\s*\/\s*(?:[\w.-]+:)?svg\s*>/i.test(decoded)) {
    throw new Error(`Mushaf page ${filename} is not an SVG document`)
  }

  for (const tag of decoded.matchAll(/<\s*\/?\s*([A-Za-z_][\w:.-]*)\b/g)) {
    const name = localName(tag[1])
    if (name === 'script' || name === 'foreignobject') {
      throw new Error(`Mushaf page ${filename} contains unsafe SVG content`)
    }
  }

  if (/\son[a-z]+\s*=/i.test(decoded) || /@import\b/i.test(cssNormalized) || hasUnsafeCssUrlReference(cssNormalized)) {
    throw new Error(`Mushaf page ${filename} contains unsafe SVG content`)
  }

  for (const attr of decoded.matchAll(/\s(?:href|xlink:href|src)\s*=\s*(["'])(.*?)\1/gis)) {
    if (isUnsafeReference(attr[2])) {
      throw new Error(`Mushaf page ${filename} contains unsafe SVG content`)
    }
  }
}

export function viewBoxForThemedPage(text, filename) {
  const match = String(text).match(/\sviewBox=(["'])(.*?)\1/i)
  if (!match) throw new Error(`Mushaf page ${filename} is missing viewBox`)
  return match[2].trim()
}

function localName(name) {
  return String(name ?? '').split(':').pop().toLowerCase()
}

function hasUnsafeCssUrlReference(value) {
  for (const match of String(value).matchAll(/\burl\s*\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gis)) {
    const raw = (match[2] ?? match[3] ?? '').trim()
    if (!/^#[A-Za-z_][\w:.-]*$/.test(raw)) {
      return true
    }
  }
  return false
}

function decodeHtmlEntities(value) {
  const named = {
    amp: '&',
    apos: "'",
    colon: ':',
    gt: '>',
    lt: '<',
    quot: '"',
  }
  return String(value)
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => codepointToString(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => codepointToString(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] ?? entity)
}

function codepointToString(codepoint) {
  if (!Number.isInteger(codepoint) || codepoint < 0 || codepoint > 0x10ffff) return ''
  return String.fromCodePoint(codepoint)
}

function normalizeCssEscapes(value) {
  return String(value)
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex) => codepointToString(Number.parseInt(hex, 16)))
    .replace(/\\([^0-9a-f])/gi, '$1')
}

function isUnsafeReference(value) {
  const normalized = normalizeCssEscapes(decodeHtmlEntities(value))
    .replace(/[\u0000-\u001f\u007f\s]+/g, '')
    .toLowerCase()
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/.test(normalized)
}

export async function validateSvgPageSet(pagesDir, pageCount, { missing = 'error' } = {}) {
  if (!existsSync(pagesDir)) {
    if (missing === 'skip') return []
    throw new Error(`Mushaf missing page artifact directory: ${pagesDir}`)
  }

  const files = []
  for (let page = 1; page <= pageCount; page += 1) {
    const filename = `${pad3(page)}.svg`
    const fullPath = join(pagesDir, filename)
    if (!existsSync(fullPath)) {
      throw new Error(`Mushaf pages missing page ${filename}`)
    }
    assertSafeSvg(filename, await readFile(fullPath, 'utf8'))
    files.push(fullPath)
  }
  return files
}

async function collectSvgPageSet(pagesDir, pageCount, { missing = 'error' } = {}) {
  if (!existsSync(pagesDir)) {
    if (missing === 'skip') return []
    throw new Error(`Mushaf missing page artifact directory: ${pagesDir}`)
  }

  const files = []
  for (let page = 1; page <= pageCount; page += 1) {
    const filename = `${pad3(page)}.svg`
    const fullPath = join(pagesDir, filename)
    if (!existsSync(fullPath)) {
      throw new Error(`Mushaf pages missing page ${filename}`)
    }
    files.push(fullPath)
  }
  return files
}

export async function buildMushafManifestPayload({
  outDir,
  riwayah,
  sourceSlug,
  pageCount,
  firstVerse,
  verseToPage,
  pageViewBoxes,
  pageBytes = null,
  mushafEditionId = null,
  editionLabel = null,
  editionVersion = null,
}) {
  const pages = []
  for (let page = 1; page <= pageCount; page += 1) {
    const filename = `${pad3(page)}.svg`
    const first = firstVerse.get(page)
    if (!first) throw new Error(`No first verse mapping for Mushaf page ${page}`)
    const viewBox = pageViewBoxes?.get(page)
    if (!viewBox) throw new Error(`No viewBox mapping for Mushaf page ${page}`)
    const bytes = pageBytes?.get(page) ?? (await stat(join(outDir, 'pages', filename))).size
    pages.push({
      page,
      assetPath: `pages/${filename}`,
      viewBox,
      bytes,
      sourcePdfUrl: quranWsPagePdfUrl(sourceSlug, page),
      firstVerse: first,
    })
  }

  return {
    version: 1,
    riwayah,
    ...(mushafEditionId ? { mushafEditionId } : {}),
    ...(editionLabel ? { editionLabel } : {}),
    ...(editionVersion ? { editionVersion } : {}),
    sourceSlug,
    pageCount,
    attribution: {
      provider: 'quran.ws',
      sourceUrl: 'https://pdf.quran.ws/',
    },
    verseToPage,
    pages,
  }
}

export async function writeMushafManifest(options) {
  const path = join(options.outDir, 'manifest.json')
  await writeJson(path, await buildMushafManifestPayload(options))
  return path
}

async function loadCatalog() {
  const catalog = await readJson(CATALOG_PATH)
  ensure(catalog.provider === 'quran.ws', 'Mushaf page catalog provider must be quran.ws')
  ensure(Number.isInteger(catalog.pageCount) && catalog.pageCount > 0, 'Mushaf page catalog pageCount must be a positive integer')
  ensure(catalog.themeColorMap && typeof catalog.themeColorMap === 'object', 'Mushaf page catalog missing themeColorMap')
  ensure(catalog.themeColorMap['#ffffff'] === 'ground', 'Mushaf page catalog must map #ffffff to ground')
  ensure(catalog.themeColorMap['#000000'] === 'ink', 'Mushaf page catalog must map #000000 to ink')
  for (const riwayah of RIWAYAT) {
    ensure(catalog.riwayat?.[riwayah]?.sourceSlug, `Mushaf page catalog missing sourceSlug for ${riwayah}`)
  }
  return catalog
}

async function loadAssetCatalog() {
  const catalog = await readJson(ASSET_CATALOG_PATH)
  ensure(catalog.version === 1, 'Mushaf asset catalog version must be 1')
  ensure(catalog.defaults && typeof catalog.defaults === 'object', 'Mushaf asset catalog missing defaults')
  ensure(Array.isArray(catalog.assets), 'Mushaf asset catalog assets must be an array')
  return catalog
}

async function deriveRiwayahMappings(riwayah, pageCount) {
  const sourcePath = join(RIWAYAT_SOURCE_DIR, `${riwayah}.json`)
  const ayat = await readJson(sourcePath)
  const mappings = derivePageMappings(ayat)
  for (let page = 1; page <= pageCount; page += 1) {
    if (!mappings.firstVerse.has(page)) {
      throw new Error(`No first verse mapping for Mushaf page ${page}`)
    }
  }
  return mappings
}

async function fileDigest(path) {
  return sha256Hex(await readFile(path))
}

async function buildInputDigest({ riwayah, sourceFiles, catalog, asset, sourceSlug, pageCount }) {
  const hash = createHash('sha256')
  hashJson(hash, {
    version: BUILD_STAMP_VERSION,
    transform: BUILD_TRANSFORM_ID,
    riwayah,
    mushafEditionId: asset.mushafEditionId,
    sourceSlug,
    pageCount,
    themeColorMap: catalog.themeColorMap,
    riwayahSourceDigest: await fileDigest(join(RIWAYAT_SOURCE_DIR, `${riwayah}.json`)),
  })

  for (const sourceFile of sourceFiles) {
    const stats = await stat(sourceFile)
    hashJson(hash, {
      filename: basename(sourceFile),
      bytes: stats.size,
      sha256: await fileDigest(sourceFile),
    })
  }

  return hash.digest('hex')
}

function buildStampPath(riwayah, mushafEditionId) {
  return join(NORMALIZED_DIR, riwayah, `${mushafEditionId}-build-stamp.json`)
}

async function readJsonIfPresent(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

async function readCurrentMushafOutput({ riwayah, asset, sourceDigest, pageCount, verifyOutputDigests = false }) {
  const outDir = join(OUT_ROOT, riwayah, asset.mushafEditionId)
  const legacyOutDir = join(OUT_ROOT, riwayah)
  const stamp = await readJsonIfPresent(buildStampPath(riwayah, asset.mushafEditionId))
  if (
    !stamp
    || stamp.version !== BUILD_STAMP_VERSION
    || stamp.transform !== BUILD_TRANSFORM_ID
    || stamp.riwayah !== riwayah
    || stamp.mushafEditionId !== asset.mushafEditionId
    || stamp.sourceDigest !== sourceDigest
  ) {
    return null
  }

  const editionManifestPath = join(outDir, 'manifest.json')
  const legacyManifestPath = join(legacyOutDir, 'manifest.json')
  const editionManifestText = await readExistingBytes(editionManifestPath)
  const legacyManifestText = await readExistingBytes(legacyManifestPath)
  if (!editionManifestText || !legacyManifestText) return null
  if (sha256Hex(editionManifestText) !== stamp.editionManifestDigest) return null
  if (sha256Hex(legacyManifestText) !== stamp.legacyManifestDigest) return null
  const outputDigests = new Map((stamp.outputs ?? []).map((entry) => [entry.label, entry]))

  const manifest = JSON.parse(editionManifestText.toString('utf8'))
  const legacyManifest = JSON.parse(legacyManifestText.toString('utf8'))
  if (
    manifest.version !== 1
    || manifest.riwayah !== riwayah
    || manifest.mushafEditionId !== asset.mushafEditionId
    || manifest.pageCount !== pageCount
    || !Array.isArray(manifest.pages)
    || manifest.pages.length !== pageCount
    || legacyManifest.version !== 1
    || legacyManifest.riwayah !== riwayah
    || legacyManifest.pageCount !== pageCount
    || !Array.isArray(legacyManifest.pages)
    || legacyManifest.pages.length !== pageCount
  ) {
    return null
  }

  const files = [{
    url: `/dataset/mushaf-pages/${riwayah}/${asset.mushafEditionId}/manifest.json`,
    bytes: editionManifestText.byteLength,
  }]
  let totalBytes = files[0].bytes

  for (let page = 1; page <= pageCount; page += 1) {
    const filename = `${pad3(page)}.svg`
    const pageEntry = manifest.pages[page - 1]
    const legacyPageEntry = legacyManifest.pages[page - 1]
    if (pageEntry?.page !== page || legacyPageEntry?.page !== page) return null
    const editionPath = join(outDir, 'pages', filename)
    const legacyPath = join(legacyOutDir, 'pages', filename)
    const editionStats = await stat(editionPath).catch((error) => {
      if (error?.code === 'ENOENT') return null
      throw error
    })
    const legacyStats = await stat(legacyPath).catch((error) => {
      if (error?.code === 'ENOENT') return null
      throw error
    })
    if (!editionStats || !legacyStats || editionStats.size !== pageEntry.bytes || legacyStats.size !== legacyPageEntry.bytes) {
      return null
    }
    if (verifyOutputDigests) {
      const editionLabel = `public/dataset/mushaf-pages/${riwayah}/${asset.mushafEditionId}/pages/${filename}`
      const legacyLabel = `public/dataset/mushaf-pages/${riwayah}/pages/${filename}`
      const editionDigest = outputDigests.get(editionLabel)
      const legacyDigest = outputDigests.get(legacyLabel)
      if (!editionDigest || !legacyDigest) return null
      if (editionStats.size !== editionDigest.bytes || legacyStats.size !== legacyDigest.bytes) return null
      if (sha256Hex(await readFile(editionPath)) !== editionDigest.sha256) return null
      if (sha256Hex(await readFile(legacyPath)) !== legacyDigest.sha256) return null
    }
    files.push({
      url: `/dataset/mushaf-pages/${riwayah}/${asset.mushafEditionId}/pages/${filename}`,
      bytes: pageEntry.bytes,
    })
    totalBytes += pageEntry.bytes
  }

  return {
    ...asset,
    manifestUrl: files[0].url,
    files,
    totalBytes,
    pageCount,
  }
}

function outputDigestRows(files) {
  return files.map(([, content, label]) => {
    const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content)
    return {
      label,
      bytes: bytes.byteLength,
      sha256: sha256Hex(bytes),
    }
  })
}

async function writeBuildStamp({ riwayah, asset, sourceDigest, editionManifest, legacyManifest, editionFiles, legacyFiles }) {
  await writeIfChanged(buildStampPath(riwayah, asset.mushafEditionId), jsonText({
    version: BUILD_STAMP_VERSION,
    transform: BUILD_TRANSFORM_ID,
    riwayah,
    mushafEditionId: asset.mushafEditionId,
    sourceDigest,
    editionManifestDigest: sha256Hex(Buffer.from(jsonText(editionManifest))),
    legacyManifestDigest: sha256Hex(Buffer.from(jsonText(legacyManifest))),
    outputs: outputDigestRows([...(editionFiles ?? []), ...(legacyFiles ?? [])]),
  }))
}

async function readExistingBytes(path) {
  try {
    return await readFile(path)
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

async function writeIfChanged(path, content) {
  const expected = Buffer.isBuffer(content) ? content : Buffer.from(content)
  const existing = await readExistingBytes(path)
  if (existing && existing.equals(expected)) return false
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
  return true
}

async function compareExpectedFile(path, expected, label, stale) {
  const expectedBytes = Buffer.isBuffer(expected) ? expected : Buffer.from(expected)
  const existing = await readExistingBytes(path)
  if (!existing) {
    stale.missing.push(label)
  } else if (!existing.equals(expectedBytes)) {
    stale.mismatched.push(label)
  }
}

function pageFilenames(pageCount) {
  return Array.from({ length: pageCount }, (_, index) => `${pad3(index + 1)}.svg`)
}

async function removeEntriesExcept(dir, allowedNames) {
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (!allowedNames.has(entry.name)) {
      await rm(join(dir, entry.name), { recursive: true, force: true })
    }
  }
}

async function pruneMushafOutput(resolvedAssets) {
  if (!existsSync(OUT_ROOT)) return
  if (!resolvedAssets.length) {
    await rm(OUT_ROOT, { recursive: true, force: true })
    return
  }
  const allowedRiwayat = new Set(resolvedAssets.map((asset) => asset.riwayah))
  await removeEntriesExcept(OUT_ROOT, allowedRiwayat)

  for (const asset of resolvedAssets) {
    const riwayahDir = join(OUT_ROOT, asset.riwayah)
    const allowedRootEntries = new Set(['manifest.json', 'pages', asset.mushafEditionId])
    await removeEntriesExcept(riwayahDir, allowedRootEntries)
    await removeEntriesExcept(join(riwayahDir, 'pages'), new Set(pageFilenames(asset.pageCount)))
    await removeEntriesExcept(join(riwayahDir, asset.mushafEditionId), new Set(['manifest.json', 'pages']))
    await removeEntriesExcept(join(riwayahDir, asset.mushafEditionId, 'pages'), new Set(pageFilenames(asset.pageCount)))
  }
}

async function buildRiwayah(riwayah, catalog, assetCatalog, { check = false, missing = 'error' } = {}) {
  validateRiwayahId(riwayah)
  const mushafEditionId = assetCatalog.defaults[riwayah]
  const asset = assetCatalog.assets.find((entry) => entry.riwayah === riwayah && entry.mushafEditionId === mushafEditionId)
  ensure(asset, `Mushaf asset catalog missing default asset for ${riwayah}`)
  const sourceSlug = asset.sourceSlug ?? catalog.riwayat[riwayah].sourceSlug
  const pageCount = catalog.pageCount
  const sourcePagesDir = join(NORMALIZED_DIR, riwayah, 'pages')
  const sourceFiles = await collectSvgPageSet(sourcePagesDir, pageCount, { missing })

  if (sourceFiles.length === 0) {
    console.warn(`[mushaf-pages] skipping ${riwayah}: missing local page artifacts at ${sourcePagesDir}`)
    return false
  }

  const sourceDigest = await buildInputDigest({ riwayah, sourceFiles, catalog, asset, sourceSlug, pageCount })
  const currentOutput = await readCurrentMushafOutput({ riwayah, asset, sourceDigest, pageCount, verifyOutputDigests: true })
  if (currentOutput) {
    if (!check) {
      console.log(`[mushaf-pages] current ${riwayah}: ${pageCount} pages (build stamp validated)`)
    }
    return check ? true : currentOutput
  }

  await validateSvgPageSet(sourcePagesDir, pageCount, { missing })
  const mappings = await deriveRiwayahMappings(riwayah, pageCount)
  const outDir = join(OUT_ROOT, riwayah, asset.mushafEditionId)
  const legacyOutDir = join(OUT_ROOT, riwayah)
  const pageViewBoxes = new Map()
  const pageBytes = new Map()
  const editionFiles = []
  const legacyFiles = []
  const stale = { missing: [], mismatched: [] }
  let written = 0

  for (const sourceFile of sourceFiles) {
    const filename = basename(sourceFile)
    const page = Number.parseInt(filename, 10)
    const source = await readFile(sourceFile, 'utf8')
    const optimized = optimizeSvgForDataset(source)
    const themed = themeMushafSvg(optimized, { filename, colorMap: catalog.themeColorMap })
    assertThemeableSvgIntegrity(optimized, themed, filename)
    assertSafeSvg(filename, themed)
    pageViewBoxes.set(page, viewBoxForThemedPage(themed, filename))
    pageBytes.set(page, Buffer.byteLength(themed))
    editionFiles.push([join(outDir, 'pages', filename), themed, `public/dataset/mushaf-pages/${riwayah}/${asset.mushafEditionId}/pages/${filename}`])
    legacyFiles.push([join(legacyOutDir, 'pages', filename), themed, `public/dataset/mushaf-pages/${riwayah}/pages/${filename}`])
  }

  const editionManifest = await buildMushafManifestPayload({
    outDir,
    riwayah,
    mushafEditionId: asset.mushafEditionId,
    editionLabel: asset.label,
    editionVersion: 'v1',
    sourceSlug,
    pageCount,
    firstVerse: mappings.firstVerse,
    verseToPage: mappings.verseToPage,
    pageViewBoxes,
    pageBytes,
  })
  const legacyManifest = await buildMushafManifestPayload({
    outDir: legacyOutDir,
    riwayah,
    sourceSlug,
    pageCount,
    firstVerse: mappings.firstVerse,
    verseToPage: mappings.verseToPage,
    pageViewBoxes,
    pageBytes,
  })
  editionFiles.push([join(outDir, 'manifest.json'), jsonText(editionManifest), `public/dataset/mushaf-pages/${riwayah}/${asset.mushafEditionId}/manifest.json`])
  legacyFiles.push([join(legacyOutDir, 'manifest.json'), jsonText(legacyManifest), `public/dataset/mushaf-pages/${riwayah}/manifest.json`])

  if (check) {
    for (const [path, content, label] of [...editionFiles, ...legacyFiles]) {
      await compareExpectedFile(path, content, label, stale)
    }
    if (stale.missing.length || stale.mismatched.length) {
      throw new Error(`Mushaf page output is stale: missing=${stale.missing.join(',') || 'none'} mismatched=${stale.mismatched.join(',') || 'none'}`)
    }
    await writeBuildStamp({ riwayah, asset, sourceDigest, editionManifest, legacyManifest, editionFiles, legacyFiles })
    return true
  }

  for (const [path, content] of [...editionFiles, ...legacyFiles]) {
    if (await writeIfChanged(path, content)) written += 1
  }
  await writeBuildStamp({ riwayah, asset, sourceDigest, editionManifest, legacyManifest, editionFiles, legacyFiles })
  const unchanged = editionFiles.length + legacyFiles.length - written
  console.log(`[mushaf-pages] ${written ? 'updated' : 'current'} ${riwayah}: ${pageCount} pages (${written} files written, ${unchanged} unchanged)`)
  const manifestUrl = `/dataset/mushaf-pages/${riwayah}/${asset.mushafEditionId}/manifest.json`
  const manifestBytes = Buffer.byteLength(jsonText(editionManifest))
  const files = [{ url: manifestUrl, bytes: manifestBytes }]
  let totalBytes = files[0].bytes
  for (let page = 1; page <= pageCount; page += 1) {
    const filename = `${pad3(page)}.svg`
    const bytes = pageBytes.get(page)
    files.push({ url: `/dataset/mushaf-pages/${riwayah}/${asset.mushafEditionId}/pages/${filename}`, bytes })
    totalBytes += bytes
  }
  return {
    ...asset,
    manifestUrl,
    files,
    totalBytes,
    pageCount,
  }
}

async function writeMushafAssetIndex(resolvedAssets, assetCatalog) {
  const emittedKeys = new Set(resolvedAssets.map((asset) => `${asset.riwayah}:${asset.mushafEditionId}`))
  const defaults = Object.fromEntries(
    Object.entries(assetCatalog.defaults).filter(([riwayah, mushafEditionId]) => (
      emittedKeys.has(`${riwayah}:${mushafEditionId}`)
    )),
  )
  await mkdir(join(DATASET_DIR, 'indexes'), { recursive: true })
  await writeJson(join(DATASET_DIR, 'indexes', 'mushaf-assets.json'), {
    version: 1,
    defaults,
    assets: resolvedAssets,
  })
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

export async function main(argv = process.argv.slice(2)) {
  const profile = argValue(argv, 'profile', 'baseline')
  const check = argv.includes('--check')
  const requiredRiwayat = new Set(argList(argv, 'require-riwayah'))
  for (const riwayah of requiredRiwayat) validateRiwayahId(riwayah)

  const selectedRiwayat = riwayatForProfile(profile)
  const selected = new Set(selectedRiwayat)
  for (const riwayah of requiredRiwayat) {
    if (!selected.has(riwayah)) {
      throw new Error(`Required Mushaf page riwayah ${riwayah} is not part of profile ${profile}`)
    }
  }
  if (selectedRiwayat.length === 0) {
    console.warn(`[mushaf-pages] skipping profile=${profile}: no Mushaf page body output`)
    return
  }

  const catalog = await loadCatalog()
  const assetCatalog = await loadAssetCatalog()

  const resolvedAssets = []
  for (const riwayah of selectedRiwayat) {
    const resolved = await buildRiwayah(riwayah, catalog, assetCatalog, {
      check,
      missing: requiredRiwayat.has(riwayah) ? 'error' : 'skip',
    })
    if (resolved && typeof resolved === 'object') resolvedAssets.push(resolved)
  }

  if (!check) {
    await pruneMushafOutput(resolvedAssets)
    await writeMushafAssetIndex(resolvedAssets, assetCatalog)
    await refreshDatasetManifest(profile)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
