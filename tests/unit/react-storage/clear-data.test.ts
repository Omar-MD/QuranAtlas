import { describe, expect, it, vi } from 'vitest'

import { clearReactApplicationData } from '../../../src/storage/clear-data'

describe('React clear-data helper', () => {
  it('clears browser storage, Cache Storage, and the shared IndexedDB database', async () => {
    const deletedCaches: string[] = []
    vi.stubGlobal('caches', {
      keys: async () => ['quran-atlas-react-runtime-dataset-v1', 'quran-atlas-search-pack-0123456789abcdef'],
      delete: async (name: string) => {
        deletedCaches.push(name)
        return true
      },
    })

    await clearReactApplicationData()

    expect(deletedCaches).toEqual(['quran-atlas-react-runtime-dataset-v1', 'quran-atlas-search-pack-0123456789abcdef'])
  })
})
