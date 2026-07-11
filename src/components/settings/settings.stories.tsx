import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, type ReactNode } from 'react'

import { OnboardingRoute } from '../../app/routes/onboarding/OnboardingRoute'
import { AboutRoute } from '../../app/routes/settings/AboutRoute'
import { SettingsRoute } from '../../app/routes/settings/SettingsRoute'

const meta = {
  title: 'React Configure/Settings',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj

export const VerseSettings: Story = {
  render: () => <SettingsRoute mode="verse" />,
}

export const MushafSettings: Story = {
  render: () => <SettingsRoute mode="mushaf" />,
}

export const CompactAssetsCollapsed: Story = {
  parameters: { viewport: { defaultViewport: 'smallMobile' } },
  render: () => <SettingsRoute initialAssetsExpanded={false} mode="verse" />,
}

export const Dark: Story = {
  globals: { theme: 'dark' },
  render: () => <SettingsRoute mode="verse" />,
}

export const Night: Story = {
  render: () => (
    <NightAppearance>
      <SettingsRoute mode="verse" />
    </NightAppearance>
  ),
}

export const About: Story = {
  render: () => <AboutRoute />,
}

export const Onboarding: Story = {
  render: () => <OnboardingRoute />,
}

function NightAppearance({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
    document.documentElement.dataset.nightMode = 'on'
    return () => {
      delete document.documentElement.dataset.nightMode
    }
  }, [])
  return children
}
