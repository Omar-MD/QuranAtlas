/**
 * IDB CRUD for marks.
 * All mark persistence flows through this module.
 * Emits marks:saved and marks:deleted via core/events.
 */

import { getDb } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import { broadcastMarkChange } from '../safety/sync.js'

export type Mark = {
  verseKey: string
  tags: string[]
  note: string
  createdAt: number
  updatedAt: number
}

/**
 * Save (create or update) a mark.
 * @param verseKey - e.g. '2:255'
 * @param tags - lowercased tag labels
 * @param note - optional free-text note
 * @throws {Error} If IDB operation fails
 */
export async function save(verseKey: string, tags: string[], note = ''): Promise<void> {
  try {
    const db = await getDb()
    const existing = await getByVerseKey(verseKey)
    const now = Date.now()

    const record: Mark = {
      verseKey,
      tags,
      note,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    }

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('marks', 'readwrite')
      const store = tx.objectStore('marks')
      const request = store.put(record)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    emit(Events.MARKS_SAVED, { verseKey, tags })
    broadcastMarkChange([verseKey])
  } catch (error) {
    logger.error('Failed to save mark:', { verseKey, error })
    emit(Events.MARKS_SAVE_FAILED, { verseKey, error: (error as Error).message })
    throw error
  }
}

/**
 * Delete a mark by verseKey.
 * @param verseKey
 * @throws {Error} If IDB operation fails
 */
export async function del(verseKey: string): Promise<void> {
  try {
    const db = await getDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('marks', 'readwrite')
      const store = tx.objectStore('marks')
      const request = store.delete(verseKey)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    emit(Events.MARKS_DELETED, { verseKey })
    broadcastMarkChange([verseKey])
  } catch (error) {
    logger.error('Failed to delete mark:', { verseKey, error })
    throw error
  }
}

/**
 * Get a single mark by verseKey.
 */
export async function getByVerseKey(verseKey: string): Promise<Mark | undefined> {
  const db = await getDb()
  return new Promise<Mark | undefined>((resolve, reject) => {
    const tx = db.transaction('marks', 'readonly')
    const store = tx.objectStore('marks')
    const request = store.get(verseKey)
    request.onsuccess = () => resolve(request.result as Mark | undefined)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all marks.
 */
export async function getAll(): Promise<Mark[]> {
  const db = await getDb()
  return new Promise<Mark[]>((resolve, reject) => {
    const tx = db.transaction('marks', 'readonly')
    const store = tx.objectStore('marks')
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result as Mark[])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all marks with a specific tag using the by-tag index.
 * @param tag - lowercased tag label
 */
export async function getByTag(tag: string): Promise<Mark[]> {
  const db = await getDb()
  return new Promise<Mark[]>((resolve, reject) => {
    const tx = db.transaction('marks', 'readonly')
    const store = tx.objectStore('marks')
    const index = store.index('by-tag')
    const request = index.getAll(tag)
    request.onsuccess = () => resolve(request.result as Mark[])
    request.onerror = () => reject(request.error)
  })
}
