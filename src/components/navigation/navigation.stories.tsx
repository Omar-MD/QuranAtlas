import { useEffect } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { ChromeFrame } from './ChromeFrame'
import { NavDrawer } from './NavDrawer'
import { useNavDrawerController } from './nav-drawer-controller'
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
}

function ChromeFramePage({ openDrawer = false }: { openDrawer?: boolean }) {
  const drawer = useNavDrawerController()
  const dispatch = drawer.dispatch
  useEffect(() => {
    if (openDrawer) dispatch({ type: 'open' })
  }, [dispatch, openDrawer])
  return (
    <ChromeFrame controller={drawer} onOpenSettings={fn()}>
      <main className="qar:grid qar:min-h-dvh qar:place-items-center qar:p-6">
        <p className="qar:text-sm qar:text-muted">Route content composes inside the shared frame.</p>
      </main>
    </ChromeFrame>
  )
}

export const ChromeFrameDefault: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <ChromeFramePage />,
}

export const ChromeFrameDrawerOpen: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <ChromeFramePage openDrawer />,
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
      bookmarks={[
        {
          arabicSnippet: 'اِ۬لْحَمْدُ لِلهِ رَبِّ اِ۬لْعَٰلَمِينَ',
          createdAt: 1,
          riwayah: 'qaloon',
          surah: 1,
          surahName: 'Al-Fatihah',
          verseKey: '1:1',
        },
      ]}
      onDeleteBookmark={fn()}
      onNavigate={fn()}
    />
  ),
}

export const BookmarksEmpty: Story = {
  render: () => <BookmarksList />,
}
