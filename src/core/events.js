/**
 * Global pub/sub event bus — backed by mitt.
 * The only mechanism for cross-module communication (except safety/ and a11y/).
 *
 * Observability features:
 * - Correlation IDs: every object payload automatically receives a non-enumerable
 *   `_cid` (crypto.randomUUID()) for request tracing. Non-enumerable so it is
 *   invisible to deep-equality checks in tests.
 * - Action trail: ring buffer of last 20 events (type + ts + _cid) accessible via
 *   getActionTrail() for in-browser debugging.
 */

import mitt from 'mitt'

export const emitter = mitt()

const TRAIL_SIZE = 20
/** @type {Array<{type: string, ts: number, _cid?: string}>} */
const actionTrail = []

/**
 * Subscribe to an event type.
 * @param {string} type - Event type (use Events constants from constants.js)
 * @param {Function} callback - Handler function
 * @returns {Function} Unsubscribe function
 */
export function on(type, callback) {
  emitter.on(type, callback)
  return () => emitter.off(type, callback)
}

/**
 * Emit an event with optional payload.
 * - Injects a non-enumerable `_cid` correlation ID into every plain-object payload.
 * - Records the event in the in-memory action trail.
 * - Errors thrown by individual handlers are caught and isolated so one
 *   broken subscriber never prevents other subscribers from receiving the event.
 * @param {string} type - Event type (use Events constants from constants.js)
 * @param {*} [payload] - Event payload
 */
export function emit(type, payload) {
  // Inject non-enumerable correlation ID into plain-object payloads.
  // Non-enumerable keeps it invisible to deep-equality assertions in tests.
  if (payload !== null && typeof payload === 'object' && !Array.isArray(payload) && payload._cid === undefined) {
    const withCid = { ...payload }
    Object.defineProperty(withCid, '_cid', {
      value: crypto.randomUUID(),
      enumerable: false,
      configurable: true,
      writable: false,
    })
    payload = withCid
  }

  // Record in action trail
  const entry = { type, ts: Date.now() }
  if (payload?._cid) entry._cid = payload._cid
  if (actionTrail.length >= TRAIL_SIZE) actionTrail.shift()
  actionTrail.push(entry)

  const handlers = emitter.all.get(type)
  if (handlers) {
    for (const h of handlers.slice()) {
      try { h(payload) } catch { /* isolate */ }
    }
  }
  const wildcards = emitter.all.get('*')
  if (wildcards) {
    for (const h of wildcards.slice()) {
      try { h(type, payload) } catch { /* isolate */ }
    }
  }
}

/**
 * Clear all listeners for a type, or all types if no type given.
 * When called with no args (full reset) also clears the action trail.
 * @param {string} [type] - Event type to clear
 */
export function clear(type) {
  if (type) {
    emitter.all.delete(type)
  } else {
    emitter.all.clear()
    actionTrail.length = 0
  }
}

/**
 * Return the last `n` events from the action trail ring buffer.
 * Useful for in-browser debugging: window.__qa?.getActionTrail(10)
 * @param {number} [n] - Number of entries to return (default: all buffered)
 * @returns {Array<{type: string, ts: number, _cid?: string}>}
 */
export function getActionTrail(n = TRAIL_SIZE) {
  return actionTrail.slice(-n)
}
