import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Riwayah } from '../../../src/configure/state.svelte'
import type { MushafManifest } from '../../../src/read/mushaf/types'

const manifest: MushafManifest = {
  version: 1,
  riwayah: 'qaloon',
  sourceSlug: 'qalun',
  pageCount: 2,
  attribution: { provider: 'quran.ws', sourceUrl: 'https://pdf.quran.ws/' },
  verseToPage: {
    '1:1': 1,
    '2:255': 2,
  },
  pages: [
    {
      page: 1,
      assetPath: 'pages/001.svg',
      viewBox: '0 0 900 1379.25',
      bytes: 1000,
      sourcePdfUrl: 'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-1.pdf',
      firstVerse: { surah: 1, verse: 1 },
    },
    {
      page: 2,
      assetPath: 'pages/002.svg',
      viewBox: '0 0 900 1379.25',
      bytes: 1200,
      sourcePdfUrl: 'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-2.pdf',
      firstVerse: { surah: 2, verse: 255 },
    },
  ],
}

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function responseJsonError(error: Error, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => { throw error },
  } as Response
}

function mockManifestFetch(body: unknown = manifest, status = 200): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => response(body, status))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function importLoader() {
  const mod = await import('../../../src/data/mushaf-pages')
  const packages = await import('../../../src/data/riwayah-packages')
  mod.clearMushafManifestCache()
  packages.clearRiwayahPackageCacheForTests()
  return mod
}

describe('mushaf-pages dataset loader', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('loads and caches a riwayah manifest', async () => {
    const fetchMock = mockManifestFetch()
    const { loadMushafManifest } = await importLoader()

    const first = await loadMushafManifest('qaloon')
    const second = await loadMushafManifest('qaloon')

    expect(first.pageCount).toBe(2)
    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/dataset/mushaf-pages/qaloon/manifest.json')
  })

  it('resolves a page to same-origin SVG asset URL', async () => {
    mockManifestFetch()
    const { resolveMushafPage } = await importLoader()

    const resolved = await resolveMushafPage({ riwayah: 'qaloon', page: 2 })

    expect(resolved).toMatchObject({
      page: 2,
      pageCount: 2,
      riwayahLabel: 'Qālūn ʿan Nāfiʿ',
      assetPath: 'pages/002.svg',
      assetUrl: '/dataset/mushaf-pages/qaloon/pages/002.svg',
      viewBoxText: '0 0 900 1379.25',
      viewBox: { minX: 0, minY: 0, width: 900, height: 1379.25 },
      bytes: 1200,
      firstVerse: { surah: 2, verse: 255 },
      sourcePdfUrl: 'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-2.pdf',
    })
  })

  it('clamps invalid pages against the manifest page count', async () => {
    mockManifestFetch()
    const { resolveMushafPage } = await importLoader()

    await expect(resolveMushafPage({ riwayah: 'qaloon', page: 999 })).resolves.toMatchObject({
      page: 2,
    })
  })

  it('resolves verse-to-start-page through the active riwayah manifest', async () => {
    mockManifestFetch()
    const { pageForVerse } = await importLoader()

    await expect(pageForVerse({ riwayah: 'qaloon', surah: 2, verse: 255 })).resolves.toBe(2)
    await expect(pageForVerse({ riwayah: 'qaloon', surah: 9, verse: 9 })).resolves.toBeNull()
  })

  it('reports unavailable optional packs without falling back to Qaloon', async () => {
    mockManifestFetch(null, 404)
    const { getMushafPackAvailability, resolveMushafPage } = await importLoader()

    await expect(getMushafPackAvailability('hafs')).resolves.toMatchObject({
      riwayah: 'hafs',
      available: false,
      manifestUrl: '/dataset/mushaf-pages/hafs/manifest.json',
    })
    await expect(resolveMushafPage({ riwayah: 'hafs', page: 42 })).rejects.toMatchObject({
      code: 'MUSHAF_PACK_UNAVAILABLE',
      promptable: true,
      riwayah: 'hafs',
    })
  })

  it('treats non-JSON app-shell responses as unavailable optional packs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => responseJsonError(new SyntaxError('Unexpected token <'))))
    const { getMushafPackAvailability, resolveMushafPage } = await importLoader()

    await expect(getMushafPackAvailability('hafs')).resolves.toMatchObject({
      riwayah: 'hafs',
      available: false,
      manifestUrl: '/dataset/mushaf-pages/hafs/manifest.json',
    })
    await expect(resolveMushafPage({ riwayah: 'hafs', page: 42 })).rejects.toMatchObject({
      code: 'MUSHAF_PACK_UNAVAILABLE',
      promptable: true,
      riwayah: 'hafs',
    })
  })

  it('does not render optional pages when the package index cannot be trusted', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('riwayah-packages.json')) return response(null, 500)
      return response({ ...manifest, riwayah: 'hafs', sourceSlug: 'hafs' })
    })
    vi.stubGlobal('fetch', fetchMock)
    const { resolveMushafPage } = await importLoader()

    await expect(resolveMushafPage({ riwayah: 'hafs', page: 1 })).rejects.toMatchObject({
      code: 'MUSHAF_PACK_UNAVAILABLE',
      promptable: true,
      riwayah: 'hafs',
    })
    expect(fetchMock).not.toHaveBeenCalledWith('/dataset/mushaf-pages/hafs/manifest.json')
  })

  it('clears cached unavailable-pack failures after availability checks', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(null, 404))
      .mockResolvedValueOnce(response({ ...manifest, riwayah: 'hafs', sourceSlug: 'hafs' }))
    vi.stubGlobal('fetch', fetchMock)
    const { getMushafPackAvailability, loadMushafManifest } = await importLoader()

    await expect(getMushafPackAvailability('hafs')).resolves.toMatchObject({ available: false })
    await expect(loadMushafManifest('hafs')).resolves.toMatchObject({ riwayah: 'hafs' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('clears cached failures after direct manifest loads', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(null, 404))
      .mockResolvedValueOnce(response({ ...manifest, riwayah: 'hafs', sourceSlug: 'hafs' }))
    vi.stubGlobal('fetch', fetchMock)
    const { loadMushafManifest } = await importLoader()

    await expect(loadMushafManifest('hafs')).rejects.toMatchObject({
      code: 'MUSHAF_PACK_UNAVAILABLE',
      riwayah: 'hafs',
    })
    await expect(loadMushafManifest('hafs')).resolves.toMatchObject({ riwayah: 'hafs' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns pack availability without falling back to Qaloon', async () => {
    const fetchMock = mockManifestFetch({ ...manifest, riwayah: 'warsh', sourceSlug: 'warsh' })
    const { getMushafPackAvailability } = await importLoader()

    await expect(getMushafPackAvailability('warsh')).resolves.toEqual({
      riwayah: 'warsh',
      available: true,
      manifestUrl: '/dataset/mushaf-pages/warsh/manifest.json',
    })
    expect(fetchMock).toHaveBeenCalledWith('/dataset/mushaf-pages/warsh/manifest.json')
  })

  it('rejects manifests with mismatched riwayah or quran.ws source slug', async () => {
    mockManifestFetch({ ...manifest, riwayah: 'qaloon', sourceSlug: 'warsh' })
    const { loadMushafManifest } = await importLoader()

    await expect(loadMushafManifest('qaloon')).rejects.toThrow(/source slug/i)
  })

  it('rejects manifest paths that escape the pages folder', async () => {
    mockManifestFetch({
      ...manifest,
      pages: [{ ...manifest.pages[0], assetPath: '../x.svg' }],
    })
    const { loadMushafManifest } = await importLoader()

    await expect(loadMushafManifest('qaloon')).rejects.toThrow(/Invalid Mushaf asset path/)
  })

  it('rejects manifests without parseable per-page viewBox values', async () => {
    mockManifestFetch({
      ...manifest,
      pages: [{ ...manifest.pages[0], viewBox: '0 0 0 20' }, manifest.pages[1]!],
    })
    const { loadMushafManifest } = await importLoader()

    await expect(loadMushafManifest('qaloon')).rejects.toThrow(/viewBox/i)
  })

  it('rejects manifests whose page viewBox aspect ratio drifts within one riwayah', async () => {
    mockManifestFetch({
      ...manifest,
      pages: [{ ...manifest.pages[0], viewBox: '0 0 900 1379.25' }, { ...manifest.pages[1]!, viewBox: '0 0 1200 800' }],
    })
    const { loadMushafManifest } = await importLoader()

    await expect(loadMushafManifest('qaloon')).rejects.toThrow(/viewBox aspect ratio/i)
  })

  it('rejects manifests whose page assets do not match pad3 page names', async () => {
    mockManifestFetch({
      ...manifest,
      pages: [{ ...manifest.pages[0], assetPath: 'pages/1.svg' }],
    })
    const { loadMushafManifest } = await importLoader()

    await expect(loadMushafManifest('qaloon')).rejects.toThrow(/Invalid Mushaf asset path/)
  })

  it('rejects manifests without contiguous page entries', async () => {
    mockManifestFetch({
      ...manifest,
      pages: [{ ...manifest.pages[0], page: 2, assetPath: 'pages/002.svg' }],
    })
    const { loadMushafManifest } = await importLoader()

    await expect(loadMushafManifest('qaloon')).rejects.toThrow(/contiguous/)
  })

  it('rejects invalid page counts, page metadata, and quran.ws URLs', async () => {
    const cases: Array<[string, MushafManifest]> = [
      ['page count', { ...manifest, pageCount: 0 }],
      ['byte count', { ...manifest, pages: [{ ...manifest.pages[0], bytes: 0 }] }],
      ['source PDF URL', { ...manifest, pages: [{ ...manifest.pages[0], sourcePdfUrl: 'https://example.com/page.pdf' }] }],
      ['first verse', { ...manifest, pages: [{ ...manifest.pages[0], firstVerse: { surah: 1.5, verse: 1 } }] }],
      [
        'first verse surah bounds',
        { ...manifest, pages: [{ ...manifest.pages[0], firstVerse: { surah: 115, verse: 1 } }, manifest.pages[1]!] },
      ],
    ]

    for (const [label, body] of cases) {
      mockManifestFetch(body)
      const { loadMushafManifest, clearMushafManifestCache } = await import('../../../src/data/mushaf-pages')
      clearMushafManifestCache()
      await expect(loadMushafManifest('qaloon'), label).rejects.toThrow(/Invalid Mushaf/)
      vi.unstubAllGlobals()
    }
  })

  it('rejects invalid verse-to-page keys and values', async () => {
    const cases: Array<[string, MushafManifest]> = [
      ['bad key', { ...manifest, verseToPage: { '1-1': 1 } }],
      ['bad surah', { ...manifest, verseToPage: { '115:1': 1 } }],
      ['bad page', { ...manifest, verseToPage: { '1:1': 3 } }],
    ]

    for (const [label, body] of cases) {
      mockManifestFetch(body)
      const { loadMushafManifest, clearMushafManifestCache } = await import('../../../src/data/mushaf-pages')
      clearMushafManifestCache()
      await expect(loadMushafManifest('qaloon'), label).rejects.toThrow(/verse/i)
      vi.unstubAllGlobals()
    }
  })

  it('rejects invalid riwayah requests before fetching', async () => {
    const fetchMock = mockManifestFetch()
    const { loadMushafManifest } = await importLoader()

    await expect(loadMushafManifest('bad' as Riwayah)).rejects.toThrow(/Invalid Mushaf riwayah/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
