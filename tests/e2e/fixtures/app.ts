import { expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

import { QURAN_ATLAS_DB_NAME, QURAN_ATLAS_V10_STORES, QURAN_ATLAS_V11_STORES } from '../../../src/storage/schema'

const MVP_ASSET_CONTRACT_ID = 'mvp-default-assets-qaloon-bridges-v1'

// Mirrors OFFLINE_DOWNLOAD_SETUP_VERSION (src/launch/offline-download-setup);
// inlined like MVP_ASSET_CONTRACT_ID to keep app modules out of the Node runtime.
const OFFLINE_DOWNLOAD_SETUP_VERSION = 2

// Mirrors MUSHAF_EDITION_SETUP_VERSION (src/launch/mushaf-edition-setup);
// inlined to keep app modules out of the Node runtime.
const MUSHAF_EDITION_SETUP_VERSION = 1

// Mirrors READER_CORE_PACK_LABEL and readerCorePackId (src/offline/download/offline-pack-plan).
const READER_CORE_PACK_LABEL = 'Reader texts'
const READER_CORE_PACK_ID = 'reader-core--qaloon--uthmani-kfgqpc-v1--bridges'

type SeededStore = [
  name: string,
  options: IDBObjectStoreParameters,
  indexes: Array<[string, string | string[], IDBIndexParameters?]>,
]

// Translates the Dexie store specs from src/storage/schema into equivalent
// IndexedDB keyPath + index definitions, so the fixture cannot drift from the
// app's schema (null specs are store deletions and are skipped).
const SEEDED_STORES = dexieStoresToIndexedDb(QURAN_ATLAS_V11_STORES)
// The previous Dexie contract, for seeding installations that predate the
// Search removal: version 10 still owns the savedSearches store that the
// app's version 11 upgrade must drop.
const SEEDED_PREVIOUS_STORES = dexieStoresToIndexedDb(QURAN_ATLAS_V10_STORES)

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

type SeededInstall = {
  nativeVersion?: number
  stores: SeededStore[]
  settings: Array<{ key: string; value: unknown }>
  savedSearches?: Array<Record<string, unknown>>
  bookmarks?: Array<Record<string, unknown>>
  offlinePacks?: Array<Record<string, unknown>>
}

function onboardedSettings(): Array<{ key: string; value: unknown }> {
  return [
    { key: 'mushafEditionSetupVersion', value: MUSHAF_EDITION_SETUP_VERSION },
    { key: 'mvpAssetContractId', value: MVP_ASSET_CONTRACT_ID },
    { key: 'riwayah', value: 'qaloon' },
    { key: 'quranTextStyleId', value: 'uthmani-kfgqpc-v1' },
    { key: 'mushafEditionId', value: 'qalun-quran-ws-v1' },
    { key: 'translationId', value: 'bridges' },
    { key: 'translationVisible', value: true },
    { key: 'lastSurface', value: '#/s/1' },
    { key: 'offlineDownloadSetupVersion', value: OFFLINE_DOWNLOAD_SETUP_VERSION },
  ]
}

function seedInstall(page: Page, install: SeededInstall): Promise<void> {
  return page.evaluate(
    ({ dbName, nativeVersion, stores, settings, savedSearches, bookmarks, offlinePacks }) =>
      new Promise<void>((resolve, reject) => {
        // Dexie logical versions map to native IndexedDB versions multiplied by 10.
        // Leave native-created fresh fixtures versionless; seed real upgrades at 100.
        const request = nativeVersion ? indexedDB.open(dbName, nativeVersion) : indexedDB.open(dbName)
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
          try {
            const storeNames = [
              ...new Set([
                'settings',
                ...savedSearches.map(() => 'savedSearches'),
                ...bookmarks.map(() => 'bookmarks'),
                ...offlinePacks.map(() => 'offlinePacks'),
              ]),
            ]
            const transaction = db.transaction(storeNames, 'readwrite')
            const settingsStore = transaction.objectStore('settings')
            for (const record of settings) settingsStore.put(record)
            if (savedSearches.length > 0)
              for (const record of savedSearches) transaction.objectStore('savedSearches').put(record)
            if (bookmarks.length > 0) for (const record of bookmarks) transaction.objectStore('bookmarks').put(record)
            if (offlinePacks.length > 0)
              for (const record of offlinePacks) transaction.objectStore('offlinePacks').put(record)
            transaction.oncomplete = () => {
              db.close()
              resolve()
            }
            transaction.onerror = () => {
              db.close()
              reject(transaction.error)
            }
          } catch (error) {
            db.close()
            reject(error instanceof Error ? error : new Error(String(error)))
          }
        }
        request.onerror = () => reject(request.error)
      }),
    {
      dbName: QURAN_ATLAS_DB_NAME,
      nativeVersion: install.nativeVersion,
      stores: install.stores,
      settings: install.settings,
      savedSearches: install.savedSearches ?? [],
      bookmarks: install.bookmarks ?? [],
      offlinePacks: install.offlinePacks ?? [],
    },
  )
}

export async function seedOnboardedReader(page: Page, origin = ''): Promise<void> {
  await wipeApplicationData(page, origin)
  await seedInstall(page, { stores: SEEDED_STORES, settings: onboardedSettings() })
}

// Reader-core pack file list mirror of readerCoreUrls (src/offline/download/offline-pack-plan):
// quran-text + translation surah files, verse aliases, surah index, and the
// knowledge ayah/passages lanes. Byte sizes are null (unknown), matching a
// plan built before the manifest byte sizes were read.
function readerCorePackFiles(): Array<{ url: string; bytes: null }> {
  const urls: string[] = []
  for (let surah = 1; surah <= 114; surah += 1) {
    const padded = String(surah).padStart(3, '0')
    urls.push(`/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/${padded}.json`)
    urls.push(`/dataset/translations/bridges/${padded}.json`)
    urls.push(`/dataset/knowledge/ayah/${padded}.json`)
    urls.push(`/dataset/knowledge/passages/${padded}.json`)
  }
  urls.push('/dataset/translations/_verse-aliases.json')
  urls.push('/dataset/surahs.json')
  return urls.map((url) => ({ url, bytes: null }))
}

const RETIRED_SEARCH_PACK_CONTENT_HASH = '40387674cdd6cc977a8d6e920e407ccc'
const RETIRED_SEARCH_PACK_CACHE_NAME = `quran-atlas-search-pack-${RETIRED_SEARCH_PACK_CONTENT_HASH}`
const RETIRED_SEARCH_PACK_URL = `/search-packs/packs/${RETIRED_SEARCH_PACK_CONTENT_HASH}/manifest.json`
const RETIRED_DATASET_URLS = [
  '/dataset/knowledge/indexes/theme-to-ayah.json',
  '/dataset/knowledge/indexes/ayah-to-passage.json',
  '/dataset/knowledge/indexes/passage-to-ayah.json',
  '/dataset/search-index.json',
  '/dataset/search/legacy-shard.json',
  '/search-packs/registry.json',
  '/dataset/riwayat/hafs/001.json',
  '/dataset/translations/unused-copy.json',
]
const RUNTIME_DATASET_CACHE_NAME = 'quran-atlas-runtime-dataset-v1'

// Seeds the fixture for the Search-removal upgrade path: a previous-version
// installation whose Dexie contract is still version 10 (savedSearches store
// present), with saved searches, a bookmark, a paused reader-text pack, Search
// pack caches, retired dataset URLs in the shared runtime cache, and old
// precached Search chunks in the prior precache revision.
export async function seedRetiredSearchInstallation(page: Page, origin = ''): Promise<void> {
  await wipeApplicationData(page, origin)

  const now = Date.now()
  const files = readerCorePackFiles()
  const completedUrls = [
    '/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json',
    '/dataset/translations/bridges/001.json',
  ]
  await seedInstall(page, {
    nativeVersion: 100,
    stores: SEEDED_PREVIOUS_STORES,
    settings: [...onboardedSettings(), { key: 'currentPosition', value: { surah: 1, verse: 2 } }],
    savedSearches: [
      {
        id: 'saved-search-1',
        schemaVersion: 1,
        intent: { query: 'mercy' },
        packCompatibilityKey: 'k-1',
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        lastRunAt: now,
      },
      {
        id: 'saved-search-2',
        schemaVersion: 1,
        intent: { query: 'forgiveness' },
        packCompatibilityKey: 'k-2',
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastRunAt: null,
      },
    ],
    bookmarks: [{ riwayah: 'qaloon', verseKey: '2:255', surah: 2, kind: 'verse', createdAt: now }],
    offlinePacks: [
      {
        packId: READER_CORE_PACK_ID,
        kind: 'reader-core',
        label: READER_CORE_PACK_LABEL,
        status: 'paused-network',
        totalBytes: null,
        bytesDone: 0,
        fileCount: files.length,
        filesDone: completedUrls.length,
        files,
        completedUrls,
        persisted: true,
        startedAt: now,
        updatedAt: now,
      },
    ],
  })

  // Real dist bodies for the retained reader sentinels so the offline read
  // serves genuine content; retired entries get placeholder bodies.
  const sentinelBodies: Record<string, string> = {}
  for (const url of completedUrls) {
    const filePath = new URL(`../../../dist${url}`, import.meta.url)
    sentinelBodies[url] = await readFile(filePath, 'utf8')
  }

  await page.evaluate(
    async ({
      searchPackCacheName,
      searchPackUrl,
      datasetCacheName,
      retiredUrls,
      sentinelBodies,
      currentPrecacheName,
      outdatedPrecacheName,
      oldChunkUrls,
    }) => {
      const searchPackCache = await caches.open(searchPackCacheName)
      await searchPackCache.put(
        searchPackUrl,
        new Response('{"registryVersion":1,"packs":[]}', { headers: { 'Content-Type': 'application/json' } }),
      )

      const datasetCache = await caches.open(datasetCacheName)
      for (const url of retiredUrls) {
        await datasetCache.put(
          url,
          new Response('{"retired":true}', { headers: { 'Content-Type': 'application/json' } }),
        )
      }
      for (const [url, body] of Object.entries(sentinelBodies)) {
        await datasetCache.put(url, new Response(body, { headers: { 'Content-Type': 'application/json' } }))
      }

      // Old Search chunks: entries inside the current precache cache name
      // (deleted entry-wise at activation) plus a whole prior precache
      // revision cache (deleted by cleanupOutdatedCaches).
      const currentPrecache = await caches.open(currentPrecacheName)
      const outdatedPrecache = await caches.open(outdatedPrecacheName)
      for (const url of oldChunkUrls) {
        const response = new Response('// removed Search chunk', {
          headers: { 'Content-Type': 'text/javascript' },
        })
        await currentPrecache.put(url, response.clone())
        await outdatedPrecache.put(url, response)
      }
    },
    {
      searchPackCacheName: RETIRED_SEARCH_PACK_CACHE_NAME,
      searchPackUrl: RETIRED_SEARCH_PACK_URL,
      datasetCacheName: RUNTIME_DATASET_CACHE_NAME,
      retiredUrls: RETIRED_DATASET_URLS,
      sentinelBodies,
      currentPrecacheName: `quranatlas-precache-v2-${origin}/`,
      outdatedPrecacheName: `quranatlas-precache-v1-${origin}/`,
      oldChunkUrls: [`${origin}/assets/SearchRoute-oldchunk.js`, `${origin}/assets/search.worker-oldchunk.js`],
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
