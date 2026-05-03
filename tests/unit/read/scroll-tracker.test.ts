import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { observeScroll, unobserve, observeNewVerses } from '../../../src/read/scroll-tracker'

function mockIntersectionObserver() {
  const observers: Array<{
    callback: (entries: IntersectionObserverEntry[]) => void
    options: IntersectionObserverInit
    root: Element | null
    rootMargin: string
    threshold: number | number[]
    _observed: Element[]
    observe: (el: Element) => void
    unobserve: (el: Element) => void
    disconnect: () => void
    _triggerScroll: () => void
  }> = []

  class MockIntersectionObserver {
    callback: (entries: IntersectionObserverEntry[]) => void
    options: IntersectionObserverInit
    root: Element | null
    rootMargin: string
    threshold: number | number[]
    _observed: Element[] = []

    constructor(callback: (entries: IntersectionObserverEntry[]) => void, options: IntersectionObserverInit) {
      this.callback = callback
      this.options = options
      this.root = options?.root instanceof Element ? options.root : null
      this.rootMargin = options?.rootMargin ?? '0px'
      this.threshold = options?.threshold ?? 0
      observers.push(this as unknown as typeof observers[0])
    }

    observe(el: Element) {
      this._observed.push(el)
    }

    unobserve(el: Element) {
      this._observed = this._observed.filter(e => e !== el)
    }

    disconnect() {
      this._observed = []
    }

    _triggerScroll() {
      if (!this.root || this._observed.length === 0) return

      const scrollTop = (this.root as HTMLElement).scrollTop
      const verseHeight = 100
      const verseIdx = Math.floor(scrollTop / verseHeight)

      if (verseIdx >= 0 && verseIdx < this._observed.length) {
        this.callback([{ target: this._observed[verseIdx], isIntersecting: true } as IntersectionObserverEntry])
      }
    }
  }

  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

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

describe('reader/scroll-tracker', () => {
  let container: HTMLElement
  let onPositionChange: ReturnType<typeof vi.fn>
  let mockIO: ReturnType<typeof mockIntersectionObserver>

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
  })

  afterEach(() => {
    unobserve()
    if (container.parentNode) { document.body.removeChild(container) }
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

  it('observeNewVerses adds new verse elements to observer', async () => {
    vi.useFakeTimers()

    observeScroll(container, { onPositionChange })

    const newVerse = document.createElement('div')
    newVerse.setAttribute('data-verse', '11')
    newVerse.style.height = '100px'
    container.appendChild(newVerse)

    observeNewVerses([newVerse])

    container.scrollTop = 1000
    container.dispatchEvent(new Event('scroll'))
    mockIO.triggerScroll()

    vi.advanceTimersByTime(1100)

    expect(onPositionChange).toHaveBeenCalledWith({ verse: 11 })
  })

  it('observeNewVerses is a no-op when no observer exists', async () => {
    unobserve()
    expect(() => observeNewVerses([document.createElement('div')])).not.toThrow()
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

  it('uses scroll fallback when IntersectionObserver is unavailable', async () => {
    vi.useFakeTimers()

    const originalIO = globalThis.IntersectionObserver
    // @ts-expect-error — intentional removal to test fallback
    delete globalThis.IntersectionObserver

    observeScroll(container, { onPositionChange })

    container.scrollTop = 0
    container.dispatchEvent(new Event('scroll'))

    vi.advanceTimersByTime(1100)

    expect(onPositionChange).toHaveBeenCalled()

    unobserve()
    globalThis.IntersectionObserver = originalIO
  })
})
