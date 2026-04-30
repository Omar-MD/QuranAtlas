import { describe, it, expect } from 'vitest'
import {
  parseTokenKey,
  formatTokenKey,
  formatVerseTokenKey,
  verseTokenSelector,
} from '../../../src/core/tokenisable'

describe('tokenisable', () => {
  describe('parseTokenKey', () => {
    it('parses verse-grain keys', () => {
      expect(parseTokenKey('2:255')).toEqual({ surah: 2, ayah: 255 })
    })

    it('parses word-grain keys', () => {
      expect(parseTokenKey('2:255:7')).toEqual({ surah: 2, ayah: 255, wordIdx: 7 })
    })

    it('rejects malformed input', () => {
      expect(parseTokenKey('not-a-key')).toBeNull()
      expect(parseTokenKey('')).toBeNull()
      expect(parseTokenKey('2')).toBeNull()
      expect(parseTokenKey('2:abc')).toBeNull()
      expect(parseTokenKey('2:255:7:99')).toBeNull()
    })
  })

  describe('formatTokenKey', () => {
    it('formats verse-grain', () => {
      expect(formatTokenKey(36, 12)).toBe('36:12')
    })

    it('formats word-grain', () => {
      expect(formatTokenKey(36, 12, 0)).toBe('36:12:0')
    })

    it('formatVerseTokenKey aliases verse form', () => {
      expect(formatVerseTokenKey(36, 12)).toBe('36:12')
    })
  })

  describe('verseTokenSelector', () => {
    it('returns exact + word-prefix selector', () => {
      const sel = verseTokenSelector(2, 25)
      expect(sel).toContain('[data-token-key="2:25"]')
      expect(sel).toContain('[data-token-key^="2:25:"]')
    })

    it('does not collide between 2:25 and 2:255', () => {
      // Verify: a CSS engine receiving the 2:25 selector does NOT match
      // an element with data-token-key="2:255" — that's why we use
      // exact + colon-prefix join, not pure prefix.
      const sel = verseTokenSelector(2, 25)
      // Sanity: substring check on the raw selector must not include "2:255".
      expect(sel).not.toContain('2:255')
    })
  })
})
