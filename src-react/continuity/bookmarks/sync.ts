import type { Riwayah } from '../../storage/types'

export type BookmarkSyncMessage = {
  type: 'bookmarks:changed'
  riwayah: Riwayah
  verseKey: string
}

export function createBookmarkSyncMessage(riwayah: Riwayah, verseKey: string): BookmarkSyncMessage {
  return { type: 'bookmarks:changed', riwayah, verseKey }
}
