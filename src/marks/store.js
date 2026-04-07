/**
 * IDB CRUD for marks.
 * All mark persistence flows through this module.
 * Emits marks:saved and marks:deleted via core/events.
 */

import { getDb } from '../core/db.js'
import { emit } from '../core/events.js'

/**
 * Save (create or update) a mark.
 * @param {string} verseKey - e.g. '2:255'
 * @param {string[]} tags - lowercased tag labels
 */
export async function save(verseKey, tags) {
  const db = await getDb()
  const existing = await getByVerseKey(verseKey)
  const now = Date.now()

  const record = {
    verseKey,
    tags,
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

  emit('marks:saved', { verseKey, tags })
}

/**
 * Delete a mark by verseKey.
 * @param {string} verseKey
 */
export async function del(verseKey) {
  const db = await getDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readwrite')
    const store = tx.objectStore('marks')
    const request = store.delete(verseKey)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })

  emit('marks:deleted', { verseKey })
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

/**
 * Remove a tag from all marks that have it (cascade on tag deletion).
 * Marks with no remaining tags are kept (untagged).
 * @param {string} tag - lowercased tag label
 */
export async function removeTagFromAll(tag) {
  const marks = await getByTag(tag)
  const db = await getDb()

  await new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readwrite')
    const store = tx.objectStore('marks')

    let remaining = marks.length
    if (remaining === 0) { resolve(); return }

    for (const mark of marks) {
      mark.tags = mark.tags.filter(t => t !== tag)
      mark.updatedAt = Date.now()
      const request = store.put(mark)
      request.onsuccess = () => {
        remaining--
        if (remaining === 0) resolve()
      }
      request.onerror = () => reject(request.error)
    }
  })
}
