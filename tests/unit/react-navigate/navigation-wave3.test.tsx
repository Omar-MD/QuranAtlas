import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NavDrawer } from '../../../src-react/components/navigation/NavDrawer'
import { SurahList } from '../../../src-react/components/navigation/SurahList'
import { navDrawerReducer } from '../../../src-react/components/navigation/nav-drawer-controller'
import { SettingsRoute } from '../../../src-react/app/routes/settings/SettingsRoute'
import { OnboardingRoute } from '../../../src-react/app/routes/onboarding/OnboardingRoute'
import { buildJuzRows } from '../../../src-react/data/juz-index'
import { loadReaderSurahIndex } from '../../../src-react/data/surah-index'

function jsonResponse(payload: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => payload,
  } as Response
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
    expect(within(drawer).queryByText(/create plan/i)).toBeNull()
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
    fireEvent.click(screen.getByRole('button', { name: /jump to 2:255/i }))
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

  it('renders Surah rows as Svelte-style row buttons without extra Open actions', () => {
    render(<SurahList onNavigate={vi.fn()} rows={[{ counts: { hafs: 7, qaloon: 7, warsh: 7 }, n: 1, name: 'Al-Fatihah', name_ar: 'الفَاتِحة' }]} />)

    expect(screen.queryByText('Open')).toBeNull()
    expect(screen.getByRole('button', { name: /Open Al-Fatihah/i })).toHaveClass('qar-react-nav-drawer-surah-btn')
    expect(screen.getAllByText('›').length).toBeGreaterThan(0)
  })

  it('renders settings and onboarding as compact product flows', () => {
    render(<SettingsRoute />)
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Mushaf view mode' })).toBeInTheDocument()
    expect(screen.getByText('Reader assets')).toBeInTheDocument()

    render(<OnboardingRoute />)
    expect(screen.getByRole('heading', { name: /choose riwayah/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /qaloon/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open al-fatihah/i })).toBeNull()
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
        bookmarks={[{ createdAt: 1, riwayah: 'qaloon', surah: 1, verseKey: '1:1' }]}
        currentLabel="Al-Fatihah"
        mode="verse"
        onClose={vi.fn()}
        onDeleteBookmark={onDeleteBookmark}
        onNavigate={onNavigate}
        open
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Bookmarks' }))
    fireEvent.click(screen.getByRole('button', { name: /jump to 1:1/i }))
    expect(onNavigate).toHaveBeenCalledWith('#/s/1/1')
    fireEvent.click(screen.getByRole('button', { name: /delete bookmark 1:1/i }))
    expect(onDeleteBookmark).toHaveBeenCalledWith({ riwayah: 'qaloon', verseKey: '1:1' })
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
})
