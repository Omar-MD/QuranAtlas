/**
 * Pulse-highlight a verse on bookmark-jump landing.
 *
 * Subscribes to BOOKMARK_JUMP_LANDED. When the event fires the target verse
 * may not be in the DOM yet (router navigation + surah load + scroll align is
 * async); poll up to 3s, then add `qa-verse--pulse` for 1s once visible.
 */

import { on } from '../../core/events'
import { Events } from '../../core/constants'

const POLL_INTERVAL_MS = 100
const POLL_TIMEOUT_MS = 3000
const PULSE_DURATION_MS = 1000

function tryPulse(verseKey: string, deadline: number): void {
  const el = document.querySelector<HTMLElement>(`[data-token-key="${verseKey}"]`)
  if (el) {
    el.classList.add('qa-verse--pulse')
    setTimeout(() => { el.classList.remove('qa-verse--pulse') }, PULSE_DURATION_MS)
    return
  }
  if (Date.now() < deadline) {
    setTimeout(() => tryPulse(verseKey, deadline), POLL_INTERVAL_MS)
  }
}

export function initBookmarkPulse(): () => void {
  const unsub = on(Events.BOOKMARK_JUMP_LANDED, ({ verseKey }) => {
    tryPulse(verseKey, Date.now() + POLL_TIMEOUT_MS)
  })
  return unsub
}
