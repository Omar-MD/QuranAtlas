import { requestOfflinePackInstall } from '../offline/download/offline-pack-downloader'
import {
  buildMushafPackPlan,
  buildReaderCorePackPlan,
  formatOfflineBytes,
  loadDatasetByteSizes,
  type OfflinePackPlan,
} from '../offline/download/offline-pack-plan'
import { ensureStoragePersistence } from '../offline/download/storage-persistence'
import { readNativeSetting, writeNativeSetting } from '../storage/native-reader-store'
import { readActiveReaderProfile, type ActiveReaderProfile } from '../storage/reader-settings'
import { loadMushafEditionEntries } from './mushaf-edition-setup'

export const OFFLINE_DOWNLOAD_SETUP_VERSION = 2

export type OfflineDownloadOffer = {
  status: 'offer'
  profile: ActiveReaderProfile
  editionLabel: string
  mushafPlan: OfflinePackPlan
}

// The reader-profile reader lives in src/storage/reader-settings.ts (audit
// D3/D15/D16); re-exported here for the existing launch-restore and
// OfflineDataSection imports.
export { readActiveReaderProfile, type ActiveReaderProfile } from '../storage/reader-settings'

// SD-2 size segment: every surface renders the identical label·size form, with
// the exact `size unavailable` fallback when a pack total is unknown.
export function formatOfflinePackSize(totalBytes: number | null): string {
  return totalBytes != null ? formatOfflineBytes(totalBytes) : 'size unavailable'
}

// The verse/reader-text pack is required offline data, not an offer: it is
// enqueued automatically (idempotently) whenever launch resolves the reader.
// Byte sizes stay best-effort — the plan is valid without them.
export async function beginRequiredReaderCoreDownload(profile: ActiveReaderProfile): Promise<void> {
  const byteSizes = await loadDatasetByteSizes().catch(() => null)
  const plan = buildReaderCorePackPlan(profile, byteSizes)
  const persisted = await ensureStoragePersistence().catch(() => false)
  await requestOfflinePackInstall(plan, { persisted })
}

export async function resolveOfflineDownloadOffer(fetcher: typeof fetch = fetch): Promise<OfflineDownloadOffer | null> {
  try {
    const marker = await readNativeSetting('offlineDownloadSetupVersion')
    if (marker?.value === OFFLINE_DOWNLOAD_SETUP_VERSION) return null
    const profile = await readActiveReaderProfile()
    const entries = await loadMushafEditionEntries(fetcher)
    const entry = entries.find((candidate) => candidate.mushafEditionId === profile.mushafEditionId)
    if (!entry) return null
    return {
      status: 'offer',
      profile,
      editionLabel: entry.label,
      mushafPlan: buildMushafPackPlan(entry),
    }
  } catch {
    // Metadata unavailable (offline or invalid index): no offer, and no marker
    // is written, so a healthy later launch offers again instead of looping.
    return null
  }
}

export async function writeOfflineDownloadSetupComplete(): Promise<void> {
  await writeNativeSetting({ key: 'offlineDownloadSetupVersion', value: OFFLINE_DOWNLOAD_SETUP_VERSION })
}

export async function startOfflineDownloadFromOnboarding(offer: OfflineDownloadOffer): Promise<{ persisted: boolean }> {
  // User-gesture context only: persistence consent may prompt (Firefox). The
  // required reader-core pack enqueues outside this consent path.
  const persisted = await ensureStoragePersistence()
  await requestOfflinePackInstall(offer.mushafPlan, { persisted })
  return { persisted }
}
