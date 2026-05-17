import { closestTokenKey, tokenVerseKey } from '../core/tokenisable'

const DOUBLE_TAP_MS = 300
const TOUCH_MOVE_THRESHOLD = 10

export function setupVerseTafsirGestures(
  container: HTMLElement,
  {
    onShort,
    onDouble,
  }: {
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
    const tokenKey = closestTokenKey(target)
    return tokenKey ? tokenVerseKey(tokenKey) : null
  }

  function onTouchStart(event: TouchEvent): void {
    if (!getVerseKey(event.target)) { return }
    const touch = event.touches[0]
    if (!touch) { return }
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    touchMoved = false
  }

  function onTouchEnd(event: TouchEvent): void {
    const verseKey = getVerseKey(event.target)
    if (!verseKey || touchMoved) {
      touchStartX = null
      touchStartY = null
      return
    }
    touchStartX = null
    touchStartY = null
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

  function onTouchMove(event: TouchEvent): void {
    if (touchStartX === null || touchStartY === null) { return }
    const touch = event.touches[0]
    if (!touch) { return }
    const dx = Math.abs(touch.clientX - touchStartX)
    const dy = Math.abs(touch.clientY - touchStartY)
    if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
      touchMoved = true
    }
  }

  function onClick(event: MouseEvent): void {
    if (handledByTouch) { return }
    const target = event.target as HTMLElement | null
    if (target?.closest('.qa-verse-number, button, a')) { return }
    const verseKey = getVerseKey(event.target)
    if (!verseKey) { return }
    onShort?.(verseKey)
  }

  function onDblClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null
    if (target?.closest('button, a')) { return }
    const verseKey = getVerseKey(event.target)
    if (!verseKey) { return }
    onDouble?.(verseKey)
  }

  function onContextMenu(event: MouseEvent): void {
    const verseKey = getVerseKey(event.target)
    if (!verseKey) { return }
    event.preventDefault()
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
