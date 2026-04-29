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
    it('lists 342 per-surah riwayat files (114 × 3)', async () => {
      const { getManifestUrls } = await import('../../../src/data/dataset.ts')
      const urls = await getManifestUrls()
      const riwayat = urls.filter((u) => u.includes('/riwayat/'))
      expect(riwayat.length).toBe(342)
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

    it('respects active Riwayah for path resolution', async () => {
      mockedRiwayah = 'hafs'
      vi.resetModules() // re-import with fresh mock binding
      const { getSurah } = await import('../../../src/data/dataset.ts')
      const data = await getSurah(1)
      expect(data.riwayah).toBe('hafs')
      // line_start retained on Hafs only (audit R-24, 2026-04-29) for the
      // v2.1 page-image mushaf renderer; Warsh/Qaloon ship without it.
      expect(data.ayat[0]).toHaveProperty('line_start')
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
      // Saheeh ships footnotes for the bismillah verse — at least one should be present.
      expect(Object.keys(pack.footnotes).length).toBeGreaterThan(0)
    })

    it('returns null for an absent translation pack (404)', async () => {
      const { loadTranslationForSurah } = await import('../../../src/data/dataset.ts')
      const pack = await loadTranslationForSurah('does-not-exist', 1)
      expect(pack).toBeNull()
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
})
