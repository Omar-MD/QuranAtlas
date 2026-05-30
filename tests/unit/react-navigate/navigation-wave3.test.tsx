import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { NavDrawer } from '../../../src-react/components/navigation/NavDrawer'
import { BookmarksList } from '../../../src-react/components/navigation/BookmarksList'
import { SurahList } from '../../../src-react/components/navigation/SurahList'
import { navDrawerReducer } from '../../../src-react/components/navigation/nav-drawer-controller'
import { SettingsRoute } from '../../../src-react/app/routes/settings/SettingsRoute'
import { OnboardingRoute } from '../../../src-react/app/routes/onboarding/OnboardingRoute'
import { buildJuzRows } from '../../../src-react/data/juz-index'
import { loadReaderSurahIndex } from '../../../src-react/data/surah-index'
import { closeReactDb, openReactDb } from '../../../src-react/storage/db'

function jsonResponse(payload: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => payload,
  } as Response
}

async function resetReactDb() {
  closeReactDb()
  const db = await openReactDb()
  await Promise.all([
    db.settings.clear(),
    db.activationState.clear(),
    db.datasetMeta.clear(),
    db.bookmarks.clear(),
  ])
  closeReactDb()
}

const mushafManifest = {
  version: 1,
  riwayah: 'qaloon',
  mushafEditionId: 'qalun-quran-ws-v1',
  pageCount: 604,
  verseToPage: { '1:1': 1, '2:255': 42 },
  pages: [
    { page: 1, assetPath: 'pages/001.svg', viewBox: '0 0 120 180', firstVerse: { surah: 1, verse: 1 } },
    { page: 42, assetPath: 'pages/042.svg', viewBox: '0 0 120 180', firstVerse: { surah: 2, verse: 251 } },
  ],
}

describe('React navigation, settings, and onboarding parity', () => {
  it('keeps reader mode switching out of the navigation drawer and shows verse-only source controls', () => {
    render(<NavDrawer open mode="verse" currentLabel="Al-Fatihah" onClose={vi.fn()} onNavigate={vi.fn()} />)
    const drawer = screen.getByRole('dialog', { name: 'Navigation' })
    expect(within(drawer).queryByRole('tablist', { name: 'Reader mode' })).toBeNull()
    expect(within(drawer).getAllByLabelText('About QuranAtlas')[0]?.querySelector('[data-icon="brand-rosette"]')).not.toBeNull()
    expect(within(drawer).queryByRole('button', { name: /create plan/i })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Surah' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Juz' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Bookmarks' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('searchbox', { name: 'Search surah by name, number, or verse reference' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Recent' })).toHaveAttribute('aria-selected', 'false')
  })

  it('keeps Surah, Juz, and Bookmarks navigation available in Mushaf mode and routes them to pages', async () => {
    const onNavigate = vi.fn()
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/surahs.json') {
        return jsonResponse(Array.from({ length: 114 }, (_, index) => ({
          counts: { hafs: index + 7, qaloon: index + 7, warsh: index + 7 },
          n: index + 1,
          name: index === 0 ? 'Al-Fatihah' : `Surah ${index + 1}`,
          name_ar: index === 0 ? 'الفَاتِحة' : `سورة ${index + 1}`,
        })))
      }
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') return jsonResponse(mushafManifest)
      return jsonResponse({}, { ok: false, status: 404 })
    }))
    const { container } = render(
      <NavDrawer
        bookmarks={[{ createdAt: 1, riwayah: 'qaloon', surah: 2, verseKey: '2:255' }]}
        currentLabel="Page 1"
        juzRows={[{ n: 2, start: { surah: 2, verse: 255 } }]}
        mode="mushaf"
        onClose={vi.fn()}
        onNavigate={onNavigate}
        open
      />,
    )

    expect(screen.queryByRole('tablist', { name: 'Mushaf view mode' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Surah' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Juz' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Bookmarks' })).toHaveAttribute('aria-selected', 'false')

    await waitFor(() => expect(container.querySelector('.qar-react-nav-drawer-surah-btn')).not.toBeNull())
    fireEvent.click(container.querySelector('.qar-react-nav-drawer-surah-btn') as HTMLButtonElement)
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('#/m/1'))

    fireEvent.click(screen.getByRole('tab', { name: 'Juz' }))
    fireEvent.click(screen.getByRole('button', { name: 'Juz 2, starts at 2:255' }))
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('#/m/42'))

    fireEvent.click(screen.getByRole('tab', { name: 'Bookmarks' }))
    fireEvent.click(screen.getByRole('button', { name: /jump to verse 2:255/i }))
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('#/m/42'))
    vi.unstubAllGlobals()
  })

  it('switches the drawer to Juz without routing to the Surah directory', () => {
    const onNavigate = vi.fn()
    render(
      <NavDrawer
        currentLabel="Al-Fatihah"
        juzRows={[{ n: 29, start: { surah: 67, verse: 1 } }]}
        mode="verse"
        onClose={vi.fn()}
        onNavigate={onNavigate}
        open
      />,
    )

    expect(screen.queryByLabelText('Juz list')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Juz' }))
    expect(onNavigate).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: 'Juz' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('Continue')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Juz 29, starts at 67:1' }))
    expect(onNavigate).toHaveBeenCalledWith('#/s/67/1')
  })

  it('opens Daily Wird detail and routes Continue Wird to the next reference', async () => {
    await resetReactDb()
    const db = await openReactDb()
    await db.settings.put({ key: 'currentPosition', value: { surah: 2, verse: 7 } })
    await db.settings.put({
      key: 'wirdPlan',
      value: {
        id: 'wird-test',
        startRef: { surah: 2, verse: 1 },
        endRef: { surah: 2, verse: 20 },
        targetDays: 2,
        targetEndOn: '2026-05-05',
        startedOn: '2026-05-04',
        unit: 'verse',
        reminder: { enabled: false, time: '08:00', browserNotifications: 'default' },
        progress: {
          completedThroughRef: { surah: 2, verse: 7 },
          dayKey: '2026-05-04',
          lastReadRef: { surah: 2, verse: 7 },
          nextRef: { surah: 2, verse: 8 },
          todayEndRef: { surah: 2, verse: 10 },
          todayStartRef: { surah: 2, verse: 1 },
        },
        history: [],
      },
    })
    const onNavigate = vi.fn()

    render(<NavDrawer open mode="verse" currentLabel="Al-Fatihah" onClose={vi.fn()} onNavigate={onNavigate} />)

    fireEvent.click(await screen.findByRole('button', { name: /today/i }))
    expect(screen.getByRole('heading', { name: 'Daily Wird' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /continue wird/i }))

    expect(onNavigate).toHaveBeenCalledWith('#/s/2/8')
    closeReactDb()
  })

  it('renders Surah rows as Svelte-style row buttons without extra Open actions', () => {
    render(<SurahList onNavigate={vi.fn()} rows={[{ counts: { hafs: 7, qaloon: 7, warsh: 7 }, n: 1, name: 'Al-Fatihah', name_ar: 'الفَاتِحة' }]} />)

    expect(screen.queryByText('Open')).toBeNull()
    expect(screen.getByRole('button', { name: /Open Al-Fatihah/i })).toHaveClass('qar-react-nav-drawer-surah-btn')
    expect(screen.getAllByText('›').length).toBeGreaterThan(0)
  })

  it('renders settings and onboarding as compact product flows', () => {
    const settingsRender = render(<SettingsRoute mode="verse" />)
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Reader mode' })).toBeInTheDocument()
    expect(screen.queryByRole('tablist', { name: 'Mushaf view mode' })).not.toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Font size' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Reading flow' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Night mode' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Manage Assets' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Included assets' })).toBeInTheDocument()
    expect(screen.queryByText(/mushaf edition/i)).not.toBeInTheDocument()
    settingsRender.rerender(<SettingsRoute mode="mushaf" />)
    expect(screen.getByRole('tablist', { name: 'Mushaf view mode' })).toBeInTheDocument()
    expect(screen.queryByRole('slider', { name: 'Font size' })).not.toBeInTheDocument()
    settingsRender.unmount()

    render(<OnboardingRoute />)
    expect(screen.queryByText(/choose riwayah/i)).not.toBeInTheDocument()
    expect(screen.getByText(/opening al-fatihah/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open al-fatihah/i })).toBeNull()
  })

  it('persists React MVP settings controls through the shared settings store', async () => {
    await resetReactDb()

    render(<SettingsRoute />)

    const translationSwitch = await screen.findByRole('switch', { name: 'Show translation' })
    expect(translationSwitch).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(translationSwitch)

    await waitFor(async () => {
      const db = await openReactDb()
      await expect(db.settings.get('translationVisible')).resolves.toEqual({ key: 'translationVisible', value: false })
    })
    closeReactDb()
  })

  it('loads all 114 Surah rows from the real metadata boundary', async () => {
    const rows = Array.from({ length: 114 }, (_, index) => ({
      counts: { hafs: index + 1, qaloon: index + 1, warsh: index + 1 },
      n: index + 1,
      name: index === 66 ? 'Al-Mulk' : `Surah ${index + 1}`,
      name_ar: `سورة ${index + 1}`,
    }))
    const fetcher = vi.fn(async () => new Response(JSON.stringify(rows)))

    await expect(loadReaderSurahIndex(fetcher as typeof fetch)).resolves.toHaveLength(114)
    expect(fetcher).toHaveBeenCalledWith('/dataset/surahs.json', { signal: undefined })
  })

  it('builds all 30 Juz rows with Svelte-equivalent start references', () => {
    const rows = buildJuzRows([
      { n: 1, start: { surah: 1, ayah: 1 } },
      { n: 2, start: { surah: 2, ayah: 142 } },
      { n: 29, start: { surah: 67, ayah: 1 } },
      { n: 30, start: { surah: 78, ayah: 1 } },
    ])

    expect(rows).toHaveLength(30)
    expect(rows[0]).toMatchObject({ n: 1, start: { surah: 1, verse: 1 } })
    expect(rows[1]).toMatchObject({ n: 2, start: { surah: 2, verse: 142 } })
    expect(rows[28]).toMatchObject({ n: 29, start: { surah: 67, verse: 1 } })
    expect(rows[29]).toMatchObject({ n: 30, start: { surah: 78, verse: 1 } })
  })

  it('renders populated bookmark rows with jump and delete controls', () => {
    const onNavigate = vi.fn()
    const onDeleteBookmark = vi.fn()
    render(
      <NavDrawer
        bookmarks={[{ arabicSnippet: 'اِ۬لْحَمْدُ لِلهِ رَبِّ اِ۬لْعَٰلَمِينَ', createdAt: 1, riwayah: 'qaloon', surah: 1, surahName: 'Al-Fatihah', verseKey: '1:1' }]}
        currentLabel="Al-Fatihah"
        mode="verse"
        onClose={vi.fn()}
        onDeleteBookmark={onDeleteBookmark}
        onNavigate={onNavigate}
        open
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Bookmarks' }))
    expect(screen.getByText('Al-Fatihah')).toBeInTheDocument()
    expect(screen.getByLabelText('1 bookmarks')).toBeInTheDocument()
    expect(screen.getByText('اِ۬لْحَمْدُ لِلهِ رَبِّ اِ۬لْعَٰلَمِينَ')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /jump to verse 1:1/i }))
    expect(onNavigate).toHaveBeenCalledWith('#/s/1/1')
    fireEvent.click(screen.getByRole('button', { name: /delete bookmark 1:1/i }))
    expect(onDeleteBookmark).toHaveBeenCalledWith({ riwayah: 'qaloon', verseKey: '1:1' })
  })

  it('renders Mushaf page bookmarks as Svelte-style rows with a page indicator', () => {
    const onNavigate = vi.fn()
    const onDeleteBookmark = vi.fn()
    render(
      <BookmarksList
        bookmarks={[{ createdAt: 1, kind: 'page', page: 42, riwayah: 'qaloon', surah: 0, verseKey: 'm:42' }]}
        onDeleteBookmark={onDeleteBookmark}
        onNavigate={onNavigate}
      />,
    )

    expect(screen.getByText('Mushaf pages')).toBeInTheDocument()
    expect(screen.getByText('Page 42')).toBeInTheDocument()
    expect(screen.getByText('Page')).toHaveClass('qar-react-bookmarks-row-kind')

    fireEvent.click(screen.getByRole('button', { name: /jump to mushaf page 42/i }))
    expect(onNavigate).toHaveBeenCalledWith('#/m/42')
    fireEvent.click(screen.getByRole('button', { name: /delete bookmark mushaf page 42/i }))
    expect(onDeleteBookmark).toHaveBeenCalledWith({ riwayah: 'qaloon', verseKey: 'm:42' })
  })

  it('pulses the landing verse when a bookmark jump is activated', () => {
    vi.useFakeTimers()
    const onNavigate = vi.fn()

    render(
      <>
        <article data-token-key="1:1" data-testid="verse-1:1" />
        <BookmarksList
          bookmarks={[{ arabicSnippet: 'اِ۬لْحَمْدُ لِلهِ رَبِّ اِ۬لْعَٰلَمِينَ', createdAt: 1, riwayah: 'qaloon', surah: 1, surahName: 'Al-Fatihah', verseKey: '1:1' }]}
          onNavigate={onNavigate}
        />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: /jump to verse 1:1/i }))

    expect(onNavigate).toHaveBeenCalledWith('#/s/1/1')
    vi.advanceTimersByTime(0)
    expect(screen.getByTestId('verse-1:1')).toHaveAttribute('data-bookmark-pulse', 'true')
    expect(screen.getByTestId('verse-1:1')).toHaveClass('qar-reader-verse--pulse')
    expect(screen.getByTestId('verse-1:1')).toHaveClass('qa-verse--pulse')

    vi.advanceTimersByTime(1000)

    expect(screen.getByTestId('verse-1:1')).not.toHaveAttribute('data-bookmark-pulse')
    expect(screen.getByTestId('verse-1:1')).not.toHaveClass('qar-reader-verse--pulse')
    expect(screen.getByTestId('verse-1:1')).not.toHaveClass('qa-verse--pulse')
    vi.useRealTimers()
  })

  it('pulses the landing verse after bookmark navigation remounts the target row', async () => {
    function BookmarkJumpRemountHarness() {
      const [landed, setLanded] = useState(false)
      return (
        <div data-react-route={landed ? '#/s/1/1' : '#/s/1'}>
          {!landed && <article data-token-key="1:1" data-testid="old-verse-1:1" />}
          {landed && <article data-token-key="1:1" data-testid="new-verse-1:1" />}
          <BookmarksList
            bookmarks={[{ arabicSnippet: 'اِ۬لْحَمْدُ لِلهِ رَبِّ اِ۬لْعَٰلَمِينَ', createdAt: 1, riwayah: 'qaloon', surah: 1, surahName: 'Al-Fatihah', verseKey: '1:1' }]}
            onNavigate={() => setLanded(true)}
          />
        </div>
      )
    }

    render(<BookmarkJumpRemountHarness />)

    fireEvent.click(screen.getByRole('button', { name: /jump to verse 1:1/i }))

    await waitFor(() => expect(screen.getByTestId('new-verse-1:1')).toHaveAttribute('data-bookmark-pulse', 'true'))
    expect(screen.getByTestId('new-verse-1:1')).toHaveClass('qa-verse--pulse')
  })

  it('reveals bookmark delete after a left swipe gesture', () => {
    render(
      <BookmarksList
        bookmarks={[{ arabicSnippet: 'اِ۬لْحَمْدُ لِلهِ رَبِّ اِ۬لْعَٰلَمِينَ', createdAt: 1, riwayah: 'qaloon', surah: 1, surahName: 'Al-Fatihah', verseKey: '1:1' }]}
      />,
    )

    const rowButton = screen.getByRole('button', { name: /jump to verse 1:1/i })
    fireEvent.touchStart(rowButton, {
      touches: [{ clientX: 220, clientY: 40 }],
    })
    fireEvent.touchMove(rowButton, {
      touches: [{ clientX: 132, clientY: 42 }],
    })
    fireEvent.touchEnd(rowButton, {
      changedTouches: [{ clientX: 132, clientY: 42 }],
    })

    expect(screen.getByRole('button', { name: /delete bookmark 1:1/i }).closest('.qar-react-bookmarks-row')).toHaveClass('qar-react-bookmarks-row--swiped')
  })

  it('keeps drawer open state, focus return, close reasons, and route transitions in one reducer', () => {
    const opened = navDrawerReducer({ open: false, returnFocusId: null, routeTransitioning: false }, { returnFocusId: 'reader-menu', type: 'open' })
    expect(opened).toEqual({ open: true, returnFocusId: 'reader-menu', routeTransitioning: false })

    const closingForRoute = navDrawerReducer(opened, { type: 'route-transition' })
    expect(closingForRoute).toEqual({ open: false, returnFocusId: 'reader-menu', routeTransitioning: true })

    expect(navDrawerReducer({ ...opened, routeTransitioning: false }, { reason: 'escape', type: 'close' })).toEqual({
      open: false,
      returnFocusId: 'reader-menu',
      routeTransitioning: false,
    })
  })

  it('treats tablet widths as desktop drawer chrome for the React drawer breakpoint', () => {
    const css = readFileSync(resolve(process.cwd(), 'src-react/design-system/index.css'), 'utf8')

    expect(css).toContain('@media (min-width: 768px) {\n    .qar-react-nav-drawer {')
    expect(css).not.toContain('@media (min-width: 1180px) {\n    .qar-react-nav-drawer {')
  })

  it('keeps bookmark pulse styling aligned with the Svelte verse accent pulse', () => {
    const css = readFileSync(resolve(process.cwd(), 'src-react/design-system/index.css'), 'utf8')
    const hoverIndex = css.indexOf('.qar-reader-verse:hover')
    const pulseIndex = css.indexOf('.qa-verse--pulse')

    expect(css).toContain('18% {')
    expect(css).toContain('background-color: var(--qa-react-bookmark-pulse-bg, color-mix(in srgb, var(--qa-react-bookmark-accent, var(--qa-react-accent)) 22%, transparent));')
    expect(css).toContain('box-shadow: inset 2px 0 0 var(--qa-react-bookmark-pulse-edge, var(--qa-react-bookmark-accent)), inset -2px 0 0 var(--qa-react-bookmark-pulse-edge, var(--qa-react-bookmark-accent));')
    expect(css).toContain('box-shadow: inset 2px 0 0 transparent, inset -2px 0 0 transparent;')
    expect(css).toContain('animation: qar-reader-verse-pulse 1000ms ease-out 1;')
    expect(hoverIndex).toBeGreaterThanOrEqual(0)
    expect(pulseIndex).toBeGreaterThan(hoverIndex)
  })
})
