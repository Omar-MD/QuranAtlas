import { useSyncExternalStore } from 'react'

function mediaListFor(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia(query)
}

/**
 * Reactively samples a media query so components can conditionally render per
 * viewport (brief D-M4: visibility splits must not rely on CSS classes a
 * utility layer can override).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const list = mediaListFor(query)
      list?.addEventListener('change', onStoreChange)
      return () => list?.removeEventListener('change', onStoreChange)
    },
    () => mediaListFor(query)?.matches ?? false,
    () => false,
  )
}
