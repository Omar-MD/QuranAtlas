import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { NavDrawer } from './NavDrawer'
import { BookmarksList } from './BookmarksList'
import { HizbList } from './HizbList'
import { JuzList } from './JuzList'
import { SurahList } from './SurahList'

const meta = {
  title: 'React Navigation/Navigation',
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

export const Hizb: Story = {
  render: () => <HizbList />,
}

export const BookmarksPopulated: Story = {
  render: () => (
    <BookmarksList
      bookmarks={[{
        arabicSnippet: 'اِ۬لْحَمْدُ لِلهِ رَبِّ اِ۬لْعَٰلَمِينَ',
        createdAt: 1,
        riwayah: 'qaloon',
        surah: 1,
        surahName: 'Al-Fatihah',
        verseKey: '1:1',
      }]}
      onDeleteBookmark={fn()}
      onNavigate={fn()}
    />
  ),
}

export const BookmarksEmpty: Story = {
  render: () => <BookmarksList />,
}
