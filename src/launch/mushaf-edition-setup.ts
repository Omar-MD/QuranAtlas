import { DEFAULT_READER_ASSET_PROFILE, MUSHAF_ASSET_INDEX_URL } from '../../shared/reader-assets/default-profile'
import { assertRuntimeDatasetUrl } from '../data/runtime-boundary'
import { parseMushafAssetIndex, type MushafEditionIndexEntry } from '../packs/mushaf-index'

import { readNativeSettings, writeNativeMushafEditionSelection } from '../storage/native-reader-store'

export const MUSHAF_EDITION_SETUP_VERSION = 1

export type { MushafEditionIndexEntry } from '../packs/mushaf-index'

export type MushafEditionOption = {
  id: string
  label: string
  shortLabel?: string
}

export type MushafEditionSetupState =
  | { status: 'complete'; mushafEditionId: string }
  | { status: 'choose'; editions: MushafEditionOption[] }
  | { status: 'availability-error'; mushafEditionId?: string }
  | { status: 'missing'; mushafEditionId: string }

type MushafEditionSetupOptions = {
  contractWasValid: boolean
  fetcher?: typeof fetch
}

export async function loadMushafEditionEntries(fetcher: typeof fetch = fetch): Promise<MushafEditionIndexEntry[]> {
  assertRuntimeDatasetUrl(MUSHAF_ASSET_INDEX_URL)
  const response = await fetcher(MUSHAF_ASSET_INDEX_URL)
  if (!response.ok) throw new Error(`Unable to load Mushaf edition availability: ${response.status}`)
  return parseMushafAssetIndex(await response.json())
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
