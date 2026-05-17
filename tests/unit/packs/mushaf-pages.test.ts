import { beforeEach, describe, expect, it, vi } from 'vitest'

const packageIndex = {
  version: 1,
  defaultRiwayah: 'qaloon',
  packages: [
    {
      riwayah: 'qaloon',
      optional: false,
      available: true,
      text: {
        urls: ['/dataset/riwayat/qaloon/001.json'],
        totalBytes: 100,
        available: true,
      },
      pages: {
        manifestUrl: '/dataset/mushaf-pages/qaloon/manifest.json',
        urls: ['/dataset/mushaf-pages/qaloon/pages/001.svg'],
        totalBytes: 200,
        available: true,
      },
      totalBytes: 300,
    },
    {
      riwayah: 'hafs',
      optional: true,
      available: true,
      text: {
        urls: ['/dataset/riwayat/hafs/001.json'],
        totalBytes: 110,
        available: true,
      },
      pages: {
        manifestUrl: '/dataset/mushaf-pages/hafs/manifest.json',
        urls: ['/dataset/mushaf-pages/hafs/pages/001.svg'],
        totalBytes: 220,
        available: true,
      },
      totalBytes: 330,
    },
    {
      riwayah: 'warsh',
      optional: true,
      available: false,
      text: {
        urls: [],
        totalBytes: 0,
        available: false,
      },
      pages: {
        manifestUrl: '/dataset/mushaf-pages/warsh/manifest.json',
        urls: [],
        totalBytes: 0,
        available: false,
      },
      totalBytes: 0,
    },
  ],
} as const

const manifest = {
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
} as const

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function installCache(cachedUrls: string[] = []): void {
  const cached = new Set(cachedUrls.map((url) => new URL(url, location.origin).href))
  vi.stubGlobal('caches', {
    open: vi.fn(async () => ({
      match: vi.fn(async (url: string | Request) => {
        const href = typeof url === 'string' ? new URL(url, location.origin).href : url.url
        return cached.has(href) ? response({ cached: true }) : undefined
      }),
      put: vi.fn(async () => undefined),
    })),
  })
}

async function importLoader() {
  const packs = await import('../../../src/packs/riwayah')
  const mod = await import('../../../src/packs/mushaf-pages')
  packs.clearRiwayahPackCacheForTests()
  mod.clearMushafManifestCache()
  return mod
}

describe('pack-domain mushaf page policy', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.stubGlobal('location', new URL('https://quranatlas.test/'))
    installCache()
  })

  it('classifies the baseline page pack as usable when the manifest is loadable', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('riwayah-packages.json')) return response(packageIndex)
      return response(manifest)
    }))
    const { getMushafPagePackResult } = await importLoader()

    await expect(getMushafPagePackResult('qaloon')).resolves.toMatchObject({
      kind: 'usable',
      riwayah: 'qaloon',
      reason: 'baseline',
      manifestUrl: '/dataset/mushaf-pages/qaloon/manifest.json',
    })
  })

  it('classifies an uncached optional page pack as installable before manifest fetch', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('riwayah-packages.json')) return response(packageIndex)
      return response({ ...manifest, riwayah: 'hafs', sourceSlug: 'hafs' })
    }))
    const { getMushafPagePackResult } = await importLoader()

    await expect(getMushafPagePackResult('hafs')).resolves.toMatchObject({
      kind: 'installable',
      riwayah: 'hafs',
      reason: 'not-cached',
      manifestUrl: '/dataset/mushaf-pages/hafs/manifest.json',
    })
  })

  it('maps removed optional page packs to a missing result', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('riwayah-packages.json')) return response(packageIndex)
      return response(null, 404)
    }))
    const { getMushafPagePackResult } = await importLoader()

    await expect(getMushafPagePackResult('warsh')).resolves.toMatchObject({
      kind: 'missing',
      riwayah: 'warsh',
      reason: 'missing',
      manifestUrl: '/dataset/mushaf-pages/warsh/manifest.json',
    })
  })

  it('can resolve a missing optional page pack back to baseline policy when requested', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('riwayah-packages.json')) return response(packageIndex)
      return response(manifest)
    }))
    const { resolveMushafPagePack } = await importLoader()

    await expect(resolveMushafPagePack('warsh', { fallbackToBaseline: true })).resolves.toMatchObject({
      kind: 'switched-to-baseline',
      riwayah: 'warsh',
      fallbackRiwayah: 'qaloon',
      reason: 'missing',
    })
  })

  it('maps invalid manifests to a security-rejected result', async () => {
    installCache([
      '/dataset/riwayat/hafs/001.json',
      '/dataset/mushaf-pages/hafs/manifest.json',
      '/dataset/mushaf-pages/hafs/pages/001.svg',
    ])
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('riwayah-packages.json')) return response(packageIndex)
      return response({ ...manifest, riwayah: 'hafs', sourceSlug: 'qalun' })
    }))
    const { getMushafPagePackResult } = await importLoader()

    await expect(getMushafPagePackResult('hafs')).resolves.toMatchObject({
      kind: 'unavailable',
      riwayah: 'hafs',
      reason: 'security-rejected',
      manifestUrl: '/dataset/mushaf-pages/hafs/manifest.json',
    })
  })
})
