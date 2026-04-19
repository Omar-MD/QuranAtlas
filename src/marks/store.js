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

/**
 * Save (create or update) a mark.
 * @param {string} verseKey - e.g. '2:255'
 * @param {string[]} tags - lowercased tag labels
 * @param {string} [note] - optional free-text note
 * @throws {Error} If IDB operation fails
 */
export async function save(verseKey, tags, note = '') {
  try {
    const db = await getDb()
    const existing = await getByVerseKey(verseKey)
    const now = Date.now()

    const record = {
      verseKey,
      tags,
      note,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    }

    await new Promise((resolve, reject) => {
      const tx = db.transaction('marks', 'readwrite')
      const store = tx.objectStore('marks')
      const request = store.put(record)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    emit(Events.MARKS_SAVED, /** @type {import('../core/constants.js').MarksSavedPayload} */({ verseKey, tags }))
    broadcastMarkChange([verseKey])
  } catch (error) {
    logger.error('Failed to save mark:', { verseKey, error })
    emit(Events.MARKS_SAVE_FAILED, { verseKey, error: error.message })
    throw error
  }
}

/**
 * Delete a mark by verseKey.
 * @param {string} verseKey
 * @throws {Error} If IDB operation fails
 */
export async function del(verseKey) {
  try {
    const db = await getDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('marks', 'readwrite')
      const store = tx.objectStore('marks')
      const request = store.delete(verseKey)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    emit(Events.MARKS_DELETED, /** @type {import('../core/constants.js').MarksDeletedPayload} */({ verseKey }))
    broadcastMarkChange([verseKey])
  } catch (error) {
    logger.error('Failed to delete mark:', { verseKey, error })
    throw error
  }
}

/**
 * Get a single mark by verseKey.
 * @param {string} verseKey
 * @returns {Promise<{verseKey: string, tags: string[], createdAt: number, updatedAt: number} | undefined>}
 */
export async function getByVerseKey(verseKey) {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readonly')
    const store = tx.objectStore('marks')
    const request = store.get(verseKey)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all marks.
 * @returns {Promise<Array>}
 */
export async function getAll() {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readonly')
    const store = tx.objectStore('marks')
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all marks with a specific tag using the by-tag index.
 * @param {string} tag - lowercased tag label
 * @returns {Promise<Array>}
 */
export async function getByTag(tag) {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readonly')
    const store = tx.objectStore('marks')
    const index = store.index('by-tag')
    const request = index.getAll(tag)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

