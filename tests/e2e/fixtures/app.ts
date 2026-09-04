import { expect, type Page } from '@playwright/test'

import { QURAN_ATLAS_DB_NAME, QURAN_ATLAS_DB_VERSION } from '../../../src/storage/schema'

const MVP_ASSET_CONTRACT_ID = 'mvp-default-assets-qaloon-bridges-v1'

export async function seedOnboardedReader(page: Page, origin = ''): Promise<void> {
  await page.goto(`${origin}/favicon.ico`)
  await page.evaluate(async (dbName) => {
    localStorage.clear()
    sessionStorage.clear()
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(dbName)
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
      request.onblocked = () => resolve()
    })
  }, QURAN_ATLAS_DB_NAME)

  await page.evaluate(({ dbName, dbVersion, contractId }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion * 10)
    request.onupgradeneeded = () => {
      const db = request.result
      const stores: Array<[string, IDBObjectStoreParameters, Array<[string, string | string[], IDBIndexParameters?]>]> = [
        ['settings', { keyPath: 'key' }, []],
        ['activationState', { keyPath: 'id' }, []],
        ['datasetMeta', { keyPath: 'id' }, []],
        ['bookmarks', { keyPath: ['riwayah', 'verseKey'] }, [
          ['riwayah_surah', ['riwayah', 'surah'], { unique: false }],
          ['riwayah', 'riwayah', { unique: false }],
        ]],
        ['savedSearches', { keyPath: 'id' }, [
          ['updatedAt', 'updatedAt', { unique: false }],
          ['lastOpenedAt', 'lastOpenedAt', { unique: false }],
          ['schemaVersion', 'schemaVersion', { unique: false }],
          ['packCompatibilityKey', 'packCompatibilityKey', { unique: false }],
        ]],
        ['searchPackActivations', { keyPath: 'id' }, [
          ['packId', 'packId', { unique: false }],
          ['contentHash', 'contentHash', { unique: false }],
          ['generation', 'generation', { unique: false }],
          ['status', 'status', { unique: false }],
          ['updatedAt', 'updatedAt', { unique: false }],
        ]],
        ['searchPackStaging', { keyPath: 'id' }, [
          ['contentHash', 'contentHash', { unique: false }],
          ['status', 'status', { unique: false }],
          ['createdAt', 'createdAt', { unique: false }],
          ['updatedAt', 'updatedAt', { unique: false }],
        ]],
      ]
      for (const [name, options, indexes] of stores) {
        if (db.objectStoreNames.contains(name)) continue
        const store = db.createObjectStore(name, options)
        for (const [indexName, keyPath, indexOptions] of indexes) store.createIndex(indexName, keyPath, indexOptions)
      }
    }
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('settings', 'readwrite')
      const settings = transaction.objectStore('settings')
      for (const record of [
        { key: 'onboardingComplete', value: true },
        { key: 'mvpAssetContractId', value: contractId },
        { key: 'riwayah', value: 'qaloon' },
        { key: 'quranTextStyleId', value: 'uthmani-kfgqpc-v1' },
        { key: 'mushafEditionId', value: 'qalun-quran-ws-v1' },
        { key: 'translationId', value: 'bridges' },
        { key: 'translationVisible', value: true },
        { key: 'lastSurface', value: '#/s/1' },
      ]) settings.put(record)
      transaction.oncomplete = () => {
        db.close()
        resolve()
      }
      transaction.onerror = () => {
        db.close()
        reject(transaction.error)
      }
    }
    request.onerror = () => reject(request.error)
  }), {
    dbName: QURAN_ATLAS_DB_NAME,
    dbVersion: QURAN_ATLAS_DB_VERSION,
    contractId: MVP_ASSET_CONTRACT_ID,
  })
}

export async function expectControlledServiceWorker(page: Page): Promise<void> {
  await expect.poll(async () => page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false
    const registration = await navigator.serviceWorker.ready
    return Boolean(navigator.serviceWorker.controller && registration.active)
  }), { timeout: 15_000 }).toBe(true)

  const scriptURL = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? '')
  expect(scriptURL).toMatch(/\/sw\.js$/)
}
