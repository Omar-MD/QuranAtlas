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
// This factory consolidates the pattern so future overlays (audio v2.0
// is the first new consumer; mushaf v2.1, tafsir v1.3 will follow) gain
// a typed, testable bridge in one line.
//
// What this factory does NOT do (deferred to N25 / app-bootstrap):
//   - Lazy-mount the overlay component on first `open()`. The owning
//     component must be mounted at App.svelte boot today; lazy-mount
//     ships when N25 lands. Consumers DO NOT need to change when that
//     happens — `bridge.api` keeps the same shape.

export interface OverlayBridge<API> {
  /** Component-side: register the API on mount. Called exactly once per
   *  component lifetime; calling twice replaces the prior registration
   *  (covers HMR + test re-render). */
  register(api: API): void

  /** Component-side: clear the registration on unmount. Idempotent. */
  unregister(): void

  /** Imperative: invoke registered methods. Calls before `register` are
   *  silently dropped — overlay components mount synchronously at boot
   *  in production, so a real call site never races registration. Tests
   *  that arrange-act before mount are responsible for awaiting mount.
   *  Returns whatever the registered API method returns; if no API is
   *  registered, returns undefined. */
  api: API

  /** True when the overlay reports itself open. */
  isOpen(): boolean
}

/**
 * Create a typed overlay bridge.
 *
 * The API type must include `open(): void`, `close(): void`, and
 * `isOpen(): boolean`. The factory uses `isOpen()` from the registered
 * API as the source of truth — `bridge.isOpen()` delegates to it. Audio
 * uses runes-backed state, command-sheet uses a Svelte store; both are
 * compatible because we only care about the boolean answer at call time.
 */
export interface BaseOverlayAPI {
  open(): void
  close(): void
  isOpen(): boolean
}

export function createOverlayBridge<API extends BaseOverlayAPI>(opts: {
  name: string
}): OverlayBridge<API> {
  // `opts.name` carried into the bridge for future diagnostics (a
  // devtools panel listing active bridges grepping registrations);
  // also makes typo'd duplicate registrations visible at construction
  // time should that ever land. The runtime cost is ~0 — a single
  // string property hang.
  const name = opts.name
  const noop = () => undefined as unknown
  let registered: API | null = null

  const proxy = new Proxy({} as API, {
    get(_target, prop: string | symbol) {
      if (registered === null) { return noop }
      const value = (registered as Record<string | symbol, unknown>)[prop]
      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).bind(registered)
      }
      return value
    },
  })

  return {
    register(api: API): void {
      registered = api
    },
    unregister(): void {
      registered = null
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [Symbol.toStringTag]: `OverlayBridge(${name})` as any,
  } as OverlayBridge<API>
}
