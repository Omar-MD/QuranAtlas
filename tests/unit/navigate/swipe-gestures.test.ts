import { describe, it, expect } from 'vitest'
import { classifySwipe, clampSurah } from '../../../src/navigate/swipe-gestures'

describe('classifySwipe', () => {
  it('returns null when horizontal delta below threshold', () => {
    expect(classifySwipe({ dx: 30, dy: 5, dtMs: 200 })).toBeNull()
  })
  it('returns null when vertical drift exceeds gate', () => {
    expect(classifySwipe({ dx: 80, dy: 40, dtMs: 200 })).toBeNull()
  })
  it('returns null when velocity below threshold', () => {
    expect(classifySwipe({ dx: 60, dy: 5, dtMs: 1000 })).toBeNull()
  })
  it('classifies a fast leftward swipe as "left"', () => {
    expect(classifySwipe({ dx: -80, dy: 5, dtMs: 200 })).toBe('left')
  })
  it('classifies a fast rightward swipe as "right"', () => {
    expect(classifySwipe({ dx: 80, dy: 5, dtMs: 200 })).toBe('right')
  })
  it('classifies a fast downward swipe as "down" when dy dominates', () => {
    expect(classifySwipe({ dx: 5, dy: 80, dtMs: 200 })).toBe('down')
  })
  it('returns null for upward swipes (down-only support)', () => {
    expect(classifySwipe({ dx: 5, dy: -80, dtMs: 200 })).toBeNull()
  })
})

describe('clampSurah', () => {
  it('clamps below 1 to 1', () => { expect(clampSurah(0)).toBe(1) })
  it('clamps above 114 to 114', () => { expect(clampSurah(115)).toBe(114) })
  it('passes valid values through', () => { expect(clampSurah(57)).toBe(57) })
})
