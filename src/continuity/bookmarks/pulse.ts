export function createBookmarkPulseId(verseKey: string): string {
  return `bookmark-pulse-${verseKey.replace(':', '-')}`
}

const PULSE_DURATION_MS = 1000
const PULSE_POLL_INTERVAL_MS = 100
const PULSE_POLL_TIMEOUT_MS = 3000
const PULSE_CLASS = 'qar-reader-verse--pulse'

function escapeAttributeValue(value: string): string {
  return value.replace(/["\\]/g, '\\$&')
}

export function bookmarkPulseSelector(verseKey: string): string {
  return `[data-token-key="${escapeAttributeValue(verseKey)}"]`
}

export function pulseBookmarkLanding(verseKey: string, root: ParentNode = document): boolean {
  const target = root.querySelector(bookmarkPulseSelector(verseKey))
  if (!(target instanceof HTMLElement)) return false
  target.classList.remove(PULSE_CLASS)
  void target.offsetWidth
  target.classList.add(PULSE_CLASS)
  target.dataset.bookmarkPulse = 'true'
  window.setTimeout(() => {
    target.classList.remove(PULSE_CLASS)
    delete target.dataset.bookmarkPulse
  }, PULSE_DURATION_MS)
  return true
}

export function pulseBookmarkLandingWhenReady(verseKey: string, root: ParentNode = document, deadline = Date.now() + PULSE_POLL_TIMEOUT_MS): void {
  if (pulseBookmarkLanding(verseKey, root)) return
  if (Date.now() >= deadline) return
  window.setTimeout(() => pulseBookmarkLandingWhenReady(verseKey, root, deadline), PULSE_POLL_INTERVAL_MS)
}

export function pulseBookmarkLandingWhenRouteReady(
  verseKey: string,
  routeHash: string,
  root: ParentNode = document,
  deadline = Date.now() + PULSE_POLL_TIMEOUT_MS,
): void {
  const routeElement = document.querySelector('[data-react-route]')
  const renderedRoute = routeElement?.getAttribute('data-react-route')
  if (!routeElement || renderedRoute === routeHash) {
    pulseBookmarkLandingWhenReady(verseKey, root, deadline)
    return
  }
  if (Date.now() >= deadline) return
  window.setTimeout(() => pulseBookmarkLandingWhenRouteReady(verseKey, routeHash, root, deadline), PULSE_POLL_INTERVAL_MS)
}
