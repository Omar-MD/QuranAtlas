import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { useEffect, type ReactNode } from 'react'

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

export const DimPageImages: Story = {
  render: () => (
    <DimAppearance>
      <SettingsRoute mode="mushaf" />
    </DimAppearance>
  ),
}

export const About: Story = {
  render: () => <AboutRoute onClose={fn()} />,
}

function DimAppearance({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark'
    document.documentElement.dataset.dimPageImages = 'on'
    return () => {
      document.documentElement.dataset.theme = 'light'
      delete document.documentElement.dataset.dimPageImages
    }
  }, [])
  return children
}
