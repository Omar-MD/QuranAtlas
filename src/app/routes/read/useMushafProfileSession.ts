import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  deriveMushafFramingCapability,
  loadMushafPageProfileContext,
  type MushafFramingCapability,
  type MushafPageProfileContext,
} from '../../../packs/mushaf-page-asset'
import type { Riwayah } from '../../../storage/types'

export type MushafProfileSession =
  | { status: 'idle' | 'loading'; key: string | null; context: null; framingCapability: MushafFramingCapability; retry: () => void }
  | { status: 'ready'; key: string; context: MushafPageProfileContext; framingCapability: MushafFramingCapability; retry: () => void }
  | { status: 'error'; key: string; context: null; error: Error; framingCapability: MushafFramingCapability; retry: () => void }

type MushafProfileSessionState =
  | { status: 'idle' | 'loading'; key: string | null; context: null; framingCapability: MushafFramingCapability }
  | { status: 'ready'; key: string; context: MushafPageProfileContext; framingCapability: MushafFramingCapability }
  | { status: 'error'; key: string; context: null; error: Error; framingCapability: MushafFramingCapability }

const NO_FRAMING: MushafFramingCapability = { hasValidFraming: false }

export function useMushafProfileSession(input: {
  enabled: boolean
  profile: { mushafEditionId: string; riwayah: Riwayah } | null
}): MushafProfileSession {
  const key = input.enabled && input.profile ? `${input.profile.riwayah}:${input.profile.mushafEditionId}` : null
  const [retryGeneration, setRetryGeneration] = useState(0)
  const [state, setState] = useState<MushafProfileSessionState>({
    status: 'idle', key: null, context: null, framingCapability: NO_FRAMING,
  })
  const retry = useCallback(() => {
    if (state.status === 'error') setRetryGeneration((generation) => generation + 1)
  }, [state.status])
  const profile = input.profile
  const keyRef = useRef(key)
  const controllerRef = useRef<AbortController | null>(null)
  keyRef.current = key

  useEffect(() => () => controllerRef.current?.abort(), [])

  useEffect(() => {
    if (!key || !profile) {
      controllerRef.current = null
      setState({ status: 'idle', key: null, context: null, framingCapability: NO_FRAMING })
      return undefined
    }
    const controller = new AbortController()
    controllerRef.current = controller
    setState({ status: 'loading', key, context: null, framingCapability: NO_FRAMING })
    void loadMushafPageProfileContext({ ...profile, signal: controller.signal })
      .then((context) => {
        if (controller.signal.aborted || keyRef.current !== key) return
        setState({ status: 'ready', key, context, framingCapability: deriveMushafFramingCapability(context) })
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || keyRef.current !== key) return
        setState({
          status: 'error',
          key,
          context: null,
          error: cause instanceof Error ? cause : new Error('Mushaf profile unavailable'),
          framingCapability: NO_FRAMING,
        })
      })
    return () => {
      if (keyRef.current !== key) controller.abort()
    }
  }, [key, profile?.mushafEditionId, profile?.riwayah, retryGeneration])

  return useMemo(() => ({ ...state, retry }), [retry, state]) as MushafProfileSession
}
