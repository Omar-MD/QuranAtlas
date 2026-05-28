import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Riwayah } from '../../../src/configure/state.svelte'
import type { MushafManifest } from '../../../src/read/mushaf/types'

const manifest: MushafManifest = {
  version: 1,
  riwayah: 'qaloon',
  mushafEditionId: 'qalun-quran-ws-v1',
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

function mushafAssetIndex(): unknown {
  return {
    version: 1,
    defaults: {
      qaloon: 'qalun-quran-ws-v1',
    },
    assets: [
      ['qaloon', 'qalun-quran-ws-v1'],
    ].map(([riwayah, mushafEditionId]) => ({
      riwayah,
      mushafEditionId,
      label: mushafEditionId,
      tradition: 'qalun',
      providerId: 'quran-ws',
      licenseId: 'quran-ws-free-use',
      visibility: 'baseline',
      shipped: true,
      manifestUrl: `/dataset/mushaf-pages/${riwayah}/${mushafEditionId}/manifest.json`,
      files: [
        { url: `/dataset/mushaf-pages/${riwayah}/${mushafEditionId}/manifest.json`, bytes: 100 },
      ],
      totalBytes: 100,
      pageCount: 2,
      provenance: {},
    })),
  }
}

function mockManifestFetch(body: unknown = manifest, status = 200): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string) => (
    url.includes('mushaf-assets.json') ? response(mushafAssetIndex()) : response(body, status)
  ))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function importLoader() {
  const mod = await import('../../../src/data/mushaf-pages')
  const packages = await import('../../../src/data/riwayah-packages')
  mod.clearMushafManifestCache()
  packages.clearRiwayahPackageCacheForTests()
  const assets = await import('../../../src/packs/mushaf-assets')
  assets.clearMushafAssetIndexCacheForTests()
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
    expect(fetchMock).toHaveBeenCalledWith('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json')
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
      assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/002.svg',
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

  it('rejects retired riwayah page packs before fetching', async () => {
    mockManifestFetch(null, 404)
    const { getMushafPackAvailability, resolveMushafPage } = await importLoader()

    await expect(getMushafPackAvailability('hafs' as never)).rejects.toThrow(/Invalid Mushaf riwayah/)
    await expect(resolveMushafPage({ riwayah: 'hafs' as never, page: 42 })).rejects.toThrow(/Invalid Mushaf riwayah/)
  })

  it('rejects manifests with mismatched riwayah, edition id, or quran.ws source slug', async () => {
    mockManifestFetch({ ...manifest, riwayah: 'qaloon', sourceSlug: 'warsh' })
    const { loadMushafManifest } = await importLoader()

    await expect(loadMushafManifest('qaloon')).rejects.toThrow(/source slug/i)

    mockManifestFetch({ ...manifest, mushafEditionId: 'other-quran-ws-v1' })
    const { clearMushafManifestCache } = await import('../../../src/data/mushaf-pages')
    clearMushafManifestCache()
    await expect(loadMushafManifest('qaloon')).rejects.toThrow(/edition/i)
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
