import { get, put } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import { CACHE_DATASET, DATASET_RIWAYAH_PACKAGES_PATH } from '../core/constants'
import { cacheNameFor } from '../infra/sw/route-defs'
import { broadcastRiwayahChange } from '../infra/safety/sync'
import { riwayahInstallIntent, riwayahPackageState, settings } from '../core/settings.svelte'

export const RIWAYAHS = ['hafs', 'warsh', 'qaloon'] as const
export type Riwayah = (typeof RIWAYAHS)[number]
export const DEFAULT_RIWAYAH = 'qaloon' as const

export type RiwayahLabels = {
  productShort: string
  productFull: string
  runtimeShort: string
  runtimeFull: string
  subtitle: string
  verseCount: number
  sourceSlug: 'hafs' | 'warsh' | 'qalun'
}

const RIWAYAH_LABELS: Record<Riwayah, RiwayahLabels> = {
  hafs: {
    productShort: 'Ḥafṣ',
    productFull: 'Ḥafṣ ʿan ʿĀṣim',
    runtimeShort: 'Ḥafṣ',
    runtimeFull: 'Ḥafṣ ʿan ʿĀṣim',
    subtitle: 'ʿan ʿĀṣim · 6236 ayāt',
    verseCount: 6236,
    sourceSlug: 'hafs',
  },
  warsh: {
    productShort: 'Warsh',
    productFull: 'Warsh ʿan Nafiʿ',
    runtimeShort: 'Warsh',
    runtimeFull: 'Warsh ʿan Nāfiʿ',
    subtitle: 'ʿan Nāfiʿ · 6214 ayāt',
    verseCount: 6214,
    sourceSlug: 'warsh',
  },
  qaloon: {
    productShort: 'Qalun',
    productFull: 'Qalun ʿan Nafiʿ',
    runtimeShort: 'Qālūn',
    runtimeFull: 'Qālūn ʿan Nāfiʿ',
    subtitle: 'ʿan Nāfiʿ · 6214 ayāt',
    verseCount: 6214,
    sourceSlug: 'qalun',
  },
}

export type RiwayahPackageIndex = {
  version: 1
  defaultRiwayah: 'qaloon'
  packages: RiwayahPackageEntry[]
}

export type RiwayahPackageEntry = {
  riwayah: Riwayah
  optional: boolean
  available: boolean
  text: { urls: string[]; totalBytes: number; available: boolean }
  pages: { manifestUrl: string; urls: string[]; totalBytes: number; available: boolean }
  totalBytes: number
}

export type RiwayahPackageStatus =
  | { kind: 'installed'; riwayah: Riwayah; totalBytes: number }
  | { kind: 'installable'; riwayah: Riwayah; totalBytes: number }
  | { kind: 'installing'; riwayah: Riwayah; cached: number; total: number }
  | { kind: 'unavailable'; riwayah: Riwayah }
  | { kind: 'error'; riwayah: Riwayah; message: string; totalBytes: number }

export type RiwayahPackageInstallPlan = {
  riwayah: Riwayah
  urls: string[]
  totalBytes: number
}

export type PackReason =
  | 'baseline'
  | 'cached'
  | 'not-cached'
  | 'partial-cache'
  | 'quota-refused'
  | 'missing'
  | 'removed'
  | 'security-rejected'

type RiwayahPackResultBase = {
  riwayah: Riwayah
  totalBytes: number
  optional: boolean
}

export type RiwayahPackResult =
  | (RiwayahPackResultBase & { kind: 'usable'; reason: 'baseline' | 'cached' })
  | (RiwayahPackResultBase & { kind: 'installable'; reason: 'not-cached' | 'quota-refused' })
  | (RiwayahPackResultBase & { kind: 'missing'; reason: 'missing' | 'removed' })
  | (RiwayahPackResultBase & { kind: 'stale'; reason: 'partial-cache' | 'removed' | 'security-rejected' })
  | (RiwayahPackResultBase & { kind: 'unavailable'; reason: 'missing' | 'removed' | 'security-rejected' })
  | (RiwayahPackResultBase & {
    kind: 'switched-to-baseline'
    reason: 'missing' | 'removed' | 'security-rejected'
    fallbackRiwayah: typeof DEFAULT_RIWAYAH
  })

export type RiwayahPackPolicyOptions = {
  installBlocked?: 'quota-refused'
  missingReason?: 'missing' | 'removed'
}

let packageIndexPromise: Promise<RiwayahPackageIndex> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function isRiwayah(value: unknown): value is Riwayah {
  return typeof value === 'string' && (RIWAYAHS as readonly string[]).includes(value)
}

export function assertRiwayah(value: unknown, context = 'riwayah'): asserts value is Riwayah {
  if (!isRiwayah(value)) {
    throw new Error(`Invalid ${context}: ${String(value)}`)
  }
}

export function getRiwayahOptions(): Riwayah[] {
  return [...RIWAYAHS]
}

export function getRiwayahLabels(riwayah: Riwayah): RiwayahLabels {
  return RIWAYAH_LABELS[riwayah]
}

export function getRiwayahProductLabel(riwayah: Riwayah): string {
  return RIWAYAH_LABELS[riwayah].productFull
}

export async function loadRiwayah(): Promise<Riwayah> {
  try {
    const rec = await get('settings', 'riwayah')
    const raw = (rec as { value?: unknown } | undefined)?.value
    return isRiwayah(raw) ? raw : DEFAULT_RIWAYAH
  } catch (error) {
    logger.error('Failed to load riwayah:', { error })
    return DEFAULT_RIWAYAH
  }
}

export function applyRiwayah(riwayah: Riwayah): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-riwayah', riwayah)
  }
}

export async function persistRiwayahSelection(next: Riwayah): Promise<{ changed: boolean; previous: Riwayah } | null> {
  if (!isRiwayah(next)) return null
  try {
    if (!(await isRiwayahUsable(next))) return null
  } catch {
    return null
  }

  const previous = await loadRiwayah()
  if (previous !== next) {
    try {
      await put('settings', { key: 'riwayah', value: next })
    } catch (error) {
      logger.error('Failed to save riwayah:', { error })
      return null
    }
  }

  applyRiwayah(next)
  ;(settings as Record<string, unknown>).riwayah = next
  if (previous !== next) {
    emit(Events.SETTINGS_RIWAYAH_CHANGED, { from: previous, to: next })
    broadcastRiwayahChange(next)
  }
  return { changed: previous !== next, previous }
}

export async function setRiwayah(next: Riwayah): Promise<boolean> {
  return Boolean(await persistRiwayahSelection(next))
}

export async function refreshRiwayahPackageStatus(riwayah: Riwayah): Promise<RiwayahPackageStatus> {
  const status = await getRiwayahPackageStatus(riwayah)
  riwayahPackageState[riwayah] = status
  return status
}

export function beginRiwayahInstall(riwayah: Riwayah): boolean {
  if (!isRiwayah(riwayah) || riwayah === DEFAULT_RIWAYAH) return false
  riwayahInstallIntent.requested = riwayah
  riwayahPackageState[riwayah] = { kind: 'installing', riwayah, cached: 0, total: 0 }
  return true
}

export function failRiwayahInstall(riwayah: Riwayah, message: string): void {
  if (!isRiwayah(riwayah)) return
  const previous = riwayahPackageState[riwayah]
  const totalBytes = previous && 'totalBytes' in previous ? previous.totalBytes : 0
  riwayahPackageState[riwayah] = { kind: 'error', riwayah, message, totalBytes }
  if (riwayahInstallIntent.requested === riwayah) {
    riwayahInstallIntent.requested = null
  }
}

export async function completeRiwayahInstall(riwayah: Riwayah): Promise<boolean> {
  if (!isRiwayah(riwayah)) return false
  const status = await refreshRiwayahPackageStatus(riwayah)
  if (status.kind !== 'installed') return false
  const applied = await persistRiwayahSelection(riwayah)
  if (applied) {
    riwayahInstallIntent.previousUsable = riwayah
    if (riwayahInstallIntent.requested === riwayah) {
      riwayahInstallIntent.requested = null
    }
  }
  return Boolean(applied)
}

function originForRuntime(): string {
  return typeof location !== 'undefined' ? location.origin : 'http://localhost'
}

function assertDatasetUrl(value: unknown, context: string): string {
  if (typeof value !== 'string' || !value.startsWith('/dataset/') || value.includes('://') || value.includes('..')) {
    throw new Error(`Riwayah package index contains an invalid same-origin dataset URL for ${context}`)
  }
  const url = new URL(value, originForRuntime())
  if (url.origin !== originForRuntime() || !url.pathname.startsWith('/dataset/')) {
    throw new Error(`Riwayah package index contains an invalid same-origin dataset URL for ${context}`)
  }
  return value
}

function assertBytes(value: unknown, context: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Riwayah package index has invalid byte count for ${context}`)
  }
  return value
}

function assertAssetGroup(raw: unknown, context: string): { urls: string[]; totalBytes: number; available: boolean } {
  if (!isRecord(raw)) throw new Error(`Riwayah package index has invalid ${context} assets`)
  const urls = Array.isArray(raw.urls)
    ? raw.urls.map((url, index) => assertDatasetUrl(url, `${context}[${index}]`))
    : null
  if (!urls) throw new Error(`Riwayah package index has invalid ${context} urls`)
  const available = raw.available === true
  if (available && urls.length === 0) {
    throw new Error(`Riwayah package index marks ${context} available without URLs`)
  }
  return {
    urls,
    totalBytes: assertBytes(raw.totalBytes, context),
    available,
  }
}

function assertPackageEntry(raw: unknown): RiwayahPackageEntry {
  if (!isRecord(raw)) throw new Error('Riwayah package index has invalid package entry')
  assertRiwayah(raw.riwayah, 'riwayah package id')
  const text = assertAssetGroup(raw.text, `${raw.riwayah}.text`)
  if (!isRecord(raw.pages)) throw new Error(`Riwayah package index has invalid ${raw.riwayah}.pages assets`)
  const pageAssets = assertAssetGroup(raw.pages, `${raw.riwayah}.pages`)
  const manifestUrl = assertDatasetUrl(raw.pages.manifestUrl, `${raw.riwayah}.pages.manifestUrl`)
  const pages = { ...pageAssets, manifestUrl }
  const available = raw.available === true
  if (available && (!text.available || !pages.available)) {
    throw new Error(`Riwayah package index marks ${raw.riwayah} available with incomplete assets`)
  }
  return {
    riwayah: raw.riwayah,
    optional: raw.optional === true,
    available,
    text,
    pages,
    totalBytes: assertBytes(raw.totalBytes, `${raw.riwayah}.totalBytes`),
  }
}

function assertPackageIndex(raw: unknown): RiwayahPackageIndex {
  if (!isRecord(raw)) throw new Error('Invalid riwayah package index')
  if (raw.version !== 1) throw new Error(`Unsupported riwayah package index version: ${String(raw.version)}`)
  if (raw.defaultRiwayah !== DEFAULT_RIWAYAH) throw new Error('Riwayah package index default must be qaloon')
  if (!Array.isArray(raw.packages)) throw new Error('Riwayah package index packages must be an array')
  const packages = raw.packages.map(assertPackageEntry)
  const seen = new Set<Riwayah>()
  for (const entry of packages) {
    if (seen.has(entry.riwayah)) {
      throw new Error(`Riwayah package index has duplicate ${entry.riwayah}`)
    }
    seen.add(entry.riwayah)
  }
  if (!seen.has(DEFAULT_RIWAYAH)) {
    throw new Error(`Riwayah package index missing ${DEFAULT_RIWAYAH}`)
  }
  return { version: 1, defaultRiwayah: 'qaloon', packages }
}

async function fetchPackageIndex(): Promise<RiwayahPackageIndex> {
  try {
    const response = await fetch(DATASET_RIWAYAH_PACKAGES_PATH)
    if (!response.ok) throw new Error(`Failed to fetch riwayah package index: ${response.status}`)
    return assertPackageIndex(await response.json())
  } catch (networkError) {
    if (typeof caches === 'undefined') throw networkError
    const cache = await caches.open(CACHE_DATASET)
    const cached = await cache.match(DATASET_RIWAYAH_PACKAGES_PATH)
    if (!cached) throw networkError
    return assertPackageIndex(await cached.json())
  }
}

export async function loadRiwayahPackageIndex(): Promise<RiwayahPackageIndex> {
  packageIndexPromise ??= fetchPackageIndex().catch((error) => {
    packageIndexPromise = null
    throw error
  })
  return packageIndexPromise
}

export async function getRiwayahPackageEntry(riwayah: Riwayah): Promise<RiwayahPackageEntry | null> {
  const index = await loadRiwayahPackageIndex()
  return index.packages.find((entry) => entry.riwayah === riwayah) ?? null
}

export function cacheNamesForRiwayahPackage(riwayah: Riwayah): { text: string; pages: string } {
  const editionByRiwayah: Record<Riwayah, string> = {
    qaloon: 'qalun-quran-ws-v1',
    hafs: 'hafs-quran-ws-v1',
    warsh: 'warsh-quran-ws-v1',
  }
  return {
    text: CACHE_DATASET,
    pages: `qa-pages-${riwayah}-${editionByRiwayah[riwayah]}-v1`,
  }
}

function plannedUrlsFor(entry: RiwayahPackageEntry): string[] {
  if (!entry.available) return []
  return [...entry.text.urls, entry.pages.manifestUrl, ...entry.pages.urls]
}

export async function planRiwayahPackageInstall(riwayah: Riwayah): Promise<RiwayahPackageInstallPlan> {
  const entry = await getRiwayahPackageEntry(riwayah)
  if (!entry?.available) return { riwayah, urls: [], totalBytes: 0 }
  return { riwayah, urls: plannedUrlsFor(entry), totalBytes: entry.totalBytes }
}

async function cacheHas(url: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false
  const absolute = new URL(url, originForRuntime())
  const cacheName = cacheNameFor(absolute)
  if (!cacheName) return false
  const cache = await caches.open(cacheName)
  return Boolean((await cache.match(absolute.href)) || (await cache.match(url)))
}

async function countCachedPlannedUrls(entry: RiwayahPackageEntry): Promise<number> {
  const urls = plannedUrlsFor(entry)
  let cached = 0
  for (const url of urls) {
    if (await cacheHas(url)) cached += 1
  }
  return cached
}

function baseResult(entry: RiwayahPackageEntry | null, riwayah: Riwayah): RiwayahPackResultBase {
  return {
    riwayah,
    totalBytes: entry?.totalBytes ?? 0,
    optional: entry?.optional ?? riwayah !== DEFAULT_RIWAYAH,
  }
}

function isSecurityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /invalid|unsupported|same-origin dataset url/i.test(message)
}

export async function getRiwayahPackResult(
  riwayah: Riwayah,
  options: RiwayahPackPolicyOptions = {},
): Promise<RiwayahPackResult> {
  try {
    const entry = await getRiwayahPackageEntry(riwayah)
    const missingReason = options.missingReason ?? 'missing'
    if (!entry?.available) {
      return { kind: 'missing', reason: missingReason, ...baseResult(entry, riwayah) }
    }
    if (!entry.optional || riwayah === DEFAULT_RIWAYAH) {
      return { kind: 'usable', reason: 'baseline', ...baseResult(entry, riwayah) }
    }

    const planned = plannedUrlsFor(entry)
    if (planned.length === 0) {
      return { kind: 'missing', reason: missingReason, ...baseResult(entry, riwayah) }
    }

    const cached = await countCachedPlannedUrls(entry)
    if (cached === planned.length) {
      return { kind: 'usable', reason: 'cached', ...baseResult(entry, riwayah) }
    }
    if (cached > 0) {
      return { kind: 'stale', reason: 'partial-cache', ...baseResult(entry, riwayah) }
    }
    if (options.installBlocked) {
      return { kind: 'installable', reason: options.installBlocked, ...baseResult(entry, riwayah) }
    }
    return { kind: 'installable', reason: 'not-cached', ...baseResult(entry, riwayah) }
  } catch (error) {
    return {
      kind: 'unavailable',
      reason: isSecurityError(error) ? 'security-rejected' : 'missing',
      ...baseResult(null, riwayah),
    }
  }
}

export async function resolveRiwayahSelection(
  riwayah: Riwayah,
  options: RiwayahPackPolicyOptions & { fallbackToBaseline?: boolean } = {},
): Promise<RiwayahPackResult> {
  const result = await getRiwayahPackResult(riwayah, options)
  if (!options.fallbackToBaseline || riwayah === DEFAULT_RIWAYAH) return result
  if (result.kind === 'installable' || result.kind === 'stale' || result.kind === 'usable') return result
  const baseline = await getRiwayahPackResult(DEFAULT_RIWAYAH)
  if (baseline.kind !== 'usable') return result
  return {
    kind: 'switched-to-baseline',
    riwayah,
    fallbackRiwayah: DEFAULT_RIWAYAH,
    reason: result.reason,
    totalBytes: result.totalBytes,
    optional: result.optional,
  }
}

export async function getRiwayahPackageStatus(riwayah: Riwayah): Promise<RiwayahPackageStatus> {
  const result = await getRiwayahPackResult(riwayah)
  switch (result.kind) {
    case 'usable':
      return { kind: 'installed', riwayah, totalBytes: result.totalBytes }
    case 'installable':
    case 'stale':
      return { kind: 'installable', riwayah, totalBytes: result.totalBytes }
    case 'missing':
    case 'switched-to-baseline':
    case 'unavailable':
      return { kind: 'unavailable', riwayah }
  }
}

export async function isRiwayahUsable(riwayah: Riwayah): Promise<boolean> {
  const result = await getRiwayahPackResult(riwayah)
  return result.kind === 'usable'
}

export async function isRiwayahPackageFullyCached(riwayah: Riwayah): Promise<boolean> {
  const result = await getRiwayahPackResult(riwayah)
  return result.kind === 'usable' && result.reason === 'cached'
}

export function clearRiwayahPackCacheForTests(): void {
  packageIndexPromise = null
}

export const clearRiwayahPackageCacheForTests = clearRiwayahPackCacheForTests
