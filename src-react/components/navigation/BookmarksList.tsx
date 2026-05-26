import { Button } from '../ui'

export type BookmarkListItem = { riwayah: string; surah: number; verseKey: string }

export function BookmarksList({ bookmarks = [], onNavigate }: { bookmarks?: BookmarkListItem[]; onNavigate?: (hash: string) => void }) {
  if (bookmarks.length === 0) {
    return <p className="qar:m-0 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-3 qar:text-sm qar:text-muted">No bookmarks for the active riwayah.</p>
  }
  return (
    <div className="qar:grid qar:gap-2" aria-label="Bookmarks">
      {bookmarks.map((bookmark) => (
        <div className="qar:flex qar:items-center qar:justify-between qar:border-b qar:border-border qar:py-2" key={`${bookmark.riwayah}:${bookmark.verseKey}`}>
          <span className="qar:text-sm">{bookmark.riwayah} · {bookmark.verseKey}</span>
          <Button onClick={() => onNavigate?.(`#/s/${bookmark.surah}/${bookmark.verseKey.split(':')[1]}`)} size="sm" variant="secondary">Jump</Button>
        </div>
      ))}
    </div>
  )
}
