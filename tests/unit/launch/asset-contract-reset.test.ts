import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { closeDB, DB_NAME, get, openDB, put } from '../../../src/core/db'
import { DEFAULT_READER_ASSET_PROFILE, MVP_ASSET_CONTRACT_ID } from '../../../shared/reader-assets/default-profile'

describe('asset contract reset', () => {
  beforeEach(async () => {
    closeDB()
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('Test database deletion blocked'))
    })
    ;(globalThis as unknown as { caches?: CacheStorage }).caches = {
      keys: vi.fn(async () => ['quran-dataset-v2', 'qa-pages-hafs-hafs-quran-ws-v1', 'quran-atlas-react-pages', 'unrelated-cache']),
      delete: vi.fn(async () => true),
    } as unknown as CacheStorage
  })

  it('clears old settings and caches once, records the new contract marker, and seeds defaults', async () => {
    const { put } = await import('../../../src/core/db')
    const { ensureMvpAssetContractReset } = await import('../../../src/launch/asset-contract-reset')
    await openDB()
    await put('settings', { key: 'riwayah', value: 'hafs' })
    await put('settings', { key: 'translationId', value: 'saheeh' })

    const result = await ensureMvpAssetContractReset()

    expect(result).toEqual({ resetApplied: true, contractId: MVP_ASSET_CONTRACT_ID })
    expect(await get('settings', 'riwayah')).toEqual({ key: 'riwayah', value: DEFAULT_READER_ASSET_PROFILE.riwayah })
    expect(await get('settings', 'translationId')).toEqual({ key: 'translationId', value: DEFAULT_READER_ASSET_PROFILE.translationId })
    expect(await get('settings', 'quranTextStyleId')).toEqual({ key: 'quranTextStyleId', value: DEFAULT_READER_ASSET_PROFILE.quranTextStyleId })
    expect(await get('settings', 'mushafEditionId')).toEqual({ key: 'mushafEditionId', value: DEFAULT_READER_ASSET_PROFILE.mushafEditionId })
    expect(await get('settings', 'mvpAssetContractId')).toEqual({ key: 'mvpAssetContractId', value: MVP_ASSET_CONTRACT_ID })
    expect(caches.delete).toHaveBeenCalledWith('quran-dataset-v2')
    expect(caches.delete).toHaveBeenCalledWith('qa-pages-hafs-hafs-quran-ws-v1')
    expect(caches.delete).toHaveBeenCalledWith('quran-atlas-react-pages')
    expect(caches.delete).not.toHaveBeenCalledWith('unrelated-cache')
  })

  it('does not clear data again when the marker already matches', async () => {
    const { ensureMvpAssetContractReset } = await import('../../../src/launch/asset-contract-reset')
    await openDB()
    await put('settings', { key: 'mvpAssetContractId', value: MVP_ASSET_CONTRACT_ID })
    await put('settings', { key: 'currentPosition', value: { surah: 2, verse: 255 } })

    const result = await ensureMvpAssetContractReset()

    expect(result).toEqual({ resetApplied: false, contractId: MVP_ASSET_CONTRACT_ID })
    expect(await get('settings', 'currentPosition')).toEqual({ key: 'currentPosition', value: { surah: 2, verse: 255 } })
    expect(caches.delete).not.toHaveBeenCalled()
  })

  it('clears stores transactionally if database deletion is blocked by a peer tab', async () => {
    const { ensureMvpAssetContractReset } = await import('../../../src/launch/asset-contract-reset')
    await openDB()
    await put('settings', { key: 'riwayah', value: 'warsh' })

    await expect(ensureMvpAssetContractReset({ forceStoreClearForTests: true })).resolves.toEqual({
      resetApplied: true,
      contractId: MVP_ASSET_CONTRACT_ID,
    })
    expect(await get('settings', 'riwayah')).toEqual({ key: 'riwayah', value: DEFAULT_READER_ASSET_PROFILE.riwayah })
  })

  it('does not require whole-database deletion to complete launch reset', async () => {
    const { ensureMvpAssetContractReset } = await import('../../../src/launch/asset-contract-reset')
    await openDB()
    await put('settings', { key: 'riwayah', value: 'hafs' })
    const peer = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    try {
      const result = await ensureMvpAssetContractReset()

      expect(result).toEqual({ resetApplied: true, contractId: MVP_ASSET_CONTRACT_ID })
      expect(peer.objectStoreNames.contains('settings')).toBe(true)
      expect(await get('settings', 'riwayah')).toEqual({ key: 'riwayah', value: DEFAULT_READER_ASSET_PROFILE.riwayah })
    } finally {
      peer.close()
    }
  })
})
