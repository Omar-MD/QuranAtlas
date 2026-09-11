import rawProfile from './default-profile.json'
import { fetchJson } from '../../src/data/fetch'

export type ReaderAssetProfile = {
  id: string
  label: string
  riwayah: 'qaloon'
  quranTextStyleId: string
  quranFontId: string
  mushafEditionId: string
  translationId: 'bridges'
  tafsirId: null
}

export type ReaderAssetInventoryGroup = 'quran-text' | 'mushaf' | 'translation'

export type ReaderAssetInventoryRow = {
  id: string
  group: ReaderAssetInventoryGroup
  assetIds: string[]
}

export type ReaderAssetInventoryDisplayRow = ReaderAssetInventoryRow & {
  label: string
}

export type ReaderAssetProfileRowResolverOptions = {
  fetcher?: typeof fetch
  signal?: AbortSignal
}

export const MVP_ASSET_CONTRACT_ID = rawProfile.assetContractId as 'mvp-default-assets-qaloon-bridges-v1'
export const RESET_CACHE_NAME_PREFIXES = rawProfile.resetCacheNamePrefixes

export const DEFAULT_READER_ASSET_PROFILE = rawProfile.profile as ReaderAssetProfile

export const TEXT_ASSET_INDEX_URL = '/dataset/indexes/text-assets.json'
export const MUSHAF_ASSET_INDEX_URL = '/dataset/indexes/mushaf-assets.json'
const SOURCE_INDEX_URL = '/dataset/indexes/sources.json'
const PROVENANCE_URL = '/dataset/provenance.json'
const readerAssetMetadataHttpError = (_url: string, status: number): Error =>
  new Error(`Unable to load reader asset metadata: ${status}`)

export function readerAssetProfileRows(profile: ReaderAssetProfile): ReaderAssetInventoryRow[] {
  return [
    {
      id: 'qaloon-text-font',
      group: 'quran-text',
      assetIds: [profile.quranTextStyleId, profile.quranFontId],
    },
    {
      id: 'qaloon-mushaf',
      group: 'mushaf',
      assetIds: [profile.mushafEditionId],
    },
    {
      id: 'bridges-translation',
      group: 'translation',
      assetIds: [profile.translationId],
    },
  ]
}

export function readerAssetRowFallbackLabel(row: ReaderAssetInventoryRow): string {
  return row.assetIds.join(' + ')
}

export async function resolveReaderAssetProfileRows(
  profile: ReaderAssetProfile,
  { fetcher = fetch, signal }: ReaderAssetProfileRowResolverOptions = {},
): Promise<ReaderAssetInventoryDisplayRow[]> {
  const fetchOptions = { signal, httpError: readerAssetMetadataHttpError }
  const [textIndex, provenance, mushafIndex, sourceIndex] = await Promise.all([
    fetchJson<unknown>(fetcher, TEXT_ASSET_INDEX_URL, fetchOptions).catch(() => null),
    fetchJson<unknown>(fetcher, PROVENANCE_URL, fetchOptions).catch(() => null),
    fetchJson<unknown>(fetcher, MUSHAF_ASSET_INDEX_URL, fetchOptions).catch(() => null),
    fetchJson<unknown>(fetcher, SOURCE_INDEX_URL, fetchOptions).catch(() => null),
  ])

  const loadedLabels = {
    quranText: findTextAssetLabel(textIndex, profile),
    quranFont: findFontLabel(provenance, profile),
    mushaf: findMushafAssetLabel(mushafIndex, profile),
    translation: findTranslationLabel(sourceIndex, profile),
  }

  return readerAssetProfileRows(profile).map((row) => ({
    ...row,
    label: resolvedLabelForRow(row, loadedLabels),
  }))
}

function resolvedLabelForRow(
  row: ReaderAssetInventoryRow,
  labels: {
    mushaf: string | null
    quranFont: string | null
    quranText: string | null
    translation: string | null
  },
): string {
  if (row.group === 'quran-text') {
    const combined = [labels.quranText, labels.quranFont].filter(isNonEmptyString).join(' + ')
    return combined || readerAssetRowFallbackLabel(row)
  }
  if (row.group === 'mushaf') return labels.mushaf || readerAssetRowFallbackLabel(row)
  return labels.translation || readerAssetRowFallbackLabel(row)
}

function findTextAssetLabel(index: unknown, profile: ReaderAssetProfile): string | null {
  const assets = readArray(index, 'assets')
  const asset = assets.find(
    (entry) =>
      readString(entry, 'riwayah') === profile.riwayah && readString(entry, 'textStyleId') === profile.quranTextStyleId,
  )
  return readDisplayLabel(asset)
}

function findFontLabel(provenance: unknown, profile: ReaderAssetProfile): string | null {
  const riwayat = readArray(provenance, 'riwayat')
  const riwayah = riwayat.find((entry) => readString(entry, 'id') === profile.riwayah)
  return readString(riwayah, 'fontFamily')
}

function findMushafAssetLabel(index: unknown, profile: ReaderAssetProfile): string | null {
  const assets = readArray(index, 'assets')
  const asset = assets.find(
    (entry) =>
      readString(entry, 'riwayah') === profile.riwayah &&
      readString(entry, 'mushafEditionId') === profile.mushafEditionId,
  )
  return readDisplayLabel(asset)
}

function findTranslationLabel(index: unknown, profile: ReaderAssetProfile): string | null {
  const sources = readArray(index, 'sources')
  const source = sources.find(
    (entry) => readString(entry, 'id') === profile.translationId && readString(entry, 'type') === 'translation',
  )
  return readDisplayLabel(source)
}

function readDisplayLabel(value: unknown): string | null {
  return readString(value, 'displayLabel') ?? readString(value, 'label')
}

function readArray(value: unknown, key: string): unknown[] {
  if (!isRecord(value)) return []
  const child = value[key]
  return Array.isArray(child) ? child : []
}

function readString(value: unknown, key: string): string | null {
  if (!isRecord(value)) return null
  const child = value[key]
  return isNonEmptyString(child) ? child : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
