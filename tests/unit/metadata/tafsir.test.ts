import { beforeEach, describe, expect, it, vi } from 'vitest'

const getTafsirs = vi.fn()

vi.mock('../../../src/data/dataset', async () => {
  const actual = await vi.importActual('../../../src/data/dataset')
  return {
    ...actual,
    getTafsirs,
  }
})

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    clone() { return response(body, status) },
  } as Response
}

describe('metadata/tafsir adapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    getTafsirs.mockReset()
    vi.stubGlobal('location', new URL('https://quranatlas.test/'))
    vi.stubGlobal('caches', {
      open: vi.fn(async () => ({
        match: vi.fn(async () => undefined),
        put: vi.fn(async () => undefined),
      })),
    })
  })

  it('exposes tafsir source metadata through the adapter', async () => {
    getTafsirs.mockResolvedValue([
      { id: 'muyassar', name: 'Tafsir Muyassar', language: 'ar', availableInManifest: true },
    ])

    const { loadTafsirSources } = await import('../../../src/metadata/tafsir')
    await expect(loadTafsirSources()).resolves.toEqual([
      { id: 'muyassar', name: 'Tafsir Muyassar', language: 'ar', availableInManifest: true },
    ])
  })

  it('loads a tafsir surah pack through the adapter without changing payload shape', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({
      tafsirId: 'muyassar',
      tafsirVersion: 'test',
      language: 'ar',
      surahNo: 2,
      entries: [
        {
          id: '2:255',
          startKey: '2:255',
          endKey: '2:255',
          ayahKeys: ['2:255'],
          sourceGranularity: 'ayah',
          text: '<p>Text</p>',
        },
      ],
    })))

    const { loadTafsirMetadataForSurah } = await import('../../../src/metadata/tafsir')
    await expect(loadTafsirMetadataForSurah('muyassar', 2)).resolves.toMatchObject({
      state: 'available',
      fallbackId: null,
      pack: {
        tafsirId: 'muyassar',
        surahNo: 2,
        entries: [{ id: '2:255', ayahKeys: ['2:255'] }],
      },
    })
  })

  it('marks fallback packs as missing while preserving the fallback pack payload', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/mukhtasar/')) return response({}, 404)
      return response({
        tafsirId: 'muyassar',
        tafsirVersion: 'test',
        language: 'ar',
        surahNo: 2,
        entries: [{ id: '2:255', startKey: '2:255', endKey: '2:255', ayahKeys: ['2:255'], sourceGranularity: 'ayah', text: '<p>Text</p>' }],
      })
    }))

    const { loadTafsirMetadataForSurah } = await import('../../../src/metadata/tafsir')
    await expect(loadTafsirMetadataForSurah('mukhtasar', 2)).resolves.toMatchObject({
      state: 'missing',
      fallbackId: 'muyassar',
      pack: { tafsirId: 'muyassar', surahNo: 2 },
    })
  })

  it('marks null packs as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))

    const { loadTafsirMetadataForSurah } = await import('../../../src/metadata/tafsir')
    await expect(loadTafsirMetadataForSurah('muyassar', 2)).resolves.toEqual({
      state: 'unavailable',
      pack: null,
      fallbackId: null,
    })
  })

  it('marks corrupt requested tafsir payloads as stale and falls back when baseline is usable', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/mukhtasar/')) {
        return {
          ok: true,
          status: 200,
          json: async () => { throw new SyntaxError('Unexpected token <') },
          clone() { return this as Response },
        } as Response
      }
      return response({
        tafsirId: 'muyassar',
        tafsirVersion: 'test',
        language: 'ar',
        surahNo: 2,
        entries: [{ id: '2:255', startKey: '2:255', endKey: '2:255', ayahKeys: ['2:255'], sourceGranularity: 'ayah', text: '<p>Fallback</p>' }],
      })
    }))

    const { loadTafsirMetadataForSurah } = await import('../../../src/metadata/tafsir')
    await expect(loadTafsirMetadataForSurah('mukhtasar', 2)).resolves.toMatchObject({
      state: 'stale',
      fallbackId: 'muyassar',
      pack: { tafsirId: 'muyassar' },
    })
  })
})
