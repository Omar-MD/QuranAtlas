import { Spinner } from '../ui'
import { OnboardingPageRecipe } from '../../design-system/recipes/onboarding-page'

export function LaunchSplash() {
  return (
    <OnboardingPageRecipe title="QuranAtlas">
      <section className="qar:grid qar:justify-items-center qar:gap-3 qar:text-center" aria-label="Launch restore">
        <Spinner label="Opening Al-Fatihah" />
        <p className="qar:m-0 qar:text-sm qar:text-muted">Opening Al-Fatihah · Preparing the default Qaloon reader.</p>
      </section>
    </OnboardingPageRecipe>
  )
}
