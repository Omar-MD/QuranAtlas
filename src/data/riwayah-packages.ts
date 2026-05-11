import { CACHE_DATASET, DATASET_RIWAYAH_PACKAGES_PATH } from '../core/constants'
import type { Riwayah } from '../configure/state.svelte'
import { cacheNameFor } from '../infra/sw/route-defs'

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

const RIWAYAT: readonly Riwayah[] = ['hafs', 'warsh', 'qaloon'] as const
let packageIndexPromise: Promise<RiwayahPackageIndex> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isRiwayah(value: unknown): value is Riwayah {
  return value === 'hafs' || value === 'warsh' || value === 'qaloon'
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
  if (!isRiwayah(raw.riwayah)) throw new Error(`Invalid riwayah package id: ${String(raw.riwayah)}`)
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
  if (raw.defaultRiwayah !== 'qaloon') throw new Error('Riwayah package index default must be qaloon')
  if (!Array.isArray(raw.packages)) throw new Error('Riwayah package index packages must be an array')
  const packages = raw.packages.map(assertPackageEntry)
  for (const riwayah of RIWAYAT) {
    if (!packages.some((entry) => entry.riwayah === riwayah)) {
      throw new Error(`Riwayah package index missing ${riwayah}`)
    }
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
  if (!isRiwayah(riwayah)) return null
  const index = await loadRiwayahPackageIndex()
  return index.packages.find((entry) => entry.riwayah === riwayah) ?? null
}

export function cacheNamesForRiwayahPackage(riwayah: Riwayah): { text: string; pages: string } {
  return {
    text: CACHE_DATASET,
    pages: `qa-pages-${riwayah}-v1`,
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

async function allPlannedUrlsCached(entry: RiwayahPackageEntry): Promise<boolean> {
  const urls = plannedUrlsFor(entry)
  if (urls.length === 0) return false
  for (const url of urls) {
    if (!(await cacheHas(url))) return false
  }
  return true
}

export async function getRiwayahPackageStatus(riwayah: Riwayah): Promise<RiwayahPackageStatus> {
  const entry = await getRiwayahPackageEntry(riwayah)
  if (!entry?.available) return { kind: 'unavailable', riwayah }
  if (!entry.optional || riwayah === 'qaloon') {
    return { kind: 'installed', riwayah, totalBytes: entry.totalBytes }
  }
  if (await allPlannedUrlsCached(entry)) {
    return { kind: 'installed', riwayah, totalBytes: entry.totalBytes }
  }
  return { kind: 'installable', riwayah, totalBytes: entry.totalBytes }
}

export async function isRiwayahUsable(riwayah: Riwayah): Promise<boolean> {
  const status = await getRiwayahPackageStatus(riwayah)
  if (status.kind !== 'installed') return false
  if (riwayah === 'qaloon' && typeof navigator !== 'undefined' && navigator.onLine === false) {
    const entry = await getRiwayahPackageEntry(riwayah)
    return entry ? allPlannedUrlsCached(entry) : false
  }
  return status.kind === 'installed'
}

export function clearRiwayahPackageCacheForTests(): void {
  packageIndexPromise = null
}
