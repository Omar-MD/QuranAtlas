/**
 * IDB CRUD for bookmarks (DB v5).
 *
 * Bookmarks are riwayah-scoped: switching riwayah surfaces a different set.
 * The store keyPath is the compound `[riwayah, verseKey]`, so the same
 * verseKey can hold a separate bookmark per riwayah.
 *
 * All bookmark persistence flows through this module.
 * Emits bookmarks:saved / bookmarks:deleted via core/events.
 */

import { getDb, put } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import { broadcastBookmarkChange } from '../safety/sync.js'
import type { BookmarkRecord, Riwayah } from '../core/db.js'

export type Bookmark = BookmarkRecord

function surahFromVerseKey(verseKey: string): number {
  return parseInt(verseKey.split(':')[0] ?? '0', 10)
}

/**
 * Add a bookmark. No-op if one already exists for the same (verseKey, riwayah).
 */
export async function add(verseKey: string, riwayah: Riwayah): Promise<void> {
  try {
    const surah = surahFromVerseKey(verseKey)
    const record: BookmarkRecord = {
      riwayah,
      verseKey,
      surah,
      createdAt: Date.now(),
    }
    await put('bookmarks', record)
    emit(Events.BOOKMARKS_SAVED, { verseKey, riwayah })
    broadcastBookmarkChange([verseKey], riwayah)
  } catch (error) {
    logger.error('Failed to save bookmark:', { verseKey, riwayah, error })
    emit(Events.BOOKMARKS_SAVE_FAILED, { verseKey, riwayah, error: (error as Error).message })
    throw error
  }
}

/**
 * Delete a bookmark by (verseKey, riwayah). No-op if it doesn't exist.
 */
export async function del(verseKey: string, riwayah: Riwayah): Promise<void> {
  try {
    const db = await getDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('bookmarks', 'readwrite')
      const request = tx.objectStore('bookmarks').delete([riwayah, verseKey])
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    emit(Events.BOOKMARKS_DELETED, { verseKey, riwayah })
    broadcastBookmarkChange([verseKey], riwayah)
  } catch (error) {
    logger.error('Failed to delete bookmark:', { verseKey, riwayah, error })
    throw error
  }
}

/**
 * Toggle a bookmark. Returns the new state (true = bookmarked, false = removed).
 */
export async function toggle(verseKey: string, riwayah: Riwayah): Promise<boolean> {
  const existing = await getOne(verseKey, riwayah)
  if (existing) {
    await del(verseKey, riwayah)
    return false
  }
  await add(verseKey, riwayah)
  return true
}

/**
 * Get a single bookmark by (verseKey, riwayah).
 */
export async function getOne(verseKey: string, riwayah: Riwayah): Promise<Bookmark | undefined> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('bookmarks', 'readonly')
    const request = tx.objectStore('bookmarks').get([riwayah, verseKey])
    request.onsuccess = () => resolve(request.result as Bookmark | undefined)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all bookmarks for the active riwayah, sorted by canonical (surah, verse).
 */
export async function getAllForRiwayah(riwayah: Riwayah): Promise<Bookmark[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('bookmarks', 'readonly')
    const index = tx.objectStore('bookmarks').index('by-riwayah')
    const request = index.getAll(riwayah)
    request.onsuccess = () => {
      const list = (request.result as Bookmark[]).slice().sort(byCanonical)
      resolve(list)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all bookmarks for the active riwayah grouped by surah.
 * Surahs are returned in canonical (ascending) order; verses within each
 * surah are also ascending.
 */
export async function getGroupedForRiwayah(riwayah: Riwayah): Promise<Map<number, Bookmark[]>> {
  const all = await getAllForRiwayah(riwayah)
  const grouped = new Map<number, Bookmark[]>()
  for (const b of all) {
    const arr = grouped.get(b.surah) ?? []
    arr.push(b)
    grouped.set(b.surah, arr)
  }
  return new Map([...grouped.entries()].sort((a, b) => a[0] - b[0]))
}

function byCanonical(a: Bookmark, b: Bookmark): number {
  if (a.surah !== b.surah) { return a.surah - b.surah }
  const av = parseInt(a.verseKey.split(':')[1] ?? '0', 10)
  const bv = parseInt(b.verseKey.split(':')[1] ?? '0', 10)
  return av - bv
}
