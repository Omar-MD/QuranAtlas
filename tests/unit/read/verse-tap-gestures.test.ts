import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setupVerseTapGestures } from '../../../src/read/verse-tap-gestures'

function makeVerseTarget(
  markup = '<span class="qa-verse-arabic">Ayah</span>',
  targetSelector = 'article',
) {
  const container = document.createElement('div')
  container.innerHTML = `<article data-token-key="2:255">${markup}</article>`
  document.body.appendChild(container)
  const target = container.querySelector<HTMLElement>(targetSelector)
  if (!target) {
    throw new Error('Expected target element')
  }
  return { container, target }
}

function dispatchTouchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend',
  target: HTMLElement,
  coords: { clientX: number, clientY: number },
): void {
  const event = new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: type === 'touchend' ? [] : [{ clientX: coords.clientX, clientY: coords.clientY } as Touch],
    changedTouches: [{ clientX: coords.clientX, clientY: coords.clientY } as Touch],
  })
  Object.defineProperty(event, 'target', { value: target })
  target.dispatchEvent(event)
}

describe('read/verse-tap-gestures', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('calls onShort for a desktop click on a verse', () => {
    const { container, target } = makeVerseTarget()
    const onShort = vi.fn()
    const cleanup = setupVerseTapGestures(container, { onShort })

    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onShort).toHaveBeenCalledWith('2:255')

    cleanup()
  })

  it('calls onShort for a touch tap on a verse', () => {
    const { container, target } = makeVerseTarget()
    const onShort = vi.fn()
    const cleanup = setupVerseTapGestures(container, { onShort })

    dispatchTouchEvent('touchstart', target, { clientX: 10, clientY: 10 })
    dispatchTouchEvent('touchend', target, { clientX: 10, clientY: 10 })

    expect(onShort).toHaveBeenCalledWith('2:255')

    cleanup()
  })

  it('calls onDouble for a second touch tap on the same verse within 300ms', () => {
    vi.useFakeTimers()
    const { container, target } = makeVerseTarget()
    const onShort = vi.fn()
    const onDouble = vi.fn()
    const cleanup = setupVerseTapGestures(container, { onShort, onDouble })

    dispatchTouchEvent('touchstart', target, { clientX: 10, clientY: 10 })
    dispatchTouchEvent('touchend', target, { clientX: 10, clientY: 10 })
    vi.advanceTimersByTime(250)
    dispatchTouchEvent('touchstart', target, { clientX: 10, clientY: 10 })
    dispatchTouchEvent('touchend', target, { clientX: 10, clientY: 10 })

    expect(onShort).toHaveBeenCalledTimes(1)
    expect(onDouble).toHaveBeenCalledWith('2:255')

    cleanup()
    vi.useRealTimers()
  })

  it('skips a touch tap that moves beyond the threshold', () => {
    const { container, target } = makeVerseTarget()
    const onShort = vi.fn()
    const cleanup = setupVerseTapGestures(container, { onShort })

    dispatchTouchEvent('touchstart', target, { clientX: 10, clientY: 10 })
    dispatchTouchEvent('touchmove', target, { clientX: 25, clientY: 10 })
    dispatchTouchEvent('touchend', target, { clientX: 25, clientY: 10 })

    expect(onShort).not.toHaveBeenCalled()

    cleanup()
  })

  it('calls onDouble for desktop double click and context menu', () => {
    const { container, target } = makeVerseTarget()
    const onDouble = vi.fn()
    const cleanup = setupVerseTapGestures(container, { onDouble })

    target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))

    expect(onDouble).toHaveBeenNthCalledWith(1, '2:255')
    expect(onDouble).toHaveBeenNthCalledWith(2, '2:255')

    cleanup()
  })

  it('skips click handling for verse number, button, and links', () => {
    const cases = [
      '<span class="qa-verse-number">255</span>',
      '<button type="button">Open</button>',
      '<a href="#/s/2/255">Open</a>',
    ]

    for (const markup of cases) {
      const { container, target } = makeVerseTarget(markup, '.qa-verse-number, button, a')
      const onShort = vi.fn()
      const cleanup = setupVerseTapGestures(container, { onShort })

      target.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(onShort).not.toHaveBeenCalled()

      cleanup()
      container.remove()
    }
  })
})
