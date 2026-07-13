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
  const requestRef = useRef<{ key: string; controller: AbortController } | null>(null)

  useEffect(() => () => {
    requestRef.current?.controller.abort()
    requestRef.current = null
  }, [])

  useEffect(() => {
    const activeRequest = requestRef.current
    if (activeRequest && activeRequest.key !== key) {
      activeRequest.controller.abort()
      requestRef.current = null
    }
    if (!key || !profile) {
      setState({ status: 'idle', key: null, context: null, framingCapability: NO_FRAMING })
      return undefined
    }
    const controller = new AbortController()
    const request = { key, controller }
    requestRef.current = request
    setState({ status: 'loading', key, context: null, framingCapability: NO_FRAMING })
    void loadMushafPageProfileContext({ ...profile, signal: controller.signal })
      .then((context) => {
        if (controller.signal.aborted || requestRef.current !== request) return
        requestRef.current = null
        setState({ status: 'ready', key, context, framingCapability: deriveMushafFramingCapability(context) })
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || requestRef.current !== request) return
        requestRef.current = null
        setState({
          status: 'error',
          key,
          context: null,
          error: cause instanceof Error ? cause : new Error('Mushaf profile unavailable'),
          framingCapability: NO_FRAMING,
        })
      })
  }, [key, profile?.mushafEditionId, profile?.riwayah, retryGeneration])

  return useMemo(() => ({ ...state, retry }), [retry, state]) as MushafProfileSession
}
