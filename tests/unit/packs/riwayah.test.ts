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

const textAssetIndex = {
  version: 1,
  defaults: {
    qaloon: 'uthmani-kfgqpc-v1',
    hafs: 'uthmani-kfgqpc-v1',
    warsh: 'uthmani-kfgqpc-v1',
  },
  assets: [
    {
      riwayah: 'qaloon',
      textStyleId: 'uthmani-kfgqpc-v1',
      label: 'Uthmani KFGQPC',
      scriptFamily: 'uthmani',
      providerId: 'kfgqpc',
      licenseId: 'kfgqpc-quran-text',
      visibility: 'baseline',
      shipped: true,
      files: [{ url: '/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json', bytes: 100 }],
      totalBytes: 100,
      ayahCount: 6214,
      outputPathTemplate: 'quran-text/qaloon/uthmani-kfgqpc-v1/{surah}.json',
      provenance: { source: 'test' },
    },
    {
      riwayah: 'hafs',
      textStyleId: 'uthmani-kfgqpc-v1',
      label: 'Uthmani KFGQPC',
      scriptFamily: 'uthmani',
      providerId: 'kfgqpc',
      licenseId: 'kfgqpc-quran-text',
      visibility: 'optional',
      shipped: false,
      files: [{ url: '/dataset/quran-text/hafs/uthmani-kfgqpc-v1/001.json', bytes: 110 }],
      totalBytes: 110,
      ayahCount: 6236,
      outputPathTemplate: 'quran-text/hafs/uthmani-kfgqpc-v1/{surah}.json',
      provenance: { source: 'test' },
    },
    {
      riwayah: 'warsh',
      textStyleId: 'uthmani-kfgqpc-v1',
      label: 'Uthmani KFGQPC',
      scriptFamily: 'uthmani',
      providerId: 'kfgqpc',
      licenseId: 'kfgqpc-quran-text',
      visibility: 'optional',
      shipped: false,
      files: [{ url: '/dataset/quran-text/warsh/uthmani-kfgqpc-v1/001.json', bytes: 110 }],
      totalBytes: 110,
      ayahCount: 6214,
      outputPathTemplate: 'quran-text/warsh/uthmani-kfgqpc-v1/{surah}.json',
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
    })),
  })
}

async function importLoader() {
  const mod = await import('../../../src/packs/riwayah')
  mod.clearRiwayahPackCacheForTests()
  return mod
}

describe('pack-domain riwayah policy', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.stubGlobal('location', new URL('https://quranatlas.test/'))
    vi.stubGlobal('fetch', vi.fn(async () => response(packageIndex)))
    installCache()
  })

  it('exposes shared riwayah ids and product/runtime labels with Qalun product text', async () => {
    const { DEFAULT_RIWAYAH, getRiwayahLabels, getRiwayahOptions } = await importLoader()

    expect(DEFAULT_RIWAYAH).toBe('qaloon')
    expect(getRiwayahOptions()).toEqual(['hafs', 'warsh', 'qaloon'])
    expect(getRiwayahLabels('qaloon')).toMatchObject({
      productShort: 'Qalun',
      productFull: 'Qalun ʿan Nafiʿ',
      runtimeShort: 'Qālūn',
      runtimeFull: 'Qālūn ʿan Nāfiʿ',
      sourceSlug: 'qalun',
    })
  })

  it('classifies the baseline pack as usable with a baseline reason', async () => {
    const { getRiwayahPackResult } = await importLoader()

    await expect(getRiwayahPackResult('qaloon')).resolves.toMatchObject({
      kind: 'usable',
      riwayah: 'qaloon',
      reason: 'baseline',
      totalBytes: 300,
    })
  })

  it('classifies an uncached optional pack as installable with a not-cached reason', async () => {
    const { getRiwayahPackResult } = await importLoader()

    await expect(getRiwayahPackResult('hafs')).resolves.toMatchObject({
      kind: 'installable',
      riwayah: 'hafs',
      reason: 'not-cached',
      totalBytes: 330,
    })
  })

  it('can surface a quota-refused install block without changing the pack identity', async () => {
    const { getRiwayahPackResult } = await importLoader()

    await expect(getRiwayahPackResult('hafs', { installBlocked: 'quota-refused' })).resolves.toMatchObject({
      kind: 'installable',
      riwayah: 'hafs',
      reason: 'quota-refused',
    })
  })

  it('classifies a cached optional pack as usable with a cached reason', async () => {
    installCache([
      '/dataset/riwayat/hafs/001.json',
      '/dataset/mushaf-pages/hafs/manifest.json',
      '/dataset/mushaf-pages/hafs/pages/001.svg',
    ])
    const { getRiwayahPackResult } = await importLoader()

    await expect(getRiwayahPackResult('hafs')).resolves.toMatchObject({
      kind: 'usable',
      riwayah: 'hafs',
      reason: 'cached',
      totalBytes: 330,
    })
  })

  it('can resolve an unusable selection to the baseline pack without mutating the caller state', async () => {
    const { resolveRiwayahSelection } = await importLoader()

    await expect(resolveRiwayahSelection('warsh', { fallbackToBaseline: true })).resolves.toMatchObject({
      kind: 'switched-to-baseline',
      riwayah: 'warsh',
      fallbackRiwayah: 'qaloon',
      reason: 'missing',
    })
  })

  it('maps invalid package indexes to a security-rejected pack result', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({
      ...packageIndex,
      packages: [{
        ...packageIndex.packages[1],
        text: {
          ...packageIndex.packages[1].text,
          urls: ['https://cdn.example.test/riwayat/hafs/001.json'],
        },
      }],
    })))
    const { getRiwayahPackResult } = await importLoader()

    await expect(getRiwayahPackResult('hafs')).resolves.toMatchObject({
      kind: 'unavailable',
      riwayah: 'hafs',
      reason: 'security-rejected',
    })
  })
})

describe('text asset loader', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.stubGlobal('location', new URL('https://quranatlas.test/'))
    vi.stubGlobal('fetch', vi.fn(async () => response(textAssetIndex)))
    installCache()
  })

  it('loads defaults and resolves compatible text assets', async () => {
    const mod = await import('../../../src/packs/text-assets')
    mod.clearTextAssetIndexCacheForTests()

    await expect(mod.loadTextAssetIndex()).resolves.toMatchObject({
      defaults: { qaloon: 'uthmani-kfgqpc-v1' },
    })
    await expect(mod.getTextAsset('qaloon', 'uthmani-kfgqpc-v1')).resolves.toMatchObject({
      riwayah: 'qaloon',
      textStyleId: 'uthmani-kfgqpc-v1',
    })
    await expect(mod.defaultTextStyleForRiwayah('qaloon')).resolves.toBe('uthmani-kfgqpc-v1')
    await expect(mod.canUseTextAsset('qaloon', 'uthmani-kfgqpc-v1')).resolves.toBe(true)
  })

  it('reports installable, installed, and incompatible text asset states', async () => {
    const mod = await import('../../../src/packs/text-assets')
    mod.clearTextAssetIndexCacheForTests()

    await expect(mod.getTextAssetStatus('hafs', 'uthmani-kfgqpc-v1')).resolves.toBe('installable')
    installCache(['/dataset/quran-text/hafs/uthmani-kfgqpc-v1/001.json'])
    mod.clearTextAssetIndexCacheForTests()
    await expect(mod.getTextAssetStatus('hafs', 'uthmani-kfgqpc-v1')).resolves.toBe('installed')
    await expect(mod.getTextAssetStatus('warsh', 'missing-v1')).resolves.toBe('incompatible')
  })

  it('rejects indexes with non-dataset URLs or missing defaults', async () => {
    const mod = await import('../../../src/packs/text-assets')
    mod.clearTextAssetIndexCacheForTests()
    vi.stubGlobal('fetch', vi.fn(async () => response({
      ...textAssetIndex,
      assets: [{
        ...textAssetIndex.assets[0],
        files: [{ url: 'https://cdn.example.test/quran-text/qaloon/001.json', bytes: 100 }],
      }],
    })))
    await expect(mod.loadTextAssetIndex()).rejects.toThrow(/same-origin dataset URL/)

    mod.clearTextAssetIndexCacheForTests()
    vi.stubGlobal('fetch', vi.fn(async () => response({
      ...textAssetIndex,
      defaults: { qaloon: 'missing-v1' },
    })))
    await expect(mod.loadTextAssetIndex()).rejects.toThrow(/default.*missing/i)
  })
})
