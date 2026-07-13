import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { StrictMode, useState, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ReaderRoute } from '../../../src/app/routes/read/ReaderRoute'
import { MushafRoute } from '../../../src/app/routes/read/MushafRoute'
import type { MushafPageWindowEntry } from '../../../src/app/routes/read/useMushafPageWindow'
import { ReaderChrome } from '../../../src/components/reader/ReaderChrome'
import { ReaderPageShell } from '../../../src/components/reader/ReaderPageShell'
import { ReaderAssetGate } from '../../../src/components/reader/ReaderAssetGate'
import { useReaderInteractionSuspended } from '../../../src/components/reader/ReaderInteractionContext'
import { MushafPageViewer, retainReadyMushafPage } from '../../../src/components/reader/MushafPageViewer'
import { MUSHAF_CHROME_DISCOVERY_MS, useMushafChromeVisibility, type MushafChromePin } from '../../../src/components/reader/useMushafChromeVisibility'
import { clampMushafPageFraming, interpolateMushafPageFrame, mushafImagePlacement } from '../../../src/components/reader/mushaf-page-framing'
import {
  loadPreparedExternalMushafPage,
  loadMushafPageAsset,
  prepareExternalMushafImage,
  prepareReactInlineMushafSvg,
  selectExternalMushafSource,
  type MushafPageAssetState,
} from '../../../src/packs/mushaf-page-asset'
import { ReaderVerseSurface } from '../../../src/components/reader/ReaderVerseSurface'
import { loadReaderSurah, type ReaderCorpusState } from '../../../src/data/reader-corpus'
import { resolveTranslationFor } from '../../../src/data/verse-aliases'
import { openReactDb } from '../../../src/storage/db'
import { getLocalDayKey } from '../../../src/continuity/wird/progress'
import { subscribeWirdPlanChanged } from '../../../src/continuity/wird/store'

function jsonResponse(payload: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => payload,
  } as Response
}

const qaloonFatihah = {
  riwayah: 'qaloon',
  version: '10',
  sura_no: 1,
  sura_name_ar: 'الفَاتِحة',
  sura_name_en: 'Al-Fātiḥah',
  ayat: [
    { jozz: 1, page: '1', aya_no: 1, aya_text: 'اِ۬لْحَمْدُ لِلهِ رَبِّ اِ۬لْعَٰلَمِينَ' },
    { jozz: 1, page: '1', aya_no: 2, aya_text: 'اَ۬لرَّحْمَٰنِ اِ۬لرَّحِيمِ' },
    { jozz: 1, page: '1', aya_no: 3, aya_text: 'مَلِكِ يَوْمِ اِ۬لدِّينِۖ' },
    { jozz: 1, page: '1', aya_no: 4, aya_text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُۖ' },
    { jozz: 1, page: '1', aya_no: 5, aya_text: 'اُ۪هْدِنَا اَ۬لصِّرَٰطَ اَ۬لْمُسْتَقِيمَ' },
    { jozz: 1, page: '1', aya_no: 6, aya_text: 'صِرَٰطَ اَ۬لذِينَ أَنْعَمْتَ عَلَيْهِمْ' },
    { jozz: 1, page: '1', aya_no: 7, aya_text: 'غَيْرِ اِ۬لْمَغْضُوبِ عَلَيْهِمْ وَلَا اَ۬لضَّآلِّينَۖ' },
  ],
}

const bridgesFatihah = {
  translationId: 'bridges',
  translationVersion: 'qul-resource-179',
  surahNo: 1,
  intro: [],
  verses: [
    { key: '1:1', text: 'In the name of Allah, the All-Merciful, the Bestower of mercy.' },
    { key: '1:2', text: 'All praise be to Allah, Lord of all realms,' },
    { key: '1:3', text: 'the All-Merciful, the Bestower of mercy,' },
    { key: '1:4', text: 'Master [1] of the Day of Recompense.' },
    { key: '1:5', text: 'It is You we worship, and it is You we call for help.' },
    { key: '1:6', text: 'Guide us to the straight path:' },
    { key: '1:7', text: 'the path of those You have blessed, not those who have incurred (Your) wrath, nor those who have gone astray.' },
  ],
  footnotes: { '1': 'Qira’at: All except for Asem read it as: King of the Day of Recompense.' },
}

const fatihahAliases = {
  aliases: {
    '1': [
      { hafs: 1, warsh: null, qaloon: null },
      { hafs: 2, warsh: 1, qaloon: 1 },
      { hafs: 3, warsh: 2, qaloon: 2 },
      { hafs: 4, warsh: 3, qaloon: 3 },
      { hafs: 5, warsh: 4, qaloon: 4 },
      { hafs: 6, warsh: 5, qaloon: 5 },
      { hafs: 7, warsh: [6, 7], qaloon: [6, 7] },
    ],
  },
}

const surahIndex = [
  { n: 1, name: 'Al-Fatihah', name_ar: 'الفَاتِحة', counts: { hafs: 7, warsh: 7, qaloon: 7 } },
  { n: 2, name: 'Al-Baqarah', name_ar: 'البَقَرَة', counts: { hafs: 286, warsh: 285, qaloon: 285 } },
  { n: 114, name: 'An-Nas', name_ar: 'النَّاس', counts: { hafs: 6, warsh: 6, qaloon: 6 } },
]

const completeSurahIndex = Array.from({ length: 114 }, (_, index) => ({
  count: index === 1 ? 285 : 7,
  counts: { hafs: index === 1 ? 286 : 7, qaloon: index === 1 ? 285 : 7, warsh: index === 1 ? 285 : 7 },
  n: index + 1,
  name: `Surah ${index + 1}`,
  name_ar: `سورة ${index + 1}`,
}))

function readerFetchFixture() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json') return jsonResponse(qaloonFatihah)
    if (url === '/dataset/translations/bridges/001.json') return jsonResponse(bridgesFatihah)
    if (url === '/dataset/translations/_verse-aliases.json') return jsonResponse(fatihahAliases)
    if (url === '/dataset/surahs.json') return jsonResponse(surahIndex)
    if (url === '/dataset/knowledge/ayah/001.json') return jsonResponse({ surah: 1, version: 'knowledge-v1', ayahs: [] })
    if (url === '/dataset/knowledge/passages/001.json') return jsonResponse({ surah: 1, version: 'knowledge-v1', passages: [] })
    return jsonResponse({}, { ok: false, status: 404 })
  })
}

const mushafManifest = {
  version: 1,
  riwayah: 'qaloon',
  mushafEditionId: 'qalun-quran-ws-v1',
  sourceSlug: 'qalun',
  pageCount: 604,
  attribution: { provider: 'quran.ws', sourceUrl: 'https://pdf.quran.ws/qalun.pdf' },
  verseToPage: { '1:1': 1, '2:1': 2, '2:94': 15, '2:255': 42 },
  pages: Array.from({ length: 604 }, (_, index) => {
    const page = index + 1
    return {
      page,
      assetPath: `pages/${String(page).padStart(3, '0')}.svg`,
      viewBox: '0 0 120 180',
      displayViewBox: '0 0 120 180',
      bytes: 1120,
      sourcePdfUrl: `https://pdf.quran.ws/qalun/${String(page).padStart(3, '0')}.pdf`,
      firstVerse: page === 1 ? { surah: 1, verse: 1 } : page === 42 ? { surah: 2, verse: 251 } : { surah: 2, verse: page - 1 },
    }
  }),
}

const realMushafSvg = '<svg viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="180" fill="#fff"/><path d="M10 10h100v160H10z" fill="#000"/></svg>'
const inlineSvgExpected = {
  sourceViewBox: { x: 0, y: 0, width: 120, height: 180 },
  displayViewBox: { x: 0, y: 0, width: 120, height: 180 },
}

function boundaryPageFixture(page: number) {
  return {
    assetUrl: `/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/${String(page).padStart(3, '0')}.svg`,
    displaySize: { width: 120, height: 180 },
    firstVerse: page === 1 ? { surah: 1, verse: 1 } : { surah: 2, verse: page - 1 },
    manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
    mushafEditionId: 'qalun-quran-ws-v1',
    page,
    pageCount: 604,
    riwayah: 'qaloon' as const,
    riwayahLabel: 'Qalun',
  }
}
const mushafAssetIndex = {
  version: 1,
  assets: [
    {
      riwayah: 'qaloon',
      mushafEditionId: 'qalun-quran-ws-v1',
      manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
      pageCount: 604,
      files: [
        { url: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json' },
        ...Array.from({ length: 604 }, (_, index) => ({
          url: `/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/${String(index + 1).padStart(3, '0')}.svg`,
        })),
      ],
    },
  ],
}

function privateMushafPage(page: number) {
  const id = String(page).padStart(3, '0')
  return {
    page,
    firstVerse: page === 1 ? { surah: 1, verse: 1 } : { surah: 2, verse: page - 1 },
    framing: { textFrame: { x: 0.1, y: 0.05, width: 0.8, height: 0.9 }, sideLane: 'left' as const },
    media: {
      kind: 'external-image' as const,
      fallback: {
        assetPath: `pages/${id}-2136.webp`, bytes: 2136, sha256: 'a'.repeat(64), width: 2136, height: 2720, mimeType: 'image/webp' as const,
      },
      sources: [
        { assetPath: `pages/${id}-1280.webp`, bytes: 1280, sha256: 'b'.repeat(64), width: 1280, height: 1630, mimeType: 'image/webp' as const },
        { assetPath: `pages/${id}-2136.webp`, bytes: 2136, sha256: 'a'.repeat(64), width: 2136, height: 2720, mimeType: 'image/webp' as const },
      ],
    },
  }
}

const privateMushafManifest = {
  version: 2,
  riwayah: 'qaloon',
  mushafEditionId: 'qalun-furatiyyah-2023-v1',
  pageCount: 604,
  verseToPage: { '1:1': 1, '1:2': 1, '2:1': 2 },
  pages: Array.from({ length: 604 }, (_, index) => privateMushafPage(index + 1)),
}

const privateMushafAssetIndex = {
  version: 1,
  assets: [{
    riwayah: 'qaloon',
    mushafEditionId: 'qalun-furatiyyah-2023-v1',
    manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/manifest.json',
    pageCount: 604,
    version: 'v2',
    pageUrls: privateMushafManifest.pages.map((page) => `/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/${page.media.fallback.assetPath}`),
    files: [
      { url: '/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/manifest.json', bytes: 1 },
      ...privateMushafManifest.pages.flatMap((page) => page.media.sources.map((source) => ({
        url: `/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/${source.assetPath}`,
        ...source,
      }))),
    ],
  }],
}

function mushafFetchFixture() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mushafAssetIndex)
    if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') return jsonResponse(mushafManifest)
    if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg') {
      return {
        ok: true,
        status: 200,
        text: async () => realMushafSvg,
      } as Response
    }
    return jsonResponse({}, { ok: false, status: 404 })
  })
}

function failingSecondPageMushafFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mushafAssetIndex)
    if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') {
      return jsonResponse({
        ...mushafManifest,
        pages: mushafManifest.pages,
      })
    }
    if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg') {
      return { ok: true, status: 200, text: async () => realMushafSvg } as Response
    }
    if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/002.svg') {
      return { ok: false, status: 500, text: async () => '' } as Response
    }
    return jsonResponse({}, { ok: false, status: 404 })
  })
}

function ReaderSuspensionProbe() {
  return <div data-testid="reader-suspended">{String(useReaderInteractionSuspended())}</div>
}

describe('React reader coverage', () => {
  it('interpolates reviewed framing from Full to Text and falls open for invalid rectangles', () => {
    const frame = { x: 0.1, y: 0.05, width: 0.8, height: 0.9 }
    expect(clampMushafPageFraming(-4)).toBe(0)
    expect(clampMushafPageFraming(4)).toBe(1)
    expect(interpolateMushafPageFrame(frame, 0)).toEqual({ x: 0, y: 0, width: 1, height: 1 })
    expect(interpolateMushafPageFrame(frame, 1)).toEqual(frame)
    expect(mushafImagePlacement({ width: 2136, height: 2720 }, frame, 1).image.left).toBe('-12.5%')
    expect(mushafImagePlacement({ width: 2136, height: 2720 }, { x: 0, y: 0, width: 2, height: 1 }, 1).frame).toEqual({ x: 0, y: 0, width: 1, height: 1 })
  })
  function setWindowScrollY(value: number) {
    Object.defineProperty(window, 'scrollY', { configurable: true, value })
    Object.defineProperty(document.documentElement, 'scrollTop', { configurable: true, value })
  }

  it('renders reader chrome without a center surah/page title action', () => {
    render(<ReaderChrome mode="verse" onOpenNavigation={vi.fn()} onOpenSettings={vi.fn()} />)

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Toggle surah header/i })).toBeNull()
    expect(screen.queryByText('الفَاتِحة')).toBeNull()
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeInTheDocument()
    expect(screen.queryByRole('tablist', { name: 'Reader mode' })).toBeNull()
  })

  it('runs one discovery interval only after the first readable Mushaf page', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ readable, revision }) => {
        void revision
        return useMushafChromeVisibility(readable)
      },
      { initialProps: { readable: false, revision: 'loading' } },
    )

    expect(result.current.visible).toBe(false)
    expect(vi.getTimerCount()).toBe(0)

    rerender({ readable: true, revision: 'preview' })
    expect(result.current.visible).toBe(true)
    expect(vi.getTimerCount()).toBe(1)

    act(() => vi.advanceTimersByTime(MUSHAF_CHROME_DISCOVERY_MS - 1))
    expect(result.current.visible).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.visible).toBe(false)

    rerender({ readable: true, revision: 'full-promotion' })
    rerender({ readable: false, revision: 'retry' })
    rerender({ readable: true, revision: 'preference-change' })
    expect(result.current.visible).toBe(false)
    expect(vi.getTimerCount()).toBe(0)

    act(() => result.current.toggle())
    expect(result.current.visible).toBe(true)
    act(() => result.current.toggle())
    expect(result.current.visible).toBe(false)
    act(() => result.current.reveal())
    expect(result.current.visible).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('pauses the discovery remainder for every chrome pin source', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ readable }) => useMushafChromeVisibility(readable),
      { initialProps: { readable: false } },
    )
    rerender({ readable: true })
    act(() => vi.advanceTimersByTime(900))

    for (const source of ['focus', 'drawer', 'interaction', 'recovery'] satisfies MushafChromePin[]) {
      act(() => result.current.setPinned(source, true))
      expect(result.current.visible).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
    }
    act(() => vi.advanceTimersByTime(10_000))
    for (const source of ['focus', 'drawer', 'interaction'] satisfies MushafChromePin[]) {
      act(() => result.current.setPinned(source, false))
      expect(vi.getTimerCount()).toBe(0)
    }
    act(() => result.current.setPinned('recovery', false))
    expect(vi.getTimerCount()).toBe(1)
    act(() => vi.advanceTimersByTime(1_599))
    expect(result.current.visible).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.visible).toBe(false)
  })

  it('arms the full discovery interval when the first readable page arrives while pinned', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ readable }) => useMushafChromeVisibility(readable),
      { initialProps: { readable: false } },
    )

    act(() => result.current.setPinned('recovery', true))
    rerender({ readable: true })
    expect(result.current.visible).toBe(true)
    expect(vi.getTimerCount()).toBe(0)

    act(() => result.current.setPinned('recovery', false))
    expect(vi.getTimerCount()).toBe(1)
    act(() => vi.advanceTimersByTime(MUSHAF_CHROME_DISCOVERY_MS - 1))
    expect(result.current.visible).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.visible).toBe(false)
  })

  it('does not resume a consumed discovery interval after later chrome pins', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useMushafChromeVisibility(true))

    act(() => vi.advanceTimersByTime(MUSHAF_CHROME_DISCOVERY_MS))
    expect(result.current.visible).toBe(false)
    expect(vi.getTimerCount()).toBe(0)

    act(() => result.current.reveal())
    for (const source of ['recovery', 'focus'] satisfies MushafChromePin[]) {
      act(() => result.current.setPinned(source, true))
      act(() => result.current.setPinned(source, false))
      expect(result.current.visible).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
    }

    act(() => vi.advanceTimersByTime(MUSHAF_CHROME_DISCOVERY_MS))
    expect(result.current.visible).toBe(true)
  })

  it('clears an armed discovery timer when the Mushaf route session unmounts', () => {
    vi.useFakeTimers()
    const { rerender, unmount } = renderHook(
      ({ readable }) => useMushafChromeVisibility(readable),
      { initialProps: { readable: false } },
    )
    rerender({ readable: true })
    expect(vi.getTimerCount()).toBe(1)

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('retains the one-shot discovery timer through the app StrictMode effect replay', () => {
    vi.useFakeTimers()
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>
    const { result } = renderHook(() => useMushafChromeVisibility(true), { wrapper })

    expect(result.current.visible).toBe(true)
    expect(vi.getTimerCount()).toBe(1)
    act(() => vi.advanceTimersByTime(MUSHAF_CHROME_DISCOVERY_MS))
    expect(result.current.visible).toBe(false)
  })

  it('removes hidden top and bottom chrome from accessible navigation', () => {
    const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg, inlineSvgExpected)
    const resolved = boundaryPageFixture(42)
    render(
      <>
        <ReaderChrome mode="mushaf" visible={false} />
        <MushafPageViewer chromeVisible={false} inlineSvg={inlineSvg} onToggleBookmark={vi.fn()} resolved={resolved} />
      </>,
    )

    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Mushaf page navigation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open navigation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bookmark Mushaf page 42' })).not.toBeInTheDocument()
    const hiddenNavigation = screen.getByRole('navigation', { hidden: true })
    expect(hiddenNavigation).toHaveAttribute('aria-label', 'Primary navigation')
    expect(hiddenNavigation).toHaveAttribute('inert')
  })

  it('renders one Arabic contextual title and pins top chrome only while focus remains inside it', () => {
    const onChromePinChange = vi.fn()
    render(
      <ReaderPageShell chromeVisible label="Page 42" mode="mushaf" onChromePinChange={onChromePinChange} surahLabel="البَقَرَة">
        <div />
      </ReaderPageShell>,
    )

    const title = screen.getByText('البَقَرَة')
    expect(title).toHaveAttribute('dir', 'rtl')
    expect(title).toHaveAttribute('lang', 'ar')
    expect(screen.queryByRole('heading', { name: 'البَقَرَة' })).not.toBeInTheDocument()

    const navigation = screen.getByRole('button', { name: 'Open navigation' })
    const settings = screen.getByRole('button', { name: 'Open settings' })
    fireEvent.focus(navigation)
    expect(onChromePinChange).toHaveBeenLastCalledWith('focus', true)
    fireEvent.blur(navigation, { relatedTarget: settings })
    expect(onChromePinChange).not.toHaveBeenCalledWith('focus', false)
    fireEvent.focus(settings)
    fireEvent.blur(settings)
    expect(onChromePinChange).toHaveBeenLastCalledWith('focus', false)
  })

  it('pins the bottom dock across internal focus movement and Escape only requests reveal', () => {
    const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg, inlineSvgExpected)
    const onChromePinChange = vi.fn()
    const onToggleChrome = vi.fn()
    const resolved = boundaryPageFixture(42)
    const { rerender } = render(
      <MushafPageViewer
        chromeVisible
        fitWidth
        inlineSvg={inlineSvg}
        onChromePinChange={onChromePinChange}
        onToggleBookmark={vi.fn()}
        onToggleChrome={onToggleChrome}
        resolved={resolved}
      />,
    )
    const next = screen.getByRole('button', { name: 'Next Mushaf page' })
    const previous = screen.getByRole('button', { name: 'Previous Mushaf page' })
    fireEvent.focus(next)
    expect(onChromePinChange).toHaveBeenLastCalledWith('focus', true)
    fireEvent.blur(next, { relatedTarget: previous })
    expect(onChromePinChange).not.toHaveBeenCalledWith('focus', false)
    fireEvent.focus(previous)
    fireEvent.blur(previous)
    expect(onChromePinChange).toHaveBeenLastCalledWith('focus', false)
    fireEvent.scroll(screen.getByRole('region', { name: 'Scrollable Mushaf pages' }))
    expect(onToggleChrome).not.toHaveBeenCalled()

    rerender(
      <MushafPageViewer
        chromeVisible={false}
        fitWidth
        inlineSvg={inlineSvg}
        onChromePinChange={onChromePinChange}
        onToggleBookmark={vi.fn()}
        onToggleChrome={onToggleChrome}
        resolved={resolved}
      />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onToggleChrome).toHaveBeenLastCalledWith(true)
  })

  it('toggles chrome with Space only from the focused Mushaf stage', () => {
    const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg, inlineSvgExpected)
    const onToggleChrome = vi.fn()
    render(
      <MushafPageViewer
        chromeVisible
        fitWidth
        inlineSvg={inlineSvg}
        onToggleBookmark={vi.fn()}
        onToggleChrome={onToggleChrome}
        resolved={boundaryPageFixture(42)}
      />,
    )

    const stage = screen.getByRole('region', { name: 'Scrollable Mushaf pages' })
    stage.focus()
    expect(fireEvent.keyDown(stage, { key: ' ' })).toBe(false)
    expect(onToggleChrome).toHaveBeenLastCalledWith(false)

    fireEvent.keyDown(stage, { key: 'Enter' })
    expect(onToggleChrome).toHaveBeenCalledTimes(1)

    const next = screen.getByRole('button', { name: 'Next Mushaf page' })
    next.focus()
    expect(fireEvent.keyDown(next, { key: ' ' })).toBe(true)
    expect(onToggleChrome).toHaveBeenCalledTimes(1)
  })

  it('autohides Verse reader chrome on scroll down and reveals it on scroll up', () => {
    setWindowScrollY(0)
    render(
      <ReaderPageShell label="الفَاتِحة" mode="verse">
        <div />
      </ReaderPageShell>,
    )

    const nav = screen.getByRole('navigation', { name: 'Primary navigation' })
    expect(nav).toHaveAttribute('data-visible', 'true')

    setWindowScrollY(96)
    fireEvent.scroll(window)

    expect(nav).toHaveAttribute('data-visible', 'false')

    setWindowScrollY(40)
    fireEvent.scroll(window)

    expect(nav).toHaveAttribute('data-visible', 'true')
  })

  it('suspends reader interaction while navigation is open and exposes a fallback focus target', () => {
    render(
      <ReaderPageShell label="الفَاتِحة" mode="verse">
        <ReaderSuspensionProbe />
      </ReaderPageShell>,
    )

    const readerMain = screen.getByRole('main', { name: 'Verse reader' })
    expect(readerMain).toHaveAttribute('id', 'reader-main')
    readerMain.focus()
    expect(readerMain).toHaveFocus()
    expect(screen.getByTestId('reader-suspended')).toHaveTextContent('false')

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))

    expect(screen.getByTestId('reader-suspended')).toHaveTextContent('true')
  })

  it('resolves continuation translation aliases without duplicating text', () => {
    const aliases = { '7': [{ hafs: 2, warsh: [2, 3], qaloon: [2, 3] }] }
    expect(resolveTranslationFor({ surah: 7, verse: 3, riwayah: 'qaloon', translations: { '7:2': 'guidance' }, aliases })).toEqual({
      primaryAyah: 2,
      role: 'continuation',
      sourceKey: '7:2',
      text: null,
    })
  })

  it('loads the active Quran text style path and never falls back to preview verses', async () => {
    const fetcher = readerFetchFixture()
    const controller = new AbortController()

    const result = await loadReaderSurah(1, { fetcher, signal: controller.signal })

    expect(fetcher).toHaveBeenCalledWith('/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json', expect.objectContaining({ signal: controller.signal }))
    expect((result as ReaderCorpusState).status).toBe('ready')
    if (result.status !== 'ready') throw new Error(`Expected ready reader corpus, got ${result.status}`)
    expect(result.verses).toHaveLength(7)
    expect(result.verses.at(0)).toMatchObject({
      arabic: 'اِ۬لْحَمْدُ لِلهِ رَبِّ اِ۬لْعَٰلَمِينَ',
      translation: 'All praise be to Allah, Lord of all realms,',
    })
    expect(result.verses.map((verse) => verse.translation).join(' ')).not.toMatch(/Verse text unavailable/i)
  })

  it('returns an explicit unavailable state when required Quran text is missing', async () => {
    const result = await loadReaderSurah(1, {
      fetcher: vi.fn(async () => jsonResponse({}, { ok: false, status: 404 })),
    })

    expect(result.status).toBe('unavailable')
  })

  it('renders full Al-Fatihah, standalone basmala, footnotes, verse selection, and no Tafsir controls', async () => {
    vi.stubGlobal('fetch', readerFetchFixture())
    render(<ReaderRoute surah={1} ayah={1} />)
    expect(await screen.findByRole('main', { name: /verse reader/i })).toBeInTheDocument()
    expect(await screen.findByText(/Surah 1 · 7 verses/i)).toBeInTheDocument()
    expect(await screen.findByLabelText('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ')).toBeInTheDocument()
    expect(await screen.findByTestId('verse-1:7')).toBeInTheDocument()
    expect(screen.getByText(/All praise be to Allah, Lord of all realms/i)).toBeInTheDocument()
    const footnote = screen.getByRole('button', { name: /footnote 1/i })
    fireEvent.click(footnote)
    expect(screen.getByRole('note')).toHaveTextContent(/King of the Day of Recompense/i)
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark verse 5' }))
    await expect.poll(async () => (await (await openReactDb()).settings.get('currentPosition'))?.value).toEqual({ surah: 1, verse: 5 })
    expect(screen.queryByText(/tafsir/i)).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('keeps the Daily Wird card out of reader content and opens the drawer detail from compact chrome status', async () => {
    const today = getLocalDayKey()
    const db = await openReactDb()
    await db.settings.bulkPut([
      {
        key: 'wirdPlan',
        value: {
          id: 'reader-wird-status',
          startRef: { surah: 1, verse: 1 },
          endRef: { surah: 1, verse: 7 },
          targetDays: 1,
          targetEndOn: today,
          startedOn: today,
          unit: 'verse',
          reminder: { browserNotifications: 'default', enabled: false, time: '08:00' },
          progress: {
            completedThroughRef: { surah: 1, verse: 4 },
            dayKey: today,
            lastReadRef: { surah: 1, verse: 4 },
            nextRef: { surah: 1, verse: 5 },
            todayEndRef: { surah: 1, verse: 7 },
            todayStartRef: { surah: 1, verse: 1 },
          },
          history: [],
        },
      },
      { key: 'wirdReaderStatusVisible', value: true },
    ])
    vi.stubGlobal('fetch', readerFetchFixture())

    render(<ReaderRoute surah={1} ayah={1} />)

    expect(await screen.findByTestId('verse-1:7')).toBeInTheDocument()

    const status = screen.getByRole('button', { name: /Daily Wird: 57% today, 3 verses left/i })

    fireEvent.click(status)

    const drawer = screen.getByRole('dialog', { name: 'Navigation' })
    expect(within(drawer).getByRole('heading', { name: 'Daily Wird' })).toBeInTheDocument()
    expect(await within(drawer).findByRole('button', { name: /Continue Wird/i })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('applies reader preference changes live without refetching the verse corpus', async () => {
    const fetcher = readerFetchFixture()
    vi.stubGlobal('fetch', fetcher)
    render(<ReaderRoute surah={1} ayah={1} />)

    expect(await screen.findByTestId('verse-1:7')).toBeInTheDocument()
    const quranFetchesBefore = fetcher.mock.calls.filter(([input]) => String(input).includes('/dataset/quran-text/')).length

    window.dispatchEvent(new CustomEvent('quranatlas-react-reader-preferences-changed', {
      detail: {
        fontSize: 'xl',
        lineSpacing: 'lg',
        readerMargin: 'lg',
        translationVisible: false,
        verseSpacing: 'lg',
        wordSpacing: 'lg',
      },
    }))

    expect(document.documentElement.dataset.fontSize).toBe('xl')
    expect(document.documentElement.dataset.lineSpacing).toBe('lg')
    expect(document.documentElement.dataset.readerMargin).toBe('lg')
    expect(document.documentElement.dataset.verseSpacing).toBe('lg')
    expect(document.documentElement.dataset.wordSpacing).toBe('lg')
    await waitFor(() => expect(screen.queryByText(/All praise be to Allah/i)).not.toBeInTheDocument())
    expect(fetcher.mock.calls.filter(([input]) => String(input).includes('/dataset/quran-text/'))).toHaveLength(quranFetchesBefore)
    vi.unstubAllGlobals()
  })

  it('renders current product previous and next surah quick navigation controls', () => {
    const corpus: ReaderCorpusState = {
      status: 'ready',
      footnotes: {},
      riwayah: 'qaloon',
      surah: {
        number: 1,
        nameArabic: 'الفَاتِحة',
        nameEnglish: 'Al-Fatihah',
        verseCount: 7,
      },
      translationVisible: true,
      verses: [
        {
          arabic: 'اِ۬لْحَمْدُ لِلهِ رَبِّ اِ۬لْعَٰلَمِينَ',
          footnotes: {},
          key: '1:1',
          surah: 1,
          translation: 'All praise be to Allah, Lord of all realms,',
          translationRole: 'identity',
          verse: 1,
        },
      ],
    }
    window.location.hash = '#/s/1'

    render(<ReaderVerseSurface corpus={corpus} surahIndex={surahIndex} />)

    expect(screen.getByRole('button', { name: 'Previous surah: An-Nas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next surah: Al-Baqarah' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next surah: Al-Baqarah' }))

    expect(window.location.hash).toBe('#/s/2')
  })

  it('marks bookmarked verses and toggles bookmarks from verse number controls', () => {
    const onToggleBookmark = vi.fn()
    const corpus: ReaderCorpusState = {
      status: 'ready',
      footnotes: {},
      riwayah: 'qaloon',
      surah: {
        number: 1,
        nameArabic: 'الفَاتِحة',
        nameEnglish: 'Al-Fatihah',
        verseCount: 7,
      },
      translationVisible: true,
      verses: [
        {
          arabic: 'اِ۬لْحَمْدُ لِلهِ رَبِّ اِ۬لْعَٰلَمِينَ',
          footnotes: {},
          key: '1:1',
          surah: 1,
          translation: 'All praise be to Allah, Lord of all realms,',
          translationRole: 'identity',
          verse: 1,
        },
      ],
    }

    render(
      <ReaderVerseSurface
        bookmarkedVerseKeys={new Set(['1:1'])}
        corpus={corpus}
        onToggleBookmark={onToggleBookmark}
      />,
    )

    const verseNumber = screen.getByRole('button', { name: 'Remove bookmark for verse 1' })
    expect(screen.getByText('All praise be to Allah, Lord of all realms,')).toBeInTheDocument()
    expect(verseNumber).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(verseNumber)

    expect(onToggleBookmark).toHaveBeenCalledWith('1:1')
  })

  it('renders mushaf route with an explicit asset gate', () => {
    render(<MushafRoute page={1} assetState="missing" />)
    expect(screen.getByRole('main', { name: /mushaf reader/i })).toBeInTheDocument()
    expect(screen.getByText(/page pack is not installed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage assets' })).toBeInTheDocument()
  })

  it('only renders the asset-management action when a caller supplies its behavior', () => {
    const onManageAssets = vi.fn()
    const { rerender } = render(<ReaderAssetGate label="Qalun" state="missing" />)
    expect(screen.queryByRole('button', { name: 'Manage assets' })).not.toBeInTheDocument()

    rerender(<ReaderAssetGate label="Qalun" onManageAssets={onManageAssets} state="missing" />)
    fireEvent.click(screen.getByRole('button', { name: 'Manage assets' }))
    expect(onManageAssets).toHaveBeenCalledOnce()
  })

  it('renders reader mode switching as a compact header icon instead of fixed page tabs', () => {
    const onModeChange = vi.fn()
    const { rerender } = render(<ReaderChrome mode="verse" onModeChange={onModeChange} />)

    expect(screen.queryByRole('tablist', { name: 'Reader mode' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Mushaf' })).toBeNull()
    const mushafToggle = screen.getByRole('button', { name: 'Switch to Mushaf view' })
    fireEvent.click(mushafToggle)
    expect(onModeChange).toHaveBeenCalledWith('mushaf')
    expect(mushafToggle).not.toHaveAttribute('aria-pressed')

    rerender(<ReaderChrome mode="mushaf" onModeChange={onModeChange} />)
    expect(screen.getByRole('button', { name: 'Switch to Verse view' })).not.toHaveAttribute('aria-pressed')
  })

  it('switches from the Verse route to the Mushaf page containing the active verse', async () => {
    const readerFetch = readerFetchFixture()
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') return jsonResponse(mushafManifest)
      return readerFetch(input)
    }))
    window.location.hash = '#/s/2/255'

    render(<ReaderRoute surah={2} ayah={255} />)
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Mushaf view' }))

    await waitFor(() => expect(window.location.hash).toBe('#/m/42'))
    vi.unstubAllGlobals()
  })

  it('switches from a Mushaf page to the first verse on that page', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mushafAssetIndex)
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') return jsonResponse(mushafManifest)
      if (url.endsWith('/pages/042.svg')) return { ok: true, status: 200, text: async () => realMushafSvg } as Response
      return jsonResponse({}, { ok: false, status: 404 })
    }))
    window.location.hash = '#/m/42'

    render(<MushafRoute page={42} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Switch to Verse view' }))

    await waitFor(() => expect(window.location.hash).toBe('#/s/2/251'))
    vi.unstubAllGlobals()
  })

  it('renders current product Mushaf chrome without the React mode tabs on a readable page', async () => {
    vi.stubGlobal('fetch', mushafFetchFixture())
    window.location.hash = '#/m/1'

    render(<MushafRoute page={1} />)

    const chrome = await screen.findByRole('navigation', { name: 'Primary navigation' })
    expect(within(chrome).queryByText('Page 1')).not.toBeInTheDocument()
    expect(within(chrome).queryByRole('tab', { name: 'Verse' })).not.toBeInTheDocument()
    expect(within(chrome).queryByRole('tab', { name: 'Mushaf' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist', { name: 'Reader mode' })).toBeNull()
    expect(within(chrome).getByRole('button', { name: 'Switch to Verse view' })).not.toHaveAttribute('aria-pressed')
    vi.unstubAllGlobals()
  })

  it('keeps Mushaf chrome hidden before the first readable page', () => {
    render(<MushafRoute page={1} assetState="missing" />)

    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument()
    const hiddenNavigation = screen.getByRole('navigation', { hidden: true })
    expect(hiddenNavigation).toHaveAttribute('aria-label', 'Primary navigation')
    expect(hiddenNavigation).toHaveAttribute('aria-hidden', 'true')
  })

  it('sanitizes real Mushaf SVG markup and rejects unsafe SVG before injection', () => {
    const safe = prepareReactInlineMushafSvg(realMushafSvg, inlineSvgExpected)
    expect(safe.markup).toContain('qa-react-mushaf-svg')
    expect(safe.markup).toContain('var(--qa-react-mushaf-ground)')
    expect(safe.viewBoxText).toBe('0 0 120 180')

    const legacyTokenized = prepareReactInlineMushafSvg('<svg viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="180" fill="var(--qa-mushaf-ground)"/><path d="M10 10h100v160H10z" fill="var(--qa-mushaf-ink)"/></svg>', inlineSvgExpected)
    expect(legacyTokenized.markup).toContain('var(--qa-react-mushaf-ground)')
    expect(legacyTokenized.markup).toContain('var(--qa-react-mushaf-ink)')
    expect(legacyTokenized.markup).not.toContain('var(--qa-mushaf-ground)')
    expect(legacyTokenized.markup).not.toContain('var(--qa-mushaf-ink)')

    const quranWsExpected = { sourceViewBox: { x: 0, y: 0, width: 900, height: 1379.25 }, displayViewBox: { x: 60, y: 60, width: 790, height: 1270 } }
    const quranWsPage = prepareReactInlineMushafSvg('<svg viewBox="0 0 900 1379.25" xmlns="http://www.w3.org/2000/svg"><rect width="900" height="1379.25" fill="var(--qa-mushaf-ground)"/></svg>', quranWsExpected)
    expect(quranWsPage.markup).toContain('viewBox="60 60 790 1270"')
    expect(quranWsPage.viewBox).toMatchObject(quranWsExpected.displayViewBox)
    expect(quranWsPage.viewBoxText).toBe('0 0 900 1379.25')

    const inkCroppedPage = prepareReactInlineMushafSvg('<svg viewBox="0 0 900 1379.25" xmlns="http://www.w3.org/2000/svg"><rect width="900" height="1379.25" fill="var(--qa-mushaf-ground)"/><path d="M217.2 166.4 L718.82 166.4 L718.82 946.68 L217.2 946.68 Z" fill="var(--qa-mushaf-ink)"/></svg>', { ...quranWsExpected, displayViewBox: { x: 193.2, y: 142.4, width: 549.62, height: 828.28 } })
    expect(inkCroppedPage.markup).toContain('viewBox="193.2 142.4 549.62 828.28"')
    expect(inkCroppedPage.viewBox).toMatchObject({ x: 193.2, y: 142.4, width: 549.62, height: 828.28 })
    expect(inkCroppedPage.viewBoxText).toBe('0 0 900 1379.25')

    const clippedInkPage = prepareReactInlineMushafSvg('<svg viewBox="0 0 900 1379.25" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="clip-1"><path d="M217.13 414.72 L718.86 414.72 L718.86 947 L217.13 947 Z"/></clipPath></defs><rect width="900" height="1379.25" fill="var(--qa-mushaf-ground)"/><g clip-path="url(#clip-1)"><path d="M637 619.54 C637.95 166.4 718.82 946.68 217.2 946.68 Z" fill="var(--qa-mushaf-ink)"/></g></svg>', { ...quranWsExpected, displayViewBox: { x: 193.13, y: 390.72, width: 549.73, height: 580.28 } })
    expect(clippedInkPage.markup).toContain('viewBox="193.13 390.72 549.73 580.28"')
    expect(clippedInkPage.viewBox).toMatchObject({ x: 193.13, y: 390.72, width: 549.73, height: 580.28 })

    const tinyExpected = { sourceViewBox: { x: 0, y: 0, width: 1, height: 1 }, displayViewBox: { x: 0, y: 0, width: 1, height: 1 } }
    expect(() => prepareReactInlineMushafSvg('<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>', tinyExpected)).toThrow(/unsafe/i)
    expect(() => prepareReactInlineMushafSvg('<svg viewBox="0 0 1 1"><image href="https://evil.test/x.png"/></svg>', tinyExpected)).toThrow(/unsafe/i)
  })

  it('loads the active edition-aware Mushaf manifest and page SVG without falling back to placeholders', async () => {
    const fetcher = mushafFetchFixture()
    const controller = new AbortController()

    const state = await loadMushafPageAsset({
      fetcher,
      mushafEditionId: 'qalun-quran-ws-v1',
      page: 1,
      riwayah: 'qaloon',
      signal: controller.signal,
    })

    expect(fetcher).toHaveBeenCalledWith('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json', expect.objectContaining({ signal: controller.signal }))
    expect(fetcher).toHaveBeenCalledWith('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg', expect.objectContaining({ signal: controller.signal }))
    expect((state as MushafPageAssetState).status).toBe('ready')
    if (state.status !== 'ready') throw new Error(`Expected ready Mushaf state, got ${state.status}`)
    if (state.media.kind !== 'inline-svg') throw new Error('Expected inline SVG media')
    expect(state.media.inlineSvg.markup).toContain('<svg')
    expect(state.media.inlineSvg.markup).not.toMatch(/placeholder/i)
    expect(state.resolved.pageCount).toBe(604)
    expect(state.resolved.displaySize).toEqual({ width: state.media.inlineSvg.viewBox.width, height: state.media.inlineSvg.viewBox.height })
  })

  it('reports manifest mismatches and aborts as explicit non-ready states', async () => {
    const mismatch = await loadMushafPageAsset({
      fetcher: vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mushafAssetIndex)
        return jsonResponse({ ...mushafManifest, mushafEditionId: 'other-edition' })
      }),
      mushafEditionId: 'qalun-quran-ws-v1',
      page: 1,
      riwayah: 'qaloon',
    })
    expect(mismatch.status).toBe('error')

    const controller = new AbortController()
    controller.abort()
    const aborted = await loadMushafPageAsset({
      fetcher: mushafFetchFixture(),
      mushafEditionId: 'qalun-quran-ws-v1',
      page: 1,
      riwayah: 'qaloon',
      signal: controller.signal,
    })
    expect(aborted.status).toBe('aborted')
  })

  it('rejects a V1 display viewBox outside the manifest source rectangle', async () => {
    const state = await loadMushafPageAsset({
      fetcher: vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mushafAssetIndex)
        return jsonResponse({
          ...mushafManifest,
          pages: [{ ...mushafManifest.pages[0], displayViewBox: '110 0 20 180' }],
        })
      }),
      mushafEditionId: 'qalun-quran-ws-v1',
      page: 1,
      riwayah: 'qaloon',
    })
    expect(state.status).toBe('error')
  })

  it('renders the real Mushaf route without the production placeholder label', async () => {
    vi.stubGlobal('fetch', mushafFetchFixture())
    render(<MushafRoute page={1} />)

    expect(await screen.findByRole('main', { name: /mushaf reader/i })).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: /mushaf page 1, qaloon/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/mushaf page placeholder/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Auto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Single' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Scroll' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /jump from mushaf page 1 of 604/i })).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('keeps the current Mushaf page mounted and commits an unready neighbor automatically', async () => {
    let resolvePageTwo: ((response: Response) => void) | null = null
    const pageTwo = new Promise<Response>((resolve) => {
      resolvePageTwo = resolve
    })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mushafAssetIndex)
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') {
        return jsonResponse({
          ...mushafManifest,
          pages: mushafManifest.pages,
        })
      }
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg') {
        return { ok: true, status: 200, text: async () => realMushafSvg } as Response
      }
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/002.svg') return pageTwo
      return jsonResponse({}, { ok: false, status: 404 })
    }))

    window.location.hash = '#/m/1'
    render(<MushafRoute page={1} />)
    expect(await screen.findByRole('img', { name: /mushaf page 1, qaloon, beginning near 1:1/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next Mushaf page' }))
    expect(screen.getByRole('img', { name: /mushaf page 1, qaloon, beginning near 1:1/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading page 2')

    resolvePageTwo?.({ ok: true, status: 200, text: async () => '<svg viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="180" fill="#fff"/><path d="M15 15h90v150H15z" fill="#000"/></svg>' } as Response)
    expect(await screen.findByRole('img', { name: /mushaf page 2, qaloon, beginning near 2:1/i })).toBeInTheDocument()
    expect(window.location.hash).toBe('#/m/2')
    vi.unstubAllGlobals()
  })

  it('keeps the Surah title bound to the retained visible page until a requested page commits', async () => {
    let resolvePageTwo: ((response: Response) => void) | null = null
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mushafAssetIndex)
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') return jsonResponse(mushafManifest)
      if (url.endsWith('/pages/001.svg')) return { ok: true, status: 200, text: async () => realMushafSvg } as Response
      if (url.endsWith('/pages/002.svg')) return new Promise<Response>((resolve) => { resolvePageTwo = resolve })
      return jsonResponse({}, { ok: false, status: 404 })
    }))
    window.location.hash = '#/m/1'
    render(<MushafRoute page={1} />)
    expect(await screen.findByText('سورة 1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next Mushaf page' }))
    expect(screen.getByText('سورة 1')).toBeInTheDocument()
    expect(screen.queryByText('سورة 2')).not.toBeInTheDocument()

    resolvePageTwo?.({ ok: true, status: 200, text: async () => realMushafSvg } as Response)
    expect(await screen.findByRole('img', { name: /mushaf page 2, qaloon/i })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(await screen.findByText('سورة 2')).toBeInTheDocument()
    expect(screen.queryByText('سورة 1')).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('cancels pending navigation when the shell-owned Navigation drawer opens', async () => {
    let resolvePageTwo: ((response: Response) => void) | null = null
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mushafAssetIndex)
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') return jsonResponse(mushafManifest)
      if (url.endsWith('/pages/001.svg')) return { ok: true, status: 200, text: async () => realMushafSvg } as Response
      if (url.endsWith('/pages/002.svg')) return new Promise<Response>((resolve) => { resolvePageTwo = resolve })
      return jsonResponse({}, { ok: false, status: 404 })
    }))
    window.location.hash = '#/m/1'
    render(<MushafRoute page={1} />)
    expect(await screen.findByRole('img', { name: /mushaf page 1, qaloon/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next Mushaf page' }))
    expect(screen.getByRole('status')).toHaveTextContent('Loading page 2')

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeInTheDocument()
    resolvePageTwo?.({ ok: true, status: 200, text: async () => realMushafSvg } as Response)
    await waitFor(() => expect(screen.getByRole('img', { name: /mushaf page 1, qaloon/i })).toBeInTheDocument())
    expect(window.location.hash).toBe('#/m/1')
    vi.unstubAllGlobals()
  })

  it('lets a newer unready page request replace the earlier destination', async () => {
    const resolvers = new Map<number, (response: Response) => void>()
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mushafAssetIndex)
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') return jsonResponse(mushafManifest)
      const match = /\/pages\/(041|042|043)\.svg$/.exec(url)
      if (!match) return jsonResponse({}, { ok: false, status: 404 })
      const requestedPage = Number(match[1])
      if (requestedPage === 42) return { ok: true, status: 200, text: async () => realMushafSvg } as Response
      return new Promise<Response>((resolve) => resolvers.set(requestedPage, resolve))
    }))
    window.location.hash = '#/m/42'
    render(<MushafRoute page={42} />)
    expect(await screen.findByRole('img', { name: /mushaf page 42, qaloon/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next Mushaf page' }))
    expect(screen.getByRole('status')).toHaveTextContent('Loading page 43')
    fireEvent.click(screen.getByRole('button', { name: 'Previous Mushaf page' }))
    expect(screen.getByRole('status')).toHaveTextContent('Loading page 41')

    resolvers.get(43)?.({ ok: true, status: 200, text: async () => realMushafSvg } as Response)
    await waitFor(() => expect(screen.getByRole('img', { name: /mushaf page 42, qaloon/i })).toBeInTheDocument())
    expect(window.location.hash).toBe('#/m/42')
    resolvers.get(41)?.({ ok: true, status: 200, text: async () => realMushafSvg } as Response)
    expect(await screen.findByRole('img', { name: /mushaf page 41, qaloon/i })).toBeInTheDocument()
    expect(window.location.hash).toBe('#/m/41')
    vi.unstubAllGlobals()
  })

  it('cancels a pending page when Settings suspends reader interaction', async () => {
    let resolvePageTwo: ((response: Response) => void) | null = null
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mushafAssetIndex)
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') return jsonResponse(mushafManifest)
      if (url.endsWith('/pages/001.svg')) return { ok: true, status: 200, text: async () => realMushafSvg } as Response
      if (url.endsWith('/pages/002.svg')) return new Promise<Response>((resolve) => { resolvePageTwo = resolve })
      return jsonResponse({}, { ok: false, status: 404 })
    }))
    window.location.hash = '#/m/1'
    const { rerender } = render(<MushafRoute interactionSuspended={false} page={1} />)
    expect(await screen.findByRole('img', { name: /mushaf page 1, qaloon/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next Mushaf page' }))

    rerender(<MushafRoute interactionSuspended page={1} />)
    resolvePageTwo?.({ ok: true, status: 200, text: async () => realMushafSvg } as Response)
    await waitFor(() => expect(screen.getByRole('img', { name: /mushaf page 1, qaloon/i })).toBeInTheDocument())
    expect(window.location.hash).toBe('#/m/1')

    rerender(<MushafRoute interactionSuspended={false} page={1} />)
    await waitFor(() => expect(screen.getByRole('img', { name: /mushaf page 1, qaloon/i })).toBeInTheDocument())
    expect(screen.queryByRole('img', { name: /mushaf page 2, qaloon/i })).not.toBeInTheDocument()
    expect(window.location.hash).toBe('#/m/1')
    vi.unstubAllGlobals()
  })

  it('does not surface cancelled pending recovery while Settings is open', async () => {
    let resolvePageTwo: ((response: Response) => void) | null = null
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mushafAssetIndex)
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') return jsonResponse(mushafManifest)
      if (url.endsWith('/pages/001.svg')) return { ok: true, status: 200, text: async () => realMushafSvg } as Response
      if (url.endsWith('/pages/002.svg')) return new Promise<Response>((resolve) => { resolvePageTwo = resolve })
      return jsonResponse({}, { ok: false, status: 404 })
    }))
    window.location.hash = '#/m/1'
    const { rerender } = render(<MushafRoute interactionSuspended={false} page={1} />)
    expect(await screen.findByRole('img', { name: /mushaf page 1, qaloon/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next Mushaf page' }))

    rerender(<MushafRoute interactionSuspended page={1} />)
    resolvePageTwo?.(jsonResponse({}, { ok: false, status: 404 }))

    await waitFor(() => expect(screen.getByRole('img', { name: /mushaf page 1, qaloon/i })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Retry page 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stay on page 1' })).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('advances the initial visible Daily Wird position once after metadata becomes ready', async () => {
    const today = getLocalDayKey()
    const db = await openReactDb()
    await db.settings.put({
      key: 'wirdPlan',
      value: {
        endRef: { surah: 2, verse: 3 },
        history: [],
        id: 'mushaf-delayed-initial-wird',
        progress: {
          completedThroughRef: null,
          dayKey: today,
          lastReadRef: null,
          nextRef: { surah: 1, verse: 1 },
          todayEndRef: { surah: 2, verse: 3 },
          todayStartRef: { surah: 1, verse: 1 },
        },
        reminder: { browserNotifications: 'default', enabled: false, time: '08:00' },
        startRef: { surah: 1, verse: 1 },
        startedOn: today,
        targetDays: 1,
        targetEndOn: today,
        unit: 'verse',
      },
    })
    let resolveSurahIndex: ((response: Response) => void) | null = null
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/surahs.json') return new Promise<Response>((resolve) => { resolveSurahIndex = resolve })
      if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mushafAssetIndex)
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') {
        return jsonResponse({ ...mushafManifest, verseToPage: { ...mushafManifest.verseToPage, '1:7': 1 } })
      }
      if (url.endsWith('/pages/001.svg')) return { ok: true, status: 200, text: async () => realMushafSvg } as Response
      return jsonResponse({}, { ok: false, status: 404 })
    }))
    window.location.hash = '#/m/1?wird=1'
    const changes: unknown[] = []
    const unsubscribe = subscribeWirdPlanChanged((plan) => changes.push(plan))
    render(<MushafRoute page={1} />)
    expect(await screen.findByRole('img', { name: /mushaf page 1, qaloon/i })).toBeInTheDocument()
    expect(changes).toHaveLength(0)

    resolveSurahIndex?.(jsonResponse(completeSurahIndex))
    await waitFor(() => expect(changes).toHaveLength(1))
    expect(changes[0]).toMatchObject({ progress: { lastReadRef: { surah: 1, verse: 1 } } })
    expect(await screen.findByRole('button', { name: /Daily Wird: 10% today, 9 verses left today/i })).toBeInTheDocument()
    expect(changes).toHaveLength(1)
    unsubscribe()
    vi.unstubAllGlobals()
  })

  it('advances a queued forward Daily Wird position once when metadata resolves after the page commit', async () => {
    const today = getLocalDayKey()
    const db = await openReactDb()
    await db.settings.put({
      key: 'wirdPlan',
      value: {
        endRef: { surah: 2, verse: 3 },
        history: [],
        id: 'mushaf-delayed-queued-wird',
        progress: {
          completedThroughRef: null,
          dayKey: today,
          lastReadRef: null,
          nextRef: { surah: 1, verse: 1 },
          todayEndRef: { surah: 2, verse: 3 },
          todayStartRef: { surah: 1, verse: 1 },
        },
        reminder: { browserNotifications: 'default', enabled: false, time: '08:00' },
        startRef: { surah: 1, verse: 1 },
        startedOn: today,
        targetDays: 1,
        targetEndOn: today,
        unit: 'verse',
      },
    })
    let resolveSurahIndex: ((response: Response) => void) | null = null
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/surahs.json') return new Promise<Response>((resolve) => { resolveSurahIndex = resolve })
      if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mushafAssetIndex)
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') {
        return jsonResponse({ ...mushafManifest, verseToPage: { ...mushafManifest.verseToPage, '1:7': 1 } })
      }
      if (/\/pages\/(001|002)\.svg$/.test(url)) return { ok: true, status: 200, text: async () => realMushafSvg } as Response
      return jsonResponse({}, { ok: false, status: 404 })
    }))
    window.location.hash = '#/m/1?wird=1'
    const changes: unknown[] = []
    const unsubscribe = subscribeWirdPlanChanged((plan) => changes.push(plan))
    render(<MushafRoute page={1} />)
    expect(await screen.findByRole('img', { name: /mushaf page 1, qaloon/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next Mushaf page' }))
    expect(await screen.findByRole('img', { name: /mushaf page 2, qaloon/i })).toBeInTheDocument()
    expect(changes).toHaveLength(0)

    resolveSurahIndex?.(jsonResponse(completeSurahIndex))
    await waitFor(() => expect(changes).toHaveLength(1))
    expect(changes[0]).toMatchObject({ progress: { lastReadRef: { surah: 1, verse: 7 } } })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(await screen.findByRole('button', { name: /Daily Wird: 70% today, 3 verses left today/i })).toBeInTheDocument()
    expect(changes).toHaveLength(1)
    unsubscribe()
    vi.unstubAllGlobals()
  })

  it('advances a shared initial and forward Daily Wird boundary exactly once before a later distinct boundary', async () => {
    const today = getLocalDayKey()
    const db = await openReactDb()
    await db.settings.put({
      key: 'wirdPlan',
      value: {
        endRef: { surah: 2, verse: 285 },
        history: [],
        id: 'mushaf-same-boundary-wird',
        progress: {
          completedThroughRef: null,
          dayKey: today,
          lastReadRef: null,
          nextRef: { surah: 2, verse: 281 },
          todayEndRef: { surah: 2, verse: 285 },
          todayStartRef: { surah: 2, verse: 281 },
        },
        reminder: { browserNotifications: 'default', enabled: false, time: '08:00' },
        startRef: { surah: 2, verse: 281 },
        startedOn: today,
        targetDays: 1,
        targetEndOn: today,
        unit: 'verse',
      },
    })
    const sameBoundaryManifest = {
      ...mushafManifest,
      pages: mushafManifest.pages.map((entry) => {
        if (entry.page === 48) return { ...entry, firstVerse: { surah: 2, verse: 281 } }
        if (entry.page === 49) return { ...entry, firstVerse: { surah: 2, verse: 282 } }
        if (entry.page === 50) return { ...entry, firstVerse: { surah: 2, verse: 284 } }
        return entry
      }),
      verseToPage: {
        ...mushafManifest.verseToPage,
        '2:281': 48,
        '2:282': 49,
        '2:283': 49,
        '2:284': 50,
      },
    }
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/surahs.json') return jsonResponse(completeSurahIndex)
      if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mushafAssetIndex)
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') return jsonResponse(sameBoundaryManifest)
      if (/\/pages\/(047|048|049|050)\.svg$/.test(url)) return { ok: true, status: 200, text: async () => realMushafSvg } as Response
      return jsonResponse({}, { ok: false, status: 404 })
    }))
    window.location.hash = '#/m/48?wird=1'
    const changes: unknown[] = []
    const unsubscribe = subscribeWirdPlanChanged((plan) => changes.push(plan))
    render(<MushafRoute page={48} />)
    expect(await screen.findByRole('img', { name: /mushaf page 48, qaloon/i })).toBeInTheDocument()
    await waitFor(() => expect(changes).toHaveLength(1))
    expect(changes[0]).toMatchObject({ progress: { lastReadRef: { surah: 2, verse: 281 } } })

    fireEvent.click(screen.getByRole('button', { name: 'Next Mushaf page' }))
    expect(await screen.findByRole('img', { name: /mushaf page 49, qaloon/i })).toBeInTheDocument()
    await waitFor(() => expect(changes).toHaveLength(1))

    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Next Mushaf page' }))
    expect(await screen.findByRole('img', { name: /mushaf page 50, qaloon/i })).toBeInTheDocument()
    await waitFor(() => expect(changes).toHaveLength(2))
    expect(changes[1]).toMatchObject({ progress: { lastReadRef: { surah: 2, verse: 283 } } })
    window.location.hash = '#/m/48'
    unsubscribe()
    vi.unstubAllGlobals()
  })

  it('advances Daily Wird once for a forward queued commit and not for backward movement', async () => {
    const today = getLocalDayKey()
    const db = await openReactDb()
    await db.settings.put({
      key: 'wirdPlan',
      value: {
        endRef: { surah: 2, verse: 3 },
        history: [],
        id: 'mushaf-queued-wird',
        progress: {
          completedThroughRef: null,
          dayKey: today,
          lastReadRef: { surah: 1, verse: 1 },
          nextRef: { surah: 1, verse: 1 },
          todayEndRef: { surah: 2, verse: 3 },
          todayStartRef: { surah: 1, verse: 1 },
        },
        reminder: { browserNotifications: 'default', enabled: false, time: '08:00' },
        startRef: { surah: 1, verse: 1 },
        startedOn: today,
        targetDays: 1,
        targetEndOn: today,
        unit: 'verse',
      },
    })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/surahs.json') return jsonResponse(completeSurahIndex)
      if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mushafAssetIndex)
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') {
        return jsonResponse({ ...mushafManifest, verseToPage: { ...mushafManifest.verseToPage, '1:7': 1 } })
      }
      if (/\/pages\/(001|002)\.svg$/.test(url)) return { ok: true, status: 200, text: async () => realMushafSvg } as Response
      return jsonResponse({}, { ok: false, status: 404 })
    }))
    window.location.hash = '#/m/1?wird=1'
    const changes: unknown[] = []
    const unsubscribe = subscribeWirdPlanChanged((plan) => changes.push(plan))
    render(<MushafRoute page={1} />)
    expect(await screen.findByRole('img', { name: /mushaf page 1, qaloon/i })).toBeInTheDocument()
    await waitFor(() => expect(changes).toHaveLength(1))

    fireEvent.click(screen.getByRole('button', { name: 'Next Mushaf page' }))
    expect(await screen.findByRole('img', { name: /mushaf page 2, qaloon/i })).toBeInTheDocument()
    await waitFor(() => expect(changes).toHaveLength(2))

    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Previous Mushaf page' }))
    expect(await screen.findByRole('img', { name: /mushaf page 1, qaloon/i })).toBeInTheDocument()
    expect(changes).toHaveLength(2)
    window.location.hash = '#/m/1'
    unsubscribe()
    vi.unstubAllGlobals()
  })

  it('canonicalizes an out-of-range Mushaf page to the manifest boundary', async () => {
    const onReplaceHash = vi.fn()
    const finalPage = {
      ...mushafManifest.pages[0],
      assetPath: 'pages/604.svg',
      firstVerse: { surah: 114, verse: 1 },
      page: 604,
    }
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/mushaf-assets.json') {
        return jsonResponse({
          ...mushafAssetIndex,
          assets: mushafAssetIndex.assets,
        })
      }
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') {
        return jsonResponse({
          ...mushafManifest,
          pages: mushafManifest.pages.map((entry) => entry.page === 604 ? finalPage : entry),
          verseToPage: { '114:1': 604 },
        })
      }
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/604.svg') {
        return { ok: true, status: 200, text: async () => realMushafSvg } as Response
      }
      return jsonResponse({}, { ok: false, status: 404 })
    }))

    render(<MushafRoute onReplaceHash={onReplaceHash} page={999} />)

    expect(await screen.findByRole('img', { name: /mushaf page 604, qaloon, beginning near 114:1/i })).toBeInTheDocument()
    await waitFor(() => expect(onReplaceHash).toHaveBeenCalledWith('#/m/604'))
    vi.unstubAllGlobals()
  })

  it('keeps a ready requested page visible when a neighbor fails', async () => {
    const fetcher = failingSecondPageMushafFetch()
    vi.stubGlobal('fetch', fetcher)

    render(<MushafRoute page={1} />)

    expect(await screen.findByRole('img', { name: /mushaf page 1, qaloon/i })).toBeInTheDocument()
    await waitFor(() => expect(fetcher.mock.calls.some(([input]) => String(input).endsWith('/pages/002.svg'))).toBe(true))
    expect(screen.queryByText('Mushaf page pack could not be loaded.')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /mushaf page 1, qaloon/i })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('keeps page 42 truthful while distant requested page 100 fails, retries, or is cancelled', async () => {
    let page100Attempts = 0
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/mushaf-assets.json') {
        return jsonResponse({
          ...mushafAssetIndex,
          assets: [{
            ...mushafAssetIndex.assets[0],
            files: mushafAssetIndex.assets[0].files,
          }],
        })
      }
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json') {
        return jsonResponse({
          ...mushafManifest,
          pages: mushafManifest.pages.map((entry) => entry.page === 100
            ? { ...entry, firstVerse: { surah: 5, verse: 1 } }
            : entry),
        })
      }
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/042.svg') {
        return { ok: true, status: 200, text: async () => realMushafSvg } as Response
      }
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/100.svg') {
        page100Attempts += 1
        return { ok: false, status: 500, text: async () => '' } as Response
      }
      return jsonResponse({}, { ok: false, status: 404 })
    }))
    window.location.hash = '#/m/42'
    const onReplaceHash = vi.fn((hash: string) => window.history.replaceState(null, '', hash))
    const { rerender } = render(<MushafRoute onReplaceHash={onReplaceHash} page={42} />)
    expect(await screen.findByRole('img', { name: /mushaf page 42, qaloon/i })).toBeInTheDocument()

    window.location.hash = '#/m/100'
    rerender(<MushafRoute onReplaceHash={onReplaceHash} page={100} />)

    expect(await screen.findByText('Mushaf page 100 could not be loaded. Page 42 remains open.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /mushaf page 42, qaloon/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Mushaf page 42', { exact: true })).toHaveTextContent('42')
    expect(screen.getByRole('button', { name: 'Bookmark Mushaf page 42' })).toBeInTheDocument()
    expect(screen.queryByText('Mushaf page pack could not be loaded.')).not.toBeInTheDocument()

    const attemptsBeforeRetry = page100Attempts
    fireEvent.click(screen.getByRole('button', { name: 'Retry page 100' }))
    await waitFor(() => expect(page100Attempts).toBeGreaterThan(attemptsBeforeRetry))
    await screen.findByRole('button', { name: 'Stay on page 42' })

    fireEvent.click(screen.getByRole('button', { name: 'Stay on page 42' }))
    expect(onReplaceHash).toHaveBeenCalledWith('#/m/42')
    expect(window.location.hash).toBe('#/m/42')
    vi.unstubAllGlobals()
  })

  it.each([
    ['single', 'auto' as const],
    ['continuous', 'continuous' as const],
  ])('retains the actual V2 external page in %s rendering when a distant requested window fails', (_label, viewMode) => {
    const page = 42
    const descriptor = privateMushafManifest.pages[page - 1]!.media.sources[1]!
    const source = {
      ...descriptor,
      assetUrl: `/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/${descriptor.assetPath}`,
    }
    const visibleAsset = {
      media: { kind: 'external-image' as const, source },
      resolved: {
        assetUrl: source.assetUrl,
        displaySize: { height: source.height, width: source.width },
        firstVerse: { surah: 2, verse: 41 },
        framing: privateMushafManifest.pages[page - 1]!.framing,
        mushafEditionId: 'qalun-furatiyyah-2023-v1',
        page,
        pageCount: 604,
        riwayah: 'qaloon' as const,
        riwayahLabel: 'Qaloon',
      },
      status: 'ready' as const,
    }
    const distantEntries: MushafPageWindowEntry[] = Array.from({ length: 5 }, (_, index) => {
      const distantPage = 98 + index
      const resolved = { ...visibleAsset.resolved, page: distantPage }
      const descriptor = {
        kind: 'inline-svg' as const,
        assetUrl: `/pages/${distantPage}.svg`,
        displayViewBox: { height: 1, width: 1, x: 0, y: 0 },
        resolved,
        sourceViewBox: { height: 1, width: 1, x: 0, y: 0 },
      }
      return index === 2
        ? { descriptor, error: new Error('Mushaf page preparation failed'), page: distantPage, status: 'contract-error' }
        : { attempt: 0, descriptor, page: distantPage, status: 'loading' }
    })
    const retainedEntries = retainReadyMushafPage(distantEntries, visibleAsset)
    const retained = retainedEntries.find((entry) => entry.page === page)
    expect(retained?.status).toBe('ready')
    if (retained?.status !== 'ready') throw new Error('Expected retained ready page')
    expect(retained.asset.media).toEqual({ kind: 'external-image', source })
    expect(retained.rendition).toBe('full')

    render(
      <MushafPageViewer
        inlineSvg={{ markup: '', viewBox: { height: 1, width: 1, x: 0, y: 0 }, viewBoxText: '0 0 1 1' }}
        pages={distantEntries}
        resolved={visibleAsset.resolved}
        retainedPage={visibleAsset}
        viewMode={viewMode}
      />,
    )

    expect(screen.getByRole('img', { name: /Mushaf page 42, Qaloon/i })).toBeInTheDocument()
  })

  it('retains a V2 width-1280 preview truthfully while its full upgrade is pending', () => {
    const page = 42
    const pageManifest = privateMushafManifest.pages[page - 1]!
    const previewDescriptor = pageManifest.media.sources[0]!
    const fullDescriptor = pageManifest.media.sources[1]!
    const previewSource = {
      ...previewDescriptor,
      assetUrl: `/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/${previewDescriptor.assetPath}`,
    }
    const retainedAsset = {
      media: { kind: 'external-image' as const, source: previewSource },
      resolved: {
        assetUrl: `/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/${fullDescriptor.assetPath}`,
        displaySize: { height: fullDescriptor.height, width: fullDescriptor.width },
        firstVerse: { surah: 2, verse: 41 },
        framing: pageManifest.framing,
        mushafEditionId: 'qalun-furatiyyah-2023-v1',
        page,
        pageCount: 604,
        riwayah: 'qaloon' as const,
        riwayahLabel: 'Qaloon',
      },
      status: 'ready' as const,
    }
    const pendingFullUpgrade: MushafPageWindowEntry = {
      asset: retainedAsset,
      page,
      rendition: 'preview',
      status: 'ready',
      upgradeStatus: 'loading',
    }

    const retained = retainReadyMushafPage([], pendingFullUpgrade.asset)[0]

    expect(retained).toMatchObject({
      asset: { media: { kind: 'external-image', source: { width: 1280 } } },
      rendition: 'preview',
      status: 'ready',
      upgradeStatus: 'idle',
    })
  })

  it('renders the requested-page error gate when that page fails', async () => {
    vi.stubGlobal('fetch', failingSecondPageMushafFetch())

    render(<MushafRoute page={2} />)

    expect(await screen.findByText('Mushaf page pack could not be loaded.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /mushaf page 2/i })).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('opens the same Surah, Juz, and Bookmarks drawer from the Mushaf reader chrome', async () => {
    vi.stubGlobal('fetch', mushafFetchFixture())
    render(<MushafRoute page={1} />)

    expect(await screen.findByRole('img', { name: /mushaf page 1, qaloon/i })).toBeInTheDocument()
    expect(screen.queryByRole('tablist', { name: 'Navigation mode' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    const drawer = screen.getByRole('dialog', { name: 'Navigation' })
    expect(drawer).toBeInTheDocument()
    expect(within(drawer).queryByRole('tablist', { name: 'Navigation mode' })).toBeNull()
    expect(within(drawer).getByRole('tablist', { name: 'Read source' })).toBeInTheDocument()
    expect(within(drawer).getByRole('tab', { name: 'Surah' })).toHaveAttribute('aria-selected', 'true')
    expect(within(drawer).getByRole('tab', { name: 'Juz' })).toHaveAttribute('aria-selected', 'false')
    expect(within(drawer).getByRole('tab', { name: 'Bookmarks' })).toHaveAttribute('aria-selected', 'false')
    vi.unstubAllGlobals()
  })

  it('renders owned Mushaf navigation and keeps physical keyboard direction', () => {
    const onNavigate = vi.fn()
    const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg, inlineSvgExpected)
    const resolved = {
      assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/042.svg',
      displaySize: { width: 120, height: 180 },
      firstVerse: { surah: 2, verse: 251 },
      manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
      mushafEditionId: 'qalun-quran-ws-v1',
      page: 42,
      pageCount: 604,
      riwayah: 'qaloon' as const,
      riwayahLabel: 'Qalun',
    }
    const pages: MushafPageWindowEntry[] = [41, 42, 43].map((page) => ({
      asset: {
        media: { kind: 'inline-svg' as const, inlineSvg },
        resolved: { ...resolved, assetUrl: resolved.assetUrl.replace('042', String(page).padStart(3, '0')), page },
        status: 'ready' as const,
      },
      page,
      rendition: 'full' as const,
      status: 'ready' as const,
      upgradeStatus: 'idle' as const,
    }))

    render(
      <MushafPageViewer
        chromeVisible
        fitWidth
        inlineSvg={inlineSvg}
        onNavigate={onNavigate}
        pages={pages}
        resolved={resolved}
      />,
    )

    expect(screen.getByLabelText('Mushaf page 42')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.queryByText('42 / 604')).not.toBeInTheDocument()
    const nextPageButton = screen.getByRole('button', { name: 'Next Mushaf page' })
    nextPageButton.focus()
    fireEvent.click(nextPageButton)
    expect(onNavigate).toHaveBeenLastCalledWith(43)
    expect(screen.getByRole('region', { name: 'Scrollable Mushaf pages' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Previous Mushaf page' }))
    expect(onNavigate).toHaveBeenLastCalledWith(41)

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(onNavigate).toHaveBeenLastCalledWith(43)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onNavigate).toHaveBeenLastCalledWith(41)
  })

  it('hides committed page controls after moving focus from the dock to the new stage', () => {
    const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg, inlineSvgExpected)
    const current = boundaryPageFixture(42)
    const next = boundaryPageFixture(43)
    const pages: MushafPageWindowEntry[] = [current, next].map((resolved) => ({
      asset: { media: { kind: 'inline-svg' as const, inlineSvg }, resolved, status: 'ready' as const },
      page: resolved.page,
      rendition: 'full' as const,
      status: 'ready' as const,
      upgradeStatus: 'idle' as const,
    }))
    function CommitHarness() {
      const [resolved, setResolved] = useState(current)
      const chrome = useMushafChromeVisibility(true)
      return (
        <MushafPageViewer
          chromeVisible={chrome.visible}
          fitWidth
          inlineSvg={inlineSvg}
          onNavigate={(page) => {
            if (page !== 43) return
            chrome.hide()
            setResolved(next)
          }}
          onToggleChrome={(visible) => visible ? chrome.reveal() : chrome.hide()}
          pages={pages}
          resolved={resolved}
        />
      )
    }
    render(<CommitHarness />)

    const nextPageButton = screen.getByRole('button', { name: 'Next Mushaf page' })
    nextPageButton.focus()
    fireEvent.click(nextPageButton)

    expect(screen.queryByRole('navigation', { name: 'Mushaf page navigation' })).not.toBeInTheDocument()
    const replacementStage = screen.getByRole('region', { name: 'Scrollable Mushaf pages' })
    expect(replacementStage).toHaveFocus()

    fireEvent.blur(replacementStage)
    fireEvent.focus(replacementStage)
    expect(screen.getByRole('navigation', { name: 'Mushaf page navigation' })).toBeInTheDocument()
  })

  it('sends each non-ready button or arrow destination through the request callback once', () => {
    const onRequestPage = vi.fn()
    const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg, inlineSvgExpected)
    const resolved = {
      assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/042.svg',
      displaySize: { width: 120, height: 180 },
      firstVerse: { surah: 2, verse: 251 },
      mushafEditionId: 'qalun-quran-ws-v1',
      page: 42,
      pageCount: 604,
      riwayah: 'qaloon' as const,
      riwayahLabel: 'Qalun',
    }
    const descriptor = {
      kind: 'inline-svg' as const,
      assetUrl: resolved.assetUrl.replace('042', '043'),
      displayViewBox: inlineSvg.viewBox,
      resolved: { ...resolved, page: 43 },
      sourceViewBox: inlineSvg.viewBox,
    }
    render(
      <MushafPageViewer
        inlineSvg={inlineSvg}
        onRequestPage={onRequestPage}
        pages={[
          {
            asset: { media: { kind: 'inline-svg', inlineSvg }, resolved, status: 'ready' },
            page: 42,
            rendition: 'full',
            status: 'ready',
            upgradeStatus: 'idle',
          },
          { attempt: 0, descriptor, page: 43, status: 'loading' },
        ]}
        resolved={resolved}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Next Mushaf page' }))
    expect(onRequestPage).toHaveBeenCalledTimes(1)
    expect(onRequestPage).toHaveBeenLastCalledWith(43)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(onRequestPage).toHaveBeenCalledTimes(2)
    expect(onRequestPage).toHaveBeenLastCalledWith(43)
  })

  it('uses unavailable copy only for confirmed missing pages and keeps background status silent', () => {
    const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg, inlineSvgExpected)
    const resolved = {
      assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/042.svg',
      displaySize: { width: 120, height: 180 },
      firstVerse: { surah: 2, verse: 251 },
      mushafEditionId: 'qalun-quran-ws-v1',
      page: 42,
      pageCount: 604,
      riwayah: 'qaloon' as const,
      riwayahLabel: 'Qalun',
    }
    const descriptor = {
      kind: 'inline-svg' as const,
      assetUrl: resolved.assetUrl,
      displayViewBox: inlineSvg.viewBox,
      sourceViewBox: inlineSvg.viewBox,
      resolved,
    }
    const { rerender } = render(
      <MushafPageViewer
        inlineSvg={inlineSvg}
        pages={[
          { attempt: 1, descriptor: { ...descriptor, resolved: { ...resolved, page: 43 } }, page: 43, status: 'retrying' },
          { descriptor, error: new Error('Unsafe SVG'), page: 42, status: 'contract-error' },
        ]}
        resolved={resolved}
      />,
    )

    expect(screen.getByText('Mushaf page 42 could not be loaded.')).toBeInTheDocument()
    expect(screen.queryByText(/page 42 is unavailable/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('status', { name: /page 43/i })).not.toBeInTheDocument()

    rerender(
      <MushafPageViewer
        inlineSvg={inlineSvg}
        pages={[{ descriptor, page: 42, reason: '404', status: 'confirmed-missing' }]}
        resolved={resolved}
      />,
    )
    expect(screen.getByText('Mushaf page 42 is unavailable.')).toBeInTheDocument()
  })

  it('exposes every ready page image in continuous Mushaf scroll mode', () => {
    const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg, inlineSvgExpected)
    const resolved = {
      assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/042.svg',
      displaySize: { width: 120, height: 180 },
      firstVerse: { surah: 2, verse: 251 },
      manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
      mushafEditionId: 'qalun-quran-ws-v1',
      page: 42,
      pageCount: 604,
      riwayah: 'qaloon' as const,
      riwayahLabel: 'Qalun',
    }

    render(
      <MushafPageViewer
        inlineSvg={inlineSvg}
        pages={[41, 42, 43].map((page): MushafPageWindowEntry => ({
          asset: {
            media: { kind: 'inline-svg' as const, inlineSvg },
            resolved: { ...resolved, assetUrl: resolved.assetUrl.replace('042', String(page).padStart(3, '0')), page },
            status: 'ready' as const,
          },
          page,
          rendition: 'full',
          status: 'ready' as const,
          upgradeStatus: 'idle',
        }))}
        resolved={resolved}
        viewMode="continuous"
      />,
    )

    expect(screen.getByRole('img', { name: /mushaf page 41/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /mushaf page 42/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /mushaf page 43/i })).toBeInTheDocument()
  })

  it('adapts legacy adjacent pages into accessible continuous images', () => {
    const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg, inlineSvgExpected)
    const resolved = {
      assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg',
      displaySize: { width: 120, height: 180 },
      firstVerse: { surah: 1, verse: 1 },
      manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
      mushafEditionId: 'qalun-quran-ws-v1',
      page: 1,
      pageCount: 604,
      riwayah: 'qaloon' as const,
      riwayahLabel: 'Qalun',
    }

    render(
      <MushafPageViewer
        adjacentPages={{
          next: {
            inlineSvg,
            resolved: { ...resolved, assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/002.svg', page: 2 },
          },
        }}
        inlineSvg={inlineSvg}
        resolved={resolved}
        viewMode="continuous"
      />,
    )

    expect(screen.getByRole('img', { name: /mushaf page 1/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /mushaf page 2/i })).toBeInTheDocument()
  })

  it('exposes only the current page image in Single Mushaf mode', () => {
    const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg, inlineSvgExpected)
    const resolved = {
      assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/042.svg',
      displaySize: { width: 120, height: 180 },
      firstVerse: { surah: 2, verse: 251 },
      manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
      mushafEditionId: 'qalun-quran-ws-v1',
      page: 42,
      pageCount: 604,
      riwayah: 'qaloon' as const,
      riwayahLabel: 'Qalun',
    }

    render(
      <MushafPageViewer
        fitWidth
        inlineSvg={inlineSvg}
        pages={[41, 42, 43].map((page): MushafPageWindowEntry => ({
          asset: {
            media: { kind: 'inline-svg' as const, inlineSvg },
            resolved: { ...resolved, assetUrl: resolved.assetUrl.replace('042', String(page).padStart(3, '0')), page },
            status: 'ready' as const,
          },
          page,
          rendition: 'full',
          status: 'ready' as const,
          upgradeStatus: 'idle',
        }))}
        resolved={resolved}
        viewMode="fit-page"
      />,
    )

    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.getByRole('img', { name: /mushaf page 42/i })).toBeInTheDocument()
  })

  it('restores focus when a new Single Fit-width stage installs', () => {
    const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg, inlineSvgExpected)
    const resolved = {
      assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/042.svg',
      displaySize: { width: 120, height: 180 },
      firstVerse: { surah: 2, verse: 251 },
      manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
      mushafEditionId: 'qalun-quran-ws-v1',
      page: 42,
      pageCount: 604,
      riwayah: 'qaloon' as const,
      riwayahLabel: 'Qalun',
    }
    const { rerender } = render(
      <MushafPageViewer fitWidth inlineSvg={inlineSvg} resolved={resolved} />,
    )
    screen.getByRole('region', { name: 'Scrollable Mushaf pages' }).focus()

    rerender(
      <MushafPageViewer
        fitWidth
        inlineSvg={inlineSvg}
        resolved={{ ...resolved, assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/043.svg', page: 43 }}
      />,
    )

    expect(screen.getByRole('region', { name: 'Scrollable Mushaf pages' })).toHaveFocus()
  })

  it('disables visible Mushaf actions at the physical page boundaries', () => {
    const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg, inlineSvgExpected)
    const boundaryPage = (page: number) => ({
      assetUrl: `/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/${String(page).padStart(3, '0')}.svg`,
      displaySize: { width: 120, height: 180 },
      firstVerse: { surah: 1, verse: 1 },
      manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
      mushafEditionId: 'qalun-quran-ws-v1',
      page,
      pageCount: 604,
      riwayah: 'qaloon' as const,
      riwayahLabel: 'Qalun',
    })
    const { rerender } = render(
      <MushafPageViewer inlineSvg={inlineSvg} resolved={boundaryPage(1)} />,
    )

    expect(screen.getByRole('button', { name: 'Previous Mushaf page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next Mushaf page' })).toBeEnabled()

    rerender(<MushafPageViewer inlineSvg={inlineSvg} resolved={boundaryPage(604)} />)

    expect(screen.getByRole('button', { name: 'Next Mushaf page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous Mushaf page' })).toBeEnabled()
  })

  it('lets Mushaf pages toggle a page bookmark without adding page chrome tabs', () => {
    const onToggleBookmark = vi.fn()
    const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg, inlineSvgExpected)

    render(
      <MushafPageViewer
        bookmarked
        inlineSvg={inlineSvg}
        onToggleBookmark={onToggleBookmark}
        resolved={{
          assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/042.svg',
          displaySize: { width: 120, height: 180 },
          firstVerse: { surah: 2, verse: 251 },
          manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
          mushafEditionId: 'qalun-quran-ws-v1',
          page: 42,
          pageCount: 604,
          riwayah: 'qaloon',
          riwayahLabel: 'Qalun',
        }}
      />,
    )

    expect(screen.queryByRole('tablist', { name: 'Navigation mode' })).toBeNull()
    const bookmark = screen.getByRole('button', { name: 'Remove bookmark for Mushaf page 42' })
    expect(bookmark).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(bookmark)

    expect(onToggleBookmark).toHaveBeenCalledTimes(1)
  })

  it('prepares only a validated V2 external descriptor and selects the declared rendition by purpose', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(privateMushafAssetIndex)
      if (url === '/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/manifest.json') return jsonResponse(privateMushafManifest)
      return jsonResponse({}, { ok: false, status: 404 })
    })

    const page = await loadPreparedExternalMushafPage({
      fetcher,
      mushafEditionId: 'qalun-furatiyyah-2023-v1',
      page: 1,
      riwayah: 'qaloon',
    })

    expect(page).toMatchObject({
      kind: 'external-image',
      page: 1,
      firstVerse: { surah: 1, verse: 1 },
      lastVerse: { surah: 1, verse: 2 },
      framing: privateMushafManifest.pages[0].framing,
    })
    expect(selectExternalMushafSource(page, 'current')).toMatchObject({
      assetPath: 'pages/001-2136.webp', width: 2136,
      assetUrl: '/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/pages/001-2136.webp',
    })
    expect(selectExternalMushafSource(page, 'preview')).toMatchObject({
      assetPath: 'pages/001-1280.webp', width: 1280,
      assetUrl: '/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/pages/001-1280.webp',
    })
  })

  it.each([
    ['mismatched descriptor metadata', (index: typeof privateMushafAssetIndex) => {
      index.assets[0].files[1].sha256 = 'c'.repeat(64)
    }],
    ['an extra descriptor', (index: typeof privateMushafAssetIndex) => {
      index.assets[0].files.push({
        ...index.assets[0].files[1],
        url: '/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/pages/001-999.webp',
        width: 999,
      })
    }],
    ['a duplicate descriptor', (index: typeof privateMushafAssetIndex) => {
      index.assets[0].files.push(structuredClone(index.assets[0].files[1]))
    }],
    ['a duplicate descriptor with conflicting metadata', (index: typeof privateMushafAssetIndex) => {
      index.assets[0].files.push({ ...index.assets[0].files[1], sha256: 'c'.repeat(64) })
    }],
  ])('rejects V2 asset-index inventory containing %s', async (_label, mutate) => {
    const mismatchedIndex = structuredClone(privateMushafAssetIndex)
    mutate(mismatchedIndex)
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(mismatchedIndex)
      if (url === '/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/manifest.json') return jsonResponse(privateMushafManifest)
      return jsonResponse({}, { ok: false, status: 404 })
    })

    await expect(loadPreparedExternalMushafPage({
      fetcher,
      mushafEditionId: 'qalun-furatiyyah-2023-v1',
      page: 1,
      riwayah: 'qaloon',
    })).rejects.toThrow(/descriptor.*asset index/i)
  })

  it('waits for external image load and decode, and reports abort or failure without image layout', async () => {
    const source = {
      ...privateMushafManifest.pages[0].media.sources[0],
      assetUrl: '/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/pages/001-1280.webp',
    }
    const image = {
      decode: vi.fn(async () => undefined),
      onerror: null as null | ((event: Event) => void),
      onload: null as null | ((event: Event) => void),
      set src(_value: string) { this.onload?.(new Event('load')) },
    }

    await expect(prepareExternalMushafImage(source, undefined, () => image)).resolves.toMatchObject({
      status: 'ready', image,
    })
    expect(image.decode).toHaveBeenCalledOnce()

    const controller = new AbortController()
    controller.abort()
    await expect(prepareExternalMushafImage(source, controller.signal, () => image)).resolves.toEqual({ status: 'aborted' })

    let completeDecode: (() => void) | undefined
    const decodingImage = {
      decode: vi.fn(() => new Promise<void>((resolve) => { completeDecode = resolve })),
      onerror: null as null | ((event: Event) => void),
      onload: null as null | ((event: Event) => void),
      set src(_value: string) { this.onload?.(new Event('load')) },
    }
    const decodingController = new AbortController()
    const preparation = prepareExternalMushafImage(source, decodingController.signal, () => decodingImage)
    await waitFor(() => expect(decodingImage.decode).toHaveBeenCalledOnce())
    decodingController.abort()
    try {
      await expect(Promise.race([
        preparation,
        new Promise((resolve) => setTimeout(() => resolve('decode timeout'), 0)),
      ])).resolves.toEqual({ status: 'aborted' })
    } finally {
      completeDecode?.()
    }

    const failingImage = {
      decode: vi.fn(async () => { throw new Error('decode failed') }),
      onerror: null as null | ((event: Event) => void),
      onload: null as null | ((event: Event) => void),
      set src(_value: string) { this.onload?.(new Event('load')) },
    }
    await expect(prepareExternalMushafImage(source, undefined, () => failingImage)).resolves.toMatchObject({ status: 'error' })
  })

})
