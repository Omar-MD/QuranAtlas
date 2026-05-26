import { SettingsPageRecipe } from '../../../design-system/recipes/settings-page'
import { isReactProductionDeployment } from '../../deploy-target'

export function AboutRoute() {
  return (
    <SettingsPageRecipe title="About">
      <p className="qar:m-0 qar:max-w-2xl qar:text-sm qar:text-muted">
        {isReactProductionDeployment
          ? 'QuranAtlas provides verified reader, navigation, settings, search, bookmarks, and Daily Wird workflows.'
          : 'QuranAtlas React preview keeps Svelte as the shipped reference while parity work is verified.'}
      </p>
    </SettingsPageRecipe>
  )
}
