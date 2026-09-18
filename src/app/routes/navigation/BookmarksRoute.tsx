import { useEffect, useState } from 'react'

import { NavigationPageRecipe } from '../../../design-system/recipes/navigation-page'
import { BookmarkUndoToast, BookmarksList, type BookmarkListItem } from '../../../components/navigation/BookmarksList'
import { Button, Status } from '../../../components/ui'
import { useSharedBookmarks } from '../../../continuity/bookmarks/use-bookmarks'

const UNDO_TOAST_MS = 5000

// S7 bookmarks route: full route on desktop (68 ch measure) and mobile, with
// immediate remove + 5 s undo toast, ۞ empty state, and row skeletons.
export function BookmarksRoute() {
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
    <NavigationPageRecipe title="Bookmarks">
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
            <BookmarksList
              bookmarks={bookmarks}
              onDeleteBookmark={handleDelete}
              onNavigate={(hash) => {
                window.location.hash = hash
              }}
            />
            {undoTarget ? (
              <div className="qar:sticky qar:bottom-4 qar:mt-4">
                <BookmarkUndoToast onUndo={handleUndo} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </NavigationPageRecipe>
  )
}
