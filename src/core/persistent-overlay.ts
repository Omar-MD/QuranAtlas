// Generic factory for "overlay bridges" — the persistent-component +
// imperative-API pattern that 6 surfaces hand-rolled before this factory
// landed (audit R-13 / CC-9 / N22). Each bridge follows the same shape:
//   1. The persistent Svelte component registers its API in onMount.
//   2. Non-component callers (router, command-sheet, gesture handlers,
//      cross-tab sync handlers, settings, etc.) import the bridge and
//      call `bridge.api.<method>()`.
//   3. The bridge tracks open/closed state so consumers can poll
//      `bridge.isOpen()` without coupling to the component instance.
//
// Lazy-mount support (N25): the bridge can be wired to an App-level
// "mounter" function that triggers a dynamic import + mount of the owning
// overlay component. When `api.<method>()` is called before the component
// has registered, the factory:
//   - Calls the mounter once (idempotent across the lazy-import window).
//   - Queues the call onto a pending-call queue.
//   - On `register(api)`, drains the queue in arrival order.
// Eager-mount consumers (audio currently) skip `setMounter` entirely —
// the mounter trigger is opt-in and inert when unused.

import { logger } from './logger.js'

// `open` is deliberately NOT on the base — its signature varies per overlay
// (UndoToast: open(opts); NavDrawer: open(tab?, subTab?); TagSheet:
// open(verseKey); Settings/CommandSheet/Audio: open()). Forcing a base
// shape would either bivariantly weaken the type or block strict-mode
// declarations. close + isOpen ARE universal: every overlay supports
// imperative dismissal + open-state interrogation.
export interface BaseOverlayAPI {
  close(): void
  isOpen(): boolean
}

export interface OverlayBridge<API extends BaseOverlayAPI> {
  /** Component-side: register the API on mount. Called exactly once per
   *  component lifetime; calling twice replaces the prior registration
   *  (covers HMR + test re-render). On register, any pending calls
   *  queued during lazy-mount drain in arrival order. */
  register(api: API): void

  /** Component-side: clear the registration on unmount. Idempotent.
   *  Also clears any pending-call queue and re-arms the mounter so the
   *  next first-method-call after re-mount can trigger lazy-mount again
   *  (HMR + test re-render hygiene). */
  unregister(): void

  /** Imperative: invoke registered methods. If the bridge has a mounter
   *  set and the API is not yet registered, the call is queued and the
   *  mounter is triggered (idempotently). Returns whatever the registered
   *  API method returns; if no API is registered AND no mounter is set,
   *  returns undefined silently. */
  api: API

  /** True when the overlay reports itself open. False if not registered. */
  isOpen(): boolean

  /** App.svelte calls this once at boot per lazy-mounted overlay. The
   *  function should flip a $state flag that triggers a dynamic-import +
   *  mount of the overlay component. Calling setMounter twice with
   *  different functions warns in dev (catches App.svelte refactor
   *  mistakes); the latest function wins. */
  setMounter(fn: () => void): void
}

export function createOverlayBridge<API extends BaseOverlayAPI>(opts: {
  name: string
}): OverlayBridge<API> {
  const name = opts.name
  let registered: API | null = null
  let mounter: (() => void) | null = null
  let mounterFired = false
  type Pending = { method: string | symbol; args: unknown[] }
  const pending: Pending[] = []

  const proxy = new Proxy({} as API, {
    get(_target, prop: string | symbol) {
      if (registered !== null) {
        const value = (registered as Record<string | symbol, unknown>)[prop]
        if (typeof value === 'function') {
          return (value as (...args: unknown[]) => unknown).bind(registered)
        }
        return value
      }
      // Not registered — return a function that either queues (if a
      // mounter is wired) or no-ops (eager-mount with a real race).
      return (...args: unknown[]) => {
        if (mounter && !mounterFired) {
          mounterFired = true
          try { mounter() } catch (e) { logger.error(`OverlayBridge(${name}) mounter threw`, { error: e }) }
        }
        if (mounter) {
          pending.push({ method: prop, args })
        }
        // No return value while pending — the registered API's return is
        // not visible to callers that fired before mount.
        return undefined
      }
    },
  })

  return {
    register(api: API): void {
      registered = api
      // Drain the pending queue in arrival order, binding each call to
      // the freshly-registered API.
      while (pending.length > 0) {
        const call = pending.shift()!
        try {
          const fn = (api as Record<string | symbol, unknown>)[call.method]
          if (typeof fn === 'function') {
            (fn as (...args: unknown[]) => unknown).apply(api, call.args)
          }
        } catch (e) {
          logger.error(`OverlayBridge(${name}) pending-call replay threw`, {
            method: String(call.method),
            error: e,
          })
        }
      }
    },
    unregister(): void {
      registered = null
      pending.length = 0
      // Re-arm the mounter so a subsequent re-mount cycle (HMR / test
      // re-render) can re-trigger the dynamic-import path if necessary.
      mounterFired = false
    },
    api: proxy,
    isOpen(): boolean {
      if (registered === null) { return false }
      try {
        return registered.isOpen()
      } catch {
        return false
      }
    },
    setMounter(fn: () => void): void {
      if (mounter !== null && mounter !== fn) {
        logger.warn(`OverlayBridge(${name}) setMounter called twice with distinct fns`)
      }
      mounter = fn
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [Symbol.toStringTag]: `OverlayBridge(${name})` as any,
  } as OverlayBridge<API>
}
