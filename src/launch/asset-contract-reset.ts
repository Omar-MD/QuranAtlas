import { DEFAULT_READER_ASSET_PROFILE, MVP_ASSET_CONTRACT_ID, RESET_CACHE_NAME_PREFIXES } from '../../shared/reader-assets/default-profile'
import { closeDB, deleteDB, get, openDB, put } from '../core/db.js'
import { suppressNextVersionChange } from '../infra/safety/sync.js'

export type AssetContractResetResult = {
  resetApplied: boolean
  contractId: typeof MVP_ASSET_CONTRACT_ID
}

async function clearQuranAtlasCaches(): Promise<void> {
  if (typeof caches === 'undefined') {
    return
  }
  const names = await caches.keys()
  await Promise.all(
    names
      .filter((name) => RESET_CACHE_NAME_PREFIXES.some((prefix) => name.startsWith(prefix)))
      .map((name) => caches.delete(name)),
  )
}

async function clearStoresWithoutDeletingDb(): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const storeNames = Array.from(db.objectStoreNames)
    const tx = db.transaction(storeNames, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Store clear transaction failed'))
    for (const storeName of storeNames) {
      tx.objectStore(storeName).clear()
    }
  })
}

async function seedDefaultAssetSettings(): Promise<void> {
  await put('settings', { key: 'mvpAssetContractId', value: MVP_ASSET_CONTRACT_ID })
  await put('settings', { key: 'riwayah', value: DEFAULT_READER_ASSET_PROFILE.riwayah })
  await put('settings', { key: 'quranTextStyleId', value: DEFAULT_READER_ASSET_PROFILE.quranTextStyleId })
  await put('settings', { key: 'mushafEditionId', value: DEFAULT_READER_ASSET_PROFILE.mushafEditionId })
  await put('settings', { key: 'translationId', value: DEFAULT_READER_ASSET_PROFILE.translationId })
  await put('settings', { key: 'translationVisible', value: true })
}

export async function ensureMvpAssetContractReset(
  options: { forceStoreClearForTests?: boolean } = {},
): Promise<AssetContractResetResult> {
  await openDB()
  const marker = await get('settings', 'mvpAssetContractId').catch(() => undefined)
  if ((marker as { value?: unknown } | undefined)?.value === MVP_ASSET_CONTRACT_ID) {
    return { resetApplied: false, contractId: MVP_ASSET_CONTRACT_ID }
  }

  await clearQuranAtlasCaches()
  suppressNextVersionChange()
  try {
    if (options.forceStoreClearForTests) {
      throw new Error('forced store clear')
    }
    closeDB()
    await deleteDB()
  } catch {
    await clearStoresWithoutDeletingDb()
  }
  await openDB()
  await seedDefaultAssetSettings()
  return { resetApplied: true, contractId: MVP_ASSET_CONTRACT_ID }
}
