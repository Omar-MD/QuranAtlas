import { parseNavigationInput, validateTagLabel, validateTagParam, validateLayerParam } from '../../../src/safety/input-validator.js'

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

  describe('validateTagLabel()', () => {
    it('accepts a valid lowercase label', () => {
      expect(validateTagLabel('study')).toEqual({ valid: true, label: 'study' })
    })

    it('lowercases the label', () => {
      expect(validateTagLabel('Study')).toEqual({ valid: true, label: 'study' })
    })

    it('trims whitespace', () => {
      expect(validateTagLabel('  study  ')).toEqual({ valid: true, label: 'study' })
    })

    it('rejects empty string', () => {
      expect(validateTagLabel('')).toEqual({ valid: false, error: 'Tag label is required' })
    })

    it('rejects whitespace-only', () => {
      expect(validateTagLabel('   ')).toEqual({ valid: false, error: 'Tag label is required' })
    })

    it('rejects null/undefined', () => {
      expect(validateTagLabel(null)).toEqual({ valid: false, error: 'Tag label is required' })
      expect(validateTagLabel(undefined)).toEqual({ valid: false, error: 'Tag label is required' })
    })

    it('rejects labels over 50 chars', () => {
      const long = 'a'.repeat(51)
      expect(validateTagLabel(long)).toEqual({ valid: false, error: 'Tag label must be 50 characters or less' })
    })

    it('rejects labels with control characters', () => {
      expect(validateTagLabel('study' + String.fromCharCode(0))).toEqual({ valid: false, error: 'Tag label contains invalid characters' })
      expect(validateTagLabel('study' + String.fromCharCode(10))).toEqual({ valid: false, error: 'Tag label contains invalid characters' })
    })

    it('accepts labels at exactly 50 chars', () => {
      const exact = 'a'.repeat(50)
      expect(validateTagLabel(exact)).toEqual({ valid: true, label: exact })
    })
  })

  describe('validateTagParam()', () => {
    it('returns valid + lowercased label for normal input', () => {
      const result = validateTagParam('Study')
      expect(result).toEqual({ valid: true, label: 'study' })
    })

    it('trims whitespace', () => {
      const result = validateTagParam('  study  ')
      expect(result).toEqual({ valid: true, label: 'study' })
    })

    it('collapses internal whitespace', () => {
      const result = validateTagParam('my   tag')
      expect(result).toEqual({ valid: true, label: 'my tag' })
    })

    it('rejects empty string', () => {
      const result = validateTagParam('')
      expect(result.valid).toBe(false)
    })

    it('rejects string over 50 chars', () => {
      const result = validateTagParam('x'.repeat(51))
      expect(result.valid).toBe(false)
    })

    it('accepts string of exactly 50 chars', () => {
      const result = validateTagParam('x'.repeat(50))
      expect(result.valid).toBe(true)
    })

    it('rejects control characters', () => {
      const result = validateTagParam('study\x00')
      expect(result.valid).toBe(false)
    })

    it('rejects U+007F-U+009F control chars', () => {
      const result = validateTagParam('study\x7f')
      expect(result.valid).toBe(false)
    })

    it('handles URL-decoded unicode', () => {
      const result = validateTagParam('qur\u00e2n')
      expect(result.valid).toBe(true)
      expect(result.label).toBe('qur\u00e2n')
    })
  })

  describe('validateLayerParam', () => {
    it('accepts known layer + well-formed value', () => {
      expect(validateLayerParam('audience', 'muminin').valid).toBe(true)
      expect(validateLayerParam('people', 'musa').valid).toBe(true)
    })
    it('rejects unknown layer', () => {
      expect(validateLayerParam('bogus', 'foo').valid).toBe(false)
    })
    it('rejects empty or overlong value', () => {
      expect(validateLayerParam('threads', '').valid).toBe(false)
      expect(validateLayerParam('threads', 'x'.repeat(51)).valid).toBe(false)
    })
    it('canonicalizes input value', () => {
      const r = validateLayerParam('people', 'Moses')
      expect(r.valid).toBe(true)
      if (r.valid) {
        expect(r.canonical).toBe('musa')
        expect(r.layer).toBe('people')
      }
    })
  })
})
