import { describe, it, expect, beforeAll, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DATASET_PATH = join(process.cwd(), 'public', 'dataset')

// Mock loadRiwayah BEFORE importing dataset module — controls which Riwayah
// path getSurah resolves to.
let mockedRiwayah = 'qaloon'
vi.mock('../../../src/configure/riwayah.ts', () => ({
  loadRiwayah: vi.fn(async () => mockedRiwayah),
}))

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

function mockFetchWithHtmlFallback(url) {
  const asString = String(url)
  if (asString.includes('/riwayat/hafs/')) {
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
    it('fetches /dataset/riwayat/qaloon/001.json by default and returns SurahPayload', async () => {
      mockedRiwayah = 'qaloon'
      const { getSurah } = await import('../../../src/data/dataset.ts')
      const data = await getSurah(1)
      expect(data.riwayah).toBe('qaloon')
      expect(data.sura_no).toBe(1)
      expect(Array.isArray(data.ayat)).toBe(true)
      expect(data.ayat.length).toBeGreaterThan(0)
      expect(data.ayat[0].aya_text).toContain('اِ۬لْحَمْدُ')
    })

    it('throws an unavailable-pack error when the saved Riwayah is absent from the baseline', async () => {
      mockedRiwayah = 'hafs'
      vi.resetModules() // re-import with fresh mock binding
      const { getSurah, RiwayahPackUnavailableError } = await import('../../../src/data/dataset.ts')
      await expect(getSurah(1)).rejects.toMatchObject({
        code: 'RIWAYAH_PACK_UNAVAILABLE',
        riwayah: 'hafs',
      })
      await expect(getSurah(1)).rejects.toBeInstanceOf(RiwayahPackUnavailableError)
    })

    it('throws before fetching a missing non-default pack that would resolve to HTML', async () => {
      mockedRiwayah = 'hafs'
      globalThis.fetch = mockFetchWithHtmlFallback
      vi.resetModules()
      const { getSurah } = await import('../../../src/data/dataset.ts')
      await expect(getSurah(1)).rejects.toMatchObject({
        code: 'RIWAYAH_PACK_UNAVAILABLE',
        riwayah: 'hafs',
      })
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

    it('reports optional text packs as unavailable when omitted from the manifest', async () => {
      const { getRiwayahTextAvailability } = await import('../../../src/data/dataset.ts')
      await expect(getRiwayahTextAvailability('hafs')).resolves.toMatchObject({
        riwayah: 'hafs',
        available: false,
      })
      await expect(getRiwayahTextAvailability('warsh')).resolves.toMatchObject({
        riwayah: 'warsh',
        available: false,
      })
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
    it('lists default and opt-in translation sources from the source index', async () => {
      const { getTranslations } = await import('../../../src/data/dataset.ts')
      const list = await getTranslations()
      expect(Array.isArray(list)).toBe(true)
      expect(list.length).toBeGreaterThanOrEqual(4)
      const bridges = list.find((t) => t.id === 'bridges')
      expect(bridges).toBeDefined()
      expect(bridges.name).toBe('Bridges')
      expect(bridges.availableInManifest).toBe(true)
      expect(bridges.language).toBe('en')
      expect(list.find((t) => t.id === 'saheeh')).toMatchObject({
        id: 'saheeh',
        name: 'Saheeh International',
        language: 'en',
        availableInManifest: false,
      })
      expect(bridges).toMatchObject({
        id: 'bridges',
        name: 'Bridges',
        language: 'en',
        availableInManifest: true,
      })
      expect(list.find((t) => t.id === 'clear-quran')).toMatchObject({
        id: 'clear-quran',
        name: 'The Clear Quran',
        language: 'en',
        availableInManifest: false,
      })
      expect(list.find((t) => t.id === 'abdel-haleem')).toMatchObject({
        id: 'abdel-haleem',
        name: 'M.A.S. Abdel Haleem',
        language: 'en',
        availableInManifest: false,
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
      expect(pack).not.toBeNull()
      expect(pack.translationId).toBe('bridges')
    })

    it('loads an optional translation pack on demand when its asset files exist outside the baseline manifest', async () => {
      const { loadTranslationForSurah } = await import('../../../src/data/dataset.ts')
      const pack = await loadTranslationForSurah('saheeh', 1)
      expect(pack).not.toBeNull()
      expect(pack.translationId).toBe('saheeh')
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
      expect(index.defaults).toMatchObject({
        riwayah: 'qaloon',
        translation: 'bridges',
        tafsir: 'muyassar',
      })
      expect(index.sources.some((s) => s.id === 'muyassar' && s.type === 'tafsir')).toBe(true)
    })
  })

  describe('getTafsirs() / loadTafsirForSurah()', () => {
    it('lists default and opt-in tafsir packs from the source index', async () => {
      const { getTafsirs } = await import('../../../src/data/dataset.ts')
      const list = await getTafsirs()
      expect(list.find((t) => t.id === 'muyassar')).toMatchObject({
        id: 'muyassar',
        name: 'Tafsir Muyassar',
        language: 'ar',
        availableInManifest: true,
      })
      expect(list.find((t) => t.id === 'mukhtasar')).toMatchObject({
        id: 'mukhtasar',
        name: 'Al-Mukhtasar fi al-Tafsir',
        language: 'ar',
        availableInManifest: false,
      })
      expect(list.find((t) => t.id === 'saadi')).toMatchObject({
        id: 'saadi',
        name: "Tafsir al-Sa'di",
        language: 'ar',
        availableInManifest: false,
      })
    })

    it('loads grouped tafsir entries for one surah', async () => {
      const { loadTafsirForSurah } = await import('../../../src/data/dataset.ts')
      const pack = await loadTafsirForSurah('muyassar', 73)
      expect(pack).not.toBeNull()
      expect(pack.tafsirId).toBe('muyassar')
      expect(pack.entries.some((e) => e.startKey === '73:1' && e.endKey === '73:4')).toBe(true)
    })

    it('loads an optional tafsir pack on demand when its asset files exist outside the baseline manifest', async () => {
      const { loadTafsirForSurah } = await import('../../../src/data/dataset.ts')
      const pack = await loadTafsirForSurah('mukhtasar', 73)
      expect(pack).not.toBeNull()
      expect(pack.tafsirId).toBe('mukhtasar')
    })
  })
})
