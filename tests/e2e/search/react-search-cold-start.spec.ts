import { expect, test } from '@playwright/test'

import { QURAN_ATLAS_DB_NAME } from '../../../src/storage/schema'
import { seedTargetState, targetUrl } from '../fixtures/react-golden-routes'

type SearchColdStartProof = {
  databaseNames: string[]
  objectStoreCalls: Array<{ dbName: string; storeName: string }>
  openCalls: Array<{ name: string; version: number | null }>
  storeOperationCalls: Array<{ dbName: string; method: string; storeName: string }>
  transactionCalls: Array<{ dbName: string; mode: string; storeNames: string[] }>
}

const SEARCH_STORE_NAMES = ['savedSearches', 'searchPackActivations', 'searchPackStaging']

test('Reader cold launch performs no Ask/Search work before explicit Search intent', async ({ page }) => {
  await seedTargetState(page, 'react', 'onboarded-last-surface-reader')

  const requests: string[] = []
  const workerUrls: string[] = []

  page.on('request', (request) => requests.push(request.url()))
  page.on('worker', (worker) => workerUrls.push(worker.url()))

  await page.addInitScript(({ dbName, searchStoreNames }) => {
    const proof: SearchColdStartProof = {
      databaseNames: [],
      objectStoreCalls: [],
      openCalls: [],
      storeOperationCalls: [],
      transactionCalls: [],
    }
    Object.defineProperty(window, '__quranAtlasSearchColdStartProof', {
      configurable: false,
      value: proof,
    })

    const originalOpen = indexedDB.open.bind(indexedDB)
    indexedDB.open = ((name: string, version?: number) => {
      proof.openCalls.push({ name: String(name), version: version ?? null })
      return originalOpen(name, version)
    }) as IDBFactory['open']

    if (indexedDB.databases) {
      const originalDatabases = indexedDB.databases.bind(indexedDB)
      indexedDB.databases = (async () => {
        const databases = await originalDatabases()
        proof.databaseNames = databases.map((database) => database.name).filter((name): name is string => Boolean(name))
        return databases
      }) as IDBFactory['databases']
    }

    const originalTransaction = IDBDatabase.prototype.transaction
    IDBDatabase.prototype.transaction = function patchedTransaction(
      storeNames: string | string[],
      mode?: IDBTransactionMode,
      options?: IDBTransactionOptions,
    ) {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames]
      if (this.name === dbName && names.some((name) => searchStoreNames.includes(name))) {
        proof.transactionCalls.push({
          dbName: this.name,
          mode: mode ?? 'readonly',
          storeNames: names,
        })
      }
      return originalTransaction.call(this, storeNames, mode, options)
    }

    const originalObjectStore = IDBTransaction.prototype.objectStore
    IDBTransaction.prototype.objectStore = function patchedObjectStore(name: string) {
      if (this.db.name === dbName && searchStoreNames.includes(name)) {
        proof.objectStoreCalls.push({ dbName: this.db.name, storeName: name })
      }
      return originalObjectStore.call(this, name)
    }

    const storeRequestMethods = [
      'add',
      'clear',
      'count',
      'delete',
      'get',
      'getAll',
      'getAllKeys',
      'getKey',
      'openCursor',
      'openKeyCursor',
      'put',
    ] as const
    const objectStorePrototype = IDBObjectStore.prototype as unknown as Record<typeof storeRequestMethods[number], (...args: unknown[]) => IDBRequest<unknown>>
    for (const methodName of storeRequestMethods) {
      const originalMethod = objectStorePrototype[methodName]
      objectStorePrototype[methodName] = function patchedStoreRequest(this: IDBObjectStore, ...args: unknown[]) {
        if (this.transaction.db.name === dbName && searchStoreNames.includes(this.name)) {
          proof.storeOperationCalls.push({
            dbName: this.transaction.db.name,
            method: methodName,
            storeName: this.name,
          })
        }
        return originalMethod.apply(this, args)
      }
    }

    const indexRequestMethods = [
      'count',
      'get',
      'getAll',
      'getAllKeys',
      'getKey',
      'openCursor',
      'openKeyCursor',
    ] as const
    const indexPrototype = IDBIndex.prototype as unknown as Record<typeof indexRequestMethods[number], (...args: unknown[]) => IDBRequest<unknown>>
    for (const methodName of indexRequestMethods) {
      const originalMethod = indexPrototype[methodName]
      indexPrototype[methodName] = function patchedIndexRequest(this: IDBIndex, ...args: unknown[]) {
        const store = this.objectStore
        if (store.transaction.db.name === dbName && searchStoreNames.includes(store.name)) {
          proof.storeOperationCalls.push({
            dbName: store.transaction.db.name,
            method: `index.${methodName}`,
            storeName: store.name,
          })
        }
        return originalMethod.apply(this, args)
      }
    }
  }, { dbName: QURAN_ATLAS_DB_NAME, searchStoreNames: SEARCH_STORE_NAMES })

  await page.goto(targetUrl('react', '/#/s/1'))
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByTestId('verse-1:7')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.readyState)).toBe('complete')

  const indexedDbProof = await page.evaluate(async () => {
    if (indexedDB.databases) await indexedDB.databases()
    return (window as unknown as { __quranAtlasSearchColdStartProof: SearchColdStartProof }).__quranAtlasSearchColdStartProof
  })
  const resourceEntries = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .map((entry) => ({ initiatorType: entry.initiatorType, name: entry.name })),
  )

  expect(requests.some((url) => url.includes('/search-packs/'))).toBe(false)
  expect(requests.some((url) => /search.*worker|search\.worker/i.test(url))).toBe(false)
  expect(requests.some((url) => /modulepreload.+search|search.+modulepreload/i.test(url))).toBe(false)
  expect(resourceEntries.some((entry) => entry.initiatorType === 'link' && /search/i.test(entry.name))).toBe(false)
  expect(workerUrls.some((url) => /search\.worker/i.test(url))).toBe(false)
  expect(indexedDbProof.databaseNames.some((name) => name.includes('quran-atlas-search'))).toBe(false)
  expect(indexedDbProof.storeOperationCalls).toEqual([])
})
