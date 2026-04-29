/**
 * Haptics module — semantic vibration helpers.
 *
 * Covers: vibrate routing per helper, no-op when API absent, no-op when
 * prefers-reduced-motion is set. Module init runs at import time, so
 * each test re-imports via `vi.resetModules()` to pick up the matchMedia
 * + navigator.vibrate state of that scenario.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type MatchMediaListener = (e: { matches: boolean }) => void

function installMatchMedia(reduce: boolean): { listeners: MatchMediaListener[] } {
  const listeners: MatchMediaListener[] = []
  ;(window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia = ((q: string) => {
    void q
    return {
      matches: reduce,
      media: q,
      onchange: null,
      addEventListener: (_: string, l: MatchMediaListener) => { listeners.push(l) },
      removeEventListener: () => { /* no-op */ },
      addListener: () => { /* legacy */ },
      removeListener: () => { /* legacy */ },
      dispatchEvent: () => true,
    } as unknown as MediaQueryList
  }) as typeof window.matchMedia
  return { listeners }
}

describe('core/haptics', () => {
  let vibrateSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vibrateSpy = vi.fn(() => true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrateSpy, configurable: true, writable: true })
    vi.resetModules()
  })

  afterEach(() => {
    delete (navigator as unknown as { vibrate?: unknown }).vibrate
  })

  it('tap() fires a short single pulse', async () => {
    installMatchMedia(false)
    const haptics = await import('../../../src/core/haptics.ts')
    haptics.tap()
    expect(vibrateSpy).toHaveBeenCalledWith(15)
  })

  it('toggle() fires a 3-pulse pattern', async () => {
    installMatchMedia(false)
    const haptics = await import('../../../src/core/haptics.ts')
    haptics.toggle()
    expect(vibrateSpy).toHaveBeenCalledWith([15, 30, 15])
  })

  it('select() fires a select pulse', async () => {
    installMatchMedia(false)
    const haptics = await import('../../../src/core/haptics.ts')
    haptics.select()
    expect(vibrateSpy).toHaveBeenCalledWith(20)
  })

  it('isAvailable() reflects vibrate + reduce-motion state', async () => {
    installMatchMedia(false)
    const haptics = await import('../../../src/core/haptics.ts')
    expect(haptics.isAvailable()).toBe(true)
  })

  it('no-ops when navigator.vibrate is absent', async () => {
    delete (navigator as unknown as { vibrate?: unknown }).vibrate
    installMatchMedia(false)
    const haptics = await import('../../../src/core/haptics.ts')
    expect(() => haptics.tap()).not.toThrow()
    expect(vibrateSpy).not.toHaveBeenCalled()
  })

  it('no-ops when prefers-reduced-motion is set', async () => {
    installMatchMedia(true)
    const haptics = await import('../../../src/core/haptics.ts')
    haptics.tap()
    haptics.toggle()
    haptics.select()
    expect(vibrateSpy).not.toHaveBeenCalled()
  })
})
