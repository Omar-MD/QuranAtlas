import { assertRuntimeDatasetUrl } from '../../data/runtime-boundary'
import type { MushafEditionIndexEntry } from '../../launch/mushaf-edition-setup'
import type { OfflinePackFilePlan, OfflinePackKind, Riwayah } from '../../storage/types'

export type OfflinePackPlan = {
  packId: string
  kind: OfflinePackKind
  label: string
  files: OfflinePackFilePlan[]
  totalBytes: number | null // null when ANY file size is unknown
}

export const READER_CORE_PACK_LABEL = 'Reader texts'

const SURAH_COUNT = 114
const FALLBACK_TRANSLATION_ID = 'bridges'
const DATASET_ORIGIN_PREFIX = '/dataset/'
const SLUG_SOURCE = '[a-z0-9][a-z0-9-]*'

export function readerCorePackId(profile: {
  riwayah: string
  quranTextStyleId: string
  translationId: string
}): string {
  return `reader-core--${profile.riwayah}--${profile.quranTextStyleId}--${profile.translationId}`
}

export function mushafPackId(entry: { riwayah: string; mushafEditionId: string }): string {
  return `mushaf-pages--${entry.riwayah}--${entry.mushafEditionId}`
}

function readerCoreUrls(profile: { riwayah: string; quranTextStyleId: string; translationId: string }): string[] {
  const urls: string[] = []
  for (let surah = 1; surah <= SURAH_COUNT; surah += 1) {
    const padded = String(surah).padStart(3, '0')
    urls.push(`/dataset/quran-text/${profile.riwayah}/${profile.quranTextStyleId}/${padded}.json`)
  }
  for (let surah = 1; surah <= SURAH_COUNT; surah += 1) {
    const padded = String(surah).padStart(3, '0')
    urls.push(`/dataset/translations/${profile.translationId}/${padded}.json`)
  }
  if (profile.translationId !== FALLBACK_TRANSLATION_ID) {
    for (let surah = 1; surah <= SURAH_COUNT; surah += 1) {
      const padded = String(surah).padStart(3, '0')
      urls.push(`/dataset/translations/${FALLBACK_TRANSLATION_ID}/${padded}.json`)
    }
  }
  urls.push('/dataset/translations/_verse-aliases.json')
  urls.push('/dataset/surahs.json')
  for (let surah = 1; surah <= SURAH_COUNT; surah += 1) {
    const padded = String(surah).padStart(3, '0')
    urls.push(`/dataset/knowledge/ayah/${padded}.json`)
  }
  for (let surah = 1; surah <= SURAH_COUNT; surah += 1) {
    const padded = String(surah).padStart(3, '0')
    urls.push(`/dataset/knowledge/passages/${padded}.json`)
  }
  return urls
}

const slug = SLUG_SOURCE
const readerCoreUrlPattern = new RegExp(
  `^/dataset/(?:quran-text/${slug}/${slug}/\\d{3}\\.json` +
    `|translations/${slug}/\\d{3}\\.json` +
    `|translations/_verse-aliases\\.json` +
    `|surahs\\.json` +
    `|knowledge/(?:ayah|passages)/\\d{3}\\.json)$`,
)

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mushafPagesUrlPattern(identity: { riwayah: string; mushafEditionId: string }): RegExp {
  // v1 editions ship one inline SVG per page; v2 editions ship a preview
  // (1280px) and full (2136px) WebP pair per page.
  return new RegExp(
    `^/dataset/mushaf-pages/${escapeRegExp(identity.riwayah)}/${escapeRegExp(identity.mushafEditionId)}/` +
      `(?:manifest\\.json|pages/\\d{3}\\.svg|pages/\\d{3}-(?:1280|2136)\\.webp)$`,
  )
}

export function buildReaderCorePackPlan(
  profile: { riwayah: Riwayah; quranTextStyleId: string; translationId: string },
  byteSizes: ReadonlyMap<string, number> | null,
): OfflinePackPlan {
  const files: OfflinePackFilePlan[] = readerCoreUrls(profile).map((url) => ({
    url,
    bytes: byteSizes?.get(url.slice(DATASET_ORIGIN_PREFIX.length)) ?? null,
  }))
  for (const file of files) assertOfflinePackUrl(file.url, 'reader-core')
  const knownTotal = files.reduce<number | null>(
    (sum, file) => (file.bytes == null || sum == null ? null : sum + file.bytes),
    0,
  )
  return {
    packId: readerCorePackId(profile),
    kind: 'reader-core',
    label: READER_CORE_PACK_LABEL,
    files,
    totalBytes: knownTotal,
  }
}

export async function loadDatasetByteSizes(fetcher: typeof fetch = fetch): Promise<Map<string, number>> {
  assertRuntimeDatasetUrl('/dataset/manifest.json')
  const response = await fetcher('/dataset/manifest.json')
  if (!response.ok) throw new Error(`Unable to load dataset manifest: ${response.status}`)
  const manifest = (await response.json()) as unknown
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('Dataset manifest is invalid')
  }
  const files = (manifest as Record<string, unknown>).files
  if (!Array.isArray(files)) throw new Error('Dataset manifest is invalid')
  const byteSizes = new Map<string, number>()
  for (const row of files) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Dataset manifest is invalid')
    const record = row as Record<string, unknown>
    if (typeof record.path !== 'string' || typeof record.bytes !== 'number' || !Number.isFinite(record.bytes)) {
      throw new Error('Dataset manifest is invalid')
    }
    byteSizes.set(record.path, record.bytes)
  }
  return byteSizes
}

export function buildMushafPackPlan(entry: MushafEditionIndexEntry): OfflinePackPlan {
  return {
    packId: mushafPackId(entry),
    kind: 'mushaf-pages',
    label: entry.label,
    files: entry.files.map((file) => ({ url: file.url, bytes: file.bytes })),
    totalBytes: entry.totalBytes,
  }
}

export function formatOfflineBytes(bytes: number): string {
  const megabytes = bytes / 1048576
  const rounded = `${Math.round(megabytes * 10) / 10}`.replace(/\.0$/, '')
  return `${rounded} MB`
}

export function assertOfflinePackUrl(
  url: string,
  kind: OfflinePackKind,
  identity?: { riwayah: string; mushafEditionId?: string },
): void {
  assertRuntimeDatasetUrl(url)
  const parsed = new URL(url, location.origin)
  if (parsed.origin !== location.origin) {
    throw new Error(`Offline pack URLs must be same-origin: ${url}`)
  }
  if (!parsed.pathname.startsWith('/dataset/')) {
    throw new Error(`Offline pack URLs must stay under /dataset/: ${url}`)
  }
  if (parsed.search !== '' || parsed.hash !== '') {
    throw new Error(`Offline pack URLs must not carry a query or fragment: ${url}`)
  }
  let decodedPathname: string
  try {
    decodedPathname = decodeURIComponent(parsed.pathname)
  } catch {
    throw new Error(`Offline pack URL has invalid percent-encoding: ${url}`)
  }
  if (/(^|\/)\.+(\/|$)/.test(decodedPathname)) {
    throw new Error(`Offline pack URLs must not contain dot segments: ${url}`)
  }
  if (kind === 'mushaf-pages') {
    const riwayah = identity?.riwayah
    const mushafEditionId = identity?.mushafEditionId
    if (typeof riwayah !== 'string' || typeof mushafEditionId !== 'string') {
      throw new Error(`Offline pack URLs for mushaf-pages require the pack identity: ${url}`)
    }
    if (!mushafPagesUrlPattern({ riwayah, mushafEditionId }).test(parsed.pathname)) {
      throw new Error(`Offline pack URL is outside the mushaf pack identity: ${url}`)
    }
    return
  }
  if (!readerCoreUrlPattern.test(parsed.pathname)) {
    throw new Error(`Offline pack URL is outside the reader core templates: ${url}`)
  }
}
