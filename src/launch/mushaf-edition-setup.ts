import { DEFAULT_READER_ASSET_PROFILE } from '../../shared/reader-assets/default-profile'
import { assertRuntimeDatasetUrl } from '../data/runtime-boundary'
import { assertOfflinePackUrl } from '../offline/download/offline-pack-plan'
import { readNativeSettings, writeNativeMushafEditionSelection } from '../storage/native-reader-store'

export const MUSHAF_EDITION_SETUP_VERSION = 1

const MUSHAF_ASSET_INDEX_URL = '/dataset/indexes/mushaf-assets.json'

export type MushafEditionOption = {
  id: string
  label: string
  shortLabel?: string
}

export type MushafEditionIndexEntry = {
  riwayah: string
  mushafEditionId: string
  label: string
  shortLabel?: string
  pageCount: number
  manifestUrl: string
  totalBytes: number
  files: Array<{ url: string; bytes: number }>
}

export type MushafEditionSetupState =
  | { status: 'complete'; mushafEditionId: string }
  | { status: 'choose'; editions: MushafEditionOption[] }
  | { status: 'availability-error'; mushafEditionId?: string }
  | { status: 'missing'; mushafEditionId: string }

type MushafAssetIndex = {
  assets: unknown[]
}

type MushafEditionSetupOptions = {
  contractWasValid: boolean
  fetcher?: typeof fetch
}

export async function loadMushafEditionEntries(fetcher: typeof fetch = fetch): Promise<MushafEditionIndexEntry[]> {
  assertRuntimeDatasetUrl(MUSHAF_ASSET_INDEX_URL)
  const response = await fetcher(MUSHAF_ASSET_INDEX_URL)
  if (!response.ok) throw new Error(`Unable to load Mushaf edition availability: ${response.status}`)
  const index = (await response.json()) as unknown
  if (!isMushafAssetIndex(index)) throw new Error('Mushaf edition availability index is invalid')

  const entries: MushafEditionIndexEntry[] = []
  for (const asset of index.assets) {
    if (!isMushafAssetDescriptor(asset)) throw new Error('Mushaf edition availability entry is invalid')
    if (!isAvailableQaloonMushaf(asset)) continue
    entries.push(parseMushafEditionEntry(asset))
  }
  return entries
}

export async function loadMushafEditionOptions(fetcher: typeof fetch = fetch): Promise<MushafEditionOption[]> {
  const entries = await loadMushafEditionEntries(fetcher)
  return entries.map((entry) => ({
    id: entry.mushafEditionId,
    label: entry.label,
    ...(entry.shortLabel ? { shortLabel: entry.shortLabel } : {}),
  }))
}

export async function writeMushafEditionSelection(editionId: string): Promise<void> {
  await writeNativeMushafEditionSelection(editionId, MUSHAF_EDITION_SETUP_VERSION)
}

export async function resolveMushafEditionSetup({
  contractWasValid,
  fetcher = fetch,
}: MushafEditionSetupOptions): Promise<MushafEditionSetupState> {
  const [setupMarker, editionMarker] = await readNativeSettings(['mushafEditionSetupVersion', 'mushafEditionId'])
  const setupComplete = setupMarker?.value === MUSHAF_EDITION_SETUP_VERSION
  const selectedEditionId =
    typeof editionMarker?.value === 'string' ? editionMarker.value : DEFAULT_READER_ASSET_PROFILE.mushafEditionId

  if (!setupComplete && contractWasValid) {
    await writeMushafEditionSelection(DEFAULT_READER_ASSET_PROFILE.mushafEditionId)
    return { status: 'complete', mushafEditionId: DEFAULT_READER_ASSET_PROFILE.mushafEditionId }
  }

  let editions: MushafEditionOption[]
  try {
    editions = await loadMushafEditionOptions(fetcher)
  } catch {
    return setupComplete
      ? { status: 'availability-error', mushafEditionId: selectedEditionId }
      : { status: 'availability-error' }
  }

  if (setupComplete) {
    return editions.some((edition) => edition.id === selectedEditionId)
      ? { status: 'complete', mushafEditionId: selectedEditionId }
      : { status: 'missing', mushafEditionId: selectedEditionId }
  }

  return { status: 'choose', editions }
}

function isMushafAssetIndex(value: unknown): value is MushafAssetIndex {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Array.isArray((value as Record<string, unknown>).assets)
}

function isMushafAssetDescriptor(
  value: unknown,
): value is Record<string, unknown> & { label: string; mushafEditionId: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const asset = value as Record<string, unknown>
  return (
    typeof asset.riwayah === 'string' &&
    typeof asset.pageCount === 'number' &&
    typeof asset.mushafEditionId === 'string' &&
    typeof asset.label === 'string' &&
    isAcceptedMushafAvailability(asset.availability)
  )
}

function isAvailableQaloonMushaf(asset: Record<string, unknown> & { label: string; mushafEditionId: string }): boolean {
  return (
    asset.riwayah === 'qaloon' &&
    asset.pageCount === 604 &&
    (asset.availability === undefined || asset.availability === 'available')
  )
}

function parseMushafEditionEntry(
  asset: Record<string, unknown> & { label: string; mushafEditionId: string },
): MushafEditionIndexEntry {
  const riwayah = asset.riwayah
  const mushafEditionId = asset.mushafEditionId
  if (typeof riwayah !== 'string' || riwayah === '') {
    throw new Error('Mushaf edition entry is invalid: missing riwayah')
  }
  if (mushafEditionId === '') {
    throw new Error('Mushaf edition entry is invalid: missing edition id')
  }
  if (asset.label === '') {
    throw new Error(`Mushaf edition entry is invalid: missing label: ${mushafEditionId}`)
  }
  if (typeof asset.manifestUrl !== 'string' || asset.manifestUrl === '') {
    throw new Error(`Mushaf edition entry is invalid: missing manifest URL: ${mushafEditionId}`)
  }
  if (typeof asset.totalBytes !== 'number' || !Number.isFinite(asset.totalBytes) || asset.totalBytes < 0) {
    throw new Error(`Mushaf edition entry is invalid: missing total bytes: ${mushafEditionId}`)
  }
  if (!Array.isArray(asset.files)) {
    throw new Error(`Mushaf edition entry is invalid: missing files: ${mushafEditionId}`)
  }
  const files: Array<{ url: string; bytes: number }> = []
  const seenUrls = new Set<string>()
  let manifestRows = 0
  let totalBytes = 0
  for (const row of asset.files) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Mushaf edition entry is invalid: bad file row: ${mushafEditionId}`)
    }
    const file = row as Record<string, unknown>
    if (
      typeof file.url !== 'string' ||
      typeof file.bytes !== 'number' ||
      !Number.isFinite(file.bytes) ||
      file.bytes < 0
    ) {
      throw new Error(`Mushaf edition entry is invalid: bad file row: ${mushafEditionId}`)
    }
    if (seenUrls.has(file.url)) {
      throw new Error(`Mushaf edition entry is invalid: duplicate file URL: ${file.url}`)
    }
    seenUrls.add(file.url)
    assertOfflinePackUrl(file.url, 'mushaf-pages', { riwayah, mushafEditionId })
    if (file.url.endsWith('/manifest.json')) manifestRows += 1
    totalBytes += file.bytes
    files.push({ url: file.url, bytes: file.bytes })
  }
  if (files.length !== 605 || manifestRows !== 1) {
    throw new Error(`Mushaf edition entry is invalid: expected manifest + 604 pages: ${mushafEditionId}`)
  }
  if (totalBytes !== asset.totalBytes) {
    throw new Error(`Mushaf edition entry is invalid: total bytes mismatch: ${mushafEditionId}`)
  }
  return {
    riwayah,
    mushafEditionId,
    label: asset.label,
    ...(typeof asset.shortLabel === 'string' && asset.shortLabel.trim() !== '' ? { shortLabel: asset.shortLabel } : {}),
    pageCount: asset.pageCount as number,
    manifestUrl: asset.manifestUrl,
    totalBytes: asset.totalBytes,
    files,
  }
}

function isAcceptedMushafAvailability(value: unknown): value is undefined | 'available' | 'unavailable' | 'not-built' {
  return value === undefined || value === 'available' || value === 'unavailable' || value === 'not-built'
}
