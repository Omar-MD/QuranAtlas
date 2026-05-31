import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useSavedSearches } from '../../../src/components/search/useSavedSearches'
import { closeReactDb, openReactDb } from '../../../src/storage/db'
import { QURAN_ATLAS_DB_NAME } from '../../../src/storage/schema'

async function resetReactDb() {
  closeReactDb()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(QURAN_ATLAS_DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
}

describe('saved searches', () => {
  afterEach(async () => {
    await resetReactDb()
  })

  it('creates, loads, renames, and deletes query definitions only', async () => {
    await resetReactDb()
    const { result } = renderHook(() => useSavedSearches())

    let savedId = ''
    await act(async () => {
      const saved = await result.current.saveSearch({
        mode: 'phrase',
        packCompatibilityKey: 'pack-v1',
        query: 'الرحمن الرحيم',
        sort: 'mushaf-order',
      })
      savedId = saved?.id ?? ''
    })

    await waitFor(() => expect(result.current.records).toHaveLength(1))
    expect(result.current.records[0].intent).toMatchObject({
      queryText: 'الرحمن الرحيم',
      queryMode: 'phrase',
      sourceLanes: ['arabic-text'],
      sort: 'mushaf-order',
      compatiblePackRequirements: { requiredFeatures: ['core', 'phrase'] },
    })

    const stored = await (await openReactDb()).savedSearches.get(savedId)
    expect(stored).not.toHaveProperty('results')
    expect(stored).not.toHaveProperty('exploreSectionIds')
    expect(stored).not.toHaveProperty('sourceCorpusSnapshot')

    await act(async () => {
      await result.current.openSearch(savedId)
    })
    await waitFor(() => expect(result.current.status).toMatch(/Loaded saved search/))
    expect(result.current.records[0].lastOpenedAt).toEqual(expect.any(Number))

    await act(async () => {
      await result.current.renameSearch(savedId, 'Opening phrase')
    })
    await waitFor(() => expect(result.current.records[0].intent.name).toBe('Opening phrase'))

    await act(async () => {
      await result.current.deleteSearch(savedId)
    })
    await waitFor(() => expect(result.current.records).toHaveLength(0))
  })

  it('keeps incompatible saved searches readable in storage', async () => {
    await resetReactDb()
    const db = await openReactDb()
    await db.savedSearches.put({
      id: 'old-pack',
      schemaVersion: 1,
      intent: {
        schemaVersion: 1,
        id: 'old-pack',
        name: 'Old pack query',
        queryText: 'mercy',
        queryMode: 'translation',
        queryAstVersion: 1,
        filters: { sourceLane: ['translation'] },
        sourceLanes: ['translation'],
        sort: 'relevance',
        compatiblePackRequirements: { packAbiMajor: 1, normalizerVersion: 1, requiredFeatures: ['core'] },
        displayPreferences: { showSourceNotes: true },
        createdAt: 1,
        updatedAt: 1,
        lastOpenedAt: null,
      },
      packCompatibilityKey: 'old-pack',
      createdAt: 1,
      updatedAt: 1,
      lastOpenedAt: null,
      lastRunAt: null,
    })

    const { result } = renderHook(() => useSavedSearches())

    await waitFor(() => expect(result.current.records[0].packCompatibilityKey).toBe('old-pack'))
    expect(result.current.records[0].intent.queryText).toBe('mercy')
  })
})
