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
}

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
    open: vi.fn(async (cacheName: string) => ({
      match: vi.fn(async (url: string | Request) => {
        const href = typeof url === 'string' ? new URL(url, location.origin).href : url.url
        return cached.has(href) ? response({ cached: true }) : undefined
      }),
      cacheName,
    })),
  })
}

async function importLoader() {
  const mod = await import('../../../src/data/riwayah-packages')
  mod.clearRiwayahPackageCacheForTests()
  return mod
}

describe('riwayah package index', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.stubGlobal('location', new URL('https://quranatlas.test/'))
    vi.stubGlobal('fetch', vi.fn(async () => response(packageIndex)))
    installCache()
  })

  it('reports Qaloon installed when baseline package assets exist', async () => {
    const { getRiwayahPackageStatus, isRiwayahUsable } = await importLoader()

    await expect(getRiwayahPackageStatus('qaloon')).resolves.toEqual({
      kind: 'installed',
      riwayah: 'qaloon',
      totalBytes: 300,
    })
    await expect(isRiwayahUsable('qaloon')).resolves.toBe(true)
  })

  it('requires cached Qaloon package URLs when the browser is offline', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const { isRiwayahUsable, clearRiwayahPackageCacheForTests } = await importLoader()

    await expect(isRiwayahUsable('qaloon')).resolves.toBe(false)

    installCache([
      '/dataset/riwayat/qaloon/001.json',
      '/dataset/mushaf-pages/qaloon/manifest.json',
      '/dataset/mushaf-pages/qaloon/pages/001.svg',
    ])
    clearRiwayahPackageCacheForTests()
    await expect(isRiwayahUsable('qaloon')).resolves.toBe(true)
  })

  it('reports Hafs installable with a byte estimate when available assets are not cached', async () => {
    const { getRiwayahPackageStatus, isRiwayahUsable } = await importLoader()

    await expect(getRiwayahPackageStatus('hafs')).resolves.toEqual({
      kind: 'installable',
      riwayah: 'hafs',
      totalBytes: 330,
    })
    await expect(isRiwayahUsable('hafs')).resolves.toBe(false)
  })

  it('does not make Hafs usable until every planned text and page URL is cached', async () => {
    installCache([
      '/dataset/riwayat/hafs/001.json',
      '/dataset/mushaf-pages/hafs/manifest.json',
      '/dataset/mushaf-pages/hafs/pages/001.svg',
    ])
    const { getRiwayahPackageStatus, isRiwayahUsable } = await importLoader()

    await expect(getRiwayahPackageStatus('hafs')).resolves.toEqual({
      kind: 'installed',
      riwayah: 'hafs',
      totalBytes: 330,
    })
    await expect(isRiwayahUsable('hafs')).resolves.toBe(true)
  })

  it('reports Warsh unavailable when the package index lacks complete artifacts', async () => {
    const { getRiwayahPackageStatus, isRiwayahUsable } = await importLoader()

    await expect(getRiwayahPackageStatus('warsh')).resolves.toEqual({
      kind: 'unavailable',
      riwayah: 'warsh',
    })
    await expect(isRiwayahUsable('warsh')).resolves.toBe(false)
  })

  it('rejects package indexes with non-dataset URLs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({
      ...packageIndex,
      packages: [{
        ...packageIndex.packages[1],
        text: {
          ...packageIndex.packages[1]!.text,
          urls: ['https://cdn.example.test/riwayat/hafs/001.json'],
        },
      }],
    })))
    const { loadRiwayahPackageIndex } = await importLoader()

    await expect(loadRiwayahPackageIndex()).rejects.toThrow(/same-origin dataset URL/)
  })

  it('rejects encoded traversal that normalizes outside the dataset path', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({
      ...packageIndex,
      packages: [{
        ...packageIndex.packages[1],
        text: {
          ...packageIndex.packages[1]!.text,
          urls: ['/dataset/%2e%2e/app.js'],
        },
      }],
    })))
    const { loadRiwayahPackageIndex } = await importLoader()

    await expect(loadRiwayahPackageIndex()).rejects.toThrow(/same-origin dataset URL/)
  })

  it('plans install URLs and cache names per riwayah', async () => {
    const { planRiwayahPackageInstall, cacheNamesForRiwayahPackage } = await importLoader()

    await expect(planRiwayahPackageInstall('hafs')).resolves.toEqual({
      riwayah: 'hafs',
      urls: [
        '/dataset/riwayat/hafs/001.json',
        '/dataset/mushaf-pages/hafs/manifest.json',
        '/dataset/mushaf-pages/hafs/pages/001.svg',
      ],
      totalBytes: 330,
    })
    expect(cacheNamesForRiwayahPackage('hafs')).toEqual({
      text: 'quran-dataset-v2',
      pages: 'qa-pages-hafs-v1',
    })
  })
})
