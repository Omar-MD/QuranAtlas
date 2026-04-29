/**
 * Wires up explicit polling for new service-worker versions.
 *
 * Without this, installed PWAs only run the browser's register-time update
 * check, which may never re-fire because standalone apps rarely trigger a
 * hard reload. Result: users would only see the reload banner after wiping
 * storage. Polling on visibility/focus + a 30-min interval guarantees the
 * waiting SW is detected promptly.
 */
import { logger } from './logger.js'

export interface SwUpdatePollDeps {
  doc: Pick<Document, 'addEventListener' | 'visibilityState'>
  win: Pick<Window, 'addEventListener'>
  setInterval: (handler: () => void, ms: number) => unknown
}

export const SW_UPDATE_POLL_INTERVAL_MS = 30 * 60 * 1000
// Audit R-26 (2026-04-29): visibility + focus + 30-min timer all
// fire pollUpdate() — heavy multi-tab users get a thundering herd of
// reg.update() calls within seconds (open laptop, alt-tab between
// 5 tabs, each fires visibility+focus). 5-minute floor between polls
// flattens that. Long enough to still catch updates promptly.
const MIN_GAP_MS = 5 * 60 * 1000

export function startSwUpdatePolling(
  reg: Pick<ServiceWorkerRegistration, 'update'>,
  deps: SwUpdatePollDeps = {
    doc: document,
    win: window,
    setInterval: (handler, ms) => setInterval(handler, ms),
  }
): void {
  let lastPollAt = 0
  const pollUpdate = () => {
    const now = Date.now()
    if (now - lastPollAt < MIN_GAP_MS) { return }
    lastPollAt = now
    reg.update().catch((error) => {
      logger.warn('SW update poll failed:', { error })
    })
  }
  deps.doc.addEventListener('visibilitychange', () => {
    if (deps.doc.visibilityState === 'visible') { pollUpdate() }
  })
  deps.win.addEventListener('focus', pollUpdate)
  deps.setInterval(pollUpdate, SW_UPDATE_POLL_INTERVAL_MS)
}
