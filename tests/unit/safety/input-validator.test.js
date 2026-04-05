import { parseNavigationInput } from '../../../src/safety/input-validator.js'

const SURAHS = [
  { n: 1, name: 'Al-Fatihah', count: 7 },
  { n: 2, name: 'Al-Baqarah', count: 286 },
  { n: 9, name: 'At-Tawbah', count: 129 },
  { n: 36, name: 'Ya-Sin', count: 83 },
  { n: 114, name: 'An-Nas', count: 6 },
]

describe('safety/input-validator.js', () => {
  describe('parseNavigationInput', () => {
    it('accepts numeric surah', () => {
      const result = parseNavigationInput('2')
      expect(result).toEqual({ surah: 2, valid: true })
    })

    it('accepts surah:verse format', () => {
      const result = parseNavigationInput('2:255')
      expect(result).toEqual({ surah: 2, verse: 255, valid: true })
    })

    it('rejects out-of-range surah', () => {
      const result = parseNavigationInput('115')
      expect(result.valid).toBe(false)
    })

    it('rejects empty input', () => {
      const result = parseNavigationInput('')
      expect(result.valid).toBe(false)
    })

    it('rejects non-numeric verse', () => {
      const result = parseNavigationInput('2:25a')
      expect(result.valid).toBe(false)
    })

    it('rejects null input', () => {
      const result = parseNavigationInput(null)
      expect(result.valid).toBe(false)
    })

    it('rejects undefined input', () => {
      const result = parseNavigationInput(undefined)
      expect(result.valid).toBe(false)
    })

    it('rejects whitespace-only input', () => {
      const result = parseNavigationInput('   ')
      expect(result.valid).toBe(false)
    })

    it('rejects out-of-range surah with verse', () => {
      const result = parseNavigationInput('115:5')
      expect(result.valid).toBe(false)
    })

    it('rejects verse zero', () => {
      const result = parseNavigationInput('2:0')
      expect(result.valid).toBe(false)
    })

    it('rejects surah zero', () => {
      const result = parseNavigationInput('0')
      expect(result.valid).toBe(false)
    })
  })

  describe('parseNavigationInput with surahs list', () => {
    it('matches surah by full name (case-insensitive)', () => {
      const result = parseNavigationInput('al-baqarah', SURAHS)
      expect(result).toEqual({ surah: 2, valid: true })
    })

    it('matches surah by name without Al- prefix', () => {
      const result = parseNavigationInput('baqarah', SURAHS)
      expect(result).toEqual({ surah: 2, valid: true })
    })

    it('matches surah name with verse number', () => {
      const result = parseNavigationInput('Baqarah 255', SURAHS)
      expect(result).toEqual({ surah: 2, verse: 255, valid: true })
    })

    it('rejects unknown surah name', () => {
      const result = parseNavigationInput('xyz', SURAHS)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Unknown surah')
    })

    it('rejects out-of-range verse for named surah', () => {
      const result = parseNavigationInput('Baqarah 300', SURAHS)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('does not exist')
    })

    it('validates verse against count for numeric input', () => {
      const result = parseNavigationInput('2:300', SURAHS)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('does not exist')
    })

    it('accepts valid verse for numeric input with surahs', () => {
      const result = parseNavigationInput('2:255', SURAHS)
      expect(result).toEqual({ surah: 2, verse: 255, valid: true })
    })

    it('works without surahs param (backward compatible)', () => {
      const result = parseNavigationInput('2')
      expect(result).toEqual({ surah: 2, valid: true })
    })
  })
})
