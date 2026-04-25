import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  nextSurah,
  prevSurah,
  swapToSurah,
  consumeSwapAnchor,
  setupPullToSwap,
  PULL_THRESHOLD_PX,
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

describe('reader/surah-swap.ts — setupPullToSwap (wheel)', () => {
  let scroller: HTMLElement
  let onPull: ReturnType<typeof vi.fn>
  let onCommit: ReturnType<typeof vi.fn>
  let cleanup: () => void

  beforeEach(() => {
    scroller = document.createElement('div')
    Object.defineProperty(scroller, 'clientHeight', { value: 500, configurable: true })
    Object.defineProperty(scroller, 'scrollHeight', { value: 1000, configurable: true })
    onPull = vi.fn()
    onCommit = vi.fn()
    cleanup = setupPullToSwap({ scroller, onPull, onCommit })
  })

  afterEach(() => { cleanup() })

  it('emits forward progress as wheel-down accumulates at scroll-bottom', () => {
    scroller.scrollTop = 500 // at bottom
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 30 }))
    const last = onPull.mock.calls.at(-1)?.[0]
    expect(last?.direction).toBe('forward')
    expect(last?.progress).toBeGreaterThan(0)
    expect(last?.progress).toBeLessThan(1)
  })

  it('emits backward progress as wheel-up accumulates at scroll-top', () => {
    scroller.scrollTop = 0
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: -30 }))
    const last = onPull.mock.calls.at(-1)?.[0]
    expect(last?.direction).toBe('backward')
    expect(last?.progress).toBeGreaterThan(0)
  })

  it('does not emit when not at edge', () => {
    scroller.scrollTop = 200
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 30 }))
    expect(onPull).not.toHaveBeenCalled()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('reaches progress=1 and commits forward when wheel sum exceeds threshold', () => {
    vi.useFakeTimers()
    scroller.scrollTop = 500
    // Pull past threshold in chunks
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: PULL_THRESHOLD_PX + 20 }))
    // Wait past the wheel-idle commit window
    vi.advanceTimersByTime(300)
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('forward')
    vi.useRealTimers()
  })

  it('does NOT commit if wheel sum stays below threshold', () => {
    vi.useFakeTimers()
    scroller.scrollTop = 500
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 30 }))
    vi.advanceTimersByTime(300)
    expect(onCommit).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('cleanup removes listeners — no further pull events fire', () => {
    cleanup()
    scroller.scrollTop = 500
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: PULL_THRESHOLD_PX + 50 }))
    expect(onPull).not.toHaveBeenCalled()
    expect(onCommit).not.toHaveBeenCalled()
  })
})

describe('reader/surah-swap.ts — setupPullToSwap (touch)', () => {
  let scroller: HTMLElement
  let onPull: ReturnType<typeof vi.fn>
  let onCommit: ReturnType<typeof vi.fn>
  let cleanup: () => void

  beforeEach(() => {
    scroller = document.createElement('div')
    Object.defineProperty(scroller, 'clientHeight', { value: 500, configurable: true })
    Object.defineProperty(scroller, 'scrollHeight', { value: 1000, configurable: true })
    onPull = vi.fn()
    onCommit = vi.fn()
    cleanup = setupPullToSwap({ scroller, onPull, onCommit })
  })

  afterEach(() => { cleanup() })

  function makeTouchEvent(type: string, clientY: number): TouchEvent {
    const t = { clientY, identifier: 0, target: scroller } as unknown as Touch
    return new TouchEvent(type, { touches: type === 'touchend' ? [] : [t] })
  }

  it('forward: finger up at scroll-bottom past threshold then release commits', () => {
    scroller.scrollTop = 500
    scroller.dispatchEvent(makeTouchEvent('touchstart', 400))
    scroller.dispatchEvent(makeTouchEvent('touchmove', 400 - (PULL_THRESHOLD_PX + 20)))
    scroller.dispatchEvent(makeTouchEvent('touchend', 0))
    expect(onCommit).toHaveBeenCalledWith('forward')
  })

  it('backward: finger down at scroll-top past threshold then release commits', () => {
    scroller.scrollTop = 0
    scroller.dispatchEvent(makeTouchEvent('touchstart', 100))
    scroller.dispatchEvent(makeTouchEvent('touchmove', 100 + (PULL_THRESHOLD_PX + 20)))
    scroller.dispatchEvent(makeTouchEvent('touchend', 0))
    expect(onCommit).toHaveBeenCalledWith('backward')
  })

  it('release with progress < 1 does not commit and resets state', () => {
    scroller.scrollTop = 500
    scroller.dispatchEvent(makeTouchEvent('touchstart', 400))
    scroller.dispatchEvent(makeTouchEvent('touchmove', 400 - 30))
    scroller.dispatchEvent(makeTouchEvent('touchend', 0))
    expect(onCommit).not.toHaveBeenCalled()
    // Last emit should be release (null)
    expect(onPull.mock.calls.at(-1)?.[0]).toBeNull()
  })

  it('finger movement that does not start at an edge is ignored', () => {
    scroller.scrollTop = 200
    scroller.dispatchEvent(makeTouchEvent('touchstart', 400))
    scroller.dispatchEvent(makeTouchEvent('touchmove', 400 - 200))
    scroller.dispatchEvent(makeTouchEvent('touchend', 0))
    expect(onCommit).not.toHaveBeenCalled()
  })
})
