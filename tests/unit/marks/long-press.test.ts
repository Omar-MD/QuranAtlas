import { describe, it, expect, vi } from 'vitest'
import { longPress, setupTapGestures } from '../../../src/marks/long-press'

function makeArticle(opts: {
  outerTokenKey?: string
  innerTokenKey?: string
  innerClass?: string
}): { container: HTMLElement, target: HTMLElement } {
  const container = document.createElement('div')
  const article = document.createElement('article')
  if (opts.outerTokenKey !== undefined) {
    article.setAttribute('data-token-key', opts.outerTokenKey)
  }
  const inner = document.createElement('span')
  if (opts.innerTokenKey !== undefined) {
    inner.setAttribute('data-token-key', opts.innerTokenKey)
  }
  if (opts.innerClass) { inner.className = opts.innerClass }
  article.appendChild(inner)
  container.appendChild(article)
  document.body.appendChild(container)
  return { container, target: opts.innerTokenKey !== undefined ? inner : article }
}

describe('marks/long-press', () => {
  describe('longPress', () => {
    it('reads verseKey via data-token-key (post-N19)', () => {
      const { container, target } = makeArticle({
        outerTokenKey: '2:255',
        innerClass: 'qa-verse-arabic',
      })
      const onPress = vi.fn()
      const action = longPress(container, onPress)
      const ev = new TouchEvent('touchstart', {
        bubbles: true,
        touches: [{ clientX: 0, clientY: 0 } as Touch],
      })
      Object.defineProperty(ev, 'target', { value: target })
      vi.useFakeTimers()
      container.dispatchEvent(ev)
      vi.advanceTimersByTime(600)
      expect(onPress).toHaveBeenCalledWith('2:255')
      vi.useRealTimers()
      action.destroy()
      container.remove()
    })

    it('strips word-grain wordIdx (future WBW hit on inner span)', () => {
      const { container, target } = makeArticle({
        outerTokenKey: '2:255',
        innerTokenKey: '2:255:7',
      })
      const onPress = vi.fn()
      const action = longPress(container, onPress)
      const ev = new TouchEvent('touchstart', {
        bubbles: true,
        touches: [{ clientX: 0, clientY: 0 } as Touch],
      })
      Object.defineProperty(ev, 'target', { value: target })
      vi.useFakeTimers()
      container.dispatchEvent(ev)
      vi.advanceTimersByTime(600)
      // Long-press resolves verseKey for IDB lookup; word-grain stripped via tokenVerseKey.
      expect(onPress).toHaveBeenCalledWith('2:255')
      vi.useRealTimers()
      action.destroy()
      container.remove()
    })
  })

  describe('setupTapGestures', () => {
    it('reads verseKey via data-token-key on click', () => {
      const { container, target } = makeArticle({ outerTokenKey: '36:1' })
      const onShort = vi.fn()
      const cleanup = setupTapGestures(container, { onShort })
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(onShort).toHaveBeenCalledWith('36:1')
      cleanup()
      container.remove()
    })
  })
})
