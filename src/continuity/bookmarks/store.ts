import type { QuranAtlasReactDb } from '../../storage/db'
import type { BookmarkRecord, Riwayah } from '../../storage/types'
import { isMushafPageBookmark, pageNumberForBookmark } from './page-bookmark'
import { broadcastBookmarkChange } from './sync'

export type BookmarkIdentity = Pick<BookmarkRecord, 'riwayah' | 'verseKey'>
export type BookmarkInput = Pick<BookmarkRecord, 'riwayah' | 'verseKey' | 'surah'> &
  Partial<Pick<BookmarkRecord, 'createdAt' | 'kind' | 'page'>>

export async function toggleBookmark(db: QuranAtlasReactDb, bookmark: BookmarkInput): Promise<'saved' | 'deleted'> {
  const existing = await db.bookmarks.get([bookmark.riwayah, bookmark.verseKey])
  if (existing) {
    await db.bookmarks.delete([bookmark.riwayah, bookmark.verseKey])
    broadcastBookmarkChange([bookmark.verseKey], bookmark.riwayah)
    return 'deleted'
  }
  await db.bookmarks.put({ ...bookmark, createdAt: bookmark.createdAt ?? Date.now() })
  broadcastBookmarkChange([bookmark.verseKey], bookmark.riwayah)
  return 'saved'
}

export async function listBookmarks(db: QuranAtlasReactDb, riwayah: Riwayah): Promise<BookmarkRecord[]> {
  const rows = await db.bookmarks.where('riwayah').equals(riwayah).toArray()
  return rows.sort(compareBookmarks)
}

export async function deleteBookmark(db: QuranAtlasReactDb, bookmark: BookmarkIdentity): Promise<void> {
  await db.bookmarks.delete([bookmark.riwayah, bookmark.verseKey])
  broadcastBookmarkChange([bookmark.verseKey], bookmark.riwayah)
}

function verseNumber(verseKey: string): number {
  const [, verse] = verseKey.split(':')
  const parsed = Number(verse)
  return Number.isFinite(parsed) ? parsed : 0
}

function compareBookmarks(a: BookmarkRecord, b: BookmarkRecord): number {
  const aIsPage = isMushafPageBookmark(a)
  const bIsPage = isMushafPageBookmark(b)
  if (aIsPage || bIsPage) {
    if (aIsPage && bIsPage) return (pageNumberForBookmark(a) ?? 0) - (pageNumberForBookmark(b) ?? 0)
    return aIsPage ? 1 : -1
  }
  return a.surah - b.surah || verseNumber(a.verseKey) - verseNumber(b.verseKey)
}
