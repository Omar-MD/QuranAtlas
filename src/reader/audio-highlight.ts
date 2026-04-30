// Audio verse-tick highlight. Subscribes to `audio:verse-changed` and
// applies `.qa-verse-active` to every element whose `data-token-key`
// matches the playing verse. v2.0 audio renders verse-grain only —
// `verseTokenSelector` produces the prefix-match selector that catches
// both the verse container and any future word-level spans uniformly.

import { on } from '../core/events'
import { Events } from '../core/constants'
import { parseTokenKey, verseTokenSelector } from '../core/tokenisable'

const ACTIVE_CLASS = 'qa-verse-active'

let unsub: (() => void) | null = null

function clearActive(scope: ParentNode = document): void {
  for (const el of scope.querySelectorAll<HTMLElement>(`.${ACTIVE_CLASS}`)) {
    el.classList.remove(ACTIVE_CLASS)
  }
}

function applyActive(verseKey: string, scope: ParentNode = document): void {
  const parsed = parseTokenKey(verseKey)
  if (!parsed) { return }
  const selector = verseTokenSelector(parsed.surah, parsed.ayah)
  for (const el of scope.querySelectorAll<HTMLElement>(selector)) {
    el.classList.add(ACTIVE_CLASS)
  }
}

export function initAudioHighlight(scope?: ParentNode): () => void {
  if (unsub) { unsub() }
  unsub = on(Events.AUDIO_VERSE_CHANGED, ({ verseKey }) => {
    clearActive(scope)
    applyActive(verseKey, scope)
  })
  return () => {
    if (unsub) { unsub(); unsub = null }
    clearActive(scope)
  }
}

/** Test-only helper. */
export function _applyForTest(verseKey: string, scope?: ParentNode): void {
  clearActive(scope)
  applyActive(verseKey, scope)
}
