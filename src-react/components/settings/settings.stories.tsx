import type { Meta, StoryObj } from '@storybook/react-vite'

import { OnboardingRoute } from '../../app/routes/onboarding/OnboardingRoute'
import { SettingsRoute } from '../../app/routes/settings/SettingsRoute'

const meta = {
  title: 'React Configure/Wave 3 Settings',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj

export const Settings: Story = {
  render: () => <SettingsRoute />,
}

export const Onboarding: Story = {
  render: () => <OnboardingRoute />,
}
