import { describe, it, expect } from 'vitest'
import {
  parseTokenKey,
  formatTokenKey,
  formatVerseTokenKey,
  verseTokenSelector,
  closestTokenKey,
  tokenVerseKey,
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

  // Test fixtures below build DOM via createElement (no innerHTML) so the
  // security hook stays clean even for static test markup.
  function fixture(opts: {
    outerTokenKey?: string
    innerTokenKey?: string
    innerClass?: string
  }): { inner: HTMLElement, cleanup: () => void } {
    const outer = document.createElement('div')
    if (opts.outerTokenKey !== undefined) {
      outer.setAttribute('data-token-key', opts.outerTokenKey)
    }
    const inner = document.createElement('span')
    if (opts.innerTokenKey !== undefined) {
      inner.setAttribute('data-token-key', opts.innerTokenKey)
    }
    if (opts.innerClass) { inner.className = opts.innerClass }
    outer.appendChild(inner)
    document.body.appendChild(outer)
    return { inner, cleanup: () => { outer.remove() } }
  }

  describe('closestTokenKey', () => {
    it('returns the data-token-key of the nearest ancestor', () => {
      const { inner, cleanup } = fixture({ outerTokenKey: '2:255', innerClass: 'inner' })
      expect(closestTokenKey(inner)).toBe('2:255')
      cleanup()
    })

    it('returns null when no ancestor has data-token-key', () => {
      const { inner, cleanup } = fixture({ innerClass: 'inner' })
      expect(closestTokenKey(inner)).toBeNull()
      cleanup()
    })

    it('returns null for null input', () => {
      expect(closestTokenKey(null)).toBeNull()
    })

    it('rejects ancestors with malformed data-token-key', () => {
      const { inner, cleanup } = fixture({ outerTokenKey: 'garbage', innerClass: 'inner' })
      expect(closestTokenKey(inner)).toBeNull()
      cleanup()
    })

    it('walks past nested data-token-key ancestors and returns the nearest', () => {
      const { inner, cleanup } = fixture({ outerTokenKey: '2:255', innerTokenKey: '2:255:7' })
      expect(closestTokenKey(inner)).toBe('2:255:7')
      cleanup()
    })
  })

  describe('tokenVerseKey', () => {
    it('strips wordIdx from word-grain key', () => {
      expect(tokenVerseKey('2:255:7')).toBe('2:255')
    })

    it('passes through verse-grain key unchanged', () => {
      expect(tokenVerseKey('2:255')).toBe('2:255')
    })

    it('returns null for malformed input', () => {
      expect(tokenVerseKey('garbage')).toBeNull()
      expect(tokenVerseKey('')).toBeNull()
      expect(tokenVerseKey('2:')).toBeNull()
    })
  })
})
