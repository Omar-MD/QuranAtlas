import { NavigationPageRecipe } from '../../../design-system/recipes/navigation-page'
import { BookmarksList } from '../../../components/navigation/BookmarksList'

export function BookmarksRoute() {
  return (
    <NavigationPageRecipe title="Bookmarks">
      <BookmarksList />
    </NavigationPageRecipe>
  )
}
