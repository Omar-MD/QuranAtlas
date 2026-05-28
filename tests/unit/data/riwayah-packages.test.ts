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
        urls: ['/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json'],
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

  it('keeps baseline Qaloon usable while offline', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const { isRiwayahUsable } = await importLoader()

    await expect(isRiwayahUsable('qaloon')).resolves.toBe(true)
  })

  it('reports removed Hafs package unavailable in the MVP index', async () => {
    const { getRiwayahPackageStatus, isRiwayahUsable } = await importLoader()

    await expect(getRiwayahPackageStatus('hafs')).resolves.toEqual({ kind: 'unavailable', riwayah: 'hafs' })
    await expect(isRiwayahUsable('hafs')).resolves.toBe(false)
  })

  it('does not make removed Hafs usable even when legacy URLs are cached', async () => {
    installCache([
      '/dataset/quran-text/hafs/uthmani-kfgqpc-v1/001.json',
      '/dataset/mushaf-pages/hafs/hafs-quran-ws-v1/manifest.json',
      '/dataset/mushaf-pages/hafs/hafs-quran-ws-v1/pages/001.svg',
    ])
    const { getRiwayahPackageStatus, isRiwayahUsable } = await importLoader()

    await expect(getRiwayahPackageStatus('hafs')).resolves.toEqual({ kind: 'unavailable', riwayah: 'hafs' })
    await expect(isRiwayahUsable('hafs')).resolves.toBe(false)
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
        ...packageIndex.packages[0],
        riwayah: 'hafs',
        text: {
          ...packageIndex.packages[0]!.text,
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
        ...packageIndex.packages[0],
        riwayah: 'hafs',
        text: {
          ...packageIndex.packages[0]!.text,
          urls: ['/dataset/%2e%2e/app.js'],
        },
      }],
    })))
    const { loadRiwayahPackageIndex } = await importLoader()

    await expect(loadRiwayahPackageIndex()).rejects.toThrow(/same-origin dataset URL/)
  })

  it('does not plan install URLs for removed riwayat', async () => {
    const { planRiwayahPackageInstall, cacheNamesForRiwayahPackage } = await importLoader()

    await expect(planRiwayahPackageInstall('hafs')).resolves.toEqual({
      riwayah: 'hafs',
      urls: [],
      totalBytes: 0,
    })
    expect(cacheNamesForRiwayahPackage('hafs')).toEqual({
      text: 'quran-dataset-v2',
      pages: 'qa-pages-hafs-hafs-quran-ws-v1-v1',
    })
  })
})
