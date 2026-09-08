import { NavigationPageRecipe } from '../../../design-system/recipes/navigation-page'
import { BookmarksList } from '../../../components/navigation/BookmarksList'
import { Button, Spinner, Status } from '../../../components/ui'
import { useSharedBookmarks } from '../../../continuity/bookmarks/use-bookmarks'

export function BookmarksRoute() {
  const { bookmarks, deleteBookmark, retry, status } = useSharedBookmarks()

  return (
    <NavigationPageRecipe title="Bookmarks">
      <div className="qar:mx-auto qar:w-full qar:max-w-page">
        {status === 'loading' ? (
          <div className="qar:flex qar:items-center qar:gap-2">
            <Spinner label="Loading bookmarks" />
            <p className="qar:m-0 qar:text-sm qar:text-muted">Loading bookmarks</p>
          </div>
        ) : status === 'error' ? (
          <Status action={<Button onClick={retry}>Retry</Button>} title="Bookmarks unavailable." tone="error" />
        ) : (
          <BookmarksList
            bookmarks={bookmarks}
            onDeleteBookmark={deleteBookmark}
            onNavigate={(hash) => {
              window.location.hash = hash
            }}
          />
        )}
      </div>
    </NavigationPageRecipe>
  )
}
