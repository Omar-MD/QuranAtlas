import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getManifestUrls, getSurah, getSurahs } from '../../../src/data/dataset.js'

const DATASET_PATH = join(process.cwd(), 'public', 'dataset')

function mockFetch(url) {
  const filePath = join(DATASET_PATH, url.replace('/dataset/', ''))
  try {
    const content = readFileSync(filePath, 'utf-8')
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(JSON.parse(content)),
    })
  } catch {
    return Promise.resolve({
      ok: false,
      status: 404,
    })
  }
}

describe('data/dataset.js', () => {
  beforeAll(() => {
    globalThis.fetch = mockFetch
  })

  describe('getManifestUrls()', () => {
    it('returns a non-empty array of URL strings', async () => {
      const urls = await getManifestUrls()
      expect(Array.isArray(urls)).toBe(true)
      expect(urls.length).toBeGreaterThan(0)
      expect(typeof urls[0]).toBe('string')
    })

    it('includes all 114 surah files', async () => {
      const urls = await getManifestUrls()
      const surahUrls = urls.filter(u => u.includes('/surah/'))
      expect(surahUrls.length).toBe(114)
    })

    it('includes metadata files', async () => {
      const urls = await getManifestUrls()
      expect(urls.some(u => u.endsWith('/surahs.json'))).toBe(true)
      expect(urls.some(u => u.endsWith('/annotations.json'))).toBe(true)
    })
  })

  describe('getSurah()', () => {
    it('returns ar and en arrays for a valid surah', async () => {
      const surah = await getSurah(1)
      expect(surah).toHaveProperty('ar')
      expect(surah).toHaveProperty('en')
      expect(Array.isArray(surah.ar)).toBe(true)
      expect(Array.isArray(surah.en)).toBe(true)
    })

    it('returns 7 verses for Al-Fatiha', async () => {
      const surah = await getSurah(1)
      expect(surah.ar.length).toBe(7)
      expect(surah.en.length).toBe(7)
    })

    it('returns 286 verses for Al-Baqarah', async () => {
      const surah = await getSurah(2)
      expect(surah.ar.length).toBe(286)
    })

    it('throws for invalid surah numbers', async () => {
      await expect(getSurah(0)).rejects.toThrow()
      await expect(getSurah(115)).rejects.toThrow()
      await expect(getSurah(-1)).rejects.toThrow()
    })
  })
})
