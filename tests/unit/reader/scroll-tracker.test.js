import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'

function mockIntersectionObserver() {
  const observers = []

  class MockIntersectionObserver {
    constructor(callback, options) {
      this.callback = callback
      this.options = options
      this.root = options?.root || null
      this.rootMargin = options?.rootMargin || '0px'
      this.threshold = options?.threshold || 0
      this._observed = []
      observers.push(this)
    }

    observe(el) {
      this._observed.push(el)
    }

    unobserve(el) {
      this._observed = this._observed.filter(e => e !== el)
    }

    disconnect() {
      this._observed = []
    }

    _triggerScroll() {
      if (!this.root || this._observed.length === 0) return

      const scrollTop = this.root.scrollTop
      const verseHeight = 100
      const verseIdx = Math.floor(scrollTop / verseHeight)

      if (verseIdx >= 0 && verseIdx < this._observed.length) {
        this.callback([{ target: this._observed[verseIdx], isIntersecting: true }])
      }
    }
  }

  globalThis.IntersectionObserver = MockIntersectionObserver

  return {
    triggerScroll: () => {
      for (const obs of observers) {
        obs._triggerScroll()
      }
    },
    reset: () => {
      observers.length = 0
    },
  }
}

describe('reader/scroll-tracker.js', () => {
  let container
  let onPositionChange
  let observeScroll
  let unobserve
  let mockIO

  beforeEach(async () => {
    container = document.createElement('div')
    container.style.height = '400px'
    container.style.overflow = 'auto'

    for (let i = 1; i <= 10; i++) {
      const verse = document.createElement('div')
      verse.setAttribute('data-verse', String(i))
      verse.style.height = '100px'
      verse.textContent = `Verse ${i}`
      container.appendChild(verse)
    }

    document.body.appendChild(container)
    onPositionChange = vi.fn()

    mockIO = mockIntersectionObserver()

    const mod = await import('../../../src/reader/scroll-tracker.js')
    observeScroll = mod.observeScroll
    unobserve = mod.unobserve
  })

  afterEach(() => {
    unobserve()
    document.body.removeChild(container)
    vi.useRealTimers()
    mockIO.reset()
  })

  it('fires onPositionChange with the center-viewport verse', async () => {
    vi.useFakeTimers()

    observeScroll(container, { onPositionChange })

    container.scrollTop = 400
    container.dispatchEvent(new Event('scroll'))
    mockIO.triggerScroll()

    vi.advanceTimersByTime(1100)

    expect(onPositionChange).toHaveBeenCalledWith({ verse: 5 })
  })

  it('debounces: 10 rapid scrolls fire callback once', async () => {
    vi.useFakeTimers()

    observeScroll(container, { onPositionChange })

    for (let i = 0; i < 10; i++) {
      container.scrollTop = i * 100
      container.dispatchEvent(new Event('scroll'))
      mockIO.triggerScroll()
    }

    vi.advanceTimersByTime(1100)

    expect(onPositionChange).toHaveBeenCalledTimes(1)
  })

  it('does not fire before debounce window', async () => {
    vi.useFakeTimers()

    observeScroll(container, { onPositionChange })

    container.scrollTop = 400
    container.dispatchEvent(new Event('scroll'))
    mockIO.triggerScroll()

    vi.advanceTimersByTime(500)

    expect(onPositionChange).not.toHaveBeenCalled()
  })

  it('unobserve clears the listener', async () => {
    vi.useFakeTimers()

    observeScroll(container, { onPositionChange })
    unobserve()

    container.scrollTop = 400
    container.dispatchEvent(new Event('scroll'))
    mockIO.triggerScroll()
    vi.advanceTimersByTime(1100)

    expect(onPositionChange).not.toHaveBeenCalled()
  })
})
