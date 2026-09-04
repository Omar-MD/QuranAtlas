import { useCallback, useEffect, useState } from 'react'

import type { SavedSearchIntentV1 } from '../../../shared/search'
import { parseSearchQuery } from '../../search/query-parser'
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
  const [lastDeleted, setLastDeleted] = useState<SavedSearchRecord | null>(null)

  useEffect(() => {
    if (!status) return undefined
    const timeout = window.setTimeout(() => setStatus(''), 4000)
    return () => window.clearTimeout(timeout)
  }, [status])

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
    try {
      parseSearchQuery(query, { mode: input.mode })
    } catch {
      setStatus('Search is not valid to save')
      return null
    }
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
    setLastDeleted(null)
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
    setLastDeleted(null)
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
    setLastDeleted(null)
    setStatus(`Renamed saved search ${nextName}`)
    await refresh()
  }, [refresh])

  const deleteSearch = useCallback(async (id: string) => {
    const db = await openReactDb()
    const record = await db.savedSearches.get(id)
    if (!record) return
    await db.savedSearches.delete(id)
    setLastDeleted(record)
    setStatus(`Deleted saved search ${record.intent.name}`)
    await refresh()
  }, [refresh])

  const undoDelete = useCallback(async () => {
    if (!lastDeleted) return
    const db = await openReactDb()
    const restored = { ...lastDeleted, updatedAt: Date.now() }
    await db.savedSearches.put(restored)
    setLastDeleted(null)
    setStatus(`Restored saved search ${lastDeleted.intent.name}`)
    await refresh()
  }, [lastDeleted, refresh])

  return {
    deleteSearch,
    lastDeleted,
    openSearch,
    records,
    refresh,
    renameSearch,
    saveSearch,
    status,
    undoDelete,
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `saved-search-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
