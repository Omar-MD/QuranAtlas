import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Cache API with in-memory store
let caches_store = new Map()

globalThis.caches = {
  open: vi.fn(async (name) => {
    if (!caches_store.has(name)) {
      caches_store.set(name, new Map())
    }
    const store = caches_store.get(name)
    return {
      put: vi.fn(async (url, response) => { store.set(url, response) }),
      match: vi.fn(async (url) => store.get(url) || undefined),
      keys: vi.fn(async () => [...store.keys()].map(url => ({ url }))),
    }
  }),
  delete: vi.fn(async (name) => {
    const had = caches_store.has(name)
    caches_store.delete(name)
    return had
  }),
}

import {
  STAGING_CACHE,
  stageFile,
  getStagedResponse,
  listStagedUrls,
  deleteStaging,
  copyToLive,
} from '../../../src/offline/staging-cache.js'

beforeEach(() => {
  caches_store = new Map()
  vi.clearAllMocks()
})

describe('staging-cache.js', () => {
  it('exports correct staging cache name', () => {
    expect(STAGING_CACHE).toBe('quran-dataset-staging')
  })

  it('stages a file and retrieves it', async () => {
    const response = new Response('test data')
    await stageFile('/dataset/surah-1.json', response)

    const result = await getStagedResponse('/dataset/surah-1.json')
    expect(result).toBeDefined()
  })

  it('lists staged URLs', async () => {
    await stageFile('/dataset/surah-1.json', new Response('a'))
    await stageFile('/dataset/surah-2.json', new Response('b'))

    const urls = await listStagedUrls()
    expect(urls).toHaveLength(2)
    expect(urls).toContain('/dataset/surah-1.json')
    expect(urls).toContain('/dataset/surah-2.json')
  })

  it('deletes staging cache', async () => {
    await stageFile('/dataset/surah-1.json', new Response('a'))
    await deleteStaging()

    expect(caches.delete).toHaveBeenCalledWith('quran-dataset-staging')
  })

  it('copies staged files to live cache', async () => {
    await stageFile('/dataset/surah-1.json', new Response('live data'))

    await copyToLive()

    const liveCache = await caches.open('quran-dataset-v1')
    const result = await liveCache.match('/dataset/surah-1.json')
    expect(result).toBeDefined()
  })
})
