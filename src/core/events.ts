/**
 * Global pub/sub event bus — backed by mitt.
 * The only mechanism for cross-module communication (except safety/ and a11y/).
 */

import mitt from 'mitt'
import type { EventPayloads } from './constants'
import { Events } from './constants'

export const emitter = mitt<EventPayloads>()

const _knownEvents = new Set(Object.values(Events))

/**
 * Subscribe to an event type.
 * Returns an unsubscribe function.
 */
export function on<K extends keyof EventPayloads>(
  type: K,
  callback: (payload: EventPayloads[K]) => void
): () => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emitter.on(type, callback as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return () => emitter.off(type, callback as any)
}

/**
 * Emit an event with optional payload.
 * Errors thrown by individual handlers are caught and isolated so one
 * broken subscriber never prevents other subscribers from receiving the event.
 */
export function emit<K extends keyof EventPayloads>(type: K, payload: EventPayloads[K]): void {
  if (import.meta.env.DEV && !(_knownEvents as Set<string>).has(type as string)) {
    throw new Error(`[events] unknown event: "${type}". Add it to Events in src/core/constants.ts.`)
  }
  const handlers = emitter.all.get(type) as Array<(p: EventPayloads[K]) => void> | undefined
  if (handlers) {
    for (const h of handlers.slice()) {
      try { h(payload) } catch { /* isolate */ }
    }
  }
  const wildcards = emitter.all.get('*') as Array<(type: K, p: EventPayloads[K]) => void> | undefined
  if (wildcards) {
    for (const h of wildcards.slice()) {
      try { h(type, payload) } catch { /* isolate */ }
    }
  }
}

/**
 * Clear all listeners for a type, or all types if no type given.
 */
export function clear(type?: keyof EventPayloads): void {
  if (type) {
    emitter.all.delete(type)
  } else {
    emitter.all.clear()
  }
}
