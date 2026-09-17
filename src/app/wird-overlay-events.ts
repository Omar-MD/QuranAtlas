export const REACT_OPEN_WIRD_EVENT = 'quranatlas-react-open-wird'

export type ReactOpenWirdRequest = {
  returnFocusId?: string
}
export type ReactOpenWirdEvent = CustomEvent<ReactOpenWirdRequest>

// App-level Daily Wird entry (brief §15.3): request the Wird sheet without
// changing the hash; App.tsx mounts the lazy sheet and returns focus to the
// invoker id on close.
export function requestReactWirdOverlay({ returnFocusId }: ReactOpenWirdRequest = {}): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(REACT_OPEN_WIRD_EVENT, { detail: { returnFocusId } }))
}

export function subscribeReactWirdOverlayRequests(listener: (request: ReactOpenWirdRequest) => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  function onOpenWird(event: Event): void {
    listener((event as ReactOpenWirdEvent).detail ?? {})
  }
  window.addEventListener(REACT_OPEN_WIRD_EVENT, onOpenWird)
  return () => window.removeEventListener(REACT_OPEN_WIRD_EVENT, onOpenWird)
}
