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

export function startSwUpdatePolling(
  reg: Pick<ServiceWorkerRegistration, 'update'>,
  deps: SwUpdatePollDeps = {
    doc: document,
    win: window,
    setInterval: (handler, ms) => setInterval(handler, ms),
  }
): void {
  const pollUpdate = () => {
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
