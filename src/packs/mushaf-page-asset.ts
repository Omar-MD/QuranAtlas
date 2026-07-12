import { assertRuntimeDatasetUrl } from '../data/runtime-boundary'
import type { Riwayah } from '../storage/types'
import type {
  MushafExternalImageDescriptor,
  MushafExternalImageSource,
  MushafPageFraming,
} from './mushaf-index'
import { mushafManifestUrl, mushafPageUrl, resolveMushafEditionAssetUrl } from './mushaf-paths'

export type { MushafExternalImageSource, MushafPageFraming } from './mushaf-index'

export type SvgViewBox = {
  x: number
  y: number
  width: number
  height: number
}

export type ReactInlineMushafSvg = {
  markup: string
  viewBox: SvgViewBox
  viewBoxText: string
}

export type MushafResolvedPage = {
  riwayah: Riwayah
  mushafEditionId: string
  page: number
  pageCount: number
  riwayahLabel: string
  assetUrl: string
  displaySize?: { width: number; height: number }
  /** @deprecated V1 source metadata only; new reader code uses displaySize. */
  viewBox?: SvgViewBox
  /** @deprecated V1 source metadata only; new reader code uses displaySize. */
  viewBoxText?: string
  framing?: MushafPageFraming
  firstVerse: { surah: number; verse: number }
  lastVerse?: { surah: number; verse: number }
}

export type QuranRef = { surah: number; verse: number }

export type MushafPageAssetState =
  | { status: 'loading' }
  | { status: 'ready'; media: MushafReadyMedia; inlineSvg?: ReactInlineMushafSvg; resolved: MushafResolvedPage }
  | { status: 'unavailable'; reason: string; riwayah: Riwayah; mushafEditionId: string }
  | { status: 'error'; error: Error }
  | { status: 'aborted' }

export type MushafReadyPageAssetState = Extract<MushafPageAssetState, { status: 'ready' }>

export type MushafReadyMedia =
  | { kind: 'inline-svg'; inlineSvg: ReactInlineMushafSvg }
  | { kind: 'external-image'; source: MushafExternalImageSource }

export type PreparedMushafPage =
  | { kind: 'inline-svg'; assetUrl: string; inlineSvg: ReactInlineMushafSvg; resolved: MushafResolvedPage }
  | PreparedExternalMushafPage

type MushafManifestPageV1 = {
  page: number
  assetPath: string
  viewBox: string
  firstVerse: QuranRef
}

type MushafManifestPageV2 = {
  page: number
  firstVerse: QuranRef
  framing: MushafPageFraming
  media: {
    kind: 'external-image'
    fallback: MushafExternalImageDescriptor
    sources: MushafExternalImageDescriptor[]
  }
}

export type MushafManifestV1 = {
  version: 1
  riwayah: Riwayah
  mushafEditionId: string
  pageCount: number
  pages: MushafManifestPageV1[]
  verseToPage: Record<string, number>
}

export type MushafManifestV2 = {
  version: 2
  riwayah: Riwayah
  mushafEditionId: string
  pageCount: number
  pages: MushafManifestPageV2[]
  verseToPage: Record<string, number>
}

export type MushafManifest = MushafManifestV1 | MushafManifestV2

export type PreparedExternalMushafPage = {
  kind: 'external-image'
  preview: MushafExternalImageSource
  full: MushafExternalImageSource
  page: number
  pageCount: number
  firstVerse: QuranRef
  lastVerse: QuranRef
  framing: MushafPageFraming
  resolved: MushafResolvedPage
}

export type MushafPageLoadPurpose = 'current' | 'preview'

export type PreparedExternalMushafImage =
  | { status: 'ready'; image: HTMLImageElement }
  | { status: 'aborted' }
  | { status: 'error'; error: Error }

export type MushafExternalImageFactory = () => HTMLImageElement

export type MushafFramingCapability = {
  hasValidFraming: boolean
  representativeTextFrame?: MushafPageFraming['textFrame']
}

type MushafAssetIndex = {
  assets?: Array<{
    files?: Array<{ url?: unknown }>
    manifestUrl?: unknown
    mushafEditionId?: unknown
    pageCount?: unknown
    riwayah?: unknown
    version?: unknown
    pageUrls?: unknown
  }>
}

type LoadMushafPageAssetOptions = {
  fetcher?: typeof fetch
  mushafEditionId: string
  page: number
  riwayah: Riwayah
  signal?: AbortSignal
}

const RIWAYAH_LABELS: Record<Riwayah, string> = {
  qaloon: 'Qaloon',
}

const COLOR_TOKENS: Record<string, string> = {
  black: 'var(--qa-react-mushaf-ink)',
  quranWsInk: 'var(--qa-react-mushaf-ink)',
  white: 'var(--qa-react-mushaf-ground)',
  'var(--qa-mushaf-ground)': 'var(--qa-react-mushaf-ground)',
  'var(--qa-mushaf-ink)': 'var(--qa-react-mushaf-ink)',
  'var(--qa-mushaf-ornament)': 'var(--qa-react-mushaf-ink)',
  'var(--qa-mushaf-accent)': 'var(--qa-react-mushaf-accent)',
}

export async function loadMushafPageAsset({
  fetcher = fetch,
  mushafEditionId,
  page,
  riwayah,
  signal,
}: LoadMushafPageAssetOptions): Promise<MushafPageAssetState> {
  if (signal?.aborted) return { status: 'aborted' }
  try {
    const index = await fetchJson<MushafAssetIndex>(fetcher, '/dataset/indexes/mushaf-assets.json', signal)
    if (!hasIndexedMushafAsset(index, { mushafEditionId, page, riwayah })) {
      return {
        status: 'unavailable',
        reason: `Mushaf page pack is not indexed for ${riwayah}/${mushafEditionId}`,
        riwayah,
        mushafEditionId,
      }
    }
    const manifest = await loadMushafManifest({ fetcher, mushafEditionId, riwayah, signal })
    if (manifest.version !== 1) throw new Error('External-image Mushaf pages require the V2 reader loader')
    const resolved = resolveMushafPage(manifest, { mushafEditionId, page, riwayah })
    const svgText = await fetchText(fetcher, resolved.assetUrl, signal)
    const inlineSvg = prepareReactInlineMushafSvg(svgText)
    const sourceViewBox = manifest.pages.find((entry) => entry.page === resolved.page)?.viewBox?.trim()
    if (inlineSvg.viewBoxText !== sourceViewBox) {
      throw new Error('Mushaf page SVG viewBox does not match the page manifest')
    }
    resolved.displaySize = { width: inlineSvg.viewBox.width, height: inlineSvg.viewBox.height }
    return { status: 'ready', media: { kind: 'inline-svg', inlineSvg }, inlineSvg, resolved }
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) return { status: 'aborted' }
    if (error instanceof Error && /Failed to fetch .*: 404/.test(error.message)) {
      return { status: 'unavailable', reason: error.message, riwayah, mushafEditionId }
    }
    return { status: 'error', error: error instanceof Error ? error : new Error('Mushaf page unavailable') }
  }
}

export async function loadPreparedExternalMushafPage({
  fetcher = fetch,
  mushafEditionId,
  page,
  riwayah,
  signal,
}: LoadMushafPageAssetOptions): Promise<PreparedExternalMushafPage> {
  if (signal?.aborted) throw abortError()
  const index = await fetchJson<MushafAssetIndex>(fetcher, '/dataset/indexes/mushaf-assets.json', signal)
  const manifest = await loadMushafManifest({ fetcher, mushafEditionId, riwayah, signal })
  if (manifest.version !== 2) throw new Error('Prepared external Mushaf pages require a V2 manifest')
  if (signal?.aborted) throw abortError()

  const clampedPage = Math.min(manifest.pageCount, Math.max(1, Math.floor(page)))
  const pageEntry = manifest.pages.find((entry) => entry.page === clampedPage)
  if (!pageEntry) throw new Error(`Mushaf manifest has no page ${clampedPage}`)
  const indexEntry = findExternalMushafIndexEntry(index, { mushafEditionId, riwayah })
  validateExternalManifestIndexAgreement(manifest, indexEntry, { mushafEditionId, riwayah })

  const preview = externalSourceForRole(pageEntry, indexEntry, { mushafEditionId, riwayah }, 'preview')
  const full = externalSourceForRole(pageEntry, indexEntry, { mushafEditionId, riwayah }, 'full')
  return {
    kind: 'external-image',
    preview,
    full,
    page: clampedPage,
    pageCount: manifest.pageCount,
    firstVerse: pageEntry.firstVerse,
    lastVerse: lastVerseForMushafPage(manifest, clampedPage),
    framing: pageEntry.framing,
    resolved: {
      riwayah,
      mushafEditionId,
      page: clampedPage,
      pageCount: manifest.pageCount,
      riwayahLabel: RIWAYAH_LABELS[riwayah],
      assetUrl: full.assetUrl,
      displaySize: { width: full.width, height: full.height },
      framing: pageEntry.framing,
      firstVerse: pageEntry.firstVerse,
      lastVerse: lastVerseForMushafPage(manifest, clampedPage),
    },
  }
}

export async function loadPreparedMushafPage(options: LoadMushafPageAssetOptions): Promise<PreparedMushafPage> {
  const manifest = await loadMushafManifest(options)
  if (manifest.version === 2) return loadPreparedExternalMushafPage(options)
  const state = await loadMushafPageAsset(options)
  if (state.status !== 'ready') throw state.status === 'error' ? state.error : new Error('Mushaf page unavailable')
  if (state.media.kind !== 'inline-svg') throw new Error('Invalid inline Mushaf media')
  return { kind: 'inline-svg', assetUrl: state.resolved.assetUrl, inlineSvg: state.media.inlineSvg, resolved: state.resolved }
}

export async function loadMushafFramingCapability({
  fetcher = fetch,
  mushafEditionId,
  riwayah,
  signal,
}: {
  fetcher?: typeof fetch
  mushafEditionId: string
  riwayah: Riwayah
  signal?: AbortSignal
}): Promise<MushafFramingCapability> {
  try {
    const index = await fetchJson<MushafAssetIndex>(fetcher, '/dataset/indexes/mushaf-assets.json', signal)
    if (!findExternalMushafIndexEntrySafe(index, { mushafEditionId, riwayah })) return { hasValidFraming: false }
    const manifest = await loadMushafManifest({ fetcher, mushafEditionId, riwayah, signal })
    if (manifest.version !== 2) return { hasValidFraming: false }
    // This reuses the V2 descriptor/index agreement validator before exposing a private capability.
    await loadPreparedExternalMushafPage({ fetcher, mushafEditionId, page: 1, riwayah, signal })
    const hasValidFraming = manifest.pages.length === manifest.pageCount
      && manifest.pages.every((page, index) => page.page === index + 1 && isMushafPageFraming(page.framing))
    if (!hasValidFraming) return { hasValidFraming: false }
    const representative = manifest.pages[Math.floor(manifest.pages.length / 2)]?.framing.textFrame
    return representative ? { hasValidFraming: true, representativeTextFrame: representative } : { hasValidFraming: false }
  } catch {
    return { hasValidFraming: false }
  }
}

export function selectExternalMushafSource(
  page: PreparedExternalMushafPage,
  purpose: MushafPageLoadPurpose,
): MushafExternalImageSource {
  return purpose === 'current' ? page.full : page.preview
}

export async function prepareExternalMushafImage(
  source: MushafExternalImageSource,
  signal?: AbortSignal,
  imageFactory: MushafExternalImageFactory = () => new Image(),
): Promise<PreparedExternalMushafImage> {
  if (signal?.aborted) return { status: 'aborted' }
  try {
    const image = imageFactory()
    await waitForExternalImageLoad(image, source.assetUrl, signal)
    if (signal?.aborted) return { status: 'aborted' }
    await waitForExternalImageDecode(image, signal)
    if (signal?.aborted) return { status: 'aborted' }
    return { status: 'ready', image }
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) return { status: 'aborted' }
    return { status: 'error', error: error instanceof Error ? error : new Error('Mushaf image preparation failed') }
  }
}

export async function loadMushafManifest({
  fetcher = fetch,
  mushafEditionId,
  riwayah,
  signal,
}: {
  fetcher?: typeof fetch
  mushafEditionId: string
  riwayah: Riwayah
  signal?: AbortSignal
}): Promise<MushafManifest> {
  const manifestUrl = mushafManifestUrl({ riwayah, mushafEditionId })
  const manifest = await fetchJson<MushafManifest>(fetcher, manifestUrl, signal)
  assertMushafManifest(manifest, { mushafEditionId, riwayah })
  return manifest
}

export function pageForVerseInMushafManifest(manifest: MushafManifest, ref: QuranRef): number | null {
  const page = manifest.verseToPage?.[`${ref.surah}:${ref.verse}`]
  if (!Number.isInteger(page) || page < 1 || page > manifest.pageCount) return null
  return page
}

export function firstVerseForMushafPage(manifest: MushafManifest, page: number): QuranRef {
  const clampedPage = Math.min(manifest.pageCount, Math.max(1, Math.floor(page)))
  const pageEntry = manifest.pages.find((entry) => entry.page === clampedPage)
  if (!pageEntry) throw new Error(`Mushaf manifest has no page ${clampedPage}`)
  return { surah: pageEntry.firstVerse.surah, verse: pageEntry.firstVerse.verse }
}

export function lastVerseForMushafPage(manifest: MushafManifest, page: number): QuranRef {
  const clampedPage = Math.min(manifest.pageCount, Math.max(1, Math.floor(page)))
  let lastRef: QuranRef | null = null
  for (const [key, mappedPage] of Object.entries(manifest.verseToPage ?? {})) {
    if (mappedPage !== clampedPage) continue
    const ref = parseQuranRefKey(key)
    if (!ref) continue
    if (!lastRef || compareQuranRefs(ref, lastRef) > 0) lastRef = ref
  }
  return lastRef ?? firstVerseForMushafPage(manifest, clampedPage)
}

function hasIndexedMushafAsset(
  index: MushafAssetIndex,
  expected: { riwayah: Riwayah; mushafEditionId: string; page: number },
): boolean {
  const entry = index.assets?.find((asset) =>
    asset.riwayah === expected.riwayah
    && asset.mushafEditionId === expected.mushafEditionId
    && asset.manifestUrl === mushafManifestUrl(expected)
    && asset.pageCount === 604,
  )
  if (!entry) return false
  const pageUrl = mushafPageUrl(expected, Math.min(604, Math.max(1, Math.floor(expected.page))))
  return Boolean(entry.files?.some((file) => file.url === pageUrl))
}

export function prepareReactInlineMushafSvg(text: string): ReactInlineMushafSvg {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    throw new Error('Inline SVG parsing is not supported in this environment')
  }

  const document = new DOMParser().parseFromString(text, 'image/svg+xml')
  if (document.querySelector('parsererror')) throw new Error('Invalid Mushaf page SVG')
  const root = document.documentElement
  if (!root || root.localName.toLowerCase() !== 'svg') throw new Error('Invalid Mushaf page SVG')
  validateSafeSvg(root)

  const viewBoxText = root.getAttribute('viewBox')?.trim()
  if (!viewBoxText) throw new Error('Mushaf page SVG is missing viewBox')
  const sourceViewBox = parseViewBox(viewBoxText)
  root.classList.add('qa-react-mushaf-svg')
  root.setAttribute('aria-hidden', 'true')
  root.setAttribute('focusable', 'false')
  root.removeAttribute('width')
  root.removeAttribute('height')
  root.removeAttribute('role')
  removeAria(root)

  for (const node of Array.from(root.querySelectorAll('title, desc'))) node.remove()
  for (const element of Array.from(root.querySelectorAll('*'))) {
    element.removeAttribute('tabindex')
    element.removeAttribute('role')
    removeAria(element)
    rewritePaint(element)
  }

  const viewBox = displayViewBoxForMushafPage(sourceViewBox, root)
  root.setAttribute('viewBox', serializeViewBox(viewBox))

  return { markup: new XMLSerializer().serializeToString(root), viewBox, viewBoxText }
}

function resolveMushafPage(
  manifest: MushafManifestV1,
  expected: { riwayah: Riwayah; mushafEditionId: string; page: number },
): MushafResolvedPage {
  assertMushafManifest(manifest, expected)

  const clampedPage = Math.min(manifest.pageCount, Math.max(1, Math.floor(expected.page)))
  const pageEntry = manifest.pages.find((entry) => entry.page === clampedPage)
  if (!pageEntry) throw new Error(`Mushaf manifest has no page ${clampedPage}`)
  const expectedPath = `pages/${String(clampedPage).padStart(3, '0')}.svg`
  if (pageEntry.assetPath !== expectedPath) throw new Error(`Invalid Mushaf asset path at page ${clampedPage}`)
  const assetUrl = mushafPageUrl(expected, clampedPage)
  assertRuntimeDatasetUrl(assetUrl)
  return {
    riwayah: expected.riwayah,
    mushafEditionId: expected.mushafEditionId,
    page: clampedPage,
    pageCount: manifest.pageCount,
    riwayahLabel: RIWAYAH_LABELS[expected.riwayah],
    assetUrl,
    displaySize: displaySizeForViewBox(parseViewBox(pageEntry.viewBox)),
    firstVerse: pageEntry.firstVerse,
    lastVerse: lastVerseForMushafPage(manifest, clampedPage),
  }
}

function displaySizeForViewBox(viewBox: SvgViewBox): { width: number; height: number } {
  return { width: viewBox.width, height: viewBox.height }
}

function parseQuranRefKey(key: string): QuranRef | null {
  const [surahPart, versePart] = key.split(':')
  const surah = Number.parseInt(surahPart ?? '', 10)
  const verse = Number.parseInt(versePart ?? '', 10)
  if (!Number.isInteger(surah) || !Number.isInteger(verse) || surah < 1 || verse < 1) return null
  return { surah, verse }
}

function compareQuranRefs(a: QuranRef, b: QuranRef): number {
  if (a.surah !== b.surah) return a.surah - b.surah
  return a.verse - b.verse
}

function assertMushafManifest(
  manifest: MushafManifest,
  expected: { riwayah: Riwayah; mushafEditionId: string },
): void {
  if (manifest.version !== 1 && manifest.version !== 2) throw new Error('Unsupported Mushaf manifest version')
  if (manifest.riwayah !== expected.riwayah) throw new Error('Mushaf manifest riwayah mismatch')
  if (manifest.mushafEditionId !== expected.mushafEditionId) throw new Error('Mushaf manifest edition mismatch')
  if (!Number.isInteger(manifest.pageCount) || manifest.pageCount < 1) throw new Error('Invalid Mushaf page count')
  if (!manifest.verseToPage || typeof manifest.verseToPage !== 'object') throw new Error('Invalid Mushaf verse-to-page map')
  if (manifest.version === 1) return
  if (!Array.isArray(manifest.pages)) throw new Error('Invalid Mushaf manifest pages')
  for (const page of manifest.pages) validateExternalManifestPage(page)
}

type MushafExternalIndexEntry = {
  riwayah?: unknown
  mushafEditionId?: unknown
  manifestUrl?: unknown
  pageCount?: unknown
  version?: unknown
  pageUrls?: unknown
  files?: Array<Record<string, unknown>>
}

function findExternalMushafIndexEntry(
  index: MushafAssetIndex,
  expected: { riwayah: Riwayah; mushafEditionId: string },
): MushafExternalIndexEntry {
  const entry = index.assets?.find((asset) => (
    asset.riwayah === expected.riwayah
    && asset.mushafEditionId === expected.mushafEditionId
    && asset.manifestUrl === mushafManifestUrl(expected)
    && asset.pageCount === 604
    && asset.version === 'v2'
  ))
  if (!entry) throw new Error(`Mushaf external-image pack is not indexed for ${expected.riwayah}/${expected.mushafEditionId}`)
  return entry as MushafExternalIndexEntry
}

function findExternalMushafIndexEntrySafe(
  index: MushafAssetIndex,
  expected: { riwayah: Riwayah; mushafEditionId: string },
): MushafExternalIndexEntry | null {
  try {
    return findExternalMushafIndexEntry(index, expected)
  } catch {
    return null
  }
}

function validateExternalManifestIndexAgreement(
  manifest: MushafManifestV2,
  indexEntry: MushafExternalIndexEntry,
  identity: { riwayah: Riwayah; mushafEditionId: string },
): void {
  if (manifest.pageCount !== 604 || manifest.pages.length !== manifest.pageCount) {
    throw new Error('External-image Mushaf manifest must contain every page')
  }
  if (!Array.isArray(indexEntry.pageUrls) || indexEntry.pageUrls.length !== manifest.pageCount || !Array.isArray(indexEntry.files)) {
    throw new Error('External-image Mushaf asset index is incomplete')
  }
  const manifestUrl = mushafManifestUrl(identity)
  const expectedDescriptors = new Map<string, MushafExternalImageDescriptor>()
  for (let index = 0; index < manifest.pages.length; index += 1) {
    const page = manifest.pages[index]!
    if (page.page !== index + 1) throw new Error('External-image Mushaf manifest page order is invalid')
    const fallbackUrl = resolveMushafEditionAssetUrl(identity, page.media.fallback.assetPath)
    if (indexEntry.pageUrls[page.page - 1] !== fallbackUrl) {
      throw new Error(`External-image descriptor disagrees with its asset index at page ${page.page}`)
    }
    for (const descriptor of page.media.sources) {
      const url = resolveMushafEditionAssetUrl(identity, descriptor.assetPath)
      if (expectedDescriptors.has(url)) throw new Error(`External-image descriptor disagrees with its asset index at page ${page.page}`)
      expectedDescriptors.set(url, descriptor)
    }
  }
  const indexedDescriptors = new Set<string>()
  let manifestFileCount = 0
  for (const file of indexEntry.files) {
    if (file.url === manifestUrl) {
      manifestFileCount += 1
      continue
    }
    if (typeof file.url !== 'string') throw new Error('External-image descriptor disagrees with its asset index')
    const descriptor = expectedDescriptors.get(file.url)
    if (!descriptor || indexedDescriptors.has(file.url) || !sameExternalDescriptor(file, descriptor)) {
      throw new Error('External-image descriptor disagrees with its asset index')
    }
    indexedDescriptors.add(file.url)
  }
  if (manifestFileCount !== 1 || indexedDescriptors.size !== expectedDescriptors.size) {
    throw new Error('External-image descriptor disagrees with its asset index')
  }
}

function externalSourceForRole(
  page: MushafManifestPageV2,
  indexEntry: MushafExternalIndexEntry,
  identity: { riwayah: Riwayah; mushafEditionId: string },
  role: 'preview' | 'full',
): MushafExternalImageSource {
  const width = role === 'preview' ? 1280 : 2136
  const descriptor = page.media.sources.find((source) => source.width === width)
  if (!descriptor || (role === 'full' && !sameExternalDescriptor(page.media.fallback, descriptor))) {
    throw new Error(`External-image Mushaf ${role} descriptor is invalid at page ${page.page}`)
  }
  const assetUrl = resolveMushafEditionAssetUrl(identity, descriptor.assetPath)
  const file = indexEntry.files?.find((candidate) => candidate.url === assetUrl)
  if (!sameExternalDescriptor(file, descriptor)) {
    throw new Error(`External-image descriptor disagrees with its asset index at page ${page.page}`)
  }
  return { ...descriptor, assetUrl }
}

function validateExternalManifestPage(page: MushafManifestPageV2): void {
  if (!Number.isInteger(page.page) || !isQuranRef(page.firstVerse)) throw new Error('Invalid V2 Mushaf manifest page')
  if (!isMushafPageFraming(page.framing) || page.media?.kind !== 'external-image') {
    throw new Error('Invalid V2 Mushaf manifest page')
  }
  if (!Array.isArray(page.media.sources) || page.media.sources.length !== 2) throw new Error('Invalid V2 Mushaf media sources')
  for (const descriptor of page.media.sources) validateExternalDescriptor(descriptor, page.page)
  validateExternalDescriptor(page.media.fallback, page.page)
  const preview = page.media.sources.find((source) => source.width === 1280)
  const full = page.media.sources.find((source) => source.width === 2136)
  if (!preview || !full || !sameExternalDescriptor(page.media.fallback, full)) {
    throw new Error(`Invalid V2 Mushaf rendition roles at page ${page.page}`)
  }
}

function validateExternalDescriptor(descriptor: MushafExternalImageDescriptor, page: number): void {
  if (!descriptor || descriptor.assetPath !== `pages/${String(page).padStart(3, '0')}-${descriptor.width}.webp`
    || !Number.isInteger(descriptor.bytes) || descriptor.bytes <= 0
    || !/^[a-f0-9]{64}$/.test(descriptor.sha256)
    || !Number.isInteger(descriptor.width) || descriptor.width <= 0
    || !Number.isInteger(descriptor.height) || descriptor.height <= 0
    || descriptor.mimeType !== 'image/webp') {
    throw new Error(`Invalid V2 Mushaf external-image descriptor at page ${page}`)
  }
}

function isMushafPageFraming(value: MushafPageFraming): boolean {
  const frame = value?.textFrame
  return Boolean(frame && ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(frame[key as keyof typeof frame]))
    && frame.x >= 0 && frame.y >= 0 && frame.width > 0 && frame.height > 0
    && frame.x + frame.width <= 1 && frame.y + frame.height <= 1
    && ['left', 'right', 'none'].includes(value.sideLane))
}

function sameExternalDescriptor(file: Record<string, unknown> | undefined, descriptor: MushafExternalImageDescriptor): boolean {
  return Boolean(file
    && file.bytes === descriptor.bytes
    && file.sha256 === descriptor.sha256
    && file.width === descriptor.width
    && file.height === descriptor.height
    && file.mimeType === descriptor.mimeType)
}

function isQuranRef(value: QuranRef): boolean {
  return Number.isInteger(value?.surah) && value.surah > 0 && Number.isInteger(value?.verse) && value.verse > 0
}

function waitForExternalImageLoad(image: HTMLImageElement, assetUrl: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => done(() => reject(abortError()))
    const onLoad = () => done(resolve)
    const onError = () => done(() => reject(new Error(`Failed to load Mushaf image: ${assetUrl}`)))
    const done = (finish: () => void) => {
      signal?.removeEventListener('abort', onAbort)
      image.onload = null
      image.onerror = null
      finish()
    }
    if (signal?.aborted) return onAbort()
    signal?.addEventListener('abort', onAbort, { once: true })
    image.onload = onLoad
    image.onerror = onError
    image.src = assetUrl
  })
}

function waitForExternalImageDecode(image: HTMLImageElement, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => done(() => reject(abortError()))
    const done = (finish: () => void) => {
      signal?.removeEventListener('abort', onAbort)
      finish()
    }
    if (signal?.aborted) return onAbort()
    signal?.addEventListener('abort', onAbort, { once: true })
    try {
      image.decode().then(
        () => done(resolve),
        (error) => done(() => reject(error)),
      )
    } catch (error) {
      done(() => reject(error))
    }
  })
}

function abortError(): DOMException {
  return new DOMException('Mushaf image preparation was aborted', 'AbortError')
}

async function fetchJson<T>(fetcher: typeof fetch, url: string, signal?: AbortSignal): Promise<T> {
  assertRuntimeDatasetUrl(url)
  const response = await fetcher(url, { signal })
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  return response.json() as Promise<T>
}

async function fetchText(fetcher: typeof fetch, url: string, signal?: AbortSignal): Promise<string> {
  assertRuntimeDatasetUrl(url)
  const response = await fetcher(url, { signal })
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  return response.text()
}

function parseViewBox(text: string): SvgViewBox {
  const parts = text.trim().split(/\s+/).map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part)) || parts[2]! <= 0 || parts[3]! <= 0) {
    throw new Error(`Invalid Mushaf viewBox: ${text}`)
  }
  return { x: parts[0]!, y: parts[1]!, width: parts[2]!, height: parts[3]! }
}

function displayViewBoxForMushafPage(viewBox: SvgViewBox, root?: Element): SvgViewBox {
  const isQuranWsPage = Math.abs(viewBox.x) < 0.001
    && Math.abs(viewBox.y) < 0.001
    && Math.abs(viewBox.width - 900) < 0.001
    && Math.abs(viewBox.height - 1379.25) < 0.001
  if (!isQuranWsPage) return viewBox
  return root ? displayInkBoundsForMushafPage(root, viewBox) ?? quranWsFallbackViewBox() : quranWsFallbackViewBox()
}

function displayInkBoundsForMushafPage(root: Element, source: SvgViewBox): SvgViewBox | null {
  const boxes = Array.from(root.querySelectorAll('path'))
    .filter((element) => !element.closest('defs'))
    .filter((element) => {
      const fill = element.getAttribute('fill')
      const stroke = element.getAttribute('stroke')
      return fill === 'var(--qa-react-mushaf-ink)'
        || fill === 'var(--qa-react-mushaf-accent)'
        || stroke === 'var(--qa-react-mushaf-ink)'
        || stroke === 'var(--qa-react-mushaf-accent)'
    })
    .map((element) => clippedPathBounds(root, element) ?? pathDataBounds(element.getAttribute('d') ?? ''))
    .filter((box): box is SvgViewBox => Boolean(box))

  if (boxes.length === 0) return null
  const left = Math.min(...boxes.map((box) => box.x))
  const top = Math.min(...boxes.map((box) => box.y))
  const right = Math.max(...boxes.map((box) => box.x + box.width))
  const bottom = Math.max(...boxes.map((box) => box.y + box.height))
  const margin = 24
  const x = Math.max(source.x, left - margin)
  const y = Math.max(source.y, top - margin)
  const width = Math.min(source.x + source.width, right + margin) - x
  const height = Math.min(source.y + source.height, bottom + margin) - y
  if (width <= 0 || height <= 0) return null
  return {
    x: roundViewBoxNumber(x),
    y: roundViewBoxNumber(y),
    width: roundViewBoxNumber(width),
    height: roundViewBoxNumber(height),
  }
}

function clippedPathBounds(root: Element, element: Element): SvgViewBox | null {
  const clipId = nearestClipPathId(element)
  if (!clipId) return null
  const clipPath = root.querySelector(`defs clipPath#${cssEscape(clipId)}`)
  if (!clipPath) return null
  const boxes = Array.from(clipPath.querySelectorAll('path'))
    .map((path) => pathDataBounds(path.getAttribute('d') ?? ''))
    .filter((box): box is SvgViewBox => Boolean(box))
  if (boxes.length === 0) return null
  const left = Math.min(...boxes.map((box) => box.x))
  const top = Math.min(...boxes.map((box) => box.y))
  const right = Math.max(...boxes.map((box) => box.x + box.width))
  const bottom = Math.max(...boxes.map((box) => box.y + box.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function nearestClipPathId(element: Element): string | null {
  let current: Element | null = element
  while (current) {
    const clip = current.getAttribute('clip-path')
    const match = clip?.match(/^url\(#([A-Za-z][\w.-]*)\)$/)
    if (match) return match[1]
    current = current.parentElement
  }
  return null
}

function cssEscape(value: string): string {
  return value.replace(/["\\#.;:[\]>+~*^$|=,\s]/g, '\\$&')
}

function pathDataBounds(d: string): SvgViewBox | null {
  const values = Array.from(d.matchAll(/-?\d+(?:\.\d+)?/g), (match) => Number(match[0]))
  if (values.length < 2) return null
  const xs: number[] = []
  const ys: number[] = []
  for (let index = 0; index + 1 < values.length; index += 2) {
    xs.push(values[index])
    ys.push(values[index + 1])
  }
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  const right = Math.max(...xs)
  const bottom = Math.max(...ys)
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(right) || !Number.isFinite(bottom)) return null
  if (right <= x || bottom <= y) return null
  return { x, y, width: right - x, height: bottom - y }
}

function quranWsFallbackViewBox(): SvgViewBox {
  return { x: 60, y: 60, width: 790, height: 1270 }
}

function serializeViewBox(viewBox: SvgViewBox): string {
  return `${formatViewBoxNumber(viewBox.x)} ${formatViewBoxNumber(viewBox.y)} ${formatViewBoxNumber(viewBox.width)} ${formatViewBoxNumber(viewBox.height)}`
}

function formatViewBoxNumber(value: number): string {
  return roundViewBoxNumber(value).toString()
}

function roundViewBoxNumber(value: number): number {
  return Number(value.toFixed(3))
}

function validateSafeSvg(root: Element): void {
  for (const element of [root, ...Array.from(root.querySelectorAll('*'))]) {
    const name = element.localName.toLowerCase()
    if (name === 'script' || name === 'foreignobject' || name === 'style') throw new Error('Mushaf page SVG contains unsafe content')
    for (const attr of Array.from(element.attributes)) {
      const attrName = attr.name.toLowerCase()
      const value = attr.value.trim()
      if (attrName.startsWith('on')) throw new Error('Mushaf page SVG contains unsafe content')
      if (attrName === 'href' || attrName.endsWith(':href') || attrName === 'src') validateFragment(value)
      if ((attrName === 'fill' || attrName === 'stroke' || attrName === 'clip-path' || attrName === 'mask') && /\burl\s*\(/i.test(value)) {
        for (const match of value.matchAll(/\burl\s*\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gis)) {
          validateFragment((match[2] ?? match[3] ?? '').trim())
        }
      }
    }
  }
}

function validateFragment(value: string): void {
  if (!/^#[A-Za-z_][\w:.-]*$/.test(value)) throw new Error('Mushaf page SVG contains unsafe content')
}

function removeAria(element: Element): void {
  for (const attr of Array.from(element.attributes)) {
    if (attr.name.toLowerCase().startsWith('aria-')) element.removeAttribute(attr.name)
  }
}

function rewritePaint(element: Element): void {
  for (const attr of ['fill', 'stroke']) {
    const value = element.getAttribute(attr)
    if (value === null) continue
    const normalized = normalizeColor(value)
    element.setAttribute(attr, COLOR_TOKENS[normalized] ?? value)
  }
}

function normalizeColor(value: string): string {
  const lower = value.trim().toLowerCase()
  const short = lower.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/)
  const expanded = short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : lower
  if (expanded === `#${'000000'}`) return 'black'
  if (expanded === `#${'231f20'}`) return 'quranWsInk'
  if (expanded === `#${'ffffff'}`) return 'white'
  return lower
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
