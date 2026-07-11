import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  loadMushafPageAsset,
  type MushafReadyPageAssetState,
} from '../../../packs/mushaf-page-asset'
import type { Riwayah } from '../../../storage/types'

export type MushafPageWindowEntry =
  | { page: number; status: 'loading' }
  | { page: number; status: 'error' | 'unavailable' }
  | { asset: MushafReadyPageAssetState; page: number; status: 'ready' }

type MushafPageWindowState = {
  entries: MushafPageWindowEntry[]
  profileKey: string | null
}

type InFlightRequest = {
  controller: AbortController
  key: string
  promise: Promise<void>
}

export function useMushafPageWindow(input: {
  enabled: boolean
  page: number
  pageCount: number
  profile: { mushafEditionId: string; riwayah: Riwayah } | null
}): {
  entries: readonly MushafPageWindowEntry[]
  requested: MushafPageWindowEntry | null
  retry: (page: number) => void
} {
  const profileKey = input.enabled && input.profile
    ? `${input.profile.riwayah}:${input.profile.mushafEditionId}`
    : null
  const requestedPage = Math.min(input.pageCount, Math.max(1, input.page))
  const desiredPages = useMemo(() => Array.from({ length: 5 }, (_, index) => requestedPage - 2 + index)
    .filter((page) => page >= 1 && page <= input.pageCount), [input.pageCount, requestedPage])
  const desiredKey = desiredPages.join(':')
  const [state, setState] = useState<MushafPageWindowState>({ entries: [], profileKey: null })
  const [retryVersion, setRetryVersion] = useState(0)
  const stateRef = useRef(state)
  const profileRef = useRef(input.profile)
  const profileKeyRef = useRef(profileKey)
  const desiredPagesRef = useRef(desiredPages)
  const retryGenerationsRef = useRef(new Map<number, number>())
  const inFlightRef = useRef(new Map<number, InFlightRequest>())

  stateRef.current = state
  profileRef.current = input.profile
  profileKeyRef.current = profileKey
  desiredPagesRef.current = desiredPages

  useEffect(() => {
    abortAll(inFlightRef.current)
    retryGenerationsRef.current.clear()
    setState({
      entries: profileKey ? desiredPages.map((page) => ({ page, status: 'loading' })) : [],
      profileKey,
    })
    return () => abortAll(inFlightRef.current)
  }, [profileKey])

  useEffect(() => {
    if (!profileKey || state.profileKey !== profileKey) return
    const desired = new Set(desiredPages)
    for (const [page, request] of inFlightRef.current) {
      if (desired.has(page)) continue
      request.controller.abort()
      inFlightRef.current.delete(page)
    }
    setState((current) => {
      if (current.profileKey !== profileKey) return current
      const retained = new Map(current.entries
        .filter((entry) => desired.has(entry.page))
        .map((entry) => [entry.page, entry]))
      for (const page of desiredPages) {
        if (!retained.has(page)) retained.set(page, { page, status: 'loading' })
      }
      const entries = [...retained.values()].sort((left, right) => left.page - right.page)
      return sameEntries(current.entries, entries) ? current : { ...current, entries }
    })
  }, [desiredKey, profileKey, state.profileKey])

  useEffect(() => {
    if (!profileKey || !input.profile || state.profileKey !== profileKey) return
    let active = true

    async function loadWindow(): Promise<void> {
      await ensurePageLoaded(requestedPage)
      if (!active || profileKeyRef.current !== profileKey) return
      await Promise.all(desiredPages
        .filter((page) => page !== requestedPage)
        .map((page) => ensurePageLoaded(page)))
    }

    function ensurePageLoaded(page: number): Promise<void> {
      const entry = stateRef.current.profileKey === profileKey
        ? stateRef.current.entries.find((candidate) => candidate.page === page)
        : undefined
      if (entry && entry.status !== 'loading') return Promise.resolve()
      if (!desiredPagesRef.current.includes(page)) return Promise.resolve()
      const existing = inFlightRef.current.get(page)
      if (existing) return existing.promise
      const profile = profileRef.current
      if (!profile || profileKeyRef.current !== profileKey) return Promise.resolve()

      const retryGeneration = retryGenerationsRef.current.get(page) ?? 0
      const key = `${profile.riwayah}:${profile.mushafEditionId}:${page}:${retryGeneration}`
      const controller = new AbortController()
      const promise = loadMushafPageAsset({
        mushafEditionId: profile.mushafEditionId,
        page,
        riwayah: profile.riwayah,
        signal: controller.signal,
      }).then((result) => {
        const currentRequest = inFlightRef.current.get(page)
        if (controller.signal.aborted || currentRequest?.controller !== controller || profileKeyRef.current !== profileKey) return
        if ((retryGenerationsRef.current.get(page) ?? 0) !== retryGeneration) return
        if (!desiredPagesRef.current.includes(page) || result.status === 'aborted' || result.status === 'loading') return
        const entry: MushafPageWindowEntry = result.status === 'ready'
          ? { asset: result, page, status: 'ready' }
          : { page, status: result.status }
        setState((current) => current.profileKey === profileKey
          ? { ...current, entries: replaceEntry(current.entries, entry) }
          : current)
      }).finally(() => {
        if (inFlightRef.current.get(page)?.controller === controller) inFlightRef.current.delete(page)
      })
      inFlightRef.current.set(page, { controller, key, promise })
      return promise
    }

    void loadWindow()
    return () => {
      active = false
    }
  }, [desiredKey, profileKey, requestedPage, retryVersion, state.profileKey])

  const retry = useCallback((page: number) => {
    if (!profileKeyRef.current || !desiredPagesRef.current.includes(page)) return
    const request = inFlightRef.current.get(page)
    request?.controller.abort()
    inFlightRef.current.delete(page)
    retryGenerationsRef.current.set(page, (retryGenerationsRef.current.get(page) ?? 0) + 1)
    setState((current) => current.profileKey === profileKeyRef.current
      ? { ...current, entries: replaceEntry(current.entries, { page, status: 'loading' }) }
      : current)
    setRetryVersion((current) => current + 1)
  }, [])

  const entries = state.profileKey === profileKey ? state.entries : []
  return {
    entries,
    requested: entries.find((entry) => entry.page === requestedPage) ?? null,
    retry,
  }
}

function abortAll(requests: Map<number, InFlightRequest>): void {
  for (const request of requests.values()) request.controller.abort()
  requests.clear()
}

function replaceEntry(
  entries: readonly MushafPageWindowEntry[],
  replacement: MushafPageWindowEntry,
): MushafPageWindowEntry[] {
  return entries
    .map((entry) => entry.page === replacement.page ? replacement : entry)
    .sort((left, right) => left.page - right.page)
}

function sameEntries(
  current: readonly MushafPageWindowEntry[],
  next: readonly MushafPageWindowEntry[],
): boolean {
  return current.length === next.length && current.every((entry, index) => entry === next[index])
}
