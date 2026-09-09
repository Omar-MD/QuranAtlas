import type { QuranAtlasReactDb } from '../../storage/db'
import type { BookmarkRecord } from '../../storage/types'
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

export async function deleteBookmark(db: QuranAtlasReactDb, bookmark: BookmarkIdentity): Promise<void> {
  await db.bookmarks.delete([bookmark.riwayah, bookmark.verseKey])
  broadcastBookmarkChange([bookmark.verseKey], bookmark.riwayah)
}
