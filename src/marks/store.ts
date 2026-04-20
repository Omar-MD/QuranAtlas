/**
 * IDB CRUD for marks (v2 — 12-layer schema).
 * All mark persistence flows through this module.
 * Emits marks:saved and marks:deleted via core/events.
 */

import { getDb } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import { broadcastMarkChange } from '../safety/sync.js'
import { canonicalize } from '../core/normalize.js'
import type { LayerName, MarkRecord } from '../core/db.js'
import { LAYER_NAMES } from '../core/db.js'

export type Mark = MarkRecord

export interface MarkInput {
  verseKey: string
  threads: string[]
  subjects: string[]
  audience: string[]
  speaker: string[]
  quotedSpeaker: string[]
  mode: string[]
  form: string[]
  tone: string[]
  people: string[]
  places: string[]
  events: string[]
  divineNames: string[]
  flags: { hasQuestion?: boolean; hasApplication?: boolean }
  note: string
}

function computeCanon(input: MarkInput): Record<LayerName, string[]> {
  const out = {} as Record<LayerName, string[]>
  for (const layer of LAYER_NAMES) {
    out[layer] = input[layer].map(canonicalize)
  }
  return out
}

function allCanonicalTags(canon: Record<LayerName, string[]>): string[] {
  const all: string[] = []
  for (const layer of LAYER_NAMES) {
    for (const v of canon[layer]) {
      all.push(v)
    }
  }
  return all
}

/**
 * Save (create or update) a mark.
 * Computes _canon inside the writer; callers never populate _canon.
 * @throws {Error} If IDB operation fails
 */
export async function save(input: MarkInput): Promise<void> {
  try {
    const existing = await getByVerseKey(input.verseKey)
    const now = Date.now()
    const _canon = computeCanon(input)
    const record: MarkRecord = {
      ...input,
      _canon,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    }
    const db = await getDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('marks', 'readwrite')
      const request = tx.objectStore('marks').put(record)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    emit(Events.MARKS_SAVED, {
      verseKey: input.verseKey,
      tags: allCanonicalTags(_canon),
    })
    broadcastMarkChange([input.verseKey])
  } catch (error) {
    logger.error('Failed to save mark:', { verseKey: input.verseKey, error })
    emit(Events.MARKS_SAVE_FAILED, { verseKey: input.verseKey, error: (error as Error).message })
    throw error
  }
}

/**
 * Delete a mark by verseKey.
 * @throws {Error} If IDB operation fails
 */
export async function del(verseKey: string): Promise<void> {
  try {
    const db = await getDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('marks', 'readwrite')
      const request = tx.objectStore('marks').delete(verseKey)
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
  return new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readonly')
    const request = tx.objectStore('marks').get(verseKey)
    request.onsuccess = () => resolve(request.result as Mark | undefined)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all marks.
 */
export async function getAll(): Promise<Mark[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readonly')
    const request = tx.objectStore('marks').getAll()
    request.onsuccess = () => resolve(request.result as Mark[])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all marks with a specific canonical value on a given layer.
 * Replaces the old getByTag() which used the by-tag index.
 */
export async function getByLayerCanonical(layer: LayerName, canonical: string): Promise<Mark[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readonly')
    const index = tx.objectStore('marks').index(`by-canon-${layer}`)
    const request = index.getAll(canonical)
    request.onsuccess = () => resolve(request.result as Mark[])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all unique canonical values used in a specific layer (index-only cursor).
 * Fast even at 500+ marks — no record deserialization.
 */
export async function getAllCanonicalValues(layer: LayerName): Promise<string[]> {
  const db = await getDb()
  const tags = new Set<string>()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readonly')
    const index = tx.objectStore('marks').index(`by-canon-${layer}`)
    const request = index.openKeyCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        tags.add(String(cursor.key))
        cursor.continue()
      } else {
        resolve([...tags].sort())
      }
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Legacy compat: get all marks with a specific tag (searches threads layer by canonical).
 * @deprecated Use getByLayerCanonical('threads', tag) instead.
 */
export async function getByTag(tag: string): Promise<Mark[]> {
  return getByLayerCanonical('threads', canonicalize(tag))
}
