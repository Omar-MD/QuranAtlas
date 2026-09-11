// Tiny typed window CustomEvent pub/sub shared by the React-layer event
// buses (reader preferences, wird plan, settings overlay, bookmark changes).
// Event-name constants and payload types stay at their owning modules; this
// module only standardizes the dispatch/subscribe mechanics.

export function emitWindowEvent<T>(eventName: string, detail: T): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(eventName, { detail }))
}

export function subscribeWindowEvent<T>(
  eventName: string,
  listener: (detail: T) => void,
  fallbackDetail: T,
): () => void {
  if (typeof window === 'undefined') return () => undefined
  function onEvent(event: Event): void {
    listener((event as CustomEvent<T>).detail ?? fallbackDetail)
  }
  window.addEventListener(eventName, onEvent)
  return () => window.removeEventListener(eventName, onEvent)
}
