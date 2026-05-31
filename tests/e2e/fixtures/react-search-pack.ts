import type { Page } from '@playwright/test'

import { QURAN_ATLAS_DB_NAME } from '../../../src/storage/schema'

export async function installSearchPackFixture(page: Page) {
  return page.evaluate(async ({ dbName }) => {
    const registry = await fetch('/search-packs/registry.json').then((response) => response.json())
    const entry = registry.packs[0]
    const manifest = await fetch(entry.manifestUrl).then((response) => response.json())
    const cacheName = `quran-atlas-search-pack-${entry.contentHash}`
    const cache = await caches.open(cacheName)
    await cache.add(entry.manifestUrl)
    for (const shard of manifest.shards) await cache.add(shard.url)

    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open(dbName)
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction('searchPackActivations', 'readwrite')
        tx.objectStore('searchPackActivations').put({
          id: 'current',
          packId: entry.packId,
          packVersion: entry.packVersion,
          contentHash: entry.contentHash,
          generation: 1,
          status: 'active',
          cacheName,
          totalBytes: entry.totalBytes,
          estimatedMemoryBytes: manifest.estimatedMemoryBytes,
          activatedAt: Date.now(),
          verifiedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => { db.close(); reject(tx.error) }
      }
      open.onerror = () => reject(open.error)
    })

    return { cacheName, manifestUrl: entry.manifestUrl, shardCount: manifest.shards.length }
  }, { dbName: QURAN_ATLAS_DB_NAME })
}

export async function readSearchPackFixtureState(page: Page) {
  return page.evaluate(async ({ dbName }) => {
    const cacheNames = await caches.keys()
    const activation = await new Promise<unknown>((resolve, reject) => {
      const open = indexedDB.open(dbName)
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction('searchPackActivations', 'readonly')
        const get = tx.objectStore('searchPackActivations').get('current')
        get.onsuccess = () => { db.close(); resolve(get.result ?? null) }
        get.onerror = () => { db.close(); reject(get.error) }
      }
      open.onerror = () => reject(open.error)
    })
    return { cacheNames, activation }
  }, { dbName: QURAN_ATLAS_DB_NAME })
}
