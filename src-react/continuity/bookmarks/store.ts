import type { QuranAtlasReactDb } from '../../storage/db'
import type { BookmarkRecord, Riwayah } from '../../storage/types'

export async function toggleBookmark(db: QuranAtlasReactDb, bookmark: BookmarkRecord): Promise<'saved' | 'deleted'> {
  const existing = await db.bookmarks.get([bookmark.riwayah, bookmark.verseKey])
  if (existing) {
    await db.bookmarks.delete([bookmark.riwayah, bookmark.verseKey])
    return 'deleted'
  }
  await db.bookmarks.put(bookmark)
  return 'saved'
}

export async function listBookmarks(db: QuranAtlasReactDb, riwayah: Riwayah): Promise<BookmarkRecord[]> {
  return db.bookmarks.where('riwayah').equals(riwayah).toArray()
}
