import {
  SURAHS,
  SURAHS_CONTENT,
  MOCK_MARKS,
  MOCK_POSITIONS,
  setupMockData,
  setupMockFetch,
} from '../../../stories/mock-data.js'

describe('stories/mock-data.js', () => {
  describe('SURAHS', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(SURAHS)).toBe(true)
      expect(SURAHS.length).toBeGreaterThan(0)
    })

    it('each surah has required fields', () => {
      for (const s of SURAHS) {
        expect(s).toHaveProperty('n')
        expect(s).toHaveProperty('name')
        expect(s).toHaveProperty('arabic')
        expect(s).toHaveProperty('type')
        expect(s).toHaveProperty('count')
      }
    })

    it('includes Al-Fatiha as surah 1', () => {
      const fatiha = SURAHS.find(s => s.n === 1)
      expect(fatiha).toBeTruthy()
      expect(fatiha.count).toBe(7)
    })
  })

  describe('SURAHS_CONTENT', () => {
    it('has ar and en arrays for surah 1', () => {
      expect(SURAHS_CONTENT[1]).toHaveProperty('ar')
      expect(SURAHS_CONTENT[1]).toHaveProperty('en')
      expect(Array.isArray(SURAHS_CONTENT[1].ar)).toBe(true)
      expect(Array.isArray(SURAHS_CONTENT[1].en)).toBe(true)
    })

    it('surah 1 has 7 verses', () => {
      expect(SURAHS_CONTENT[1].ar.length).toBe(7)
      expect(SURAHS_CONTENT[1].en.length).toBe(7)
    })

    it('ar and en arrays have matching lengths', () => {
      for (const [key, surah] of Object.entries(SURAHS_CONTENT)) {
        expect(surah.ar.length).toBe(surah.en.length)
      }
    })
  })

  describe('MOCK_MARKS', () => {
    it('has verseKey and tags for each entry', () => {
      for (const [key, mark] of Object.entries(MOCK_MARKS)) {
        expect(mark).toHaveProperty('verseKey')
        expect(mark).toHaveProperty('tags')
        expect(Array.isArray(mark.tags)).toBe(true)
      }
    })
  })

  describe('MOCK_POSITIONS', () => {
    it('has required position fields', () => {
      for (const [key, pos] of Object.entries(MOCK_POSITIONS)) {
        expect(pos).toHaveProperty('id')
        expect(pos).toHaveProperty('surah')
        expect(pos).toHaveProperty('verse')
        expect(pos).toHaveProperty('savedAt')
      }
    })
  })

  describe('setupMockFetch', () => {
    let originalFetch

    beforeAll(() => {
      originalFetch = globalThis.fetch
    })

    afterAll(() => {
      globalThis.fetch = originalFetch
    })

    it('returns surah content for dataset URLs', async () => {
      setupMockFetch(1)
      const res = await fetch('/dataset/surah/001.json')
      expect(res.ok).toBe(true)
      const data = await res.json()
      expect(data.ar.length).toBe(7)
    })

    it('returns surahs list for surahs.json', async () => {
      setupMockFetch(1)
      const res = await fetch('/dataset/surahs.json')
      expect(res.ok).toBe(true)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
    })

    it('falls through to original fetch for non-dataset URLs', async () => {
      setupMockFetch(1)
      expect(globalThis.fetch).not.toBe(originalFetch)
    })
  })
})
