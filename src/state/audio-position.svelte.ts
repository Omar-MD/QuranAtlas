// Sole writer for the `audioPosition` IDB store. Per data-model.md
// cross-cutting invariant, only this module writes the store; all other
// audio modules read it via `loadPosition()` and call into the writer
// via `savePosition()` / `removePosition()`.
//
// Schema:
//   id: `${reciter}:${surah}` (string, primary key)
//   reciter: string
//   surah: number
//   ayah: number
//   ms: number
//   lastPlayedAt: number (epoch ms)
//
// LRU 50-entry cap enforced by the writer (audit C-8 storage hygiene):
// when a save would push the row count past 50, the oldest by
// `lastPlayedAt` is evicted in the same transaction. Write throttling
// (debounce on verse-change + 10s ticker) lives in `state/audio.svelte.ts`
// because the runtime player owns the timing source; this module is the
// idempotent bottom-of-stack that just persists what it's given.

import { getDb, get, put, del } from '../core/db'
import type { AudioPositionRecord } from '../core/db/types'
import { logger } from '../core/logger'

const STORE = 'audioPosition'
const MAX_ROWS = 50

export function makeId(reciter: string, surah: number): string {
  return `${reciter}:${surah}`
}

export async function loadPosition(reciter: string, surah: number): Promise<AudioPositionRecord | null> {
  try {
    const rec = await get(STORE, makeId(reciter, surah))
    return (rec as AudioPositionRecord | undefined) ?? null
  } catch (error) {
    logger.error('Failed to load audioPosition:', { reciter, surah, error })
    return null
  }
}

export async function loadMostRecent(): Promise<AudioPositionRecord | null> {
  try {
    const db = await getDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const idx = store.index('by-last-played-at')
      // Open in descending order; first cursor entry is the most recent.
      const request = idx.openCursor(null, 'prev')
      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result
        resolve(cursor ? (cursor.value as AudioPositionRecord) : null)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    logger.error('Failed to load most-recent audioPosition:', { error })
    return null
  }
}

export async function savePosition(record: Omit<AudioPositionRecord, 'id'>): Promise<boolean> {
  try {
    const id = makeId(record.reciter, record.surah)
    const full: AudioPositionRecord = { id, ...record }
    await put(STORE, full)
    void enforceLruCap().catch(() => undefined)
    return true
  } catch (error) {
    logger.error('Failed to save audioPosition:', { record, error })
    return false
  }
}

export async function removePosition(reciter: string, surah: number): Promise<boolean> {
  try {
    await del(STORE, makeId(reciter, surah))
    return true
  } catch (error) {
    logger.error('Failed to delete audioPosition:', { reciter, surah, error })
    return false
  }
}

async function enforceLruCap(): Promise<void> {
  try {
    const db = await getDb()
    const all: AudioPositionRecord[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result as AudioPositionRecord[])
      request.onerror = () => reject(request.error)
    })
    if (all.length <= MAX_ROWS) { return }
    // Sort ascending; the first (length - MAX_ROWS) are oldest and get evicted.
    all.sort((a, b) => a.lastPlayedAt - b.lastPlayedAt)
    const toEvict = all.slice(0, all.length - MAX_ROWS)
    for (const row of toEvict) {
      await del(STORE, row.id)
    }
  } catch (error) {
    logger.warn('audioPosition LRU eviction failed:', { error })
  }
}

/** Test-only helper for clearing the store between tests. */
export async function clearAllPositions(): Promise<void> {
  try {
    const db = await getDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    logger.warn('audioPosition clear failed:', { error })
  }
}
