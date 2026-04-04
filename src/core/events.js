/**
 * Global pub/sub event bus.
 * The only mechanism for cross-module communication (except safety/ and a11y/).
 */

const listeners = new Map()

/**
 * Subscribe to an event type.
 * @param {string} type - Event type (e.g., 'reader:surah-loaded')
 * @param {Function} callback - Handler function
 * @returns {Function} Unsubscribe function
 */
export function on(type, callback) {
  if (!listeners.has(type)) {
    listeners.set(type, new Set())
  }
  listeners.get(type).add(callback)

  return () => {
    const subs = listeners.get(type)
    if (subs) {
      subs.delete(callback)
      if (subs.size === 0) {
        listeners.delete(type)
      }
    }
  }
}

/**
 * Emit an event with optional payload.
 * @param {string} type - Event type
 * @param {*} [payload] - Event payload
 */
export function emit(type, payload) {
  const subs = listeners.get(type)
  if (subs) {
    for (const callback of subs) {
      try {
        callback(payload)
      } catch (error) {
        console.error(`Event handler error for "${type}":`, error)
      }
    }
  }
}

/**
 * Clear all listeners for a type, or all types if no type given.
 * @param {string} [type] - Event type to clear
 */
export function clear(type) {
  if (type) {
    listeners.delete(type)
  } else {
    listeners.clear()
  }
}
