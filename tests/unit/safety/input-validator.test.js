import { parseNavigationInput } from '../../../src/safety/input-validator.js'

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
  })
})
