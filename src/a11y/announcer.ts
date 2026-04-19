/**
 * ARIA live region announcements for screen readers.
 * Permitted cross-module import (a11y exception).
 */

let announcer: HTMLElement | null = null

/**
 * Get or create the live region element.
 */
function getAnnouncer(): HTMLElement {
  if (!announcer) {
    announcer = document.createElement('div')
    announcer.setAttribute('aria-live', 'polite')
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'qa-sr-only'
    announcer.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;'
    document.body.appendChild(announcer)
  }
  return announcer
}

/**
 * Announce a message to screen readers.
 */
export function announce(message: string): void {
  const el = getAnnouncer()
  // Clear first to ensure re-announcement
  el.textContent = ''
  requestAnimationFrame(() => {
    el.textContent = message
  })
}
