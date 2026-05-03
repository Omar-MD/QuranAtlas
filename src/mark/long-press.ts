/**
 * Svelte action: long-press on a verse element → open mark editor.
 *
 * Invariant: long-press is the only gesture for opening the mark editor.
 * No contextual menu, no action sheet, no preview popover.
 *
 * Usage (on a container with [data-token-key] children):
 *   <div use:longPress={openEditor}>…</div>
 *
 * Usage (on an individual element with data-token-key):
 *   <article use:longPress={openEditor} data-token-key="2:255">…</article>
 *
 * Returns a cleanup object so Svelte can call destroy() on unmount.
 */

import { closestTokenKey, tokenVerseKey } from '../core/tokenisable'

const LONG_PRESS_MS = 500
const TOUCH_MOVE_THRESHOLD = 10

export function longPress(node: HTMLElement, onPress: (verseKey: string) => void) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let touchStartX: number | null = null
  let touchStartY: number | null = null

  function getVerseKey(target: EventTarget | null): string | null {
    if (!(target instanceof Element)) { return null }
    const tk = closestTokenKey(target)
    return tk ? tokenVerseKey(tk) : null
  }

  function onTouchStart(e: TouchEvent) {
    const verseKey = getVerseKey(e.target)
    if (!verseKey) { return }
    const touch = e.touches[0]
    if (!touch) { return }
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    timer = setTimeout(() => {
      onPress(verseKey)
      timer = null
    }, LONG_PRESS_MS)
  }

  function onTouchEnd() {
    if (timer) { clearTimeout(timer); timer = null }
    touchStartX = null
    touchStartY = null
  }

  function onTouchMove(e: TouchEvent) {
    if (timer === null || touchStartX === null || touchStartY === null) { return }
    const touch = e.touches[0]
    if (!touch) { return }
    const dx = Math.abs(touch.clientX - touchStartX)
    const dy = Math.abs(touch.clientY - touchStartY)
    if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
      clearTimeout(timer)
      timer = null
      touchStartX = null
      touchStartY = null
    }
  }

  // Desktop: right-click (contextmenu) opens editor directly.
  // No contextual menu here: preventDefault prevents the browser menu from
  // browser menu from appearing; the editor opens instead.
  function onContextMenu(e: MouseEvent) {
    const verseKey = getVerseKey(e.target)
    if (!verseKey) { return }
    e.preventDefault()
    onPress(verseKey)
  }

  node.addEventListener('touchstart', onTouchStart, { passive: true })
  node.addEventListener('touchend', onTouchEnd, { passive: true })
  node.addEventListener('touchmove', onTouchMove, { passive: true })
  node.addEventListener('contextmenu', onContextMenu)

  return {
    destroy() {
      if (timer) { clearTimeout(timer); timer = null }
      node.removeEventListener('touchstart', onTouchStart)
      node.removeEventListener('touchend', onTouchEnd)
      node.removeEventListener('touchmove', onTouchMove)
      node.removeEventListener('contextmenu', onContextMenu)
    },
    update(newOnPress: (verseKey: string) => void) {
      onPress = newOnPress
    },
  }
}

/**
 * Imperative wrapper for vanilla-JS consumers (e.g. reader/index.js) that
 * cannot use Svelte action syntax. Attaches the same gesture to a container
 * and returns a cleanup function.
 *
 * This shim will be removed once reader/ ports to Svelte (Task 5).
 */
export function setupLongPress(
  container: HTMLElement,
  onPress: (verseKey: string) => void,
): () => void {
  const action = longPress(container, onPress)
  return () => action.destroy()
}

/**
 * Tap gesture handler for verse rows.
 *
 *   short-tap   → onShort (e.g. switch active verse while fast-tag is open)
 *   double-tap  → onDouble (e.g. open fast-tag panel — replaces long-press
 *                 since 2026-04-25; long-press now stays free for the OS)
 *
 * Touch double-tap detected via two ends within DOUBLE_TAP_MS on the same
 * `[data-token-key]`. Desktop maps native `dblclick` and right-click
 * `contextmenu` to onDouble for parity.
 */
const DOUBLE_TAP_MS = 300

export function setupTapGestures(
  container: HTMLElement,
  { onShort, onDouble }: {
    onShort?: (verseKey: string) => void
    onDouble?: (verseKey: string) => void
  },
): () => void {
  let touchStartX: number | null = null
  let touchStartY: number | null = null
  let touchMoved = false
  let handledByTouch = false
  let lastTapVerse: string | null = null
  let lastTapAt = 0

  function getVerseKey(target: EventTarget | null): string | null {
    if (!(target instanceof Element)) { return null }
    const tk = closestTokenKey(target)
    return tk ? tokenVerseKey(tk) : null
  }

  function onTouchStart(e: TouchEvent): void {
    if (!getVerseKey(e.target)) { return }
    const t = e.touches[0]
    if (!t) { return }
    touchStartX = t.clientX
    touchStartY = t.clientY
    touchMoved = false
  }

  function onTouchEnd(e: TouchEvent): void {
    const verseKey = getVerseKey(e.target)
    if (!verseKey || touchMoved) {
      touchStartX = null; touchStartY = null
      return
    }
    touchStartX = null; touchStartY = null
    handledByTouch = true
    setTimeout(() => { handledByTouch = false }, 400)

    const now = Date.now()
    if (lastTapVerse === verseKey && (now - lastTapAt) < DOUBLE_TAP_MS) {
      lastTapVerse = null
      lastTapAt = 0
      onDouble?.(verseKey)
      return
    }
    lastTapVerse = verseKey
    lastTapAt = now
    onShort?.(verseKey)
  }

  function onTouchMove(e: TouchEvent): void {
    if (touchStartX === null || touchStartY === null) { return }
    const t = e.touches[0]
    if (!t) { return }
    const dx = Math.abs(t.clientX - touchStartX)
    const dy = Math.abs(t.clientY - touchStartY)
    if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
      touchMoved = true
    }
  }

  function onClick(e: MouseEvent): void {
    if (handledByTouch) { return }
    const target = e.target as HTMLElement | null
    if (target?.closest('.qa-verse-number, button, a')) { return }
    const verseKey = getVerseKey(e.target)
    if (!verseKey) { return }
    onShort?.(verseKey)
  }

  function onDblClick(e: MouseEvent): void {
    const target = e.target as HTMLElement | null
    if (target?.closest('button, a')) { return }
    const verseKey = getVerseKey(e.target)
    if (!verseKey) { return }
    onDouble?.(verseKey)
  }

  function onContextMenu(e: MouseEvent): void {
    const verseKey = getVerseKey(e.target)
    if (!verseKey) { return }
    e.preventDefault()
    onDouble?.(verseKey)
  }

  container.addEventListener('touchstart', onTouchStart, { passive: true })
  container.addEventListener('touchend', onTouchEnd, { passive: true })
  container.addEventListener('touchmove', onTouchMove, { passive: true })
  container.addEventListener('click', onClick)
  container.addEventListener('dblclick', onDblClick)
  container.addEventListener('contextmenu', onContextMenu)

  return () => {
    container.removeEventListener('touchstart', onTouchStart)
    container.removeEventListener('touchend', onTouchEnd)
    container.removeEventListener('touchmove', onTouchMove)
    container.removeEventListener('click', onClick)
    container.removeEventListener('dblclick', onDblClick)
    container.removeEventListener('contextmenu', onContextMenu)
  }
}
