// Reader-verse DOM helpers shared by the reader route, the settings overlay,
// and reader-position sync. The verse surface stamps each rendered verse with
// `data-token-key` holding its `${surah}:${verse}` key.

export const READER_VERSE_SELECTOR = '.qar-reader-verse[data-token-key]'

export type ReaderVerseAnchor = { key: string; top: number }

export function findReaderVerseElement(verseKey: string): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>(READER_VERSE_SELECTOR)) {
    if (element.dataset.tokenKey === verseKey) return element
  }
  return null
}

/**
 * Closest rendered verse to the viewport's vertical center (the verse a
 * centered-verse scan reports as "current"); null when no verse element
 * intersects the viewport. `match` restricts the scan, mirroring the per-key
 * filter callers previously inlined in their loops.
 */
export function findCenteredReaderVerseElement(match?: (verseKey: string) => boolean): HTMLElement | null {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  const centerY = viewportHeight / 2
  let closest: { distance: number; element: HTMLElement } | null = null

  for (const element of document.querySelectorAll<HTMLElement>(READER_VERSE_SELECTOR)) {
    const verseKey = element.dataset.tokenKey
    if (!verseKey) continue
    if (match && !match(verseKey)) continue
    const rect = element.getBoundingClientRect()
    if (rect.height <= 0 || rect.bottom <= 0 || rect.top >= viewportHeight) continue
    const distance =
      rect.top <= centerY && rect.bottom >= centerY
        ? 0
        : Math.min(Math.abs(rect.top - centerY), Math.abs(rect.bottom - centerY))
    if (!closest || distance < closest.distance) closest = { distance, element }
    if (distance === 0) break
  }

  return closest?.element ?? null
}

/**
 * Centered verse as a scroll anchor: its token key plus its current viewport
 * top, so a later restore can scrollBy the drift delta.
 */
export function findCenteredReaderVerseAnchor(): ReaderVerseAnchor | null {
  const element = findCenteredReaderVerseElement()
  if (!element) return null
  return {
    key: element.dataset.tokenKey ?? '',
    top: element.getBoundingClientRect().top,
  }
}
