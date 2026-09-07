import type { Meta, StoryObj } from '@storybook/react-vite'

import { NavigationPageRecipe } from './navigation-page'
import { OnboardingPageRecipe } from './onboarding-page'
import { ReaderPageRecipe } from './reader-page'
import { SettingsPageRecipe } from './settings-page'

const meta = {
  title: 'React Design System/Page Recipes',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj

export const ReaderPage: Story = {
  render: () => (
    <ReaderPageRecipe>
      <p className="qar:text-sm qar:text-muted">Verse content column capped at --qa-react-page-max-width.</p>
    </ReaderPageRecipe>
  ),
}

export const ReaderPageWithChrome: Story = {
  render: () => (
    <ReaderPageRecipe chrome={<div className="qar:h-12 qar:border-b qar:border-border">chrome slot</div>}>
      <p className="qar:text-sm qar:text-muted">Verse content below a mounted chrome bar.</p>
    </ReaderPageRecipe>
  ),
}

export const OnboardingPage: Story = {
  render: () => (
    <OnboardingPageRecipe kicker="Reader setup" title="Choose your Mushaf edition">
      <p className="qar:text-sm qar:text-muted">Centered max-w-md column per the director brief.</p>
    </OnboardingPageRecipe>
  ),
}

export const NavigationPage: Story = {
  render: () => (
    <NavigationPageRecipe kicker="Browse" title="Surahs">
      <p className="qar:text-sm qar:text-muted">List rhythm follows the page heading.</p>
    </NavigationPageRecipe>
  ),
}

export const SettingsPage: Story = {
  render: () => (
    <SettingsPageRecipe title="About">
      <p className="qar:text-sm qar:text-muted">Read content follows the single page heading.</p>
    </SettingsPageRecipe>
  ),
}
