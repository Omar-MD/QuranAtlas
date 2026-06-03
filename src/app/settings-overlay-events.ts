import type { SettingsRouteMode } from './routes/settings/SettingsRoute'

export const REACT_OPEN_SETTINGS_EVENT = 'quranatlas-react-open-settings'
const READER_SETTINGS_ANCHOR_KEY = '__quranAtlasReaderSettingsAnchor'

export type ReactOpenSettingsEvent = CustomEvent<{ mode?: SettingsRouteMode }>
type ReaderSettingsAnchor = { key: string; top: number }
type ReaderSettingsAnchorWindow = Window & {
  [READER_SETTINGS_ANCHOR_KEY]?: ReaderSettingsAnchor
}

export function requestReactSettingsOverlay(mode: SettingsRouteMode): void {
  if (typeof window === 'undefined') return
  captureReactSettingsReaderAnchor()
  window.dispatchEvent(new CustomEvent(REACT_OPEN_SETTINGS_EVENT, { detail: { mode } }))
}

export function subscribeReactSettingsOverlayRequests(
  listener: (mode?: SettingsRouteMode) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined
  function onOpenSettings(event: Event): void {
    listener((event as ReactOpenSettingsEvent).detail?.mode)
  }
  window.addEventListener(REACT_OPEN_SETTINGS_EVENT, onOpenSettings)
  return () => window.removeEventListener(REACT_OPEN_SETTINGS_EVENT, onOpenSettings)
}

export function restoreReactSettingsReaderAnchor(): void {
  if (typeof window === 'undefined') return
  const anchor = (window as ReaderSettingsAnchorWindow)[READER_SETTINGS_ANCHOR_KEY]
  if (!anchor?.key) return
  const element = findReaderVerseElement(anchor.key)
  if (!element) return
  const delta = element.getBoundingClientRect().top - anchor.top
  if (Math.abs(delta) < 1) return
  window.scrollBy({ behavior: 'auto', top: delta })
}

export function clearReactSettingsReaderAnchor(): void {
  if (typeof window === 'undefined') return
  delete (window as ReaderSettingsAnchorWindow)[READER_SETTINGS_ANCHOR_KEY]
}

function captureReactSettingsReaderAnchor(): void {
  const anchor = findCurrentReaderAnchor()
  if (anchor) {
    (window as ReaderSettingsAnchorWindow)[READER_SETTINGS_ANCHOR_KEY] = anchor
  }
}

function findCurrentReaderAnchor(): ReaderSettingsAnchor | null {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  const centerY = viewportHeight / 2
  let closest: { distance: number; element: HTMLElement } | null = null

  for (const element of document.querySelectorAll<HTMLElement>('.qar-reader-verse[data-token-key]')) {
    const key = element.dataset.tokenKey
    if (!key) continue
    const rect = element.getBoundingClientRect()
    if (rect.height <= 0 || rect.bottom <= 0 || rect.top >= viewportHeight) continue
    const distance = rect.top <= centerY && rect.bottom >= centerY
      ? 0
      : Math.min(Math.abs(rect.top - centerY), Math.abs(rect.bottom - centerY))
    if (!closest || distance < closest.distance) closest = { distance, element }
    if (distance === 0) break
  }

  if (!closest) return null
  return {
    key: closest.element.dataset.tokenKey ?? '',
    top: closest.element.getBoundingClientRect().top,
  }
}

function findReaderVerseElement(verseKey: string): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>('.qar-reader-verse[data-token-key]')) {
    if (element.dataset.tokenKey === verseKey) return element
  }
  return null
}
