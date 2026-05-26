import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { NavDrawer } from './NavDrawer'
import { SurahList } from './SurahList'

const meta = {
  title: 'React Navigation/Wave 3 Navigation',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj

export const DrawerVerse: Story = {
  render: () => <NavDrawer currentLabel="Al-Fatihah" mode="verse" onClose={fn()} onNavigate={fn()} open />,
}

export const Surahs: Story = {
  render: () => <SurahList />,
}
