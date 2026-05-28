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
  ],
} as const

const textAssetIndex = {
  version: 1,
  defaults: {
    qaloon: 'uthmani-kfgqpc-v1',
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

  it('exposes only the default Qaloon riwayah and product/runtime labels', async () => {
    const { DEFAULT_RIWAYAH, getRiwayahLabels, getRiwayahOptions } = await importLoader()

    expect(DEFAULT_RIWAYAH).toBe('qaloon')
    expect(getRiwayahOptions()).toEqual(['qaloon'])
    expect(getRiwayahLabels('qaloon')).toMatchObject({
      productShort: 'Qaloon',
      productFull: 'Qaloon ʿan Nafiʿ',
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

  it('rejects removed riwayat instead of planning optional installs', async () => {
    const { getRiwayahPackageEntry, getRiwayahPackResult, resolveRiwayahSelection } = await importLoader()

    await expect(getRiwayahPackageEntry('hafs' as never)).rejects.toThrow()
    await expect(getRiwayahPackResult('hafs' as never)).resolves.toMatchObject({ kind: 'unavailable' })
    await expect(resolveRiwayahSelection('warsh' as never, { fallbackToBaseline: true })).resolves.toMatchObject({ kind: 'unavailable' })
  })

  it('maps invalid package indexes to a security-rejected pack result', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({
      ...packageIndex,
      packages: [{
        ...packageIndex.packages[0],
        riwayah: 'hafs',
        text: {
          ...packageIndex.packages[0].text,
          urls: ['https://cdn.example.test/riwayat/hafs/001.json'],
        },
      }],
    })))
    const { getRiwayahPackResult } = await importLoader()

    await expect(getRiwayahPackResult('hafs' as never)).resolves.toMatchObject({
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

  it('rejects removed text asset states as incompatible', async () => {
    const mod = await import('../../../src/packs/text-assets')
    mod.clearTextAssetIndexCacheForTests()

    await expect(mod.getTextAssetStatus('hafs' as never, 'uthmani-kfgqpc-v1')).resolves.toBe('incompatible')
    installCache(['/dataset/quran-text/hafs/uthmani-kfgqpc-v1/001.json'])
    mod.clearTextAssetIndexCacheForTests()
    await expect(mod.getTextAssetStatus('hafs' as never, 'uthmani-kfgqpc-v1')).resolves.toBe('incompatible')
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
