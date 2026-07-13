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

type MushafProfileRequest = {
  key: string
  controller: AbortController
}

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
  const retry = useCallback(() => setRetryGeneration((generation) => generation + 1), [])
  const profile = input.profile
  const activeRequestsRef = useRef(new Map<string, Set<MushafProfileRequest>>())
  const latestRequestRef = useRef<MushafProfileRequest | null>(null)

  useEffect(() => () => {
    for (const requests of activeRequestsRef.current.values()) {
      for (const request of requests) request.controller.abort()
    }
    activeRequestsRef.current.clear()
    latestRequestRef.current = null
  }, [])

  useEffect(() => {
    for (const [requestKey, requests] of activeRequestsRef.current) {
      if (requestKey === key) continue
      for (const request of requests) request.controller.abort()
      activeRequestsRef.current.delete(requestKey)
    }
    if (latestRequestRef.current?.key !== key) latestRequestRef.current = null
    if (!key || !profile) {
      setState({ status: 'idle', key: null, context: null, framingCapability: NO_FRAMING })
      return undefined
    }
    const controller = new AbortController()
    const request = { key, controller }
    const activeRequests = activeRequestsRef.current.get(key) ?? new Set<MushafProfileRequest>()
    activeRequests.add(request)
    activeRequestsRef.current.set(key, activeRequests)
    latestRequestRef.current = request
    setState({ status: 'loading', key, context: null, framingCapability: NO_FRAMING })
    void loadMushafPageProfileContext({ ...profile, signal: controller.signal })
      .then((context) => {
        const requests = activeRequestsRef.current.get(key)
        requests?.delete(request)
        if (requests?.size === 0) activeRequestsRef.current.delete(key)
        if (controller.signal.aborted || latestRequestRef.current !== request) return
        latestRequestRef.current = null
        setState({ status: 'ready', key, context, framingCapability: deriveMushafFramingCapability(context) })
      })
      .catch((cause: unknown) => {
        const requests = activeRequestsRef.current.get(key)
        requests?.delete(request)
        if (requests?.size === 0) activeRequestsRef.current.delete(key)
        if (controller.signal.aborted || latestRequestRef.current !== request) return
        latestRequestRef.current = null
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
