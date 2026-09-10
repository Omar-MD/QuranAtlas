#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { argValue, ensure, pad3, sha256Hex } from '../lib/script.mjs'
import { jsonText, readJson } from '../lib/json.mjs'
import { refreshDatasetManifest } from '../lib/manifest-refresh.mjs'
import {
  MUSHAF_FULL_RENDITION_WIDTH,
  MUSHAF_PREVIEW_RENDITION_WIDTH,
  MUSHAF_PRIVATE_EDITION_ID as PRIVATE_EDITION_ID,
  MUSHAF_PRIVATE_MEDIA_KIND as PRIVATE_MEDIA_KIND,
  MUSHAF_PRIVATE_MIME_TYPE as PRIVATE_MIME_TYPE,
  MUSHAF_PRIVATE_RENDER_DPI,
  isMushafMediaRenditionPolicy,
  isMushafPrivateEncoderPolicy,
  validateMushafRenditionDescriptor,
} from '../lib/mushaf-contract.mjs'
import { hasUnsafeCssUrlReference, isUnsafeReference, localName, normalizeCssEscapes } from '../lib/svg-safety.mjs'
import { decodeHtmlEntities } from '../lib/html-entities.mjs'
import { deriveMushafDisplayViewBox } from './display-view-box.mjs'
import { assertThemeableSvgIntegrity, themeMushafSvg } from './theme-svg.mjs'
import { loadPrivateMushafEditionContract, runtimeTextFrame, validateLegacyMetadata } from './private-pdf.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')
const CATALOG_PATH = join(REPO_ROOT, 'data', 'catalog', 'mushaf-pages.json')
const ASSET_CATALOG_PATH = join(REPO_ROOT, 'data', 'catalog', 'mushaf-assets.json')
// Tracked canonical mushaf asset index. Trees without local Mushaf media copy
// this into the dataset so the reader still resolves its default edition (page
// files stay lazy); trees with media rebuild the index and re-sync the anchor.
const ASSET_INDEX_ANCHOR_PATH = join(REPO_ROOT, 'data', 'catalog', 'mushaf-asset-index.json')
const NORMALIZED_DIR = join(REPO_ROOT, 'data', 'normalized', 'mushaf-pages')
const RIWAYAT_SOURCE_DIR = join(REPO_ROOT, 'data', 'normalized', 'quran', 'riwayat')
const DATASET_DIR = join(REPO_ROOT, 'public', 'dataset')
const OUT_ROOT = join(DATASET_DIR, 'mushaf-pages')
const RIWAYAT = ['hafs', 'warsh', 'qaloon']
const BUILD_STAMP_VERSION = 2
const BUILD_TRANSFORM_ID = 'quranatlas-mushaf-pages-theme-v2'

function sourceSurahNo(ayah) {
  return ayah.sura_no ?? ayah.sora
}

function pagesFromSourcePage(raw) {
  const text = String(raw ?? '').trim()
  const range = text.match(/^(\d+)-(\d+)$/)
  if (range) {
    const start = Number.parseInt(range[1], 10)
    const end = Number.parseInt(range[2], 10)
    ensure(
      Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end >= start,
      `Invalid Mushaf page range: ${text}`,
    )
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }
  const page = Number.parseInt(text, 10)
  ensure(Number.isInteger(page) && page >= 1 && String(page) === text, `Invalid Mushaf page metadata: ${text}`)
  return [page]
}

function validateRiwayahId(id) {
  ensure(RIWAYAT.includes(id), `Unsupported Mushaf page riwayah: ${id}`)
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

/**
 * Select the explicit page editions that a build profile is permitted to emit.
 * The standard profiles deliberately never infer an internal edition from the
 * catalog: quran.ws remains the only default output.
 */
export function editionIdsForProfile(profile, catalog) {
  const defaultEdition = catalog?.defaults?.qaloon
  ensure(
    typeof defaultEdition === 'string' && defaultEdition.length > 0,
    'Mushaf asset catalog missing default Qaloon edition',
  )
  if (profile === 'baseline') return [defaultEdition]
  if (profile === 'private') return [defaultEdition, PRIVATE_EDITION_ID]
  throw new Error(`Unsupported Mushaf page profile: ${profile}`)
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

// Collects the per-page SVG source set in a single pass: one read and one
// safety scan per page (audit §5: validateSvgPageSet + collectSvgPageSet
// near-duplicates caused a double file read). Missing-page and
// missing-directory failures keep their exact messages.
async function collectSvgPageSet(pagesDir, pageCount, { missing = 'error' } = {}) {
  if (!existsSync(pagesDir)) {
    if (missing === 'skip') return []
    throw new Error(`Mushaf missing page artifact directory: ${pagesDir}`)
  }

  const pages = []
  for (let page = 1; page <= pageCount; page += 1) {
    const filename = `${pad3(page)}.svg`
    const fullPath = join(pagesDir, filename)
    if (!existsSync(fullPath)) {
      throw new Error(`Mushaf pages missing page ${filename}`)
    }
    const text = await readFile(fullPath, 'utf8')
    assertSafeSvg(filename, text)
    pages.push({ page, filename, fullPath, text })
  }
  return pages
}

export async function buildMushafManifestPayload({
  outDir,
  riwayah,
  sourceSlug,
  pageCount,
  firstVerse,
  verseToPage,
  pageViewBoxes,
  pageDisplayViewBoxes,
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
    const displayViewBox = pageDisplayViewBoxes?.get(page)
    if (!displayViewBox) throw new Error(`No display viewBox mapping for Mushaf page ${page}`)
    const bytes = pageBytes?.get(page) ?? (await stat(join(outDir, 'pages', filename))).size
    pages.push({
      page,
      assetPath: `pages/${filename}`,
      viewBox,
      displayViewBox,
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

async function loadCatalog() {
  const catalog = await readJson(CATALOG_PATH)
  ensure(catalog.provider === 'quran.ws', 'Mushaf page catalog provider must be quran.ws')
  ensure(
    Number.isInteger(catalog.pageCount) && catalog.pageCount > 0,
    'Mushaf page catalog pageCount must be a positive integer',
  )
  ensure(
    catalog.themeColorMap && typeof catalog.themeColorMap === 'object',
    'Mushaf page catalog missing themeColorMap',
  )
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

function buildStampPath(riwayah, mushafEditionId, normalizedRoot = NORMALIZED_DIR) {
  return join(normalizedRoot, riwayah, `${mushafEditionId}-build-stamp.json`)
}

async function readJsonIfPresent(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

async function readCurrentMushafOutput({
  riwayah,
  asset,
  sourceDigest,
  pageCount,
  verifyOutputDigests = false,
  outRoot = OUT_ROOT,
  normalizedRoot = NORMALIZED_DIR,
}) {
  const outDir = join(outRoot, riwayah, asset.mushafEditionId)
  const stamp = await readJsonIfPresent(buildStampPath(riwayah, asset.mushafEditionId, normalizedRoot))
  if (
    !stamp ||
    stamp.version !== BUILD_STAMP_VERSION ||
    stamp.transform !== BUILD_TRANSFORM_ID ||
    stamp.riwayah !== riwayah ||
    stamp.mushafEditionId !== asset.mushafEditionId ||
    stamp.sourceDigest !== sourceDigest
  ) {
    return null
  }

  const editionManifestPath = join(outDir, 'manifest.json')
  const editionManifestText = await readExistingBytes(editionManifestPath)
  if (!editionManifestText) return null
  if (sha256Hex(editionManifestText) !== stamp.editionManifestDigest) return null
  const outputDigests = new Map((stamp.outputs ?? []).map((entry) => [entry.label, entry]))

  const manifest = JSON.parse(editionManifestText.toString('utf8'))
  if (
    manifest.version !== 1 ||
    manifest.riwayah !== riwayah ||
    manifest.mushafEditionId !== asset.mushafEditionId ||
    manifest.pageCount !== pageCount ||
    !Array.isArray(manifest.pages) ||
    manifest.pages.length !== pageCount
  ) {
    return null
  }

  const files = [
    {
      url: `/dataset/mushaf-pages/${riwayah}/${asset.mushafEditionId}/manifest.json`,
      bytes: editionManifestText.byteLength,
    },
  ]
  const outputFiles = [
    { path: `mushaf-pages/${riwayah}/${asset.mushafEditionId}/manifest.json`, bytes: editionManifestText.byteLength },
  ]
  let totalBytes = files[0].bytes

  for (let page = 1; page <= pageCount; page += 1) {
    const filename = `${pad3(page)}.svg`
    const pageEntry = manifest.pages[page - 1]
    if (pageEntry?.page !== page) return null
    const editionPath = join(outDir, 'pages', filename)
    const editionStats = await stat(editionPath).catch((error) => {
      if (error?.code === 'ENOENT') return null
      throw error
    })
    if (!editionStats || editionStats.size !== pageEntry.bytes) {
      return null
    }
    if (verifyOutputDigests) {
      const editionLabel = `public/dataset/mushaf-pages/${riwayah}/${asset.mushafEditionId}/pages/${filename}`
      const editionDigest = outputDigests.get(editionLabel)
      if (!editionDigest) return null
      if (editionStats.size !== editionDigest.bytes) return null
      if (sha256Hex(await readFile(editionPath)) !== editionDigest.sha256) return null
    }
    files.push({
      url: `/dataset/mushaf-pages/${riwayah}/${asset.mushafEditionId}/pages/${filename}`,
      bytes: pageEntry.bytes,
    })
    outputFiles.push({
      path: `mushaf-pages/${riwayah}/${asset.mushafEditionId}/pages/${filename}`,
      bytes: editionStats.size,
    })
    totalBytes += pageEntry.bytes
  }

  return {
    asset: {
      ...asset,
      manifestUrl: files[0].url,
      files,
      totalBytes,
      pageCount,
    },
    outputFiles,
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

async function writeBuildStamp({
  riwayah,
  asset,
  sourceDigest,
  editionManifest,
  editionFiles,
  normalizedRoot = NORMALIZED_DIR,
}) {
  await writeIfChanged(
    buildStampPath(riwayah, asset.mushafEditionId, normalizedRoot),
    jsonText({
      version: BUILD_STAMP_VERSION,
      transform: BUILD_TRANSFORM_ID,
      riwayah,
      mushafEditionId: asset.mushafEditionId,
      sourceDigest,
      editionManifestDigest: sha256Hex(Buffer.from(jsonText(editionManifest))),
      outputs: outputDigestRows(editionFiles ?? []),
    }),
  )
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
  if (existing?.equals(expected)) return false
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

function pageFilenames(pageCount, extension = '.svg') {
  return Array.from({ length: pageCount }, (_, index) => `${pad3(index + 1)}${extension}`)
}

async function removeEntriesExcept(dir, allowedNames) {
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (!allowedNames.has(entry.name)) {
      await rm(join(dir, entry.name), { recursive: true, force: true })
    }
  }
}

export async function pruneMushafOutput(resolvedAssets, { outRoot = OUT_ROOT } = {}) {
  if (!existsSync(outRoot)) return
  if (!resolvedAssets.length) {
    await rm(outRoot, { recursive: true, force: true })
    return
  }
  const allowedRiwayat = new Set(resolvedAssets.map((asset) => asset.riwayah))
  await removeEntriesExcept(outRoot, allowedRiwayat)

  for (const riwayah of allowedRiwayat) {
    const selectedAssets = resolvedAssets.filter((asset) => asset.riwayah === riwayah)
    const riwayahDir = join(outRoot, riwayah)
    // Only edition-scoped directories are emitted; pre-era root manifests and
    // page trees are pruned with everything else not selected.
    await removeEntriesExcept(riwayahDir, new Set(selectedAssets.map((asset) => asset.mushafEditionId)))
    for (const asset of selectedAssets) {
      const editionDir = join(riwayahDir, asset.mushafEditionId)
      await removeEntriesExcept(editionDir, new Set(['manifest.json', 'pages']))
      const extension = asset.sourceKind === 'local-pdf' ? '.webp' : '.svg'
      const names =
        asset.sourceKind === 'local-pdf'
          ? new Set(
              Array.from({ length: asset.pageCount }, (_, index) => [
                `${pad3(index + 1)}-${MUSHAF_PREVIEW_RENDITION_WIDTH}.webp`,
                `${pad3(index + 1)}-${MUSHAF_FULL_RENDITION_WIDTH}.webp`,
              ]).flat(),
            )
          : new Set(pageFilenames(asset.pageCount, extension))
      await removeEntriesExcept(join(editionDir, 'pages'), names)
    }
  }
}

async function buildQuranWsEdition(
  asset,
  catalog,
  assetCatalog,
  { check = false, missing = 'error', outRoot = OUT_ROOT, normalizedRoot = NORMALIZED_DIR } = {},
) {
  const riwayah = asset.riwayah
  validateRiwayahId(riwayah)
  const mushafEditionId = assetCatalog.defaults[riwayah]
  ensure(asset.mushafEditionId === mushafEditionId, `Only the default quran.ws edition may be built for ${riwayah}`)
  const sourceSlug = asset.sourceSlug ?? catalog.riwayat[riwayah].sourceSlug
  const pageCount = catalog.pageCount
  const scopedPagesDir = join(normalizedRoot, riwayah, asset.mushafEditionId, 'pages')
  const sourcePagesDir = existsSync(scopedPagesDir) ? scopedPagesDir : join(normalizedRoot, riwayah, 'pages')
  const sourcePages = await collectSvgPageSet(sourcePagesDir, pageCount, { missing })

  if (sourcePages.length === 0) {
    console.warn(`[mushaf-pages] skipping ${riwayah}: missing local page artifacts at ${sourcePagesDir}`)
    return false
  }

  const sourceDigest = await buildInputDigest({
    riwayah,
    sourceFiles: sourcePages.map((entry) => entry.fullPath),
    catalog,
    asset,
    sourceSlug,
    pageCount,
  })
  const currentOutput = check
    ? null
    : await readCurrentMushafOutput({
        riwayah,
        asset,
        sourceDigest,
        pageCount,
        verifyOutputDigests: true,
        outRoot,
        normalizedRoot,
      })
  if (currentOutput) {
    console.log(`[mushaf-pages] current ${riwayah}: ${pageCount} pages (build stamp validated)`)
    return currentOutput
  }

  const mappings = await deriveRiwayahMappings(riwayah, pageCount)
  const outDir = join(outRoot, riwayah, asset.mushafEditionId)
  const pageViewBoxes = new Map()
  const pageDisplayViewBoxes = new Map()
  const pageBytes = new Map()
  const editionFiles = []
  const stale = { missing: [], mismatched: [] }
  let written = 0

  for (const { page, filename, text: source } of sourcePages) {
    const optimized = optimizeSvgForDataset(source)
    const themed = themeMushafSvg(optimized, { filename, colorMap: catalog.themeColorMap })
    assertThemeableSvgIntegrity(optimized, themed, filename)
    assertSafeSvg(filename, themed)
    pageViewBoxes.set(page, viewBoxForThemedPage(themed, filename))
    pageDisplayViewBoxes.set(page, deriveMushafDisplayViewBox(themed, filename))
    pageBytes.set(page, Buffer.byteLength(themed))
    editionFiles.push([
      join(outDir, 'pages', filename),
      themed,
      `public/dataset/mushaf-pages/${riwayah}/${asset.mushafEditionId}/pages/${filename}`,
    ])
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
    pageDisplayViewBoxes,
    pageBytes,
  })
  editionFiles.push([
    join(outDir, 'manifest.json'),
    jsonText(editionManifest),
    `public/dataset/mushaf-pages/${riwayah}/${asset.mushafEditionId}/manifest.json`,
  ])

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
  const model = {
    asset: {
      ...asset,
      manifestUrl,
      files,
      totalBytes,
      pageCount,
    },
    outputFiles: editionFiles.map(([, content, label]) => ({
      path: label.replace(/^public\/dataset\//, ''),
      bytes: Buffer.byteLength(content),
    })),
  }

  if (check) {
    for (const [path, content, label] of editionFiles) {
      await compareExpectedFile(path, content, label, stale)
    }
    if (stale.missing.length || stale.mismatched.length) {
      throw new Error(
        `Mushaf page output is stale: missing=${stale.missing.join(',') || 'none'} mismatched=${stale.mismatched.join(',') || 'none'}`,
      )
    }
    return model
  }

  for (const [path, content] of editionFiles) {
    if (await writeIfChanged(path, content)) written += 1
  }
  await writeBuildStamp({
    riwayah,
    asset,
    sourceDigest,
    editionManifest,
    editionFiles,
    normalizedRoot,
  })
  const unchanged = editionFiles.length - written
  console.log(
    `[mushaf-pages] ${written ? 'updated' : 'current'} ${riwayah}: ${pageCount} pages (${written} files written, ${unchanged} unchanged)`,
  )
  return model
}

async function preflightQuranWsEdition(
  asset,
  catalog,
  assetCatalog,
  { missing = 'error', normalizedRoot = NORMALIZED_DIR } = {},
) {
  const riwayah = asset.riwayah
  validateRiwayahId(riwayah)
  ensure(
    asset.mushafEditionId === assetCatalog.defaults[riwayah],
    `Only the default quran.ws edition may be built for ${riwayah}`,
  )
  const pageCount = catalog.pageCount
  const scopedPagesDir = join(normalizedRoot, riwayah, asset.mushafEditionId, 'pages')
  const sourcePagesDir = existsSync(scopedPagesDir) ? scopedPagesDir : join(normalizedRoot, riwayah, 'pages')
  const sourcePages = await collectSvgPageSet(sourcePagesDir, pageCount, { missing })
  if (sourcePages.length === 0) return false
  await deriveRiwayahMappings(riwayah, pageCount)
  return true
}

function assertUnitRect(rect, label) {
  ensure(rect && typeof rect === 'object', `${label} must be an object`)
  for (const key of ['x', 'y', 'width', 'height']) ensure(Number.isFinite(rect[key]), `${label}.${key} must be finite`)
  ensure(
    rect.x >= 0 &&
      rect.y >= 0 &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.x + rect.width <= 1 &&
      rect.y + rect.height <= 1,
    `${label} must stay within the emitted Full frame`,
  )
}

function privateRenditionDescriptor(row, page, role) {
  const rendition = row.renditions?.find((entry) => entry?.role === role)
  return validateMushafRenditionDescriptor(rendition, page, role, `Private Mushaf page ${page} ${role}`)
}

function assertPrivateNormalizedProvenance(metadata, contract) {
  ensure(
    metadata.sourcePdfSha256 === contract.source.sha256,
    'Private Mushaf normalized source PDF digest disagrees with the committed source contract',
  )
  validateLegacyMetadata(metadata)
  ensure(
    metadata.contractDigest === contract.emissionContractDigest,
    'Private Mushaf normalized contract digest disagrees with the committed emission contract',
  )
  for (const tool of ['pdftocairo', 'cwebp', 'webpinfo']) {
    ensure(
      typeof metadata.toolVersions?.[tool] === 'string' && metadata.toolVersions[tool].length > 0,
      `Private Mushaf normalized ${tool} version provenance is invalid`,
    )
  }
  ensure(
    typeof metadata.contentDigest === 'string' && /^[a-f0-9]{64}$/.test(metadata.contentDigest),
    'Private Mushaf normalized metadata content digest is invalid',
  )
  const { contentDigest, ...unsignedMetadata } = metadata
  ensure(
    contentDigest === sha256Hex(Buffer.from(jsonText(unsignedMetadata))),
    'Private Mushaf normalized metadata content digest is stale or forged',
  )
  ensure(
    JSON.stringify(metadata.media) ===
      JSON.stringify({
        kind: contract.mediaPolicy.kind,
        mimeType: contract.mediaPolicy.mimeType,
        renderDpi: contract.mediaPolicy.renderDpi,
        encoder: contract.mediaPolicy.encoder,
        renditions: contract.mediaPolicy.renditions,
      }),
    'Private Mushaf normalized media policy disagrees with the committed media contract',
  )

  for (let index = 0; index < metadata.pages.length; index += 1) {
    const page = index + 1
    const row = metadata.pages[index]
    const review = contract.pageStartReviews[index]
    const framing = contract.framingPages[index]
    const expectedTextFrame = runtimeTextFrame(framing.sourceTextFrame, framing.sourceFullFrame)
    ensure(
      row.sourcePdfPage === review.sourcePdfPage &&
        row.firstVerse?.surah === review.canonicalFirstVerse.surah &&
        row.firstVerse?.verse === review.canonicalFirstVerse.verse,
      `Private Mushaf normalized page ${page} disagrees with the committed page review`,
    )
    ensure(
      row.framing?.sideLane === framing.sideLane &&
        row.framing.textFrame?.x === expectedTextFrame.x &&
        row.framing.textFrame?.y === expectedTextFrame.y &&
        row.framing.textFrame?.width === expectedTextFrame.width &&
        row.framing.textFrame?.height === expectedTextFrame.height,
      `Private Mushaf normalized page ${page} disagrees with the committed framing contract`,
    )
  }
}

async function loadPrivateNormalizedPages(asset, { missing = 'error', normalizedRoot = NORMALIZED_DIR } = {}) {
  const normalizedDir = join(normalizedRoot, asset.riwayah, asset.mushafEditionId)
  const importPath = join(normalizedDir, 'import.json')
  const bytes = await readExistingBytes(importPath)
  if (!bytes) {
    if (missing === 'skip') return null
    throw new Error(`Mushaf missing private normalized input: ${importPath}`)
  }
  const metadata = JSON.parse(bytes.toString('utf8'))
  ensure(
    metadata?.version === 1 && metadata.riwayah === asset.riwayah && metadata.mushafEditionId === asset.mushafEditionId,
    'Private Mushaf normalized metadata identity is invalid',
  )
  const contract = await loadPrivateMushafEditionContract(asset.mushafEditionId)
  assertPrivateNormalizedProvenance(metadata, contract)
  ensure(
    metadata.media?.kind === PRIVATE_MEDIA_KIND &&
      metadata.media.mimeType === PRIVATE_MIME_TYPE &&
      metadata.media.renderDpi === MUSHAF_PRIVATE_RENDER_DPI,
    'Private Mushaf normalized media policy is invalid',
  )
  ensure(isMushafPrivateEncoderPolicy(metadata.media.encoder), 'Private Mushaf normalized encoder policy is invalid')
  ensure(
    isMushafMediaRenditionPolicy(metadata.media.renditions),
    'Private Mushaf normalized rendition policy is incomplete',
  )
  ensure(
    Array.isArray(metadata.pages) && metadata.pages.length === asset.pageCount,
    'Private Mushaf normalized pages are incomplete',
  )

  const pages = []
  for (let index = 0; index < metadata.pages.length; index += 1) {
    const page = index + 1
    const row = metadata.pages[index]
    ensure(row?.page === page, `Private Mushaf normalized page ${page} is invalid`)
    ensure(
      Number.isInteger(row.firstVerse?.surah) && Number.isInteger(row.firstVerse?.verse),
      `Private Mushaf page ${page} first verse is invalid`,
    )
    assertUnitRect(row.framing?.textFrame, `Private Mushaf page ${page} textFrame`)
    ensure(['left', 'right', 'none'].includes(row.framing?.sideLane), `Private Mushaf page ${page} sideLane is invalid`)
    ensure(
      Array.isArray(row.renditions) && row.renditions.length === 2,
      `Private Mushaf page ${page} renditions are incomplete`,
    )
    const preview = privateRenditionDescriptor(row, page, 'preview')
    const fallback = privateRenditionDescriptor(row, page, 'full')
    for (const descriptor of [preview, fallback]) {
      const path = join(normalizedDir, descriptor.assetPath)
      const file = await readExistingBytes(path)
      ensure(
        file && file.byteLength === descriptor.bytes && sha256Hex(file) === descriptor.sha256,
        `Private Mushaf page ${page} ${descriptor.assetPath} bytes are invalid`,
      )
    }
    pages.push({ page, firstVerse: row.firstVerse, framing: row.framing, preview, fallback })
  }
  return { normalizedDir, metadata, pages, sourceDigest: metadata.contentDigest }
}

async function preflightPrivateEdition(asset, { missing = 'error', normalizedRoot = NORMALIZED_DIR } = {}) {
  const normalized = await loadPrivateNormalizedPages(asset, { missing, normalizedRoot })
  if (!normalized) return false
  const mappings = await deriveRiwayahMappings(asset.riwayah, asset.pageCount)
  for (const row of normalized.pages) {
    const expectedFirstVerse = mappings.firstVerse.get(row.page)
    ensure(
      expectedFirstVerse?.surah === row.firstVerse.surah && expectedFirstVerse?.verse === row.firstVerse.verse,
      `Private Mushaf page ${row.page} first verse disagrees with the canonical map`,
    )
  }
  return true
}

async function buildPrivateEdition(
  asset,
  { check = false, missing = 'error', outRoot = OUT_ROOT, normalizedRoot = NORMALIZED_DIR } = {},
) {
  const normalized = await loadPrivateNormalizedPages(asset, { missing, normalizedRoot })
  if (!normalized) {
    console.warn(`[mushaf-pages] skipping ${asset.mushafEditionId}: missing local normalized image artifacts`)
    return false
  }
  const mappings = await deriveRiwayahMappings(asset.riwayah, asset.pageCount)
  const outDir = join(outRoot, asset.riwayah, asset.mushafEditionId)
  const pageFiles = []
  const manifestPages = normalized.pages.map((row) => {
    const expectedFirstVerse = mappings.firstVerse.get(row.page)
    ensure(
      expectedFirstVerse?.surah === row.firstVerse.surah && expectedFirstVerse?.verse === row.firstVerse.verse,
      `Private Mushaf page ${row.page} first verse disagrees with the canonical map`,
    )
    const sources = [row.preview, row.fallback]
    for (const descriptor of sources)
      pageFiles.push([
        join(outDir, descriptor.assetPath),
        join(normalized.normalizedDir, descriptor.assetPath),
        descriptor,
        row.page,
      ])
    return {
      page: row.page,
      firstVerse: expectedFirstVerse,
      framing: row.framing,
      media: { kind: PRIVATE_MEDIA_KIND, fallback: row.fallback, sources },
    }
  })
  const manifest = {
    version: 2,
    riwayah: asset.riwayah,
    mushafEditionId: asset.mushafEditionId,
    editionLabel: asset.label,
    editionVersion: 'v1',
    pageCount: asset.pageCount,
    verseToPage: mappings.verseToPage,
    pages: manifestPages,
  }
  const manifestPath = join(outDir, 'manifest.json')
  const manifestText = jsonText(manifest)
  const stale = { missing: [], mismatched: [] }
  await compareExpectedFile(
    manifestPath,
    manifestText,
    `public/dataset/mushaf-pages/${asset.riwayah}/${asset.mushafEditionId}/manifest.json`,
    stale,
  )
  for (const [outputPath, inputPath, descriptor] of pageFiles) {
    const source = await readFile(inputPath)
    await compareExpectedFile(
      outputPath,
      source,
      `public/dataset/mushaf-pages/${asset.riwayah}/${asset.mushafEditionId}/${descriptor.assetPath}`,
      stale,
    )
  }
  const manifestUrl = `/dataset/mushaf-pages/${asset.riwayah}/${asset.mushafEditionId}/manifest.json`
  const files = [{ url: manifestUrl, bytes: Buffer.byteLength(manifestText) }]
  for (const page of manifestPages) {
    for (const descriptor of page.media.sources) {
      files.push({
        url: `/dataset/mushaf-pages/${asset.riwayah}/${asset.mushafEditionId}/${descriptor.assetPath}`,
        ...descriptor,
      })
    }
  }
  const model = {
    asset: {
      ...asset,
      manifestUrl,
      pageUrls: manifestPages.map(
        (page) => `/dataset/mushaf-pages/${asset.riwayah}/${asset.mushafEditionId}/${page.media.fallback.assetPath}`,
      ),
      files,
      totalBytes: files.reduce((total, file) => total + file.bytes, 0),
      pageCount: asset.pageCount,
      version: 'v2',
      provenance: `private normalized input ${normalized.sourceDigest}`,
    },
    outputFiles: files.map((file) => ({
      path: file.url.replace(/^\/dataset\//, ''),
      bytes: file.bytes,
    })),
  }
  if (check) {
    if (stale.missing.length || stale.mismatched.length)
      throw new Error(
        `Mushaf page output is stale: missing=${stale.missing.join(',') || 'none'} mismatched=${stale.mismatched.join(',') || 'none'}`,
      )
    return model
  }
  let written = (await writeIfChanged(manifestPath, manifestText)) ? 1 : 0
  for (const [outputPath, inputPath] of pageFiles) {
    if (await writeIfChanged(outputPath, await readFile(inputPath))) written += 1
  }
  console.log(
    `[mushaf-pages] ${written ? 'updated' : 'current'} ${asset.mushafEditionId}: ${asset.pageCount} pages (${written} files written)`,
  )
  return model
}

function buildMushafAssetIndexPayload(resolvedAssets, assetCatalog) {
  const emittedKeys = new Set(resolvedAssets.map((asset) => `${asset.riwayah}:${asset.mushafEditionId}`))
  const defaults = Object.fromEntries(
    Object.entries(assetCatalog.defaults).filter(([riwayah, mushafEditionId]) =>
      emittedKeys.has(`${riwayah}:${mushafEditionId}`),
    ),
  )
  return {
    version: 1,
    defaults,
    assets: resolvedAssets.map((asset) => {
      if (asset.sourceKind !== 'quran-ws') return asset
      const { sourceKind: _sourceKind, ...indexAsset } = asset
      return indexAsset
    }),
  }
}

async function writeMushafAssetIndex(payload, { datasetDir = DATASET_DIR } = {}) {
  await mkdir(join(datasetDir, 'indexes'), { recursive: true })
  await writeFile(join(datasetDir, 'indexes', 'mushaf-assets.json'), jsonText(payload), 'utf8')
}

async function collectRelativeTree(root, relativePath = '') {
  const directories = new Set()
  const files = new Set()
  for (const entry of await readdir(join(root, relativePath), { withFileTypes: true }).catch(() => [])) {
    const path = join(relativePath, entry.name)
    if (entry.isDirectory()) {
      directories.add(path)
      const nested = await collectRelativeTree(root, path)
      for (const directory of nested.directories) directories.add(directory)
      for (const file of nested.files) files.add(file)
    } else {
      files.add(path)
    }
  }
  return { directories, files }
}

function expectedMushafTree(models) {
  const files = new Set()
  const directories = new Set()
  for (const output of models.flatMap((model) => model.outputFiles)) {
    ensure(output.path.startsWith('mushaf-pages/'), `Unexpected Mushaf output path: ${output.path}`)
    const path = output.path.slice('mushaf-pages/'.length)
    files.add(path)
    let directory = dirname(path)
    while (directory !== '.') {
      directories.add(directory)
      directory = dirname(directory)
    }
  }
  return { directories, files }
}

function differingEntries(expected, actual) {
  return {
    missing: [...expected].filter((entry) => !actual.has(entry)).sort(),
    extra: [...actual].filter((entry) => !expected.has(entry)).sort(),
  }
}

async function assertExactMushafTree(models, outRoot) {
  const expected = expectedMushafTree(models)
  const actual = await collectRelativeTree(outRoot)
  const fileDiff = differingEntries(expected.files, actual.files)
  const directoryDiff = differingEntries(expected.directories, actual.directories)
  const missing = [...directoryDiff.missing, ...fileDiff.missing]
  const extra = [...directoryDiff.extra, ...fileDiff.extra]
  if (missing.length || extra.length) {
    throw new Error(
      `Mushaf output membership is stale: missing=${missing.join(',') || 'none'} extra=${extra.join(',') || 'none'}`,
    )
  }
}

async function assertExpectedIndex(payload, datasetDir) {
  const stale = { missing: [], mismatched: [] }
  await compareExpectedFile(
    join(datasetDir, 'indexes', 'mushaf-assets.json'),
    jsonText(payload),
    'public/dataset/indexes/mushaf-assets.json',
    stale,
  )
  if (stale.missing.length || stale.mismatched.length) {
    throw new Error(
      `Mushaf asset index is stale: missing=${stale.missing.join(',') || 'none'} mismatched=${stale.mismatched.join(',') || 'none'}`,
    )
  }
}

async function assertDatasetManifestMembership(models, indexPayload, datasetDir) {
  const manifestPath = join(datasetDir, 'manifest.json')
  const manifest = await readJsonIfPresent(manifestPath)
  if (!manifest) throw new Error('Mushaf dataset manifest is stale: public/dataset/manifest.json is missing')
  const expected = [
    ...models
      .flatMap((model) => model.outputFiles)
      .map((file) => ({
        path: file.path,
        lane: 'pages',
        category: 'pages',
        bytes: file.bytes,
      })),
    {
      path: 'indexes/mushaf-assets.json',
      lane: 'text',
      category: 'text-index',
      bytes: Buffer.byteLength(jsonText(indexPayload)),
    },
  ].sort((left, right) => left.path.localeCompare(right.path))
  const actual = (manifest.files ?? [])
    .filter((file) => file?.path === 'indexes/mushaf-assets.json' || file?.path?.startsWith('mushaf-pages/'))
    .sort((left, right) => left.path.localeCompare(right.path))
  const pageFiles = expected.filter((file) => file.lane === 'pages')
  const expectedPagesLane = {
    enabled: pageFiles.length > 0,
    files: pageFiles.length,
    bytes: pageFiles.reduce((total, file) => total + file.bytes, 0),
  }
  // The manifest `profile` field belongs to the text lane (a private-profile
  // tree still ships the baseline text dataset), so membership asserts only
  // the Mushaf-owned files and pages lane.
  if (
    JSON.stringify(actual) !== JSON.stringify(expected) ||
    JSON.stringify(manifest.lanes?.pages) !== JSON.stringify(expectedPagesLane)
  ) {
    throw new Error('Mushaf dataset manifest membership is stale')
  }
}

export async function main(argv = process.argv.slice(2)) {
  const profile = argValue(argv, 'profile', 'baseline')
  const check = argv.includes('--check')
  const catalog = await loadCatalog()
  const assetCatalog = await loadAssetCatalog()
  const selectedEditionIds = editionIdsForProfile(profile, assetCatalog)
  const selectedAssets = selectedEditionIds.map((editionId) => {
    const asset = assetCatalog.assets.find((entry) => entry.mushafEditionId === editionId)
    ensure(asset, `Mushaf asset catalog missing selected edition ${editionId}`)
    return asset
  })
  if (selectedAssets.length === 0) {
    console.warn(`[mushaf-pages] skipping profile=${profile}: no Mushaf page body output`)
    return
  }

  const missingPolicy = profile === 'private' ? 'error' : 'skip'
  for (const asset of selectedAssets) {
    const options = { missing: missingPolicy }
    if (asset.sourceKind === 'local-pdf') {
      await preflightPrivateEdition(asset, options)
    } else {
      await preflightQuranWsEdition(asset, catalog, assetCatalog, options)
    }
  }

  const models = []
  for (const asset of selectedAssets) {
    const model =
      asset.sourceKind === 'local-pdf'
        ? await buildPrivateEdition(asset, { check, missing: missingPolicy })
        : await buildQuranWsEdition(asset, catalog, assetCatalog, { check, missing: missingPolicy })
    if (model && typeof model === 'object') models.push(model)
  }

  const datasetIndexPath = join(DATASET_DIR, 'indexes', 'mushaf-assets.json')
  if (models.length === 0) {
    if (profile !== 'baseline') return
    // Baseline tree without local Mushaf media: the dataset must still
    // declare the profile's default edition so the reader resolves it; page
    // files stay lazy.
    if (check) {
      const anchorText = await readFile(ASSET_INDEX_ANCHOR_PATH, 'utf8')
      const datasetText = await readFile(datasetIndexPath, 'utf8')
      if (anchorText !== datasetText) {
        throw new Error(
          'Mushaf asset index drifted from data/catalog/mushaf-asset-index.json — rerun a mushaf-pages build or restore the anchor',
        )
      }
      return
    }
    await mkdir(join(DATASET_DIR, 'indexes'), { recursive: true })
    await copyFile(ASSET_INDEX_ANCHOR_PATH, datasetIndexPath)
    await refreshDatasetManifest(profile, DATASET_DIR)
    return
  }
  const resolvedAssets = models.map((model) => model.asset)
  const indexPayload = buildMushafAssetIndexPayload(resolvedAssets, assetCatalog)
  if (check) {
    await assertExactMushafTree(models, OUT_ROOT)
    await assertExpectedIndex(indexPayload, DATASET_DIR)
    if (existsSync(join(DATASET_DIR, 'manifest.json'))) {
      await assertDatasetManifestMembership(models, indexPayload, DATASET_DIR)
    }
    return
  }

  await pruneMushafOutput(resolvedAssets, { outRoot: OUT_ROOT })
  await writeMushafAssetIndex(indexPayload, { datasetDir: DATASET_DIR })
  if (profile === 'baseline') await copyFile(datasetIndexPath, ASSET_INDEX_ANCHOR_PATH)
  await refreshDatasetManifest(profile, DATASET_DIR)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
