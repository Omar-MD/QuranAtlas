import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  nextSurah,
  prevSurah,
  swapToSurah,
  consumeSwapAnchor,
  setupPullToSwap,
  PULL_THRESHOLD_PX,
} from '../../../src/read/surah-swap'

/**
 * Pull-to-swap requires the scroller to have settled at an edge for
 * SCROLL_SETTLE_MS (~250) before wheel/touch input is allowed to
 * accumulate as pull. Tests therefore advance past that window before
 * dispatching the gesture events.
 */
const SETTLE_WAIT_MS = 300

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
    vi.useFakeTimers()
    scroller = document.createElement('div')
    Object.defineProperty(scroller, 'clientHeight', { value: 500, configurable: true })
    Object.defineProperty(scroller, 'scrollHeight', { value: 1000, configurable: true })
    onPull = vi.fn()
    onCommit = vi.fn()
    cleanup = setupPullToSwap({ scroller, onPull, onCommit })
    // Walk past the SCROLL_SETTLE_MS gate that arms wheel/touch input.
    vi.advanceTimersByTime(SETTLE_WAIT_MS)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('emits forward progress as wheel-down accumulates at scroll-bottom', () => {
    scroller.scrollTop = 500
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
    scroller.scrollTop = 500
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: PULL_THRESHOLD_PX + 20 }))
    vi.advanceTimersByTime(400)
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('forward')
  })

  it('does NOT commit if wheel sum stays below threshold', () => {
    scroller.scrollTop = 500
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 30 }))
    vi.advanceTimersByTime(400)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('ignores wheel input that arrives during ongoing scroll (no settle)', () => {
    scroller.scrollTop = 500
    // Simulate scroll activity right before the wheel — settle gate must veto.
    scroller.dispatchEvent(new Event('scroll'))
    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: PULL_THRESHOLD_PX + 50 }))
    vi.advanceTimersByTime(400)
    expect(onPull).not.toHaveBeenCalled()
    expect(onCommit).not.toHaveBeenCalled()
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
    vi.useFakeTimers()
    scroller = document.createElement('div')
    Object.defineProperty(scroller, 'clientHeight', { value: 500, configurable: true })
    Object.defineProperty(scroller, 'scrollHeight', { value: 1000, configurable: true })
    onPull = vi.fn()
    onCommit = vi.fn()
    cleanup = setupPullToSwap({ scroller, onPull, onCommit })
    vi.advanceTimersByTime(SETTLE_WAIT_MS)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

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
    expect(onPull.mock.calls.at(-1)?.[0]).toBeNull()
  })

  it('finger movement that does not start at an edge is ignored', () => {
    scroller.scrollTop = 200
    scroller.dispatchEvent(makeTouchEvent('touchstart', 400))
    scroller.dispatchEvent(makeTouchEvent('touchmove', 400 - 200))
    scroller.dispatchEvent(makeTouchEvent('touchend', 0))
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('touchstart during ongoing scroll (no settle) cannot pull even at edge', () => {
    scroller.scrollTop = 500
    scroller.dispatchEvent(new Event('scroll'))
    scroller.dispatchEvent(makeTouchEvent('touchstart', 400))
    scroller.dispatchEvent(makeTouchEvent('touchmove', 400 - (PULL_THRESHOLD_PX + 50)))
    scroller.dispatchEvent(makeTouchEvent('touchend', 0))
    expect(onCommit).not.toHaveBeenCalled()
  })
})
