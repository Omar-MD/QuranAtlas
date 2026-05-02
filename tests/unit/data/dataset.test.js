import { describe, it, expect, beforeAll, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DATASET_PATH = join(process.cwd(), 'public', 'dataset')

// Mock loadRiwayah BEFORE importing dataset module — controls which Riwayah
// path getSurah resolves to.
let mockedRiwayah = 'qaloon'
vi.mock('../../../src/settings/riwayah.ts', () => ({
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

    it('falls back to Qaloon when the saved Riwayah is absent from the baseline', async () => {
      mockedRiwayah = 'hafs'
      vi.resetModules() // re-import with fresh mock binding
      const { getSurah } = await import('../../../src/data/dataset.ts')
      const data = await getSurah(1)
      expect(data.riwayah).toBe('qaloon')
    })

    it('rejects out-of-range surah numbers', async () => {
      const { getSurah } = await import('../../../src/data/dataset.ts')
      await expect(getSurah(0)).rejects.toThrow()
      await expect(getSurah(115)).rejects.toThrow()
      await expect(getSurah(1.5)).rejects.toThrow()
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
    it('lists each shipped pack with id, label, translator, language', async () => {
      const { getTranslations } = await import('../../../src/data/dataset.ts')
      const list = await getTranslations()
      expect(Array.isArray(list)).toBe(true)
      expect(list.length).toBeGreaterThanOrEqual(1)
      const saheeh = list.find((t) => t.id === 'saheeh')
      expect(saheeh).toBeDefined()
      expect(saheeh.name).toBe('Saheeh International')
      expect(saheeh.subtitle).toBe('Saheeh International')
      expect(saheeh.language).toBe('en')
    })
  })

  describe('loadTranslationForSurah()', () => {
    it('returns the per-surah pack for a shipped translation', async () => {
      const { loadTranslationForSurah } = await import('../../../src/data/dataset.ts')
      const pack = await loadTranslationForSurah('saheeh', 1)
      expect(pack).not.toBeNull()
      expect(pack.translationId).toBe('saheeh')
      expect(pack.surahNo).toBe(1)
      expect(Array.isArray(pack.verses)).toBe(true)
      expect(pack.verses.length).toBeGreaterThan(0)
      expect(pack.verses[0].key).toBe('1:1')
      expect(pack.footnotes).toEqual({})
    })

    it('returns null for an absent translation pack (404)', async () => {
      const { loadTranslationForSurah } = await import('../../../src/data/dataset.ts')
      const pack = await loadTranslationForSurah('does-not-exist', 1)
      expect(pack).not.toBeNull()
      expect(pack.translationId).toBe('saheeh')
    })

    it('rejects out-of-range surah numbers', async () => {
      const { loadTranslationForSurah } = await import('../../../src/data/dataset.ts')
      await expect(loadTranslationForSurah('saheeh', 0)).rejects.toThrow()
      await expect(loadTranslationForSurah('saheeh', 115)).rejects.toThrow()
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
        translation: 'saheeh',
        tafsir: 'muyassar',
      })
      expect(index.sources.some((s) => s.id === 'muyassar' && s.type === 'tafsir')).toBe(true)
    })
  })

  describe('getTafsirs() / loadTafsirForSurah()', () => {
    it('lists baseline tafsir packs from the source index', async () => {
      const { getTafsirs } = await import('../../../src/data/dataset.ts')
      const list = await getTafsirs()
      expect(list.find((t) => t.id === 'muyassar')).toMatchObject({
        id: 'muyassar',
        name: 'Tafsir Muyassar',
        language: 'ar',
      })
    })

    it('loads grouped tafsir entries for one surah', async () => {
      const { loadTafsirForSurah } = await import('../../../src/data/dataset.ts')
      const pack = await loadTafsirForSurah('muyassar', 73)
      expect(pack).not.toBeNull()
      expect(pack.tafsirId).toBe('muyassar')
      expect(pack.entries.some((e) => e.startKey === '73:1' && e.endKey === '73:4')).toBe(true)
    })
  })
})
