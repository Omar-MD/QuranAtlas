import { OnboardingPageRecipe } from '../../../design-system/recipes/onboarding-page'
import { Button } from '../../../components/ui'
import { isReactProductionDeployment } from '../../deploy-target'

export function OnboardingRoute() {
  return (
    <OnboardingPageRecipe>
      <div className="qar:grid qar:max-w-xl qar:gap-4 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-5">
        <div>
          <p className="qar:m-0 qar:text-xs qar:text-muted">Reader setup</p>
          <h2 className="qar:m-0 qar:text-2xl qar:leading-tight">Start reading</h2>
        </div>
        <p className="qar:m-0 qar:text-sm qar:text-muted">
          {isReactProductionDeployment
            ? 'Choose a verified source bundle before opening reader surfaces.'
            : 'Choose a verified source bundle before the React preview opens reader surfaces.'}
        </p>
        <Button onClick={() => { window.location.hash = '#/s/1' }}>Open Al-Fatihah</Button>
      </div>
    </OnboardingPageRecipe>
  )
}
