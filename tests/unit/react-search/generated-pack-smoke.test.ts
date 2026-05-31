import { readFile } from 'node:fs/promises'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { closeReactDb } from '../../../src/storage/db'
import { installSearchPack, verifyStagedSearchPack, activateSearchPack } from '../../../src/offline/search/activation'
import { SearchWorkerSession } from '../../../src/search-worker/session'
import { parseSearchQuery } from '../../../src/search/query-parser'
import type { SearchPackManifestV1, SearchPackRegistry } from '../../../shared/search'

describe('generated Search pack smoke', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    closeReactDb()
  })

  it('installs, activates, decodes, and queries the generated core pack', async () => {
    const registry = JSON.parse(await readFile('public/search-packs/registry.json', 'utf8')) as SearchPackRegistry
    const entry = registry.packs[0]!
    const manifestPath = entry.manifestUrl.replace(/^\//, 'public/')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as SearchPackManifestV1
    const cacheStorage = createCacheStorage()
    vi.stubGlobal('caches', cacheStorage)

    const fetcher = async (url: RequestInfo | URL) => {
      const pathname = typeof url === 'string'
        ? url
        : url instanceof URL
          ? url.pathname
          : new URL(url.url).pathname
      return new Response(await readFile(pathname.replace(/^\//, 'public/')))
    }

    await installSearchPack(manifest, { fetcher, now: 1 })
    await verifyStagedSearchPack(manifest, { now: 2 })
    await expect(activateSearchPack(manifest, { now: 3 })).resolves.toMatchObject({
      packId: manifest.packId,
      contentHash: manifest.contentHash,
      status: 'active',
    })

    const session = new SearchWorkerSession({
      cacheStorage,
      manifest,
      aliases: { '2': [{ hafs: 255, warsh: 255, qaloon: 255 }] },
    })
    await session.handle({ type: 'init', requestId: 'init', packId: manifest.packId })
    const reference = parseSearchQuery('2:255')
    const referenceResponse = await session.handle({
      type: 'query',
      requestId: 'ref',
      query: reference.ast,
      limit: 3,
      sort: 'relevance',
    })
    if (referenceResponse.type === 'error') throw new Error(referenceResponse.error.message)
    expect(referenceResponse).toMatchObject({ type: 'ok' })

    const arabic = parseSearchQuery('الله', { mode: 'arabic-text' })
    const response = await session.handle({
      type: 'query',
      requestId: 'arabic',
      query: arabic.ast,
      limit: 3,
      sort: 'relevance',
    })
    expect(response).toMatchObject({ type: 'ok' })
    if (response.type !== 'ok' || response.payload.kind !== 'query-window') throw new Error('expected query results')
    expect(response.payload.window.results.length).toBeGreaterThan(0)
  }, 30_000)
})

function createCacheStorage() {
  const stores = new Map<string, Map<string, Response>>()
  return {
    open: async (name: string) => {
      const store = stores.get(name) ?? new Map<string, Response>()
      stores.set(name, store)
      return {
        put: async (key: string, response: Response) => {
          store.set(key, response.clone())
        },
        match: async (key: string) => store.get(key)?.clone(),
      }
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  } satisfies Pick<CacheStorage, 'open' | 'keys' | 'delete'>
}
