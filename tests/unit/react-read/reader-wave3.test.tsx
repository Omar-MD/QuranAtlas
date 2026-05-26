import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReaderRoute } from '../../../src-react/app/routes/read/ReaderRoute'
import { MushafRoute } from '../../../src-react/app/routes/read/MushafRoute'
import { ReaderChrome } from '../../../src-react/components/reader/ReaderChrome'
import { MushafPageViewer } from '../../../src-react/components/reader/MushafPageViewer'
import {
  loadMushafPageAsset,
  prepareReactInlineMushafSvg,
  type MushafPageAssetState,
} from '../../../src-react/packs/mushaf-page-asset'
import { ReaderVerseSurface } from '../../../src-react/components/reader/ReaderVerseSurface'
import { VerseBlock } from '../../../src-react/components/reader/VerseBlock'
import { VirtualVerseList } from '../../../src-react/components/reader/VirtualVerseList'
import { loadReaderSurah, type ReaderCorpusState } from '../../../src-react/data/reader-corpus'
import { resolveTranslationFor } from '../../../src-react/data/verse-aliases'
import { openReactDb } from '../../../src-react/storage/db'

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
  verseToPage: { '1:1': 1 },
  pages: [
    {
      page: 1,
      assetPath: 'pages/001.svg',
      viewBox: '0 0 120 180',
      bytes: 1120,
      sourcePdfUrl: 'https://pdf.quran.ws/qalun/001.pdf',
      firstVerse: { surah: 1, verse: 1 },
    },
  ],
}

const realMushafSvg = '<svg viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="180" fill="#fff"/><path d="M10 10h100v160H10z" fill="#000"/></svg>'
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
        { url: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg' },
        { url: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/002.svg' },
      ],
    },
  ],
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

describe('React reader parity', () => {
  it('resolves continuation translation aliases without duplicating text', () => {
    const aliases = { '7': [{ hafs: 2, warsh: [2, 3], qaloon: [2, 3] }] }
    expect(resolveTranslationFor({ surah: 7, verse: 3, riwayah: 'qaloon', translations: { '7:2': 'guidance' }, aliases })).toEqual({
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
    expect(result.verses.map((verse) => verse.translation).join(' ')).not.toMatch(/React preview|Verse text unavailable/i)
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
    expect(screen.getByText('Surah 1')).toBeInTheDocument()
    expect(await screen.findByLabelText('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ')).toBeInTheDocument()
    expect(screen.getByTestId('verse-1:1')).toHaveAttribute('data-token-key', '1:1')
    expect(await screen.findByTestId('verse-1:7')).toBeInTheDocument()
    expect(screen.getByText(/All praise be to Allah, Lord of all realms/i)).toBeInTheDocument()
    const footnote = screen.getByRole('button', { name: /footnote 1/i })
    fireEvent.click(footnote)
    expect(screen.getByRole('note')).toHaveTextContent(/King of the Day of Recompense/i)
    fireEvent.click(screen.getByRole('button', { name: 'Verse 5' }))
    expect(screen.getByTestId('verse-1:5')).toHaveAttribute('data-selected', 'true')
    await expect.poll(async () => (await (await openReactDb()).settings.get('currentPosition'))?.value).toEqual({ surah: 1, verse: 5 })
    expect(screen.queryByText(/tafsir/i)).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('keeps React verse text, footnotes, dividers, and scrolling aligned with the Svelte reader surface', () => {
    const verses = Array.from({ length: 45 }, (_, index) => {
      const verse = index + 1
      return {
        arabic: `آية ${verse}`,
        footnotes: {},
        key: `2:${verse}`,
        translation: `Translation ${verse}`,
        translationRole: 'identity' as const,
        verse,
      }
    })

    const { container } = render(
      <VirtualVerseList
        verses={verses}
      />,
    )

    expect(container.querySelector('[data-virtualized="true"]')).toBeNull()
    expect(screen.getByTestId('verse-2:45')).toBeInTheDocument()

    const firstVerse = screen.getByTestId('verse-2:1')
    const secondVerse = screen.getByTestId('verse-2:2')
    expect(firstVerse.className).not.toContain('qar:border-b')
    expect(secondVerse.className).toContain('qar-reader-verse--divided')
    expect(firstVerse.className).not.toContain('qar:border-b')

    const arabicLine = firstVerse.querySelector('[data-reader-arabic-line="true"]')
    const verseNumber = screen.getByRole('button', { name: 'Verse 1' })
    expect(arabicLine?.compareDocumentPosition(verseNumber) ?? 0).toBe(Node.DOCUMENT_POSITION_PRECEDING)

    const translation = firstVerse.querySelector('[data-reader-translation="true"]')
    expect(translation).toHaveAttribute('dir', 'ltr')
    expect(translation?.className).toContain('qar-reader-verse-translation')
    expect(translation?.className).not.toContain('qar:max-w-3xl')
  })

  it('opens translation footnotes below the translation instead of inside the text run', () => {
    const { container } = render(
      <VerseBlock
        arabic="مَلِكِ يَوْمِ اِ۬لدِّينِۖ"
        footnotes={{ '1': 'Qira’at: All except for Asem read it as: King of the Day of Recompense.' }}
        translation="Master [1] of the Day of Recompense."
        verse={4}
        verseKey="1:4"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /footnote 1/i }))

    const note = screen.getByRole('note')
    expect(note).toHaveTextContent(/King of the Day of Recompense/i)
    expect(note.closest('[data-reader-translation="true"]')).toBeNull()
    expect(container.querySelector('[data-reader-footnote-panel="true"]')).toBe(note)
  })

  it('renders Svelte-style previous and next surah quick navigation controls', () => {
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

    expect(screen.getByRole('button', { name: 'Previous surah: An-Nas' })).toHaveAttribute('data-continue-prev')
    expect(screen.getByRole('button', { name: 'Next surah: Al-Baqarah' })).toHaveAttribute('data-continue-next')
    expect(screen.getByText('↑')).toBeInTheDocument()
    expect(screen.getByText('↓')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next surah: Al-Baqarah' }))

    expect(window.location.hash).toBe('#/s/2')
  })

  it('renders mushaf route with an explicit asset gate', () => {
    render(<MushafRoute page={1} assetState="missing" />)
    expect(screen.getByRole('main', { name: /mushaf reader/i })).toBeInTheDocument()
    expect(screen.getByText(/page pack is not installed/i)).toBeInTheDocument()
  })

  it('routes the reader mode toggle between Verse and Mushaf modes', () => {
    const onModeChange = vi.fn()
    render(<ReaderChrome currentLabel="Surah 1" mode="verse" onModeChange={onModeChange} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Mushaf' }))

    expect(onModeChange).toHaveBeenCalledWith('mushaf')
  })

  it('switches from the Verse route to the Mushaf route from the reader chrome', () => {
    vi.stubGlobal('fetch', readerFetchFixture())
    window.location.hash = '#/s/1'

    render(<ReaderRoute surah={1} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Mushaf' }))

    expect(window.location.hash).toBe('#/m/1')
    vi.unstubAllGlobals()
  })

  it('renders Svelte-style Mushaf chrome without the React mode tabs on the page', () => {
    window.location.hash = '#/m/1'

    render(<MushafRoute page={1} assetState="missing" />)

    expect(screen.getByText('Page 1')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Verse' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Mushaf' })).not.toBeInTheDocument()
  })

  it('sanitizes real Mushaf SVG markup and rejects unsafe SVG before injection', () => {
    const safe = prepareReactInlineMushafSvg(realMushafSvg)
    expect(safe.markup).toContain('qa-react-mushaf-svg')
    expect(safe.markup).toContain('var(--qa-react-mushaf-ground)')
    expect(safe.viewBoxText).toBe('0 0 120 180')

    const svelteTokenized = prepareReactInlineMushafSvg('<svg viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="180" fill="var(--qa-mushaf-ground)"/><path d="M10 10h100v160H10z" fill="var(--qa-mushaf-ink)"/></svg>')
    expect(svelteTokenized.markup).toContain('var(--qa-react-mushaf-ground)')
    expect(svelteTokenized.markup).toContain('var(--qa-react-mushaf-ink)')
    expect(svelteTokenized.markup).not.toContain('var(--qa-mushaf-ground)')
    expect(svelteTokenized.markup).not.toContain('var(--qa-mushaf-ink)')

    const quranWsPage = prepareReactInlineMushafSvg('<svg viewBox="0 0 900 1379.25" xmlns="http://www.w3.org/2000/svg"><rect width="900" height="1379.25" fill="var(--qa-mushaf-ground)"/></svg>')
    expect(quranWsPage.markup).toContain('viewBox="60 60 790 1270"')
    expect(quranWsPage.viewBox).toMatchObject({ x: 60, y: 60, width: 790, height: 1270 })
    expect(quranWsPage.viewBoxText).toBe('0 0 900 1379.25')

    const inkCroppedPage = prepareReactInlineMushafSvg('<svg viewBox="0 0 900 1379.25" xmlns="http://www.w3.org/2000/svg"><rect width="900" height="1379.25" fill="var(--qa-mushaf-ground)"/><path d="M217.2 166.4 L718.82 166.4 L718.82 946.68 L217.2 946.68 Z" fill="var(--qa-mushaf-ink)"/></svg>')
    expect(inkCroppedPage.markup).toContain('viewBox="193.2 142.4 549.62 828.28"')
    expect(inkCroppedPage.viewBox).toMatchObject({ x: 193.2, y: 142.4, width: 549.62, height: 828.28 })
    expect(inkCroppedPage.viewBoxText).toBe('0 0 900 1379.25')

    const clippedInkPage = prepareReactInlineMushafSvg('<svg viewBox="0 0 900 1379.25" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="clip-1"><path d="M217.13 414.72 L718.86 414.72 L718.86 947 L217.13 947 Z"/></clipPath></defs><rect width="900" height="1379.25" fill="var(--qa-mushaf-ground)"/><g clip-path="url(#clip-1)"><path d="M637 619.54 C637.95 166.4 718.82 946.68 217.2 946.68 Z" fill="var(--qa-mushaf-ink)"/></g></svg>')
    expect(clippedInkPage.markup).toContain('viewBox="193.13 390.72 549.73 580.28"')
    expect(clippedInkPage.viewBox).toMatchObject({ x: 193.13, y: 390.72, width: 549.73, height: 580.28 })

    expect(() => prepareReactInlineMushafSvg('<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>')).toThrow(/unsafe/i)
    expect(() => prepareReactInlineMushafSvg('<svg viewBox="0 0 1 1"><image href="https://evil.test/x.png"/></svg>')).toThrow(/unsafe/i)
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
    expect(state.inlineSvg.markup).toContain('<svg')
    expect(state.inlineSvg.markup).not.toMatch(/placeholder/i)
    expect(state.resolved.pageCount).toBe(604)
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

  it('renders the real Mushaf route without the production placeholder label', async () => {
    vi.stubGlobal('fetch', mushafFetchFixture())
    render(<MushafRoute page={1} />)

    expect(await screen.findByRole('main', { name: /mushaf reader/i })).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: /mushaf page 1, qalun/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/mushaf page placeholder/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Auto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Width' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /jump from mushaf page 1 of 604/i })).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('keeps the current Mushaf page mounted while the next page asset loads', async () => {
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
          pages: [
            ...mushafManifest.pages,
            {
              ...mushafManifest.pages[0],
              assetPath: 'pages/002.svg',
              firstVerse: { surah: 2, verse: 1 },
              page: 2,
            },
          ],
        })
      }
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg') {
        return { ok: true, status: 200, text: async () => realMushafSvg } as Response
      }
      if (url === '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/002.svg') return pageTwo
      return jsonResponse({}, { ok: false, status: 404 })
    }))

    const { rerender } = render(<MushafRoute page={1} />)
    expect(await screen.findByRole('img', { name: /mushaf page 1/i })).toBeInTheDocument()

    rerender(<MushafRoute page={2} />)
    expect(screen.getByRole('img', { name: /mushaf page 1/i })).toBeInTheDocument()
    expect(screen.queryByLabelText('Loading Mushaf page')).not.toBeInTheDocument()

    resolvePageTwo?.({ ok: true, status: 200, text: async () => '<svg viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="180" fill="#fff"/><path d="M15 15h90v150H15z" fill="#000"/></svg>' } as Response)
    expect(await screen.findByRole('img', { name: /mushaf page 2/i })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('opens Mushaf navbar controls from the reader chrome instead of rendering fit controls on the page', async () => {
    vi.stubGlobal('fetch', mushafFetchFixture())
    render(<MushafRoute page={1} />)

    expect(await screen.findByRole('img', { name: /mushaf page 1, qalun/i })).toBeInTheDocument()
    expect(screen.queryByRole('tablist', { name: 'Mushaf view mode' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(screen.getByRole('complementary', { name: 'Navigation drawer' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Mushaf view mode' })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('navigates Mushaf pages from broad physical edge zones and swipe gestures', () => {
    const onNavigate = vi.fn()
    const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg)

    render(
      <MushafPageViewer
        inlineSvg={inlineSvg}
        onNavigate={onNavigate}
        resolved={{
          assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/002.svg',
          firstVerse: { surah: 1, verse: 1 },
          manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
          mushafEditionId: 'qalun-quran-ws-v1',
          page: 2,
          pageCount: 604,
          riwayah: 'qaloon',
          riwayahLabel: 'Qalun',
        }}
      />,
    )

    expect(screen.queryByLabelText(/mushaf page controls/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Advance Mushaf page from left edge' }))
    expect(onNavigate).toHaveBeenLastCalledWith(3)
    fireEvent.click(screen.getByRole('button', { name: 'Return to previous Mushaf page from right edge' }))
    expect(onNavigate).toHaveBeenLastCalledWith(1)

    const page = screen.getByRole('img', { name: /mushaf page 2/i })
    fireEvent.touchStart(page, { touches: [{ clientX: 320, clientY: 240 }] })
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 120, clientY: 242 }] })
    expect(onNavigate).toHaveBeenLastCalledWith(3)
    fireEvent.touchStart(page, { touches: [{ clientX: 120, clientY: 240 }] })
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 320, clientY: 238 }] })
    expect(onNavigate).toHaveBeenLastCalledWith(1)
  })

  it('keeps the React Mushaf SVG and its visible page frame on the same fitted box', () => {
    const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg)

    const { container } = render(
      <MushafPageViewer
        inlineSvg={inlineSvg}
        resolved={{
          assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg',
          firstVerse: { surah: 1, verse: 1 },
          manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
          mushafEditionId: 'qalun-quran-ws-v1',
          page: 1,
          pageCount: 604,
          riwayah: 'qaloon',
          riwayahLabel: 'Qalun',
        }}
      />,
    )

    const surface = container.querySelector<HTMLElement>('.qar-react-mushaf-page-surface')
    const stage = container.querySelector<HTMLElement>('.qar-react-mushaf-page-stage')
    const frame = container.querySelector<HTMLElement>('.qar-react-mushaf-page-frame')
    const svg = container.querySelector<SVGElement>('.qa-react-mushaf-svg')

    expect(surface).toHaveClass('qar-react-mushaf-page-surface')
    expect(stage).toHaveClass('qar-react-mushaf-page-stage')
    expect(frame).toHaveClass('qar-react-mushaf-page-frame')
    expect(stage?.style.getPropertyValue('--qa-react-mushaf-page-ratio')).toBe(String(inlineSvg.viewBox.width / inlineSvg.viewBox.height))
    expect(svg?.getAttribute('width')).toBeNull()
    expect(svg?.getAttribute('height')).toBeNull()
  })
})
