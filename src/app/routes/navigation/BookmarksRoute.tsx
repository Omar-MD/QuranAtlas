import { NavigationPageRecipe } from '../../../design-system/recipes/navigation-page'
import { BookmarksList } from '../../../components/navigation/BookmarksList'
import { useBookmarks } from '../../../continuity/bookmarks/use-bookmarks'

export function BookmarksRoute() {
  const { bookmarks, deleteBookmark, status } = useBookmarks()

  return (
    <NavigationPageRecipe title="Bookmarks">
      {status === 'loading' ? (
        <p className="qar:m-0 qar:text-sm qar:text-muted" role="status">Loading bookmarks</p>
      ) : status === 'error' ? (
        <p className="qar:m-0 qar:text-sm qar:text-danger" role="status">Bookmarks unavailable.</p>
      ) : (
        <BookmarksList bookmarks={bookmarks} onDeleteBookmark={deleteBookmark} onNavigate={(hash) => { window.location.hash = hash }} />
      )}
    </NavigationPageRecipe>
  )
}
