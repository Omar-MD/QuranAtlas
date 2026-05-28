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
        manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
        urls: ['/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg'],
        totalBytes: 200,
        available: true,
      },
      totalBytes: 300,
    },
  ],
} as const

const manifest = {
  version: 1,
  riwayah: 'qaloon',
  mushafEditionId: 'qalun-quran-ws-v1',
  editionLabel: 'Qalun Quran.ws',
  editionVersion: 'v1',
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

const mushafAssetIndex = {
  version: 1,
  defaults: {
    qaloon: 'qalun-quran-ws-v1',
  },
  assets: [
    {
      riwayah: 'qaloon',
      mushafEditionId: 'qalun-quran-ws-v1',
      label: 'Qalun Quran.ws',
      tradition: 'qalun',
      providerId: 'quran-ws',
      licenseId: 'quran-ws-free-use',
      visibility: 'baseline',
      shipped: true,
      manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
      files: [
        { url: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json', bytes: 100 },
        { url: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg', bytes: 1000 },
      ],
      totalBytes: 1100,
      pageCount: 2,
      provenance: { source: 'test' },
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
  const assets = await import('../../../src/packs/mushaf-assets')
  const mod = await import('../../../src/packs/mushaf-pages')
  packs.clearRiwayahPackCacheForTests()
  assets.clearMushafAssetIndexCacheForTests()
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
      if (url.includes('mushaf-assets.json')) return response(mushafAssetIndex)
      if (url.includes('riwayah-packages.json')) return response(packageIndex)
      return response(manifest)
    }))
    const { getMushafPagePackResult } = await importLoader()

    await expect(getMushafPagePackResult('qaloon')).resolves.toMatchObject({
      kind: 'usable',
      riwayah: 'qaloon',
      reason: 'baseline',
      manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
    })
  })

  it('maps invalid default manifests to a security-rejected result', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('mushaf-assets.json')) return response(mushafAssetIndex)
      if (url.includes('riwayah-packages.json')) return response(packageIndex)
      return response({ ...manifest, sourceSlug: 'hafs' })
    }))
    const { getMushafPagePackResult } = await importLoader()

    await expect(getMushafPagePackResult('qaloon')).resolves.toMatchObject({
      kind: 'unavailable',
      riwayah: 'qaloon',
      reason: 'security-rejected',
      manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
    })
  })
})

describe('mushaf asset loader', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.stubGlobal('location', new URL('https://quranatlas.test/'))
    installCache()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('mushaf-assets.json')) return response(mushafAssetIndex)
      return response(manifest)
    }))
  })

  it('loads defaults and resolves compatible Mushaf edition assets', async () => {
    const mod = await import('../../../src/packs/mushaf-assets')
    mod.clearMushafAssetIndexCacheForTests()

    await expect(mod.loadMushafAssetIndex()).resolves.toMatchObject({
      defaults: { qaloon: 'qalun-quran-ws-v1' },
    })
    await expect(mod.getMushafAsset('qaloon', 'qalun-quran-ws-v1')).resolves.toMatchObject({
      riwayah: 'qaloon',
      mushafEditionId: 'qalun-quran-ws-v1',
    })
    await expect(mod.defaultMushafEditionForRiwayah('qaloon')).resolves.toBe('qalun-quran-ws-v1')
    await expect(mod.canUseMushafAsset('qaloon', 'qalun-quran-ws-v1')).resolves.toBe(true)
  })

  it('reports shipped and incompatible Mushaf asset states', async () => {
    const mod = await import('../../../src/packs/mushaf-assets')
    mod.clearMushafAssetIndexCacheForTests()

    await expect(mod.getMushafAssetStatus('qaloon', 'qalun-quran-ws-v1')).resolves.toBe('shipped')
    await expect(mod.getMushafAssetStatus('qaloon', 'missing-v1')).resolves.toBe('incompatible')
  })

  it('rejects manifest edition mismatches before an asset becomes usable', async () => {
    const mod = await import('../../../src/packs/mushaf-assets')
    mod.clearMushafAssetIndexCacheForTests()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('mushaf-assets.json')) return response(mushafAssetIndex)
      return response({ ...manifest, mushafEditionId: 'wrong-v1' })
    }))

    await expect(mod.canUseMushafAsset('qaloon', 'qalun-quran-ws-v1')).resolves.toBe(false)
    await expect(mod.getMushafAssetStatus('qaloon', 'qalun-quran-ws-v1')).resolves.toBe('unavailable')
  })

  it('rejects indexes with non-dataset URLs or missing defaults', async () => {
    const mod = await import('../../../src/packs/mushaf-assets')
    mod.clearMushafAssetIndexCacheForTests()
    vi.stubGlobal('fetch', vi.fn(async () => response({
      ...mushafAssetIndex,
      assets: [{
        ...mushafAssetIndex.assets[0],
        manifestUrl: 'https://cdn.example.test/manifest.json',
      }],
    })))
    await expect(mod.loadMushafAssetIndex()).rejects.toThrow(/same-origin dataset URL/)

    mod.clearMushafAssetIndexCacheForTests()
    vi.stubGlobal('fetch', vi.fn(async () => response({
      ...mushafAssetIndex,
      defaults: { qaloon: 'missing-v1' },
    })))
    await expect(mod.loadMushafAssetIndex()).rejects.toThrow(/default.*missing/i)
  })
})
