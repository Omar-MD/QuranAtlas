import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  nextSurah,
  prevSurah,
  swapToSurah,
  consumeSwapAnchor,
  setupOverscrollSwap,
} from '../../../src/reader/surah-swap'

describe('reader/surah-swap.ts — wrap math', () => {
  it('nextSurah increments inside the range', () => {
    expect(nextSurah(1)).toBe(2)
    expect(nextSurah(57)).toBe(58)
    expect(nextSurah(113)).toBe(114)
  })

  it('nextSurah wraps 114 to 1', () => {
    expect(nextSurah(114)).toBe(1)
  })

  it('prevSurah decrements inside the range', () => {
    expect(prevSurah(2)).toBe(1)
    expect(prevSurah(58)).toBe(57)
    expect(prevSurah(114)).toBe(113)
  })

  it('prevSurah wraps 1 to 114', () => {
    expect(prevSurah(1)).toBe(114)
  })
})

describe('reader/surah-swap.ts — anchor stash + consume', () => {
  beforeEach(() => {
    // Clean any leftover from a previous test
    consumeSwapAnchor()
  })

  it('defaults to "top" when no anchor was stashed', () => {
    expect(consumeSwapAnchor()).toBe('top')
  })

  it('returns the stashed anchor and clears it after one read', () => {
    const w = globalThis as unknown as Record<string, string>
    w.__qaSurahSwapAnchor = 'bottom'
    expect(consumeSwapAnchor()).toBe('bottom')
    expect(consumeSwapAnchor()).toBe('top')
  })

  it('swapToSurah stashes the anchor and rewrites the URL hash', () => {
    const originalHash = window.location.hash
    swapToSurah(7, 'bottom')
    expect(window.location.hash).toBe('#/s/7')
    expect(consumeSwapAnchor()).toBe('bottom')
    window.location.hash = originalHash
  })
})

describe('reader/surah-swap.ts — setupOverscrollSwap', () => {
  let scroller: HTMLElement
  let onForward: ReturnType<typeof vi.fn>
  let onBackward: ReturnType<typeof vi.fn>
  let cleanup: () => void

  beforeEach(() => {
    scroller = document.createElement('div')
    Object.defineProperty(scroller, 'clientHeight', { value: 500, configurable: true })
    Object.defineProperty(scroller, 'scrollHeight', { value: 1000, configurable: true })
    onForward = vi.fn()
    onBackward = vi.fn()
    cleanup = setupOverscrollSwap({ scroller, onForward, onBackward })
  })

  afterEach(() => { cleanup() })

  it('fires onForward when wheel-down past the bottom edge', () => {
    scroller.scrollTop = 500 // scrollTop + clientHeight = 1000 = scrollHeight
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 80 }))
    expect(onForward).toHaveBeenCalledTimes(1)
    expect(onBackward).not.toHaveBeenCalled()
  })

  it('fires onBackward when wheel-up past the top edge', () => {
    scroller.scrollTop = 0
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: -80 }))
    expect(onBackward).toHaveBeenCalledTimes(1)
    expect(onForward).not.toHaveBeenCalled()
  })

  it('ignores small wheel deltas below the threshold', () => {
    scroller.scrollTop = 500
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 5 }))
    expect(onForward).not.toHaveBeenCalled()
  })

  it('ignores wheel-down when not yet at the bottom edge', () => {
    scroller.scrollTop = 200 // 200 + 500 = 700 < 1000 scrollHeight
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 80 }))
    expect(onForward).not.toHaveBeenCalled()
  })

  it('debounces repeated triggers within the cool-down window', () => {
    scroller.scrollTop = 500
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 80 }))
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 80 }))
    expect(onForward).toHaveBeenCalledTimes(1)
  })

  it('cleanup removes listeners', () => {
    cleanup()
    scroller.scrollTop = 500
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 80 }))
    expect(onForward).not.toHaveBeenCalled()
  })
})
