import { NavigationPageRecipe } from '../../../design-system/recipes/navigation-page'
import { SurahList } from '../../../components/navigation/SurahList'

export function SurahsRoute() {
  return (
    <NavigationPageRecipe title="Surahs">
      <div className="qar:mx-auto qar:w-full qar:max-w-page">
        <SurahList
          onNavigate={(hash) => {
            window.location.hash = hash
          }}
        />
      </div>
    </NavigationPageRecipe>
  )
}
