/**
 * Global pub/sub event bus — backed by mitt.
 * The only mechanism for cross-module communication (except safety/ and a11y/).
 */

import mitt from 'mitt'

export const emitter = mitt()

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
 * Errors thrown by individual handlers are caught and isolated so one
 * broken subscriber never prevents other subscribers from receiving the event.
 * @param {string} type - Event type (use Events constants from constants.js)
 * @param {*} [payload] - Event payload
 */
export function emit(type, payload) {
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
 * @param {string} [type] - Event type to clear
 */
export function clear(type) {
  if (type) {
    emitter.all.delete(type)
  } else {
    emitter.all.clear()
  }
}
