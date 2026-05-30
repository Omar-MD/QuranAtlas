import { NavigationPageRecipe } from '../../../design-system/recipes/navigation-page'
import { SurahList } from '../../../components/navigation/SurahList'

export function SurahsRoute() {
  return (
    <NavigationPageRecipe title="Surahs">
      <SurahList onNavigate={(hash) => { window.location.hash = hash }} />
    </NavigationPageRecipe>
  )
}
