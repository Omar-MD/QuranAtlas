import { describe, expect, it, vi } from 'vitest'

import { logger } from '../../../src/core/logger.js'
import { SW_UPDATE_POLL_INTERVAL_MS, startSwUpdatePolling } from '../../../src/core/sw-update-poll.ts'

function makeFakeDoc(initialVisibility: DocumentVisibilityState = 'visible') {
  const listeners = new Map<string, EventListener[]>()
  return {
    visibilityState: initialVisibility,
    addEventListener: vi.fn((type: string, fn: EventListener) => {
      const arr = listeners.get(type) ?? []
      arr.push(fn)
      listeners.set(type, arr)
    }),
    fire(type: string) {
      for (const fn of listeners.get(type) ?? []) { fn(new Event(type)) }
    },
    setVisibility(state: DocumentVisibilityState) {
      this.visibilityState = state
    },
  }
}

function makeFakeWin() {
  const listeners = new Map<string, EventListener[]>()
  return {
    addEventListener: vi.fn((type: string, fn: EventListener) => {
      const arr = listeners.get(type) ?? []
      arr.push(fn)
      listeners.set(type, arr)
    }),
    fire(type: string) {
      for (const fn of listeners.get(type) ?? []) { fn(new Event(type)) }
    },
  }
}

describe('core/sw-update-poll', () => {
  it('calls reg.update() when the document becomes visible', () => {
    const reg = { update: vi.fn().mockResolvedValue(undefined) }
    const doc = makeFakeDoc('hidden')
    const win = makeFakeWin()

    startSwUpdatePolling(reg, { doc, win, setInterval: vi.fn() })

    expect(reg.update).not.toHaveBeenCalled()
    doc.setVisibility('visible')
    doc.fire('visibilitychange')
    expect(reg.update).toHaveBeenCalledTimes(1)
  })

  it('does not call reg.update() while the document is hidden', () => {
    const reg = { update: vi.fn().mockResolvedValue(undefined) }
    const doc = makeFakeDoc('visible')
    const win = makeFakeWin()

    startSwUpdatePolling(reg, { doc, win, setInterval: vi.fn() })

    doc.setVisibility('hidden')
    doc.fire('visibilitychange')
    expect(reg.update).not.toHaveBeenCalled()
  })

  it('calls reg.update() on window focus', () => {
    const reg = { update: vi.fn().mockResolvedValue(undefined) }
    const doc = makeFakeDoc()
    const win = makeFakeWin()

    startSwUpdatePolling(reg, { doc, win, setInterval: vi.fn() })

    win.fire('focus')
    expect(reg.update).toHaveBeenCalledTimes(1)
  })

  it('schedules a 30-minute interval poll', () => {
    const reg = { update: vi.fn().mockResolvedValue(undefined) }
    const setIntervalSpy = vi.fn()

    startSwUpdatePolling(reg, { doc: makeFakeDoc(), win: makeFakeWin(), setInterval: setIntervalSpy })

    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    expect(setIntervalSpy.mock.calls[0]?.[1]).toBe(SW_UPDATE_POLL_INTERVAL_MS)
    const handler = setIntervalSpy.mock.calls[0]?.[0] as () => void
    handler()
    expect(reg.update).toHaveBeenCalledTimes(1)
  })

  it('swallows reg.update() rejections without throwing', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const reg = { update: vi.fn().mockRejectedValue(new Error('boom')) }
    const win = makeFakeWin()

    startSwUpdatePolling(reg, { doc: makeFakeDoc(), win, setInterval: vi.fn() })

    expect(() => win.fire('focus')).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()
    expect(warnSpy).toHaveBeenCalledWith('SW update poll failed:', { error: expect.any(Error) })
    warnSpy.mockRestore()
  })
})
