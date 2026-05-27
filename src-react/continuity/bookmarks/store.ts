import type { QuranAtlasReactDb } from '../../storage/db'
import type { BookmarkRecord, Riwayah } from '../../storage/types'

export type BookmarkIdentity = Pick<BookmarkRecord, 'riwayah' | 'verseKey'>

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
  const rows = await db.bookmarks.where('riwayah').equals(riwayah).toArray()
  return rows.sort((a, b) => a.surah - b.surah || verseNumber(a.verseKey) - verseNumber(b.verseKey))
}

export async function deleteBookmark(db: QuranAtlasReactDb, bookmark: BookmarkIdentity): Promise<void> {
  await db.bookmarks.delete([bookmark.riwayah, bookmark.verseKey])
}

function verseNumber(verseKey: string): number {
  const [, verse] = verseKey.split(':')
  const parsed = Number(verse)
  return Number.isFinite(parsed) ? parsed : 0
}
