import { useEffect, useRef } from 'react'

import { DEFAULT_READER_ASSET_PROFILE } from '../../shared/reader-assets/default-profile'
import { readNativeSettings } from '../storage/native-reader-store'
import { subscribeReactReaderPreferencesChanged } from '../storage/reader-preferences'

export type MushafEditionChangeSignal = {
  /** Records the edition id a successful resolution applied; the next event re-triggers only past this id. */
  track: (editionId: string) => void
}

/**
 * §3 wiring: the shared preferences event fires on every settings write and
 * carries no edition id — read the native one and re-resolve only on an
 * actual mushaf edition change. The host tracks the id its current data was
 * resolved for (via `track`) and receives `onEditionChanged` when the native
 * id moves past it. The signal never fires after unmount.
 */
export function useMushafEditionChangeSignal(onEditionChanged: () => void): MushafEditionChangeSignal {
  const trackedEditionIdRef = useRef<string | null>(null)
  const onEditionChangedRef = useRef(onEditionChanged)
  onEditionChangedRef.current = onEditionChanged

  useEffect(() => {
    let active = true
    const unsubscribe = subscribeReactReaderPreferencesChanged(() => {
      void readNativeSettings(['mushafEditionId'])
        .then(([mushafEditionId]) => {
          const editionId =
            typeof mushafEditionId?.value === 'string'
              ? mushafEditionId.value
              : DEFAULT_READER_ASSET_PROFILE.mushafEditionId
          if (!active || editionId === trackedEditionIdRef.current) return
          onEditionChangedRef.current()
        })
        .catch(() => undefined)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return {
    track: (editionId: string) => {
      trackedEditionIdRef.current = editionId
    },
  }
}
