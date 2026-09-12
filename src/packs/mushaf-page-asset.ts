import { compareQuranRefs, isQuranRef, parseQuranRefKey, type QuranRef } from '../continuity/verse-key'
import { fetchJson, isAbortError } from '../data/fetch'
import { assertRuntimeDatasetUrl } from '../data/runtime-boundary'
import { MUSHAF_ASSET_INDEX_URL } from '../../shared/reader-assets/default-profile'
import type { Riwayah } from '../storage/types'
import {
  assertMushafManifest as assertMushafManifestContract,
  sameMushafExternalImageDescriptor,
  type MushafAssetIndex,
  type MushafAssetIndexEntryRaw,
  type MushafExternalImageDescriptor,
  type MushafExternalImageSource,
  type MushafManifest,
  type MushafManifestPageV2,
  type MushafManifestV1,
  type MushafManifestV2,
  type MushafPageFraming,
  findMushafAssetIndexEntry,
  isMushafPageFraming,
} from './mushaf-index'
import {
  MUSHAF_FULL_RENDITION_WIDTH,
  MUSHAF_PAGE_COUNT,
  MUSHAF_PREVIEW_RENDITION_WIDTH,
  mushafManifestUrl,
  mushafPageUrl,
  mushafSvgPageAssetPath,
  mushafWebpPageAssetPath,
  resolveMushafEditionAssetUrl,
} from './mushaf-paths'

export type {
  MushafExternalImageSource,
  MushafManifest,
  MushafManifestPageV1,
  MushafManifestPageV2,
  MushafManifestV1,
  MushafManifestV2,
  MushafPageFraming,
} from './mushaf-index'
export type { QuranRef } from '../continuity/verse-key'

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
  displaySize: { width: number; height: number }
  framing?: MushafPageFraming
  firstVerse: { surah: number; verse: number }
  lastVerse?: { surah: number; verse: number }
}

export type MushafReadyPageAssetState = { status: 'ready'; media: MushafReadyMedia; resolved: MushafResolvedPage }

export type MushafReadyMedia =
  | { kind: 'inline-svg'; inlineSvg: ReactInlineMushafSvg }
  | { kind: 'external-image'; source: MushafExternalImageSource }

export type MushafPageDescriptor =
  | {
      kind: 'inline-svg'
      assetUrl: string
      displayViewBox: SvgViewBox
      sourceViewBox: SvgViewBox
      resolved: MushafResolvedPage
    }
  | PreparedExternalMushafPage

export type MushafMediaPurpose = 'readable' | 'full'

export class MushafAssetHttpError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`Failed to fetch ${url}: ${status}`)
  }
}

// All three Mushaf dataset fetches throw the typed HTTP error so
// classifyMushafPageFailure can distinguish missing pages from failures.
const mushafAssetHttpError = (url: string, status: number): MushafAssetHttpError =>
  new MushafAssetHttpError(url, status)

// Typed marker for external-image load failures; the <img> element exposes no
// status, so classifyMushafPageFailure matches the type, never the message.
class MushafImageLoadError extends Error {}

export type MushafPageFailureKind = 'transient' | 'confirmed-missing' | 'contract-error'

export function classifyMushafPageFailure(error: unknown): MushafPageFailureKind {
  if (error instanceof MushafAssetHttpError) {
    if (error.status === 404) return 'confirmed-missing'
    if (error.status >= 500) return 'transient'
    return 'contract-error'
  }
  if (error instanceof DOMException && error.name === 'AbortError') throw error
  if (error instanceof DOMException && error.name === 'EncodingError') return 'transient'
  if (error instanceof TypeError) return 'transient'
  if (error instanceof MushafImageLoadError) return 'transient'
  return 'contract-error'
}

type PreparedExternalMushafPage = {
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

export type PreparedExternalMushafImage =
  | { status: 'ready'; image: HTMLImageElement }
  | { status: 'aborted' }
  | { status: 'error'; error: Error }

export type MushafExternalImageFactory = () => HTMLImageElement

export type MushafFramingCapability = {
  hasValidFraming: boolean
  representativeTextFrame?: MushafPageFraming['textFrame']
  /**
   * Present only when the capability probe itself failed (unreachable or
   * corrupt manifest). Absent means the edition legitimately carries no
   * framing; `hasValidFraming` is false in both cases, so consumers that only
   * need the gate are unaffected.
   */
  availabilityError?: Error
}

export type MushafPageProfileContext = {
  index: MushafAssetIndex
  manifest: MushafManifest
  mushafEditionId: string
  riwayah: Riwayah
}

type LoadMushafPageAssetOptions = {
  context?: MushafPageProfileContext
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

// Single validated parse per manifest instance: the per-page walk runs once
// per fetched manifest object, no matter how many contexts wrap it or how
// many pages are later described from it.
const validatedManifests = new WeakSet<MushafManifest>()
const validatedProfileContexts = new WeakSet<MushafPageProfileContext>()

export async function loadMushafPageProfileContext({
  fetcher = fetch,
  mushafEditionId,
  riwayah,
  signal,
}: Omit<LoadMushafPageAssetOptions, 'context' | 'page'>): Promise<MushafPageProfileContext> {
  if (signal?.aborted) throw abortError()
  const [index, manifest] = await Promise.all([
    fetchJson<MushafAssetIndex>(fetcher, MUSHAF_ASSET_INDEX_URL, { signal, httpError: mushafAssetHttpError }),
    fetchJson<MushafManifest>(fetcher, mushafManifestUrl({ mushafEditionId, riwayah }), {
      signal,
      httpError: mushafAssetHttpError,
    }),
  ])
  if (signal?.aborted) throw abortError()
  const context = { index, manifest, mushafEditionId, riwayah }
  assertMushafPageProfileContext(context, { mushafEditionId, riwayah })
  validatedProfileContexts.add(context)
  return context
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
    const context = await loadMushafPageProfileContext({ fetcher, mushafEditionId, riwayah, signal })
    return deriveMushafFramingCapability(context)
  } catch (error) {
    if (isAbortError(error, signal)) throw error
    // §7.5: resolve the probe failure as a distinct availability-error state
    // instead of swallowing it into "no framing".
    return {
      hasValidFraming: false,
      availabilityError: error instanceof Error ? error : new Error('Mushaf framing capability could not be loaded'),
    }
  }
}

export function deriveMushafFramingCapability(context: MushafPageProfileContext): MushafFramingCapability {
  if (context.manifest.version !== 2) return { hasValidFraming: false }
  const valid =
    context.manifest.pages.length === context.manifest.pageCount &&
    context.manifest.pages.every((page, index) => page.page === index + 1 && isMushafPageFraming(page.framing))
  if (!valid) return { hasValidFraming: false }
  const representativeTextFrame =
    context.manifest.pages[Math.floor(context.manifest.pages.length / 2)]?.framing.textFrame
  return representativeTextFrame ? { hasValidFraming: true, representativeTextFrame } : { hasValidFraming: false }
}

export function describeMushafPage(context: MushafPageProfileContext, page: number): MushafPageDescriptor {
  const expected = { mushafEditionId: context.mushafEditionId, riwayah: context.riwayah }
  ensureValidatedMushafPageProfileContext(context, expected)
  if (context.manifest.version === 2) return prepareExternalMushafPage({ ...context, manifest: context.manifest }, page)
  if (!hasIndexedMushafAsset(context.index, { ...expected, page })) {
    throw new Error(`Mushaf page pack is not indexed for ${expected.riwayah}/${expected.mushafEditionId}`)
  }
  const unresolved = resolveMushafPage(context.manifest, { ...expected, page })
  const pageEntry = context.manifest.pages.find((entry) => entry.page === unresolved.page)
  if (!pageEntry) throw new Error(`Mushaf manifest has no page ${unresolved.page}`)
  const sourceViewBox = parseViewBox(pageEntry.viewBox)
  const displayViewBox = parseViewBox(pageEntry.displayViewBox)
  assertContainedViewBox(displayViewBox, sourceViewBox)
  return {
    kind: 'inline-svg',
    assetUrl: unresolved.assetUrl,
    sourceViewBox,
    displayViewBox,
    resolved: {
      ...unresolved,
      displaySize: { width: displayViewBox.width, height: displayViewBox.height },
    },
  }
}

export async function prepareMushafDescriptorMedia(
  descriptor: MushafPageDescriptor,
  purpose: MushafMediaPurpose,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<MushafReadyMedia> {
  if (signal?.aborted) throw abortError()
  if (descriptor.kind === 'external-image') {
    return { kind: 'external-image', source: purpose === 'full' ? descriptor.full : descriptor.preview }
  }
  if (purpose !== 'readable') throw new Error('Inline Mushaf pages only provide readable media')
  const svgText = await fetchText(fetcher, descriptor.assetUrl, signal)
  return {
    kind: 'inline-svg',
    inlineSvg: prepareReactInlineMushafSvg(svgText, {
      sourceViewBox: descriptor.sourceViewBox,
      displayViewBox: descriptor.displayViewBox,
    }),
  }
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
    return { status: 'ready', image }
  } catch (error) {
    if (isAbortError(error, signal)) return { status: 'aborted' }
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
  const manifest = await fetchJson<MushafManifest>(fetcher, manifestUrl, { signal, httpError: mushafAssetHttpError })
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
  const entry = findMushafAssetIndexEntry(index, {
    riwayah: expected.riwayah,
    mushafEditionId: expected.mushafEditionId,
    pageCount: MUSHAF_PAGE_COUNT,
  })
  if (!entry) return false
  const page = Math.min(MUSHAF_PAGE_COUNT, Math.max(1, Math.floor(expected.page)))
  if (entry.version === 'v2') {
    return (
      Array.isArray(entry.pageUrls) &&
      entry.pageUrls[page - 1] ===
        resolveMushafEditionAssetUrl(expected, mushafWebpPageAssetPath(page, MUSHAF_FULL_RENDITION_WIDTH))
    )
  }
  const pageUrl = mushafPageUrl(expected, page)
  return Boolean(entry.files?.some((file) => file.url === pageUrl))
}

function assertMushafPageProfileContext(
  context: MushafPageProfileContext,
  expected: { riwayah: Riwayah; mushafEditionId: string },
): void {
  assertMushafPageProfileIdentity(context, expected)
  assertMushafManifest(context.manifest, expected)
  const indexed = findMushafAssetIndexEntry(context.index, {
    riwayah: expected.riwayah,
    mushafEditionId: expected.mushafEditionId,
    pageCount: context.manifest.pageCount,
  })
  if (!indexed) throw new Error(`Mushaf page pack is not indexed for ${expected.riwayah}/${expected.mushafEditionId}`)
  if (context.manifest.version === 2) {
    const external = findExternalMushafIndexEntry(context.index, expected)
    validateExternalManifestIndexAgreement(context.manifest, external, expected)
  } else if (indexed.version === 'v2') {
    throw new Error('Mushaf asset index version does not match its manifest')
  }
}

function ensureValidatedMushafPageProfileContext(
  context: MushafPageProfileContext,
  expected: { riwayah: Riwayah; mushafEditionId: string },
): void {
  assertMushafPageProfileIdentity(context, expected)
  if (validatedProfileContexts.has(context)) return
  assertMushafPageProfileContext(context, expected)
  validatedProfileContexts.add(context)
}

function assertMushafPageProfileIdentity(
  context: MushafPageProfileContext,
  expected: { riwayah: Riwayah; mushafEditionId: string },
): void {
  if (
    context.riwayah !== expected.riwayah ||
    context.mushafEditionId !== expected.mushafEditionId ||
    context.manifest.riwayah !== expected.riwayah ||
    context.manifest.mushafEditionId !== expected.mushafEditionId
  ) {
    throw new Error('Mushaf page profile context identity mismatch')
  }
  if (
    (context.manifest.version !== 1 && context.manifest.version !== 2) ||
    !Number.isInteger(context.manifest.pageCount) ||
    context.manifest.pageCount < 1 ||
    !context.manifest.verseToPage ||
    typeof context.manifest.verseToPage !== 'object'
  ) {
    throw new Error('Mushaf page profile context contract is invalid')
  }
}

function prepareExternalMushafPage(
  context: MushafPageProfileContext & { manifest: MushafManifestV2 },
  page: number,
): PreparedExternalMushafPage {
  const { manifest, mushafEditionId, riwayah } = context
  const clampedPage = Math.min(manifest.pageCount, Math.max(1, Math.floor(page)))
  const pageEntry = manifest.pages.find((entry) => entry.page === clampedPage)
  if (!pageEntry) throw new Error(`Mushaf manifest has no page ${clampedPage}`)
  const indexEntry = findExternalMushafIndexEntry(context.index, { mushafEditionId, riwayah })
  const preview = externalSourceForRole(pageEntry, indexEntry, { mushafEditionId, riwayah }, 'preview')
  const full = externalSourceForRole(pageEntry, indexEntry, { mushafEditionId, riwayah }, 'full')
  const lastVerse = lastVerseForMushafPage(manifest, clampedPage)
  return {
    kind: 'external-image',
    preview,
    full,
    page: clampedPage,
    pageCount: manifest.pageCount,
    firstVerse: pageEntry.firstVerse,
    lastVerse,
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
      lastVerse,
    },
  }
}

export function prepareReactInlineMushafSvg(
  text: string,
  expected: { sourceViewBox: SvgViewBox; displayViewBox: SvgViewBox },
): ReactInlineMushafSvg {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    throw new Error('Inline SVG parsing is not supported in this environment')
  }

  const document = new DOMParser().parseFromString(text, 'image/svg+xml')
  if (document.querySelector('parsererror')) throw new Error('Invalid Mushaf page SVG')
  const root = document.documentElement
  if (root?.localName.toLowerCase() !== 'svg') throw new Error('Invalid Mushaf page SVG')
  validateSafeSvg(root)

  const viewBoxText = root.getAttribute('viewBox')?.trim()
  if (!viewBoxText) throw new Error('Mushaf page SVG is missing viewBox')
  const sourceViewBox = parseViewBox(viewBoxText)
  if (!sameViewBox(sourceViewBox, expected.sourceViewBox)) {
    throw new Error('Mushaf page SVG viewBox does not match the page manifest')
  }
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

  root.setAttribute('viewBox', serializeViewBox(expected.displayViewBox))

  return { markup: new XMLSerializer().serializeToString(root), viewBox: expected.displayViewBox, viewBoxText }
}

function resolveMushafPage(
  manifest: MushafManifestV1,
  expected: { riwayah: Riwayah; mushafEditionId: string; page: number },
): Omit<MushafResolvedPage, 'displaySize'> {
  const clampedPage = Math.min(manifest.pageCount, Math.max(1, Math.floor(expected.page)))
  const pageEntry = manifest.pages.find((entry) => entry.page === clampedPage)
  if (!pageEntry) throw new Error(`Mushaf manifest has no page ${clampedPage}`)
  const expectedPath = mushafSvgPageAssetPath(clampedPage)
  if (pageEntry.assetPath !== expectedPath) throw new Error(`Invalid Mushaf asset path at page ${clampedPage}`)
  if (!isQuranRef(pageEntry.firstVerse)) throw new Error(`Invalid Mushaf first verse at page ${clampedPage}`)
  parseViewBox(pageEntry.viewBox)
  const displayViewBox = parseViewBox(pageEntry.displayViewBox)
  assertContainedViewBox(displayViewBox, parseViewBox(pageEntry.viewBox))
  const assetUrl = mushafPageUrl(expected, clampedPage)
  assertRuntimeDatasetUrl(assetUrl)
  return {
    riwayah: expected.riwayah,
    mushafEditionId: expected.mushafEditionId,
    page: clampedPage,
    pageCount: manifest.pageCount,
    riwayahLabel: RIWAYAH_LABELS[expected.riwayah],
    assetUrl,
    firstVerse: pageEntry.firstVerse,
    lastVerse: lastVerseForMushafPage(manifest, clampedPage),
  }
}

function assertMushafManifest(manifest: MushafManifest, expected: { riwayah: Riwayah; mushafEditionId: string }): void {
  if (validatedManifests.has(manifest)) return
  assertMushafManifestContract(manifest, expected)
  validatedManifests.add(manifest)
}

function findExternalMushafIndexEntry(
  index: MushafAssetIndex,
  expected: { riwayah: Riwayah; mushafEditionId: string },
): MushafAssetIndexEntryRaw {
  const entry = findMushafAssetIndexEntry(index, {
    riwayah: expected.riwayah,
    mushafEditionId: expected.mushafEditionId,
    pageCount: MUSHAF_PAGE_COUNT,
    version: 'v2',
  })
  if (!entry)
    throw new Error(`Mushaf external-image pack is not indexed for ${expected.riwayah}/${expected.mushafEditionId}`)
  return entry
}

function validateExternalManifestIndexAgreement(
  manifest: MushafManifestV2,
  indexEntry: MushafAssetIndexEntryRaw,
  identity: { riwayah: Riwayah; mushafEditionId: string },
): void {
  if (manifest.pageCount !== MUSHAF_PAGE_COUNT || manifest.pages.length !== manifest.pageCount) {
    throw new Error('External-image Mushaf manifest must contain every page')
  }
  if (
    !Array.isArray(indexEntry.pageUrls) ||
    indexEntry.pageUrls.length !== manifest.pageCount ||
    !Array.isArray(indexEntry.files)
  ) {
    throw new Error('External-image Mushaf asset index is incomplete')
  }
  const manifestUrl = mushafManifestUrl(identity)
  const expectedDescriptors = new Map<string, MushafExternalImageDescriptor>()
  for (const [index, page] of manifest.pages.entries()) {
    if (page.page !== index + 1) throw new Error('External-image Mushaf manifest page order is invalid')
    const fallbackUrl = resolveMushafEditionAssetUrl(identity, page.media.fallback.assetPath)
    if (indexEntry.pageUrls[page.page - 1] !== fallbackUrl) {
      throw new Error(`External-image descriptor disagrees with its asset index at page ${page.page}`)
    }
    for (const descriptor of page.media.sources) {
      const url = resolveMushafEditionAssetUrl(identity, descriptor.assetPath)
      if (expectedDescriptors.has(url))
        throw new Error(`External-image descriptor disagrees with its asset index at page ${page.page}`)
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
    if (!descriptor || indexedDescriptors.has(file.url) || !sameMushafExternalImageDescriptor(file, descriptor)) {
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
  indexEntry: MushafAssetIndexEntryRaw,
  identity: { riwayah: Riwayah; mushafEditionId: string },
  role: 'preview' | 'full',
): MushafExternalImageSource {
  const width = role === 'preview' ? MUSHAF_PREVIEW_RENDITION_WIDTH : MUSHAF_FULL_RENDITION_WIDTH
  const descriptor = page.media.sources.find((source) => source.width === width)
  if (!descriptor || (role === 'full' && !sameMushafExternalImageDescriptor(page.media.fallback, descriptor))) {
    throw new Error(`External-image Mushaf ${role} descriptor is invalid at page ${page.page}`)
  }
  const assetUrl = resolveMushafEditionAssetUrl(identity, descriptor.assetPath)
  const file = indexEntry.files?.find((candidate) => candidate.url === assetUrl)
  if (!sameMushafExternalImageDescriptor(file, descriptor)) {
    throw new Error(`External-image descriptor disagrees with its asset index at page ${page.page}`)
  }
  return { ...descriptor, assetUrl }
}

function waitForExternalImageLoad(image: HTMLImageElement, assetUrl: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => done(() => reject(abortError()))
    const onLoad = () => done(resolve)
    const onError = () => done(() => reject(new MushafImageLoadError(`Failed to load Mushaf image: ${assetUrl}`)))
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

function abortError(): DOMException {
  return new DOMException('Mushaf image preparation was aborted', 'AbortError')
}

async function fetchText(fetcher: typeof fetch, url: string, signal?: AbortSignal): Promise<string> {
  assertRuntimeDatasetUrl(url)
  const response = await fetcher(url, { signal })
  if (!response.ok) throw new MushafAssetHttpError(url, response.status)
  return response.text()
}

function parseViewBox(text: string): SvgViewBox {
  const parts = text.trim().split(/\s+/).map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part)) || parts[2] <= 0 || parts[3] <= 0) {
    throw new Error(`Invalid Mushaf viewBox: ${text}`)
  }
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] }
}

function sameViewBox(left: SvgViewBox, right: SvgViewBox): boolean {
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height
}

function assertContainedViewBox(display: SvgViewBox, source: SvgViewBox): void {
  if (
    display.x < source.x ||
    display.y < source.y ||
    display.x + display.width > source.x + source.width ||
    display.y + display.height > source.y + source.height
  ) {
    throw new Error('Mushaf display viewBox is outside the source viewBox')
  }
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
    if (name === 'script' || name === 'foreignobject' || name === 'style')
      throw new Error('Mushaf page SVG contains unsafe content')
    for (const attr of Array.from(element.attributes)) {
      const attrName = attr.name.toLowerCase()
      const value = attr.value.trim()
      if (attrName.startsWith('on')) throw new Error('Mushaf page SVG contains unsafe content')
      if (attrName === 'href' || attrName.endsWith(':href') || attrName === 'src') validateFragment(value)
      if (
        (attrName === 'fill' || attrName === 'stroke' || attrName === 'clip-path' || attrName === 'mask') &&
        /\burl\s*\(/i.test(value)
      ) {
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
