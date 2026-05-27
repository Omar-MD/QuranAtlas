import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { NavDrawer } from './NavDrawer'
import { BookmarksList } from './BookmarksList'
import { JuzList } from './JuzList'
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

export const Juz: Story = {
  render: () => <JuzList />,
}

export const BookmarksPopulated: Story = {
  render: () => (
    <BookmarksList
      bookmarks={[{ createdAt: 1, riwayah: 'qaloon', surah: 1, verseKey: '1:1' }]}
      onDeleteBookmark={fn()}
      onNavigate={fn()}
    />
  ),
}
