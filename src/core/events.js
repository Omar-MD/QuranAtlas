/**
 * Typed pub/sub event bus.
 *
 * All cross-module communication flows through here.
 * No direct imports across domain boundaries (except into core/).
 *
 * Usage:
 *   import { on, off, emit } from './events.js';
 *   on('marks:saved', ({ verseKey }) => { ... });
 *   emit('marks:saved', { verseKey: '2:255' });
 */

/** @type {Map<string, Set<Function>>} */
const handlers = new Map();

/**
 * Subscribe to an event.
 * @param {string} event
 * @param {Function} handler
 */
export function on(event, handler) {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event).add(handler);
}

/**
 * Unsubscribe from an event.
 * @param {string} event
 * @param {Function} handler
 */
export function off(event, handler) {
  const set = handlers.get(event);
  if (!set) return;
  set.delete(handler);
  if (set.size === 0) handlers.delete(event);
}

/**
 * Emit an event to all subscribers.
 * Subscribers are called synchronously in registration order.
 * @param {string} event
 * @param {*} [data]
 */
export function emit(event, data) {
  for (const handler of handlers.get(event) ?? []) handler(data);
}

/**
 * Subscribe once — auto-unsubscribes after first call.
 * @param {string} event
 * @param {Function} handler
 */
export function once(event, handler) {
  const wrapper = (data) => {
    off(event, wrapper);
    handler(data);
  };
  on(event, wrapper);
}
