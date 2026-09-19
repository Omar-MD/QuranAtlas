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
  description: string
}

const EDITION_DESCRIPTIONS: Record<string, string> = {
  'qalun-quran-ws-v1': 'Minimal monochrome pages from quran.ws.',
  'qalun-furatiyyah-2023-v1': '2023 Furatiyyah print with coloured notation and marginal notes.',
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

// One shared availability-index load per fetcher (P1): simultaneous
// launch-phase callers (launch restore, offline offer, edition banner,
// Settings, Downloads, edition dialog) previously each fetched and re-parsed
// the ~568 KB index. Concurrent calls now share one in-flight request, and a
// success is remembered for a short window so a same-burst caller (the
// banner mounting right after launch) does not refetch immediately. The
// window is short enough that a later explicit refresh (opening Settings or
// the edition dialog) revalidates through the NetworkFirst service worker; a
// rejection is never remembered, so an offline failure never poisons the
// next attempt.
const AVAILABILITY_INDEX_MEMO_MS = 15_000

type AvailabilityIndexCache = {
  inFlight: Promise<MushafEditionIndexEntry[]> | null
  entries: MushafEditionIndexEntry[] | null
  settledAt: number
}

const availabilityIndexCache = new WeakMap<typeof fetch, AvailabilityIndexCache>()

export async function loadMushafEditionEntries(fetcher: typeof fetch = fetch): Promise<MushafEditionIndexEntry[]> {
  const cache = availabilityIndexCache.get(fetcher) ?? { inFlight: null, entries: null, settledAt: 0 }
  if (cache.entries && Date.now() - cache.settledAt < AVAILABILITY_INDEX_MEMO_MS) {
    return cache.entries
  }
  cache.inFlight ??= (async () => {
    assertRuntimeDatasetUrl(MUSHAF_ASSET_INDEX_URL)
    const response = await fetcher(MUSHAF_ASSET_INDEX_URL)
    if (!response.ok) throw new Error(`Unable to load Mushaf edition availability: ${response.status}`)
    return parseMushafAssetIndex(await response.json())
  })()
  availabilityIndexCache.set(fetcher, cache)
  try {
    const entries = await cache.inFlight
    cache.entries = entries
    cache.settledAt = Date.now()
    return entries
  } catch (error) {
    // Evict on rejection so a later explicit retry (Try again, reopening a
    // surface) performs a fresh request instead of rethrowing forever.
    if (availabilityIndexCache.get(fetcher) === cache) {
      cache.inFlight = null
      cache.entries = null
    }
    throw error
  } finally {
    cache.inFlight = null
  }
}

export async function loadMushafEditionOptions(fetcher: typeof fetch = fetch): Promise<MushafEditionOption[]> {
  const entries = await loadMushafEditionEntries(fetcher)
  return entries.map((entry) => ({
    id: entry.mushafEditionId,
    label: entry.label,
    description: EDITION_DESCRIPTIONS[entry.mushafEditionId] ?? '',
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
    // The availability index is an online re-validation, not required data: a
    // completed setup keeps reading from its stored edition instead of being
    // stranded on an error screen when the index cannot be fetched (offline,
    // or a cold service worker that has not cached it yet).
    if (setupComplete) return { status: 'complete', mushafEditionId: selectedEditionId }
    return { status: 'availability-error' }
  }

  if (setupComplete) {
    return editions.some((edition) => edition.id === selectedEditionId)
      ? { status: 'complete', mushafEditionId: selectedEditionId }
      : { status: 'missing', mushafEditionId: selectedEditionId }
  }

  return { status: 'choose', editions }
}
