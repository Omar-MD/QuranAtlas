/**
 * Svelte action: long-press on a verse element → open mark editor.
 *
 * CLAUDE.md Rule 4: Long-press is the ONLY gesture for opening the mark editor.
 * No contextual menu, no action sheet, no preview popover.
 *
 * Usage (on a container with [data-verse-key] children):
 *   <div use:longPress={openEditor}>…</div>
 *
 * Usage (on an individual element with data-verse-key):
 *   <article use:longPress={openEditor} data-verse-key="2:255">…</article>
 *
 * Returns a cleanup object so Svelte can call destroy() on unmount.
 */

const LONG_PRESS_MS = 500
const TOUCH_MOVE_THRESHOLD = 10

export function longPress(node: HTMLElement, onPress: (verseKey: string) => void) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let touchStartX: number | null = null
  let touchStartY: number | null = null

  function getVerseKey(target: EventTarget | null): string | null {
    if (!(target instanceof Element)) { return null }
    const el = target.closest('[data-verse-key]') as HTMLElement | null
    return el?.dataset['verseKey'] ?? null
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
  // Per CLAUDE.md Rule 4: no contextual menu — preventDefault prevents the
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
