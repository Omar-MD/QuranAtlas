import { DEFAULT_READER_ASSET_PROFILE, MVP_ASSET_CONTRACT_ID, RESET_CACHE_NAME_PREFIXES } from '../../shared/reader-assets/default-profile'
import { openReactDb } from '../storage/db'

export async function ensureReactMvpAssetContractReset(): Promise<{ resetApplied: boolean; contractId: string }> {
  const db = await openReactDb()
  const marker = await db.settings.get('mvpAssetContractId')
  if (marker?.value === MVP_ASSET_CONTRACT_ID) {
    return { resetApplied: false, contractId: MVP_ASSET_CONTRACT_ID }
  }

  if (typeof caches !== 'undefined') {
    const names = await caches.keys()
    await Promise.all(
      names
        .filter((name) => RESET_CACHE_NAME_PREFIXES.some((prefix) => name.startsWith(prefix)))
        .map((name) => caches.delete(name)),
    )
  }

  await db.transaction('rw', [db.settings, db.activationState, db.datasetMeta, db.bookmarks], async () => {
    await db.settings.clear()
    await db.activationState.clear()
    await db.datasetMeta.clear()
    await db.bookmarks.clear()
    await db.settings.bulkPut([
      { key: 'mvpAssetContractId', value: MVP_ASSET_CONTRACT_ID },
      { key: 'riwayah', value: DEFAULT_READER_ASSET_PROFILE.riwayah },
      { key: 'quranTextStyleId', value: DEFAULT_READER_ASSET_PROFILE.quranTextStyleId },
      { key: 'mushafEditionId', value: DEFAULT_READER_ASSET_PROFILE.mushafEditionId },
      { key: 'translationId', value: DEFAULT_READER_ASSET_PROFILE.translationId },
      { key: 'translationVisible', value: true },
    ])
  })

  return { resetApplied: true, contractId: MVP_ASSET_CONTRACT_ID }
}
