import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { settings } from '../../../src/configure/state.svelte.ts'
import { DEFAULT_READER_ASSET_PROFILE } from '../../../shared/reader-assets/default-profile.ts'

const DATASET_PATH = join(process.cwd(), 'public', 'dataset')

function mockFetch(url) {
  const filePath = join(DATASET_PATH, String(url).replace('/dataset/', ''))
  try {
    const content = readFileSync(filePath, 'utf-8')
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(JSON.parse(content)),
    })
  } catch {
    return Promise.resolve({ ok: false, status: 404 })
  }
}

function responseWithJson(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

function mockFetchWithHtmlFallback(url) {
  const asString = String(url)
  if (asString.includes('/quran-text/hafs/')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error(`Unexpected token '<' in JSON at position 0 for ${asString}`)),
    })
  }
  return mockFetch(url)
}

beforeAll(() => { globalThis.fetch = mockFetch })

describe('data/dataset', () => {
  beforeEach(async () => {
    settings.riwayah = 'qaloon'
    settings.quranTextStyleId = 'uthmani-kfgqpc-v1'
    const { clearTextAssetIndexCacheForTests } = await import('../../../src/packs/text-assets.ts')
    clearTextAssetIndexCacheForTests()
  })

  describe('getManifestUrls()', () => {
    it('lists 114 baseline riwayah files for Qaloon only', async () => {
      const { getManifestUrls } = await import('../../../src/data/dataset.ts')
      const urls = await getManifestUrls()
      const riwayat = urls.filter((u) => u.includes('/riwayat/'))
      expect(riwayat.length).toBe(114)
      expect(riwayat.every((u) => u.includes('/riwayat/qaloon/'))).toBe(true)
    })

    it('includes the metadata files', async () => {
      const { getManifestUrls } = await import('../../../src/data/dataset.ts')
      const urls = await getManifestUrls()
      expect(urls.some((u) => u.endsWith('/surahs.json'))).toBe(true)
      expect(urls.some((u) => u.endsWith('/juz.json'))).toBe(true)
      expect(urls.some((u) => u.endsWith('/provenance.json'))).toBe(true)
    })
  })

  describe('getSurah(n)', () => {
    it('fetches the active Quran text-style asset by default and returns SurahPayload', async () => {
      const fetchSpy = vi.fn(mockFetch)
      globalThis.fetch = fetchSpy
      const { getSurah } = await import('../../../src/data/dataset.ts')
      const data = await getSurah(1)
      expect(data.riwayah).toBe('qaloon')
      expect(data.sura_no).toBe(1)
      expect(Array.isArray(data.ayat)).toBe(true)
      expect(data.ayat.length).toBeGreaterThan(0)
      expect(data.ayat[0].aya_text).toContain('اِ۬لْحَمْدُ')
      expect(fetchSpy).toHaveBeenCalledWith('/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json', expect.anything())
      globalThis.fetch = mockFetch
    })

    it('throws an unavailable-pack error when the saved Riwayah is absent from the baseline', async () => {
      settings.riwayah = 'hafs'
      const { getSurah, RiwayahPackUnavailableError } = await import('../../../src/data/dataset.ts')
      await expect(getSurah(1)).rejects.toMatchObject({
        code: 'RIWAYAH_PACK_UNAVAILABLE',
        riwayah: 'hafs',
      })
      await expect(getSurah(1)).rejects.toBeInstanceOf(RiwayahPackUnavailableError)
    })

    it('throws before fetching a missing non-default pack that would resolve to HTML', async () => {
      settings.riwayah = 'hafs'
      globalThis.fetch = mockFetchWithHtmlFallback
      const { getSurah } = await import('../../../src/data/dataset.ts')
      await expect(getSurah(1)).rejects.toMatchObject({
        code: 'RIWAYAH_PACK_UNAVAILABLE',
        riwayah: 'hafs',
      })
      globalThis.fetch = mockFetch
    })

    it('does not trust legacy manifest membership when the optional package index fails', async () => {
      settings.riwayah = 'hafs'
      const fetchMock = vi.fn(async (url) => {
        const asString = String(url)
        if (asString.includes('/indexes/text-assets.json')) {
          return { ok: false, status: 500 }
        }
        if (asString.endsWith('/manifest.json')) {
          return responseWithJson({
            version: 1,
            profile: 'baseline',
            files: [{ path: 'riwayat/hafs/001.json', lane: 'text', category: 'text-riwayah', bytes: 1 }],
          })
        }
        return responseWithJson({ riwayah: 'hafs', sura_no: 1, ayat: [] })
      })
      globalThis.fetch = fetchMock
      const { getSurah } = await import('../../../src/data/dataset.ts')

      await expect(getSurah(1)).rejects.toMatchObject({
        code: 'RIWAYAH_PACK_UNAVAILABLE',
        riwayah: 'hafs',
      })
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/dataset/quran-text/hafs/'))).toBe(false)
      globalThis.fetch = mockFetch
    })

    it('rejects out-of-range surah numbers', async () => {
      const { getSurah } = await import('../../../src/data/dataset.ts')
      await expect(getSurah(0)).rejects.toThrow()
      await expect(getSurah(115)).rejects.toThrow()
      await expect(getSurah(1.5)).rejects.toThrow()
    })
  })

  describe('getRiwayahTextAvailability()', () => {
    it('reports Qaloon text as available from the dataset manifest', async () => {
      const { getRiwayahTextAvailability } = await import('../../../src/data/dataset.ts')
      await expect(getRiwayahTextAvailability('qaloon')).resolves.toMatchObject({
        riwayah: 'qaloon',
        available: true,
      })
    })

    it('reports removed optional text assets as unavailable in the MVP package index', async () => {
      const { getRiwayahTextAvailability } = await import('../../../src/data/dataset.ts')
      await expect(getRiwayahTextAvailability('hafs')).resolves.toMatchObject({ riwayah: 'hafs', available: false })
      await expect(getRiwayahTextAvailability('warsh')).resolves.toMatchObject({ riwayah: 'warsh', available: false })
    })
  })

  describe('getSurahs()', () => {
    it('returns 114 entries with per-Riwayah counts', async () => {
      const { getSurahs } = await import('../../../src/data/dataset.ts')
      const list = await getSurahs()
      expect(list).toHaveLength(114)
      expect(list[0]).toMatchObject({ n: 1, name: 'Al-Fātiḥah' })
      expect(list[0].counts).toMatchObject({ hafs: expect.any(Number), warsh: expect.any(Number), qaloon: expect.any(Number) })
    })
  })

  describe('getTranslations()', () => {
    it('lists only the default Bridges translation source from the source index', async () => {
      const { getTranslations } = await import('../../../src/data/dataset.ts')
      const list = await getTranslations()
      expect(Array.isArray(list)).toBe(true)
      expect(list.map((t) => t.id)).toEqual([DEFAULT_READER_ASSET_PROFILE.translationId])
      const bridges = list.find((t) => t.id === 'bridges')
      expect(bridges).toBeDefined()
      expect(bridges.name).toBe('Bridges')
      expect(bridges.availableInManifest).toBe(true)
      expect(bridges.language).toBe('en')
      expect(bridges).toMatchObject({
        id: 'bridges',
        name: 'Bridges',
        language: 'en',
        availableInManifest: true,
      })
    })
  })

  describe('loadTranslationForSurah()', () => {
    it('returns the per-surah pack for a shipped translation', async () => {
      const { loadTranslationForSurah } = await import('../../../src/data/dataset.ts')
      const pack = await loadTranslationForSurah('bridges', 1)
      expect(pack).not.toBeNull()
      expect(pack.translationId).toBe('bridges')
      expect(pack.surahNo).toBe(1)
      expect(Array.isArray(pack.verses)).toBe(true)
      expect(pack.verses.length).toBeGreaterThan(0)
      expect(pack.verses[0].key).toBe('1:1')
      expect(pack.footnotes).toMatchObject({
        '1': expect.stringContaining('King of the Day of Recompense'),
      })
    })

    it('returns null for an absent translation pack (404)', async () => {
      const { loadTranslationForSurah } = await import('../../../src/data/dataset.ts')
      const pack = await loadTranslationForSurah('does-not-exist', 1)
      expect(pack).toBeNull()
    })

    it('returns null when a removed optional translation id is requested', async () => {
      const { loadTranslationForSurah } = await import('../../../src/data/dataset.ts')
      const pack = await loadTranslationForSurah('saheeh', 1)
      expect(pack).toBeNull()
    })

    it('rejects out-of-range surah numbers', async () => {
      const { loadTranslationForSurah } = await import('../../../src/data/dataset.ts')
      await expect(loadTranslationForSurah('bridges', 0)).rejects.toThrow()
      await expect(loadTranslationForSurah('bridges', 115)).rejects.toThrow()
    })

    it('returns null for an empty id', async () => {
      const { loadTranslationForSurah } = await import('../../../src/data/dataset.ts')
      const pack = await loadTranslationForSurah('', 1)
      expect(pack).toBeNull()
    })
  })

  describe('getSourceIndex()', () => {
    it('loads the source catalog index with default baseline ids', async () => {
      const { getSourceIndex } = await import('../../../src/data/dataset.ts')
      const index = await getSourceIndex()
      expect(index.defaults).toEqual({
        riwayah: DEFAULT_READER_ASSET_PROFILE.riwayah,
        translation: DEFAULT_READER_ASSET_PROFILE.translationId,
        tafsir: DEFAULT_READER_ASSET_PROFILE.tafsirId,
      })
      expect(index.sources.map((source) => `${source.type}:${source.id}`)).toEqual([
        'riwayah:qaloon',
        'translation:bridges',
      ])
    })
  })
})
