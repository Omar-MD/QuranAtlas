import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../../../src/app/App'
import { SettingsRoute } from '../../../src/app/routes/settings/SettingsRoute'
import { REACT_READER_PREFERENCES_CHANGED_EVENT } from '../../../src/storage/reader-preferences'
import { closeReactDb, openReactDb } from '../../../src/storage/db'
import { loadMushafFramingCapability } from '../../../src/packs/mushaf-page-asset'

vi.mock('../../../src/packs/mushaf-page-asset', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/packs/mushaf-page-asset')>()
  return { ...actual, loadMushafFramingCapability: vi.fn(async () => ({ hasValidFraming: false })) }
})

const mockedLoadMushafFramingCapability = vi.mocked(loadMushafFramingCapability)

vi.mock('../../../src/app/routes/read/ReaderRoute', () => ({
  ReaderRoute: ({ ayah, surah }: { ayah?: number; surah: number }) => (
    <main aria-label="Verse reader" data-testid="mock-verse-reader" id="reader-main" tabIndex={-1}>
      <button type="button" aria-label="Open navigation">Open</button>
      <button id="reader-settings-trigger" type="button">Open settings</button>
      <article className="qar-reader-verse" data-token-key={`${surah}:${ayah ?? 1}`} />
      Verse reader {surah}:{ayah ?? 1}
    </main>
  ),
}))

vi.mock('../../../src/app/routes/read/MushafRoute', () => ({
  MushafRoute: ({ page }: { page: number }) => (
    <main aria-label="Mushaf reader" data-testid="mock-mushaf-reader">
      Mushaf reader page {page}
    </main>
  ),
}))

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

async function seedLastSurface(lastSurface: string) {
  const db = await openReactDb()
  await db.settings.bulkPut([
    { key: 'mvpAssetContractId', value: 'mvp-default-assets-qaloon-bridges-v1' },
    { key: 'lastSurface', value: lastSurface },
    { key: 'onboardingComplete', value: true },
    { key: 'riwayah', value: 'qaloon' },
    { key: 'quranTextStyleId', value: 'uthmani-kfgqpc-v1' },
    { key: 'mushafEditionId', value: 'qalun-quran-ws-v1' },
    { key: 'translationId', value: 'bridges' },
    { key: 'translationVisible', value: true },
  ])
}

function ReaderPreferenceListenerProbe() {
  const [updates, setUpdates] = useState(0)

  useEffect(() => {
    function onPreferencesChanged() {
      setUpdates((current) => current + 1)
    }
    window.addEventListener(REACT_READER_PREFERENCES_CHANGED_EVENT, onPreferencesChanged)
    return () => window.removeEventListener(REACT_READER_PREFERENCES_CHANGED_EVENT, onPreferencesChanged)
  }, [])

  return <span data-testid="reader-preference-listener-updates">{updates}</span>
}

describe('React settings shell coverage', () => {
  afterEach(async () => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    mockedLoadMushafFramingCapability.mockReset()
    mockedLoadMushafFramingCapability.mockResolvedValue({ hasValidFraming: false })
    window.history.replaceState(null, '', '#/')
    await resetReactDb()
  })

  it('opens #/settings over the previous Verse reader hash and restores it on close', async () => {
    await resetReactDb()
    await seedLastSurface('#/s/2/255')
    window.history.replaceState(null, '', '#/settings')

    render(<App />)

    expect(await screen.findByTestId('mock-verse-reader')).toHaveTextContent('Verse reader 2:255')
    const dialog = await screen.findByRole('dialog', { name: 'Verse settings' })
    expect(within(dialog).getByRole('heading', { name: 'Verse settings' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('radiogroup', { name: 'Reader mode' })).not.toBeInTheDocument()
    await waitFor(() => expect(window.location.hash).toBe('#/s/2/255'))

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close settings' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Verse settings' })).not.toBeInTheDocument())
    expect(screen.getByTestId('mock-verse-reader')).toHaveTextContent('Verse reader 2:255')
    expect(window.location.hash).toBe('#/s/2/255')
  })

  it('infers Mushaf Settings from the previous Mushaf reader hash', async () => {
    await resetReactDb()
    await seedLastSurface('#/m/42')
    window.history.replaceState(null, '', '#/settings')

    render(<App />)

    expect(await screen.findByTestId('mock-mushaf-reader')).toHaveTextContent('Mushaf reader page 42')
    const dialog = await screen.findByRole('dialog', { name: 'Mushaf settings' })
    expect(within(dialog).getByRole('heading', { name: 'Mushaf settings' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('radiogroup', { name: 'Reader mode' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('region', { name: 'Page layout' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('region', { name: 'Verse reading' })).not.toBeInTheDocument()
    await waitFor(() => expect(window.location.hash).toBe('#/m/42'))
  })

  it('keeps the last Mushaf reader context when Settings opens from About', async () => {
    await resetReactDb()
    await seedLastSurface('#/m/42')
    window.history.replaceState(null, '', '#/m/42')

    render(<App />)

    expect(await screen.findByTestId('mock-mushaf-reader')).toHaveTextContent('Mushaf reader page 42')
    window.location.hash = '#/about'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await screen.findByRole('main', { name: 'About' })

    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }))

    expect(await screen.findByRole('dialog', { name: 'Mushaf settings' })).toBeInTheDocument()
    expect(screen.getByTestId('mock-mushaf-reader')).toHaveTextContent('Mushaf reader page 42')
    await waitFor(() => expect(window.location.hash).toBe('#/m/42'))
  })

  it('falls back to the default reader when direct Settings finds only a non-reader last surface', async () => {
    await resetReactDb()
    await seedLastSurface('#/about')
    window.history.replaceState(null, '', '#/settings')

    render(<App />)

    expect(await screen.findByTestId('mock-verse-reader')).toHaveTextContent('Verse reader 1:1')
    expect(await screen.findByRole('dialog', { name: 'Verse settings' })).toBeInTheDocument()
    await waitFor(() => expect(window.location.hash).toBe('#/s/1'))
  })

  it('does not render Verse or Mushaf preview panels in the MVP settings shell', async () => {
    const verseRender = render(<SettingsRoute mode="verse" onClose={vi.fn()} previousHash="#/s/1" />)
    const verseDialog = await screen.findByRole('dialog', { name: 'Verse settings' })
    expect(within(verseDialog).queryByText('Verse preview')).not.toBeInTheDocument()
    expect(within(verseDialog).queryByLabelText('Verse preview sample')).not.toBeInTheDocument()
    expect(within(verseDialog).queryByText('Mushaf preview')).not.toBeInTheDocument()
    verseRender.unmount()

    render(<SettingsRoute mode="mushaf" onClose={vi.fn()} previousHash="#/m/1" />)
    const mushafDialog = await screen.findByRole('dialog', { name: 'Mushaf settings' })
    expect(within(mushafDialog).queryByText('Mushaf preview')).not.toBeInTheDocument()
    expect(within(mushafDialog).queryByLabelText('Mushaf preview')).not.toBeInTheDocument()
    expect(within(mushafDialog).queryByText('Verse preview')).not.toBeInTheDocument()
  })

  it('keeps settings control names unambiguous while the reader chrome remains mounted behind the shell', async () => {
    await resetReactDb()
    await seedLastSurface('#/s/1')
    window.history.replaceState(null, '', '#/settings')

    render(<App />)

    const dialog = await screen.findByRole('dialog', { name: 'Verse settings' })
    expect(screen.queryByRole('button', { name: 'Open navigation' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Night mode: On' })).toBe(within(dialog).getByRole('button', { name: 'Night mode: On' }))
    expect(screen.queryByRole('button', { name: 'On' })).not.toBeInTheDocument()
  })

  it('keeps the current reader DOM mounted when opening the transient settings hash', async () => {
    await resetReactDb()
    await seedLastSurface('#/s/2/24')
    window.history.replaceState(null, '', '#/s/2/24')

    render(<App />)

    const reader = await screen.findByTestId('mock-verse-reader')
    expect(reader).toHaveTextContent('Verse reader 2:24')

    window.location.hash = '#/settings'
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    const dialog = await screen.findByRole('dialog', { name: 'Verse settings' })
    expect(dialog).toBeInTheDocument()
    await waitFor(() => expect(window.location.hash).toBe('#/s/2/24'))
    expect(screen.getByTestId('mock-verse-reader')).toBe(reader)
  })

  it('opens settings in-place from the reader without mutating the current reader hash', async () => {
    await resetReactDb()
    await seedLastSurface('#/s/2/24')
    window.history.replaceState(null, '', '#/s/2/24')

    render(<App />)

    const reader = await screen.findByTestId('mock-verse-reader')

    window.dispatchEvent(new CustomEvent('quranatlas-react-open-settings', {
      detail: { mode: 'verse', returnFocusId: 'reader-settings-trigger' },
    }))

    const dialog = await screen.findByRole('dialog', { name: 'Verse settings' })
    expect(window.location.hash).toBe('#/s/2/24')
    expect(screen.getByTestId('mock-verse-reader')).toBe(reader)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close settings' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open settings' })).toHaveFocus())
    expect(window.location.hash).toBe('#/s/2/24')
  })

  it('falls back to the reader main landmark when a direct settings route has no opener', async () => {
    function DirectSettingsHarness() {
      const [open, setOpen] = useState(true)
      return (
        <>
          <main id="reader-main" tabIndex={-1}>Reader</main>
          {open ? <SettingsRoute mode="verse" onClose={() => setOpen(false)} previousHash="#/s/2/24" /> : null}
        </>
      )
    }

    render(<DirectSettingsHarness />)

    const dialog = await screen.findByRole('dialog', { name: 'Verse settings' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close settings' }))
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus())
  })

  it('emits preference changes outside the Settings render phase', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <>
        <ReaderPreferenceListenerProbe />
        <SettingsRoute mode="verse" onClose={vi.fn()} previousHash="#/s/1" />
      </>,
    )

    const dialog = await screen.findByRole('dialog', { name: 'Verse settings' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Theme: Dark' }))

    await waitFor(() => expect(screen.getByTestId('reader-preference-listener-updates')).toHaveTextContent('1'))
    expect(consoleError.mock.calls.some((call) => call.join(' ').includes('Cannot update a component'))).toBe(false)
    consoleError.mockRestore()
  })

  it('applies persisted appearance during app bootstrap', async () => {
    await resetReactDb()
    await seedLastSurface('#/s/1')
    const db = await openReactDb()
    await db.settings.bulkPut([
      { key: 'theme', value: 'sepia' },
      { key: 'nightMode', value: 'on' },
    ])
    window.history.replaceState(null, '', '#/s/1')

    render(<App />)

    expect(await screen.findByTestId('mock-verse-reader')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('sepia')
      expect(document.documentElement.dataset.nightMode).toBe('on')
    })
  })

  it('persists Navigation mode changes from the settings shell', async () => {
    await resetReactDb()
    render(<SettingsRoute mode="mushaf" onClose={vi.fn()} previousHash="#/m/1" />)

    const dialog = await screen.findByRole('dialog', { name: 'Mushaf settings' })
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Navigation mode: Scroll' }))

    expect(within(dialog).getByRole('radio', { name: 'Navigation mode: Scroll' })).toHaveAttribute('aria-checked', 'true')
    await waitFor(async () => {
      const db = await openReactDb()
      await expect(db.settings.get('mushafViewMode')).resolves.toEqual({ key: 'mushafViewMode', value: 'continuous' })
    })
  })

  it('persists Fit width as a boolean without changing Navigation mode', async () => {
    await resetReactDb()
    render(<SettingsRoute mode="mushaf" onClose={vi.fn()} previousHash="#/m/1" />)

    const dialog = await screen.findByRole('dialog', { name: 'Mushaf settings' })
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Fit width' }))

    expect(within(dialog).getByRole('switch', { name: 'Fit width' })).toBeChecked()
    await waitFor(async () => {
      const db = await openReactDb()
      await expect(db.settings.bulkGet(['mushafFitWidth', 'mushafViewMode'])).resolves.toEqual([
        { key: 'mushafFitWidth', value: true },
        { key: 'mushafViewMode', value: 'auto' },
      ])
    })
  })

  it('shows reviewed framing controls only for a framing-capable private edition and persists its value', async () => {
    await resetReactDb()
    const db = await openReactDb()
    await db.settings.put({ key: 'mushafEditionId', value: 'qalun-furatiyyah-2023-v1' })
    mockedLoadMushafFramingCapability.mockResolvedValue({
      hasValidFraming: true,
      representativeTextFrame: { x: 0.1, y: 0, width: 0.8, height: 1 },
    })
    render(<SettingsRoute mode="mushaf" onClose={vi.fn()} previousHash="#/m/1" />)

    const dialog = await screen.findByRole('dialog', { name: 'Mushaf settings' })
    expect(await within(dialog).findByRole('slider', { name: "Qur'an text size" })).toBeInTheDocument()
    expect(within(dialog).getByText('100% reviewed frame width')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Text focus' }))
    expect(within(dialog).getByRole('button', { name: 'Text focus' })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(db.settings.get('mushafPageFraming')).resolves.toEqual({ key: 'mushafPageFraming', value: 1 }))
    expect(within(dialog).getByText('80% reviewed frame width')).toBeInTheDocument()
  })

  it('keeps quran.ws Page layout controls unchanged without framing controls', async () => {
    await resetReactDb()
    render(<SettingsRoute mode="mushaf" onClose={vi.fn()} previousHash="#/m/1" />)
    const dialog = await screen.findByRole('dialog', { name: 'Mushaf settings' })
    expect(within(dialog).getByRole('switch', { name: 'Fit width' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('slider', { name: "Qur'an text size" })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Text focus' })).not.toBeInTheDocument()
  })

  it('persists Daily Wird visibility from the standalone Wird settings section', async () => {
    await resetReactDb()

    render(<SettingsRoute mode="verse" onClose={vi.fn()} previousHash="#/s/1" />)

    const dialog = await screen.findByRole('dialog', { name: 'Verse settings' })
    const verseSettings = within(dialog).getByRole('region', { name: 'Verse reading' })
    expect(within(verseSettings).queryByRole('switch', { name: 'Enable Daily Wird' })).not.toBeInTheDocument()

    const wirdSettings = within(dialog).getByRole('region', { name: 'Reading continuity' })
    const toggle = within(wirdSettings).getByRole('switch', { name: 'Enable Daily Wird' })
    expect(toggle).toBeChecked()

    fireEvent.click(toggle)

    expect(toggle).not.toBeChecked()
    await waitFor(async () => {
      const db = await openReactDb()
      await expect(db.settings.get('wirdReaderStatusVisible')).resolves.toEqual({ key: 'wirdReaderStatusVisible', value: false })
    })
  })

  it('disables the Wird reminder when Daily Wird is disabled', async () => {
    await resetReactDb()
    const db = await openReactDb()
    await db.settings.put({
      key: 'wirdPlan',
      value: {
        endRef: { surah: 114, verse: 6 },
        history: [],
        id: 'wird-test',
        progress: {
          completedThroughRef: null,
          dayKey: '2026-06-03',
          lastReadRef: { surah: 1, verse: 1 },
          nextRef: { surah: 1, verse: 1 },
          todayEndRef: { surah: 1, verse: 7 },
          todayStartRef: { surah: 1, verse: 1 },
        },
        reminder: { browserNotifications: 'granted', enabled: true, time: '07:30' },
        startRef: { surah: 1, verse: 1 },
        startedOn: '2026-06-03',
        targetDays: 30,
        targetEndOn: '2026-07-03',
        unit: 'verse',
      },
    })

    render(<SettingsRoute mode="verse" onClose={vi.fn()} previousHash="#/s/1" />)

    const dialog = await screen.findByRole('dialog', { name: 'Verse settings' })
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Enable Daily Wird' }))

    await waitFor(async () => {
      const nextDb = await openReactDb()
      const record = await nextDb.settings.get('wirdPlan')
      expect(record?.value).toMatchObject({
        reminder: { browserNotifications: 'granted', enabled: false, time: '07:30' },
      })
    })
  })

  it('scopes reader controls to the selected mode', async () => {
    const { rerender } = render(<SettingsRoute mode="verse" onClose={vi.fn()} previousHash="#/s/1" />)
    let dialog = await screen.findByRole('dialog', { name: 'Verse settings' })

    expect(within(dialog).queryByRole('radiogroup', { name: 'Reader mode' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('slider', { name: 'Font size' })).toBeInTheDocument()
    expect(within(dialog).getByRole('combobox', { name: 'Reading flow' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('radiogroup', { name: 'Navigation mode' })).not.toBeInTheDocument()

    rerender(<SettingsRoute mode="mushaf" onClose={vi.fn()} previousHash="#/m/1" />)
    dialog = await screen.findByRole('dialog', { name: 'Mushaf settings' })

    expect(within(dialog).queryByRole('radiogroup', { name: 'Reader mode' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('slider', { name: 'Font size' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('combobox', { name: 'Reading flow' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('radiogroup', { name: 'Navigation mode' })).toBeInTheDocument()
  })

  it('orders the active settings groups and omits inactive mode controls', async () => {
    const { rerender } = render(<SettingsRoute mode="verse" onClose={vi.fn()} previousHash="#/s/1" />)
    let dialog = await screen.findByRole('dialog', { name: 'Verse settings' })

    expect(within(dialog).getAllByRole('region', {
      name: /^(Verse reading|Reading continuity|Appearance|Included reading assets)$/,
    }).map((region) => (
      within(region).getByRole('heading', { level: 3 }).textContent
    ))).toEqual([
      'Verse reading',
      'Reading continuity',
      'Appearance',
      'Included reading assets',
    ])
    expect(within(dialog).queryByRole('radiogroup', { name: 'Navigation mode' })).not.toBeInTheDocument()

    rerender(<SettingsRoute mode="mushaf" onClose={vi.fn()} previousHash="#/m/1" />)
    dialog = await screen.findByRole('dialog', { name: 'Mushaf settings' })

    expect(within(dialog).getAllByRole('region', {
      name: /^(Page layout|Reading continuity|Appearance|Included reading assets)$/,
    }).map((region) => (
      within(region).getByRole('heading', { level: 3 }).textContent
    ))).toEqual([
      'Page layout',
      'Reading continuity',
      'Appearance',
      'Included reading assets',
    ])
    expect(within(dialog).queryByRole('slider', { name: 'Font size' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('combobox', { name: 'Reading flow' })).not.toBeInTheDocument()
  })

  it('renders the default asset inventory inline inside settings without optional controls', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/text-assets.json') {
        return new Response(JSON.stringify({
          version: 1,
          assets: [{ riwayah: 'qaloon', textStyleId: 'uthmani-kfgqpc-v1', label: 'Loaded Qaloon Text' }],
        }), { headers: { 'Content-Type': 'application/json' }, status: 200 })
      }
      if (url === '/dataset/provenance.json') {
        return new Response(JSON.stringify({
          riwayat: [{ id: 'qaloon', fontFamily: 'Loaded Qaloon Font' }],
        }), { headers: { 'Content-Type': 'application/json' }, status: 200 })
      }
      if (url === '/dataset/indexes/mushaf-assets.json') {
        return new Response(JSON.stringify({
          version: 1,
          assets: [{ riwayah: 'qaloon', mushafEditionId: 'qalun-quran-ws-v1', label: 'Loaded Qaloon Mushaf' }],
        }), { headers: { 'Content-Type': 'application/json' }, status: 200 })
      }
      if (url === '/dataset/indexes/sources.json') {
        return new Response(JSON.stringify({
          version: 1,
          sources: [{ id: 'bridges', type: 'translation', displayLabel: 'Loaded Bridges' }],
        }), { headers: { 'Content-Type': 'application/json' }, status: 200 })
      }
      return new Response('{}', { status: 404 })
    }))
    render(<SettingsRoute mode="verse" onClose={vi.fn()} previousHash="#/s/1" />)
    const dialog = await screen.findByRole('dialog', { name: 'Verse settings' })
    const assets = within(dialog).getByRole('region', { name: 'Included reading assets' })

    expect(within(dialog).getByText('Translation')).toBeInTheDocument()
    expect(within(dialog).queryByText('Bridges Translation')).not.toBeInTheDocument()
    expect(within(assets).getByText('Text:')).toBeInTheDocument()
    expect(await within(assets).findByText('Loaded Qaloon Text + Loaded Qaloon Font')).toBeInTheDocument()
    expect(within(assets).getByText('Mushaf:')).toBeInTheDocument()
    expect(within(assets).getByText('Loaded Qaloon Mushaf')).toBeInTheDocument()
    expect(within(assets).getByText('Translation:')).toBeInTheDocument()
    expect(within(assets).getByText('Loaded Bridges')).toBeInTheDocument()
    expect(within(assets).getAllByText('Included')).toHaveLength(3)
    expect(within(assets).queryByText('Qaloon Madani Text + font')).not.toBeInTheDocument()
    expect(within(assets).queryByText('Qaloon Madani')).not.toBeInTheDocument()
    expect(within(assets).queryByText('Bridges')).not.toBeInTheDocument()
    expect(within(assets).queryByText('uthmani-kfgqpc-v1 + kfgqpc-qaloon-v10')).not.toBeInTheDocument()
    expect(within(assets).queryByText('qalun-quran-ws-v1')).not.toBeInTheDocument()
    expect(within(assets).queryByText('bridges')).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/^(0[1-9]|[1-9][0-9])$/)).not.toBeInTheDocument()
    expect(within(assets).queryByRole('button', { name: /install|delete|verify|set active|switch|retry/i })).not.toBeInTheDocument()
    expect(within(assets).getAllByRole('button')).toHaveLength(1)
    expect(within(assets).queryByRole('link')).not.toBeInTheDocument()

    const disclosure = within(assets).getByRole('button', { name: 'Hide included reading assets' })
    expect(disclosure).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(disclosure)
    expect(within(assets).getByRole('button', { name: 'Show included reading assets' })).toHaveAttribute('aria-expanded', 'false')
    expect(within(assets).queryByText('Loaded Qaloon Mushaf')).not.toBeInTheDocument()
  })

  it('opens the settings shell for legacy #/assets URLs instead of rendering an assets page', async () => {
    await resetReactDb()
    await seedLastSurface('#/s/2/255')
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    window.history.replaceState(null, '', '#/assets')

    render(<App />)

    expect(await screen.findByTestId('mock-verse-reader')).toHaveTextContent('Verse reader 2:255')
    const dialog = await screen.findByRole('dialog', { name: 'Verse settings' })
    const assets = within(dialog).getByRole('region', { name: 'Included reading assets' })
    expect(within(assets).getByRole('button', { name: 'Hide included reading assets' })).toHaveAttribute('aria-expanded', 'true')
    expect(within(assets).getAllByText('Included')).toHaveLength(3)
    expect(screen.queryByRole('heading', { name: 'Assets' })).not.toBeInTheDocument()
    await waitFor(() => expect(window.location.hash).toBe('#/s/2/255'))
  })

  it('persists theme, night mode, translation visibility, and typography changes', async () => {
    await resetReactDb()

    render(<SettingsRoute mode="verse" onClose={vi.fn()} previousHash="#/s/1" />)

    const dialog = await screen.findByRole('dialog', { name: 'Verse settings' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Theme: Dark' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Night mode: On' }))
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Show translation' }))
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Enable Daily Wird' }))
    fireEvent.keyDown(within(dialog).getByRole('slider', { name: 'Font size' }), { key: 'End' })
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
    fireEvent.click(within(dialog).getByRole('combobox', { name: 'Reading flow' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Spacious' }))

    await waitFor(async () => {
      const db = await openReactDb()
      await expect(db.settings.bulkGet([
        'theme',
        'nightMode',
        'translationVisible',
        'wirdReaderStatusVisible',
        'fontSize',
        'lineSpacing',
        'wordSpacing',
        'readerMargin',
        'verseSpacing',
      ])).resolves.toEqual([
        { key: 'theme', value: 'dark' },
        { key: 'nightMode', value: 'on' },
        { key: 'translationVisible', value: false },
        { key: 'wirdReaderStatusVisible', value: false },
        { key: 'fontSize', value: 'xl' },
        { key: 'lineSpacing', value: 'lg' },
        { key: 'wordSpacing', value: 'lg' },
        { key: 'readerMargin', value: 'lg' },
        { key: 'verseSpacing', value: 'lg' },
      ])
    })
  })

  it('announces preference changes so mounted reader routes can update live', async () => {
    await resetReactDb()
    const listener = vi.fn()
    window.addEventListener('quranatlas-react-reader-preferences-changed', listener)

    render(<SettingsRoute mode="verse" onClose={vi.fn()} previousHash="#/s/1" />)

    const dialog = await screen.findByRole('dialog', { name: 'Verse settings' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Night mode: On' }))

    await waitFor(() => expect(listener).toHaveBeenCalled())
    expect(listener.mock.calls.at(-1)?.[0]).toMatchObject({
      detail: expect.objectContaining({ nightMode: 'on' }),
    })
    window.removeEventListener('quranatlas-react-reader-preferences-changed', listener)
  })
})
