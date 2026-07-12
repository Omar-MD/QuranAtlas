import { DEFAULT_READER_ASSET_PROFILE } from '../../shared/reader-assets/default-profile'
import { assertRuntimeDatasetUrl } from '../data/runtime-boundary'
import { readNativeSettings, writeNativeMushafEditionSelection } from '../storage/native-reader-store'

export const MUSHAF_EDITION_SETUP_VERSION = 1

const MUSHAF_ASSET_INDEX_URL = '/dataset/indexes/mushaf-assets.json'

export type MushafEditionOption = {
  id: string
  label: string
}

export type MushafEditionSetupState =
  | { status: 'complete'; mushafEditionId: string }
  | { status: 'choose'; editions: MushafEditionOption[] }
  | { status: 'missing'; mushafEditionId: string }

type MushafAssetIndex = {
  assets?: unknown
}

type MushafEditionSetupOptions = {
  contractWasValid: boolean
  fetcher?: typeof fetch
}

export async function loadMushafEditionOptions(fetcher: typeof fetch = fetch): Promise<MushafEditionOption[]> {
  assertRuntimeDatasetUrl(MUSHAF_ASSET_INDEX_URL)
  const response = await fetcher(MUSHAF_ASSET_INDEX_URL)
  if (!response.ok) throw new Error(`Unable to load Mushaf edition availability: ${response.status}`)
  const index = await response.json() as MushafAssetIndex
  if (!Array.isArray(index.assets)) return []

  return index.assets.flatMap((asset): MushafEditionOption[] => {
    if (!isAvailableQaloonMushaf(asset)) return []
    return [{ id: asset.mushafEditionId, label: asset.label }]
  })
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
  const selectedEditionId = typeof editionMarker?.value === 'string'
    ? editionMarker.value
    : DEFAULT_READER_ASSET_PROFILE.mushafEditionId

  if (!setupComplete && contractWasValid) {
    await writeMushafEditionSelection(DEFAULT_READER_ASSET_PROFILE.mushafEditionId)
    return { status: 'complete', mushafEditionId: DEFAULT_READER_ASSET_PROFILE.mushafEditionId }
  }

  let editions: MushafEditionOption[]
  try {
    editions = await loadMushafEditionOptions(fetcher)
  } catch {
    return setupComplete
      ? { status: 'missing', mushafEditionId: selectedEditionId }
      : { status: 'choose', editions: [] }
  }

  if (setupComplete) {
    return editions.some((edition) => edition.id === selectedEditionId)
      ? { status: 'complete', mushafEditionId: selectedEditionId }
      : { status: 'missing', mushafEditionId: selectedEditionId }
  }

  return { status: 'choose', editions }
}

function isAvailableQaloonMushaf(value: unknown): value is { label: string; mushafEditionId: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const asset = value as Record<string, unknown>
  return asset.riwayah === 'qaloon'
    && asset.pageCount === 604
    && (asset.availability === undefined || asset.availability === 'available')
    && typeof asset.mushafEditionId === 'string'
    && typeof asset.label === 'string'
}
