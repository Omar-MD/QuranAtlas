import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../../../src/app/App'
import { SettingsRoute } from '../../../src/app/routes/settings/SettingsRoute'
import { REACT_READER_PREFERENCES_CHANGED_EVENT } from '../../../src/storage/reader-preferences'
import { closeReactDb, openReactDb } from '../../../src/storage/db'

vi.mock('../../../src/app/routes/read/ReaderRoute', () => ({
  ReaderRoute: ({ ayah, surah }: { ayah?: number; surah: number }) => (
    <main aria-label="Verse reader" data-testid="mock-verse-reader">
      <button type="button" aria-label="Open navigation">Open</button>
      <article className="qar-reader-verse" data-token-key={(globalThis as { __qaMockVisibleVerseKey?: string }).__qaMockVisibleVerseKey ?? `${surah}:${ayah ?? 1}`} />
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
    delete (globalThis as { __qaMockVisibleVerseKey?: string }).__qaMockVisibleVerseKey
    vi.useRealTimers()
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '#/')
    await resetReactDb()
  })

  it('opens #/settings over the previous Verse reader hash and restores it on close', async () => {
    await resetReactDb()
    await seedLastSurface('#/s/2/255')
    window.history.replaceState(null, '', '#/settings')

    render(<App />)

    expect(await screen.findByTestId('mock-verse-reader')).toHaveTextContent('Verse reader 2:255')
    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
    expect(within(dialog).getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(within(dialog).getByRole('tab', { name: 'Reader mode: Verse' })).toHaveAttribute('aria-selected', 'true')
    expect(within(dialog).getByRole('tab', { name: 'Reader mode: Mushaf' })).toHaveAttribute('aria-selected', 'false')
    await waitFor(() => expect(window.location.hash).toBe('#/s/2/255'))

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close settings' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument())
    expect(screen.getByTestId('mock-verse-reader')).toHaveTextContent('Verse reader 2:255')
    expect(window.location.hash).toBe('#/s/2/255')
  })

  it('infers Mushaf Settings from the previous Mushaf reader hash', async () => {
    await resetReactDb()
    await seedLastSurface('#/m/42')
    window.history.replaceState(null, '', '#/settings')

    render(<App />)

    expect(await screen.findByTestId('mock-mushaf-reader')).toHaveTextContent('Mushaf reader page 42')
    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
    expect(within(dialog).getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(within(dialog).getByRole('tab', { name: 'Reader mode: Mushaf' })).toHaveAttribute('aria-selected', 'true')
    expect(within(dialog).getByLabelText('Mushaf settings')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Verse settings')).not.toBeInTheDocument()
    await waitFor(() => expect(window.location.hash).toBe('#/m/42'))
  })

  it('does not render Verse or Mushaf preview panels in the MVP settings shell', async () => {
    const verseRender = render(<SettingsRoute mode="verse" onClose={vi.fn()} previousHash="#/s/1" />)
    const verseDialog = await screen.findByRole('dialog', { name: 'Settings' })
    expect(within(verseDialog).queryByText('Verse preview')).not.toBeInTheDocument()
    expect(within(verseDialog).queryByLabelText('Verse preview sample')).not.toBeInTheDocument()
    expect(within(verseDialog).queryByText('Mushaf preview')).not.toBeInTheDocument()
    verseRender.unmount()

    render(<SettingsRoute mode="mushaf" onClose={vi.fn()} previousHash="#/m/1" />)
    const mushafDialog = await screen.findByRole('dialog', { name: 'Settings' })
    expect(within(mushafDialog).queryByText('Mushaf preview')).not.toBeInTheDocument()
    expect(within(mushafDialog).queryByLabelText('Mushaf preview')).not.toBeInTheDocument()
    expect(within(mushafDialog).queryByText('Verse preview')).not.toBeInTheDocument()
  })

  it('keeps settings control names unambiguous while the reader chrome remains mounted behind the shell', async () => {
    await resetReactDb()
    await seedLastSurface('#/s/1')
    window.history.replaceState(null, '', '#/settings')

    render(<App />)

    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeInTheDocument()
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

    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
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

    window.dispatchEvent(new CustomEvent('quranatlas-react-open-settings', { detail: { mode: 'verse' } }))

    expect(await screen.findByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#/s/2/24')
    expect(screen.getByTestId('mock-verse-reader')).toBe(reader)
  })

  it('uses the live visible verse when Settings switches a scrolled Verse route between Verse and Mushaf', async () => {
    await resetReactDb()
    await seedLastSurface('#/s/2')
    ;(globalThis as { __qaMockVisibleVerseKey?: string }).__qaMockVisibleVerseKey = '2:201'
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') {
        return new Response(JSON.stringify({
          version: 1,
          riwayah: 'qaloon',
          mushafEditionId: 'qalun-quran-ws-v1',
          pageCount: 604,
          pages: [
            { page: 77, assetPath: 'pages/077.svg', viewBox: '0 0 900 1379.25', firstVerse: { surah: 2, verse: 196 } },
          ],
          verseToPage: { '2:1': 1, '2:201': 77 },
        }), { headers: { 'Content-Type': 'application/json' }, status: 200 })
      }
      return new Response('{}', { status: 404 })
    }))
    window.history.replaceState(null, '', '#/s/2')

    render(<App />)

    expect(await screen.findByTestId('mock-verse-reader')).toHaveTextContent('Verse reader 2:1')
    window.dispatchEvent(new CustomEvent('quranatlas-react-open-settings', { detail: { mode: 'verse' } }))
    const dialog = await screen.findByRole('dialog', { name: 'Settings' })

    fireEvent.click(within(dialog).getByRole('tab', { name: 'Reader mode: Mushaf' }))

    await waitFor(() => expect(window.location.hash).toBe('#/m/77'))
    expect(screen.getByTestId('mock-mushaf-reader')).toHaveTextContent('Mushaf reader page 77')

    fireEvent.click(within(dialog).getByRole('tab', { name: 'Reader mode: Verse' }))

    await waitFor(() => expect(window.location.hash).toBe('#/s/2/201'))
    expect(screen.getByTestId('mock-verse-reader')).toHaveTextContent('Verse reader 2:201')
  })

  it('focuses the settings shell without scrolling the underlying reader', async () => {
    const focusCalls: Array<{ options?: FocusOptions }> = []
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function focusWithoutScrolling(this: HTMLElement, options?: FocusOptions) {
      focusCalls.push({ options })
    })

    render(<SettingsRoute mode="verse" onClose={vi.fn()} previousHash="#/s/2/24" />)

    await screen.findByRole('dialog', { name: 'Settings' })
    expect(focusCalls.some((call) => call.options?.preventScroll === true)).toBe(true)
    focusSpy.mockRestore()
  })

  it('emits preference changes outside the Settings render phase', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <>
        <ReaderPreferenceListenerProbe />
        <SettingsRoute mode="verse" onClose={vi.fn()} previousHash="#/s/1" />
      </>,
    )

    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
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

  it('persists Mushaf view mode changes from the settings shell', async () => {
    await resetReactDb()
    render(<SettingsRoute mode="mushaf" onClose={vi.fn()} previousHash="#/m/1" />)

    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Mushaf view mode: Width' }))

    expect(within(dialog).queryByRole('tab', { name: 'Mushaf view mode: Auto' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('tab', { name: 'Mushaf view mode: Width' })).toHaveAttribute('aria-selected', 'true')
    await waitFor(async () => {
      const db = await openReactDb()
      await expect(db.settings.get('mushafViewMode')).resolves.toEqual({ key: 'mushafViewMode', value: 'fit-width' })
    })
  })

  it('persists the Daily Wird reader status preference from Verse settings', async () => {
    await resetReactDb()

    render(<SettingsRoute mode="verse" onClose={vi.fn()} previousHash="#/s/1" />)

    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
    const toggle = within(dialog).getByRole('switch', { name: 'Show Daily Wird reader status' })
    expect(toggle).toBeChecked()

    fireEvent.click(toggle)

    expect(toggle).not.toBeChecked()
    await waitFor(async () => {
      const db = await openReactDb()
      await expect(db.settings.get('wirdReaderStatusVisible')).resolves.toEqual({ key: 'wirdReaderStatusVisible', value: false })
    })
  })

  it('lets settings switch the underlying reader mode without closing the shell', async () => {
    const onReaderModeChange = vi.fn()
    render(<SettingsRoute mode="verse" onClose={vi.fn()} onReaderModeChange={onReaderModeChange} previousHash="#/s/2/5" />)

    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Reader mode: Mushaf' }))

    expect(onReaderModeChange).toHaveBeenCalledWith('mushaf')
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  })

  it('scopes reader controls to the selected mode', async () => {
    const { rerender } = render(<SettingsRoute mode="verse" onClose={vi.fn()} previousHash="#/s/1" />)
    let dialog = await screen.findByRole('dialog', { name: 'Settings' })

    expect(within(dialog).getByRole('slider', { name: 'Font size' })).toBeInTheDocument()
    expect(within(dialog).getByRole('combobox', { name: 'Reading flow' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('tablist', { name: 'Mushaf view mode' })).not.toBeInTheDocument()

    rerender(<SettingsRoute mode="mushaf" onClose={vi.fn()} previousHash="#/m/1" />)
    dialog = await screen.findByRole('dialog', { name: 'Settings' })

    expect(within(dialog).queryByRole('slider', { name: 'Font size' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('combobox', { name: 'Reading flow' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('tablist', { name: 'Mushaf view mode' })).toBeInTheDocument()
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
    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
    const assets = within(dialog).getByRole('region', { name: 'Included assets' })

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
  })

  it('opens the settings shell for legacy #/assets URLs instead of rendering an assets page', async () => {
    await resetReactDb()
    await seedLastSurface('#/s/2/255')
    window.history.replaceState(null, '', '#/assets')

    render(<App />)

    expect(await screen.findByTestId('mock-verse-reader')).toHaveTextContent('Verse reader 2:255')
    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
    expect(within(dialog).getByRole('region', { name: 'Included assets' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Assets' })).not.toBeInTheDocument()
    await waitFor(() => expect(window.location.hash).toBe('#/s/2/255'))
  })

  it('persists theme, night mode, translation visibility, and typography changes', async () => {
    await resetReactDb()

    render(<SettingsRoute mode="verse" onClose={vi.fn()} previousHash="#/s/1" />)

    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Theme: Dark' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Night mode: On' }))
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Show translation' }))
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Show Daily Wird reader status' }))
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

    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Night mode: On' }))

    await waitFor(() => expect(listener).toHaveBeenCalled())
    expect(listener.mock.calls.at(-1)?.[0]).toMatchObject({
      detail: expect.objectContaining({ nightMode: 'on' }),
    })
    window.removeEventListener('quranatlas-react-reader-preferences-changed', listener)
  })
})
