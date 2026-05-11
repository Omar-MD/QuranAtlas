#!/usr/bin/env node

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
const NORMALIZED_DIR = join(REPO_ROOT, 'data', 'normalized', 'mushaf-pages')
const RIWAYAT_SOURCE_DIR = join(REPO_ROOT, 'data', 'normalized', 'quran', 'riwayat')
const DATASET_DIR = join(REPO_ROOT, 'public', 'dataset')
const OUT_ROOT = join(DATASET_DIR, 'mushaf-pages')
const RIWAYAT = ['hafs', 'warsh', 'qaloon']
const PROFILE_RIWAYAT = {
  baseline: ['qaloon'],
  full: RIWAYAT,
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

export async function writeMushafManifest({ outDir, riwayah, sourceSlug, pageCount, firstVerse, verseToPage, pageViewBoxes }) {
  const pages = []
  for (let page = 1; page <= pageCount; page += 1) {
    const filename = `${pad3(page)}.svg`
    const first = firstVerse.get(page)
    if (!first) throw new Error(`No first verse mapping for Mushaf page ${page}`)
    const viewBox = pageViewBoxes?.get(page)
    if (!viewBox) throw new Error(`No viewBox mapping for Mushaf page ${page}`)
    pages.push({
      page,
      assetPath: `pages/${filename}`,
      viewBox,
      bytes: (await stat(join(outDir, 'pages', filename))).size,
      sourcePdfUrl: quranWsPagePdfUrl(sourceSlug, page),
      firstVerse: first,
    })
  }

  const path = join(outDir, 'manifest.json')
  await writeJson(path, {
    version: 1,
    riwayah,
    sourceSlug,
    pageCount,
    attribution: {
      provider: 'quran.ws',
      sourceUrl: 'https://pdf.quran.ws/',
    },
    verseToPage,
    pages,
  })
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

async function buildRiwayah(riwayah, catalog, { check = false, missing = 'error' } = {}) {
  validateRiwayahId(riwayah)
  const sourceSlug = catalog.riwayat[riwayah].sourceSlug
  const pageCount = catalog.pageCount
  const sourcePagesDir = join(NORMALIZED_DIR, riwayah, 'pages')
  const sourceFiles = await validateSvgPageSet(sourcePagesDir, pageCount, { missing })

  if (sourceFiles.length === 0) {
    console.warn(`[mushaf-pages] skipping ${riwayah}: missing local page artifacts at ${sourcePagesDir}`)
    return false
  }

  const mappings = await deriveRiwayahMappings(riwayah, pageCount)
  if (check) return true

  const outDir = join(OUT_ROOT, riwayah)
  await mkdir(join(outDir, 'pages'), { recursive: true })
  const pageViewBoxes = new Map()
  for (const sourceFile of sourceFiles) {
    const filename = basename(sourceFile)
    const source = await readFile(sourceFile, 'utf8')
    const optimized = optimizeSvgForDataset(source)
    const themed = themeMushafSvg(optimized, { filename, colorMap: catalog.themeColorMap })
    assertThemeableSvgIntegrity(optimized, themed, filename)
    assertSafeSvg(filename, themed)
    pageViewBoxes.set(Number.parseInt(filename, 10), viewBoxForThemedPage(themed, filename))
    await writeFile(join(outDir, 'pages', filename), themed, 'utf8')
  }
  await writeMushafManifest({
    outDir,
    riwayah,
    sourceSlug,
    pageCount,
    firstVerse: mappings.firstVerse,
    verseToPage: mappings.verseToPage,
    pageViewBoxes,
  })
  console.log(`[mushaf-pages] wrote ${riwayah}: ${pageCount} pages`)
  return true
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
  if (!check) {
    await rm(OUT_ROOT, { recursive: true, force: true })
  }

  for (const riwayah of selectedRiwayat) {
    await buildRiwayah(riwayah, catalog, {
      check,
      missing: requiredRiwayat.has(riwayah) ? 'error' : 'skip',
    })
  }

  if (!check) {
    await refreshDatasetManifest(profile)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
