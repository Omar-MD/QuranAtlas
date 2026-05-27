import { Button } from '../ui'
import type { Riwayah } from '../../storage/types'

export type BookmarkListItem = { createdAt?: number; riwayah: Riwayah; surah: number; verseKey: string }

export function BookmarksList({
  bookmarks = [],
  onDeleteBookmark,
  onNavigate,
}: {
  bookmarks?: BookmarkListItem[]
  onDeleteBookmark?: (bookmark: Pick<BookmarkListItem, 'riwayah' | 'verseKey'>) => void
  onNavigate?: (hash: string) => void
}) {
  if (bookmarks.length === 0) {
    return <p className="qar:m-0 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-3 qar:text-sm qar:text-muted">No bookmarks for the active riwayah.</p>
  }
  return (
    <div className="qar:grid qar:gap-2" aria-label="Bookmarks">
      {bookmarks.map((bookmark) => (
        <div className="qar:flex qar:items-center qar:justify-between qar:border-b qar:border-border qar:py-2" key={`${bookmark.riwayah}:${bookmark.verseKey}`}>
          <span className="qar:text-sm">{bookmark.riwayah} · {bookmark.verseKey}</span>
          <div className="qar:flex qar:gap-2">
            <Button aria-label={`Jump to ${bookmark.verseKey}`} onClick={() => onNavigate?.(`#/s/${bookmark.surah}/${bookmark.verseKey.split(':')[1]}`)} size="sm" variant="secondary">Jump</Button>
            <Button aria-label={`Delete bookmark ${bookmark.verseKey}`} onClick={() => onDeleteBookmark?.({ riwayah: bookmark.riwayah, verseKey: bookmark.verseKey })} size="sm" variant="ghost">Delete</Button>
          </div>
        </div>
      ))}
    </div>
  )
}
