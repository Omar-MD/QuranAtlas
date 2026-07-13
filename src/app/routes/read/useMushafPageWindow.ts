import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  classifyMushafPageFailure,
  describeMushafPage,
  prepareExternalMushafImage,
  prepareMushafDescriptorMedia,
  type MushafPageDescriptor,
  type MushafReadyMedia,
  type MushafReadyPageAssetState,
} from '../../../packs/mushaf-page-asset'
import {
  commitMushafPageFull,
  commitMushafPagePreview,
  MUSHAF_RETRY_DELAYS_MS,
  preserveMushafPageOnUpgradeFailure,
  resetMushafPageUpgrade,
  setMushafPageAttempt,
  setMushafPageUpgradeAttempt,
  writeMushafPageGeneration,
  type MushafPageWindowEntry,
} from './mushaf-page-window-state'
import type { MushafProfileSession } from './useMushafProfileSession'

export type { MushafPageWindowEntry } from './mushaf-page-window-state'

type State = { entries: readonly MushafPageWindowEntry[]; profileKey: string | null }
type Request = { controller: AbortController; generation: number; promise: Promise<void> }
type RouteRequestedEntry = MushafPageWindowEntry | { page: number; status: 'error' | 'unavailable' }

export function useMushafPageWindow(input: {
  enabled: boolean
  page: number
  session: MushafProfileSession
}): { entries: readonly MushafPageWindowEntry[]; requested: RouteRequestedEntry | null; retry: (page: number) => void } {
  const context = input.session.status === 'ready' ? input.session.context : null
  const profileKey = input.enabled ? input.session.key : null
  const pageCount = context?.manifest.pageCount ?? 604
  const requestedPage = Math.min(pageCount, Math.max(1, input.page))
  const pages = useMemo(() => Array.from({ length: 5 }, (_, index) => requestedPage - 2 + index)
    .filter((page) => page >= 1 && page <= pageCount), [pageCount, requestedPage])
  const [state, setState] = useState<State>({ entries: [], profileKey: null })
  const stateRef = useRef(state)
  const activeProfileKeyRef = useRef<string | null>(null)
  const activeContextRef = useRef(context)
  const requestedPageRef = useRef(requestedPage)
  const ownedPagesRef = useRef(new Set<number>())
  const descriptorsRef = useRef(new Map<number, MushafPageDescriptor>())
  const generationsRef = useRef(new Map<number, number>())
  const nextGenerationRef = useRef(0)
  const requestsRef = useRef(new Map<string, Request>())
  const ensureFullRef = useRef<(page: number) => void>(() => undefined)
  stateRef.current = state
  requestedPageRef.current = requestedPage

  const updateEntry = useCallback((page: number, generation: number, update: (entry: MushafPageWindowEntry) => MushafPageWindowEntry) => {
    setState((current) => {
      if (current.profileKey !== activeProfileKeyRef.current) return current
      const existing = current.entries.find((entry) => entry.page === page)
      if (!existing) return current
      const entries = writeMushafPageGeneration(
        current.entries,
        update(existing),
        generation,
        generationsRef.current.get(page),
      )
      if (entries === current.entries) return current
      const next = { ...current, entries }
      stateRef.current = next
      return next
    })
  }, [])

  const ensureFull = useCallback((page: number) => {
    if (requestedPageRef.current !== page || !ownedPagesRef.current.has(page)) return
    const descriptor = descriptorsRef.current.get(page)
    const generation = generationsRef.current.get(page)
    const entry = stateRef.current.entries.find((candidate) => candidate.page === page)
    if (!descriptor || descriptor.kind !== 'external-image' || generation === undefined
      || entry?.status !== 'ready' || entry.rendition === 'full' || entry.upgradeStatus !== 'idle') return
    const key = requestKey(page, 'full')
    if (requestsRef.current.has(key)) return
    const controller = new AbortController()
    const promise = (async () => {
      for (let attempt = 0; attempt <= MUSHAF_RETRY_DELAYS_MS.length; attempt += 1) {
        if (controller.signal.aborted || requestedPageRef.current !== page) return
        updateEntry(page, generation, (current) => setMushafPageUpgradeAttempt(current, attempt))
        try {
          const media = await prepareMushafDescriptorMedia(descriptor, 'full', controller.signal)
          const asset = await prepareReadyAsset(descriptor, media, controller.signal)
          if (controller.signal.aborted || requestedPageRef.current !== page) return
          updateEntry(page, generation, (current) => commitMushafPageFull(current, descriptor, asset))
          return
        } catch (error) {
          if (isAbort(error, controller.signal)) return
          const kind = classifyMushafPageFailure(error)
          if (kind !== 'transient' || attempt === MUSHAF_RETRY_DELAYS_MS.length) {
            updateEntry(page, generation, preserveMushafPageOnUpgradeFailure)
            return
          }
          try {
            await abortableDelay(MUSHAF_RETRY_DELAYS_MS[attempt]!, controller.signal)
          } catch (delayError) {
            if (isAbort(delayError, controller.signal)) return
            throw delayError
          }
        }
      }
    })().finally(() => {
      if (requestsRef.current.get(key)?.controller === controller) requestsRef.current.delete(key)
    })
    requestsRef.current.set(key, { controller, generation, promise })
  }, [updateEntry])
  ensureFullRef.current = ensureFull

  const ensureReadable = useCallback((page: number) => {
    if (!ownedPagesRef.current.has(page)) return
    const descriptor = descriptorsRef.current.get(page)
    const generation = generationsRef.current.get(page)
    if (!descriptor || generation === undefined) return
    const existing = stateRef.current.entries.find((entry) => entry.page === page)
    if (existing?.status === 'ready') {
      if (requestedPageRef.current === page) ensureFullRef.current(page)
      return
    }
    if (existing?.status === 'transient-error' || existing?.status === 'contract-error'
      || existing?.status === 'confirmed-missing') return
    const key = requestKey(page, 'readable')
    if (requestsRef.current.has(key)) return
    const controller = new AbortController()
    const promise = (async () => {
      for (let attempt = 0; attempt <= MUSHAF_RETRY_DELAYS_MS.length; attempt += 1) {
        if (controller.signal.aborted || !ownedPagesRef.current.has(page)) return
        updateEntry(page, generation, () => setMushafPageAttempt(descriptor, attempt))
        try {
          const media = await prepareMushafDescriptorMedia(descriptor, 'readable', controller.signal)
          const asset = await prepareReadyAsset(descriptor, media, controller.signal)
          if (controller.signal.aborted || !ownedPagesRef.current.has(page)) return
          updateEntry(page, generation, () => commitMushafPagePreview(descriptor, asset))
          if (requestedPageRef.current === page) queueMicrotask(() => ensureFullRef.current(page))
          return
        } catch (error) {
          if (isAbort(error, controller.signal)) return
          const kind = classifyMushafPageFailure(error)
          if (kind === 'transient' && attempt < MUSHAF_RETRY_DELAYS_MS.length) {
            try {
              await abortableDelay(MUSHAF_RETRY_DELAYS_MS[attempt]!, controller.signal)
            } catch (delayError) {
              if (isAbort(delayError, controller.signal)) return
              throw delayError
            }
            continue
          }
          const normalized = error instanceof Error ? error : new Error('Mushaf page preparation failed')
          updateEntry(page, generation, () => kind === 'confirmed-missing'
            ? { descriptor, page, reason: normalized.message, status: 'confirmed-missing' }
            : { descriptor, error: normalized, page, status: kind === 'transient' ? 'transient-error' : 'contract-error' })
          return
        }
      }
    })().finally(() => {
      if (requestsRef.current.get(key)?.controller === controller) requestsRef.current.delete(key)
    })
    requestsRef.current.set(key, { controller, generation, promise })
  }, [updateEntry])

  useEffect(() => {
    const profileChanged = activeProfileKeyRef.current !== profileKey || activeContextRef.current !== context
    if (profileChanged) {
      abortAll(requestsRef.current)
      descriptorsRef.current.clear()
      generationsRef.current.clear()
      ownedPagesRef.current.clear()
      activeProfileKeyRef.current = profileKey
      activeContextRef.current = context
    }
    if (!context || !profileKey) {
      setState({ entries: [], profileKey })
      return
    }

    const wanted = new Set(pages)
    for (const page of ownedPagesRef.current) {
      if (wanted.has(page)) continue
      abortPage(requestsRef.current, page)
      descriptorsRef.current.delete(page)
      generationsRef.current.delete(page)
    }
    for (const [key, request] of requestsRef.current) {
      if (key.endsWith(':full') && !key.startsWith(`${requestedPage}:`)) {
        request.controller.abort()
        requestsRef.current.delete(key)
      }
    }

    const previous = !profileChanged && stateRef.current.profileKey === profileKey ? stateRef.current.entries : []
    const entries = pages.map((page): MushafPageWindowEntry => {
      let descriptor = descriptorsRef.current.get(page)
      if (!descriptor) {
        descriptor = describeMushafPage(context, page)
        descriptorsRef.current.set(page, descriptor)
        generationsRef.current.set(page, ++nextGenerationRef.current)
      }
      const retained = previous.find((entry) => entry.page === page)
      if (!retained) return { descriptor, page, status: 'descriptor' }
      if (retained.status === 'ready' && !retained.descriptor) return { ...retained, descriptor }
      if (retained.status === 'ready' && page !== requestedPage && retained.upgradeStatus !== 'idle') {
        return resetMushafPageUpgrade(retained)
      }
      return retained
    })
    ownedPagesRef.current = wanted
    const next = { entries, profileKey }
    stateRef.current = next
    setState(next)

    void ensureReadable(requestedPage)
    for (const neighbor of [requestedPage - 1, requestedPage + 1]) {
      if (descriptorsRef.current.has(neighbor)) void ensureReadable(neighbor)
    }
    const current = entries.find((entry) => entry.page === requestedPage)
    if (current?.status === 'ready') ensureFull(requestedPage)
  }, [context, ensureFull, ensureReadable, pages, profileKey, requestedPage])

  useEffect(() => {
    const current = state.entries.find((entry) => entry.page === requestedPage)
    if (current?.status === 'ready' && current.rendition === 'preview') ensureFull(requestedPage)
  }, [ensureFull, requestedPage, state.entries])

  useEffect(() => () => abortAll(requestsRef.current), [])

  const retry = useCallback((page: number) => {
    const descriptor = descriptorsRef.current.get(page)
    if (!descriptor || !ownedPagesRef.current.has(page)) return
    abortPage(requestsRef.current, page)
    const generation = ++nextGenerationRef.current
    generationsRef.current.set(page, generation)
    updateEntry(page, generation, () => ({ descriptor, page, status: 'descriptor' }))
    queueMicrotask(() => ensureReadable(page))
  }, [ensureReadable, updateEntry])

  const entries = state.profileKey === profileKey ? state.entries : []
  const requested = entries.find((entry) => entry.page === requestedPage)
  return { entries, requested: requested ? routeRequestedEntry(requested) : null, retry }
}

async function prepareReadyAsset(
  descriptor: MushafPageDescriptor,
  media: MushafReadyMedia,
  signal: AbortSignal,
): Promise<MushafReadyPageAssetState> {
  if (media.kind === 'external-image') {
    const prepared = await prepareExternalMushafImage(media.source, signal)
    if (prepared.status === 'aborted') throw new DOMException('Mushaf image preparation was aborted', 'AbortError')
    if (prepared.status === 'error') throw prepared.error
  }
  return { status: 'ready', media, resolved: descriptor.resolved }
}

function routeRequestedEntry(entry: MushafPageWindowEntry): RouteRequestedEntry {
  if (entry.status === 'confirmed-missing') return { page: entry.page, status: 'unavailable' }
  if (entry.status === 'transient-error' || entry.status === 'contract-error') return { page: entry.page, status: 'error' }
  return entry
}

function requestKey(page: number, purpose: 'readable' | 'full'): string {
  return `${page}:${purpose}`
}

function abortPage(requests: Map<string, Request>, page: number): void {
  for (const [key, request] of requests) {
    if (!key.startsWith(`${page}:`)) continue
    request.controller.abort()
    requests.delete(key)
  }
}

function abortAll(requests: Map<string, Request>): void {
  for (const request of requests.values()) request.controller.abort()
  requests.clear()
}

function isAbort(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (error instanceof DOMException && error.name === 'AbortError')
}

function abortableDelay(delay: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => finish(() => reject(new DOMException('Mushaf retry was aborted', 'AbortError')))
    const timer = window.setTimeout(() => finish(resolve), delay)
    const finish = (complete: () => void) => {
      window.clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      complete()
    }
    if (signal.aborted) return onAbort()
    signal.addEventListener('abort', onAbort, { once: true })
  })
}
