import { expect, type Page } from '@playwright/test'

import { QURAN_ATLAS_DB_NAME, QURAN_ATLAS_V10_STORES } from '../../../src/storage/schema'

const MVP_ASSET_CONTRACT_ID = 'mvp-default-assets-qaloon-bridges-v1'

// Mirrors OFFLINE_DOWNLOAD_SETUP_VERSION (src/launch/offline-download-setup);
// inlined like MVP_ASSET_CONTRACT_ID to keep app modules out of the Node runtime.
const OFFLINE_DOWNLOAD_SETUP_VERSION = 2

// Mirrors MUSHAF_EDITION_SETUP_VERSION (src/launch/mushaf-edition-setup);
// inlined to keep app modules out of the Node runtime.
const MUSHAF_EDITION_SETUP_VERSION = 1

type SeededStore = [
  name: string,
  options: IDBObjectStoreParameters,
  indexes: Array<[string, string | string[], IDBIndexParameters?]>,
]

// Translates the Dexie store specs from src/storage/schema into equivalent
// IndexedDB keyPath + index definitions, so the fixture cannot drift from the
// app's schema (null specs are store deletions and are skipped).
const SEEDED_STORES = dexieStoresToIndexedDb(QURAN_ATLAS_V10_STORES)

function dexieStoresToIndexedDb(specs: Record<string, string | null>): SeededStore[] {
  const stores: SeededStore[] = []
  for (const [name, spec] of Object.entries(specs)) {
    if (spec === null) continue
    const tokens = spec.split(',').map((token) => token.trim())
    const primaryKey = dexieKeyPath(tokens[0])
    const options: IDBObjectStoreParameters = primaryKey
      ? { keyPath: primaryKey, autoIncrement: tokens[0].includes('++') }
      : { autoIncrement: true }
    const indexes: SeededStore[2] = []
    for (const token of tokens.slice(1)) {
      const keyPath = dexieKeyPath(token)
      if (!keyPath) continue
      const indexName = Array.isArray(keyPath) ? keyPath.join('_') : keyPath
      indexes.push([indexName, keyPath, { unique: token.includes('&'), multiEntry: token.includes('*') }])
    }
    stores.push([name, options, indexes])
  }
  return stores
}

function dexieKeyPath(token: string): string | string[] | null {
  const name = token.replace(/([&*]|\+\+)/g, '')
  if (!name) return null
  return name.startsWith('[') ? name.slice(1, -1).split('+') : name
}

export async function wipeApplicationData(page: Page, origin = ''): Promise<void> {
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
}

export async function seedOnboardedReader(page: Page, origin = ''): Promise<void> {
  await wipeApplicationData(page, origin)

  await page.evaluate(
    ({ dbName, stores, contractId, offlineDownloadSetupVersion, mushafEditionSetupVersion }) =>
      new Promise<void>((resolve, reject) => {
        // Versionless like the app's own native opens (src/storage/native-reader-store.ts):
        // the fixture must not pin a DB version the app's Dexie schema disagrees with.
        const request = indexedDB.open(dbName)
        request.onupgradeneeded = () => {
          const db = request.result
          for (const [name, options, indexes] of stores) {
            if (db.objectStoreNames.contains(name)) continue
            const store = db.createObjectStore(name, options)
            for (const [indexName, keyPath, indexOptions] of indexes)
              store.createIndex(indexName, keyPath, indexOptions)
          }
        }
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction('settings', 'readwrite')
          const settings = transaction.objectStore('settings')
          for (const record of [
            { key: 'mushafEditionSetupVersion', value: mushafEditionSetupVersion },
            { key: 'mvpAssetContractId', value: contractId },
            { key: 'riwayah', value: 'qaloon' },
            { key: 'quranTextStyleId', value: 'uthmani-kfgqpc-v1' },
            { key: 'mushafEditionId', value: 'qalun-quran-ws-v1' },
            { key: 'translationId', value: 'bridges' },
            { key: 'translationVisible', value: true },
            { key: 'lastSurface', value: '#/s/1' },
            { key: 'offlineDownloadSetupVersion', value: offlineDownloadSetupVersion },
          ])
            settings.put(record)
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
      }),
    {
      dbName: QURAN_ATLAS_DB_NAME,
      stores: SEEDED_STORES,
      contractId: MVP_ASSET_CONTRACT_ID,
      offlineDownloadSetupVersion: OFFLINE_DOWNLOAD_SETUP_VERSION,
      mushafEditionSetupVersion: MUSHAF_EDITION_SETUP_VERSION,
    },
  )
}

export async function expectControlledServiceWorker(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          if (!('serviceWorker' in navigator)) return false
          const registration = await navigator.serviceWorker.ready
          return Boolean(navigator.serviceWorker.controller && registration.active)
        }),
      { timeout: 15_000 },
    )
    .toBe(true)

  const scriptURL = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? '')
  expect(scriptURL).toMatch(/\/sw\.js$/)
}
