import { DEFAULT_READER_ASSET_PROFILE, MVP_ASSET_CONTRACT_ID, RESET_CACHE_NAME_PREFIXES } from '../../shared/reader-assets/default-profile'
import { readNativeSetting, resetNativeReaderStores } from '../storage/native-reader-store'

export type ReactMvpAssetContractReset = {
  contractId: string
  hadValidContract: boolean
  resetApplied: boolean
}

export async function ensureReactMvpAssetContractReset(): Promise<ReactMvpAssetContractReset> {
  const marker = await readNativeSetting('mvpAssetContractId')
  if (marker?.value === MVP_ASSET_CONTRACT_ID) {
    return { hadValidContract: true, resetApplied: false, contractId: MVP_ASSET_CONTRACT_ID }
  }

  if (typeof caches !== 'undefined' && typeof caches.keys === 'function') {
    const names = await caches.keys()
    await Promise.all(
      names
        .filter((name) => RESET_CACHE_NAME_PREFIXES.some((prefix) => name.startsWith(prefix)))
        .map((name) => caches.delete(name)),
    )
  }

  await resetNativeReaderStores([
    { key: 'mvpAssetContractId', value: MVP_ASSET_CONTRACT_ID },
    { key: 'riwayah', value: DEFAULT_READER_ASSET_PROFILE.riwayah },
    { key: 'quranTextStyleId', value: DEFAULT_READER_ASSET_PROFILE.quranTextStyleId },
    { key: 'mushafEditionId', value: DEFAULT_READER_ASSET_PROFILE.mushafEditionId },
    { key: 'translationId', value: DEFAULT_READER_ASSET_PROFILE.translationId },
    { key: 'translationVisible', value: true },
  ])

  return { hadValidContract: false, resetApplied: true, contractId: MVP_ASSET_CONTRACT_ID }
}
