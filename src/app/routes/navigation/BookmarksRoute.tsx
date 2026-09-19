import { useEffect, useState } from 'react'

import { SettingsShell } from '../../../components/settings/SettingsShell'
import { BookmarkUndoToast, BookmarksList, type BookmarkListItem } from '../../../components/navigation/BookmarksList'
import { Button, Status } from '../../../components/ui'
import { useSharedBookmarks } from '../../../continuity/bookmarks/use-bookmarks'

const UNDO_TOAST_MS = 5000

// S7 bookmarks: an overlay above the reader (desktop dialog, mobile
// full-screen cover) with immediate remove + 5 s undo toast, ۞ empty state,
// and row skeletons. Closing returns to the reader behind it.
export function BookmarksRoute({
  onClose,
  onNavigate,
  returnFocusId,
}: {
  onClose: () => void
  onNavigate: (hash: string) => void
  returnFocusId?: string
}) {
  const { bookmarks, deleteBookmark, toggleBookmark, retry, status } = useSharedBookmarks()
  const [undoTarget, setUndoTarget] = useState<BookmarkListItem | null>(null)

  useEffect(() => {
    if (!undoTarget) return undefined
    const timer = window.setTimeout(() => setUndoTarget(null), UNDO_TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [undoTarget])

  function handleDelete(bookmark: BookmarkListItem) {
    setUndoTarget(bookmark)
    void deleteBookmark({ riwayah: bookmark.riwayah, verseKey: bookmark.verseKey })
  }

  function handleUndo() {
    const bookmark = undoTarget
    setUndoTarget(null)
    if (!bookmark) return
    void toggleBookmark({
      kind: bookmark.kind ?? (bookmark.verseKey.includes(':') ? 'verse' : 'verse'),
      page: bookmark.page,
      riwayah: bookmark.riwayah,
      surah: bookmark.surah,
      verseKey: bookmark.verseKey,
    })
  }

  return (
    <SettingsShell
      closeLabel="Close bookmarks"
      onClose={onClose}
      returnFocusId={returnFocusId}
      subtitle=""
      title="Bookmarks"
    >
      <div className="qar:mx-auto qar:w-full qar:max-w-page">
        {status === 'loading' ? (
          <div aria-label="Loading bookmarks" aria-live="polite" data-bookmarks-loading="true" role="status">
            {/* 3 single-line row skeletons (S7): bookmark rows are one line. */}
            {[0, 1, 2].map((row) => (
              <div className="qar:grid qar:gap-2 qar:py-2" key={row}>
                <div className="qar-reader-skeleton-bar" style={{ width: '62%' }} />
              </div>
            ))}
          </div>
        ) : status === 'error' ? (
          <Status action={<Button onClick={retry}>Try again</Button>} title="Bookmarks unavailable." tone="error" />
        ) : (
          <>
            <BookmarksList bookmarks={bookmarks} onDeleteBookmark={handleDelete} onNavigate={onNavigate} />
            {undoTarget ? (
              <div className="qar:sticky qar:bottom-4 qar:mt-4">
                <BookmarkUndoToast onUndo={handleUndo} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </SettingsShell>
  )
}
