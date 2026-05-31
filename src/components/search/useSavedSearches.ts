import { useCallback, useEffect, useState } from 'react'

import type { SavedSearchIntentV1 } from '../../../shared/search'
import type { SearchQueryMode, SearchSort } from '../../search/schema'
import { openReactDb } from '../../storage/db'
import type { SavedSearchRecord } from '../../storage/types'
import { sourceLaneForMode } from './search-labels'

export type SavedSearchInput = {
  mode: SearchQueryMode
  name?: string
  packCompatibilityKey?: string
  query: string
  sort?: SearchSort
}

export function useSavedSearches() {
  const [records, setRecords] = useState<SavedSearchRecord[]>([])
  const [status, setStatus] = useState('')

  const refresh = useCallback(async () => {
    const db = await openReactDb()
    const saved = await db.savedSearches.orderBy('updatedAt').reverse().toArray()
    setRecords(saved)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveSearch = useCallback(async (input: SavedSearchInput) => {
    const query = input.query.trim()
    if (!query) return null
    const db = await openReactDb()
    const now = Date.now()
    const id = createId()
    const name = input.name?.trim() || query
    const sourceLanes = sourceLaneForMode(input.mode)
    const intent: SavedSearchIntentV1 = {
      schemaVersion: 1,
      id,
      name,
      queryText: query,
      queryMode: input.mode,
      queryAstVersion: 1,
      filters: { sourceLane: sourceLanes },
      sourceLanes,
      sort: input.sort ?? 'relevance',
      compatiblePackRequirements: {
        packAbiMajor: 1,
        normalizerVersion: 1,
        requiredFeatures: input.mode === 'phrase' ? ['core', 'phrase'] : ['core'],
      },
      displayPreferences: { showSourceNotes: true },
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: null,
    }
    const record: SavedSearchRecord = {
      id,
      schemaVersion: 1,
      intent,
      packCompatibilityKey: input.packCompatibilityKey ?? 'search-pack-abi-1-normalizer-1',
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastRunAt: null,
    }
    await db.savedSearches.put(record)
    setStatus(`Saved search ${name}`)
    await refresh()
    return record
  }, [refresh])

  const openSearch = useCallback(async (id: string) => {
    const db = await openReactDb()
    const record = await db.savedSearches.get(id)
    if (!record) return null
    const opened: SavedSearchRecord = {
      ...record,
      intent: { ...record.intent, lastOpenedAt: Date.now() },
      lastOpenedAt: Date.now(),
      lastRunAt: Date.now(),
      updatedAt: record.updatedAt,
    }
    await db.savedSearches.put(opened)
    setStatus(`Loaded saved search ${record.intent.name}`)
    await refresh()
    return opened
  }, [refresh])

  const renameSearch = useCallback(async (id: string, name: string) => {
    const db = await openReactDb()
    const record = await db.savedSearches.get(id)
    const nextName = name.trim()
    if (!record || !nextName) return
    const now = Date.now()
    await db.savedSearches.put({
      ...record,
      intent: { ...record.intent, name: nextName, updatedAt: now },
      updatedAt: now,
    })
    setStatus(`Renamed saved search ${nextName}`)
    await refresh()
  }, [refresh])

  const deleteSearch = useCallback(async (id: string) => {
    const db = await openReactDb()
    await db.savedSearches.delete(id)
    setStatus('Deleted saved search')
    await refresh()
  }, [refresh])

  return {
    deleteSearch,
    openSearch,
    records,
    refresh,
    renameSearch,
    saveSearch,
    status,
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `saved-search-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
