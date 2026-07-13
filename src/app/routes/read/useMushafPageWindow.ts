import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  describeMushafPage,
  prepareExternalMushafImage,
  prepareMushafDescriptorMedia,
  type MushafPageDescriptor,
  type MushafReadyPageAssetState,
} from '../../../packs/mushaf-page-asset'
import type { MushafProfileSession } from './useMushafProfileSession'

export type MushafPageWindowEntry =
  | { page: number; status: 'loading' }
  | { page: number; descriptor: MushafPageDescriptor; status: 'descriptor' }
  | { page: number; status: 'error' | 'unavailable' }
  | { asset: MushafReadyPageAssetState; loadPurpose: 'current' | 'preview'; page: number; status: 'ready' }

type State = { entries: MushafPageWindowEntry[]; profileKey: string | null }
type Request = { controller: AbortController; promise: Promise<void>; purpose: 'current' | 'preview' | 'descriptor' }

export function useMushafPageWindow(input: {
  enabled: boolean
  page: number
  session: MushafProfileSession
}): { entries: readonly MushafPageWindowEntry[]; requested: MushafPageWindowEntry | null; retry: (page: number) => void } {
  const context = input.session.status === 'ready' ? input.session.context : null
  const profileKey = input.enabled ? input.session.key : null
  const pageCount = context?.manifest.pageCount ?? 604
  const requestedPage = Math.min(pageCount, Math.max(1, input.page))
  const pages = useMemo(() => Array.from({ length: 5 }, (_, index) => requestedPage - 2 + index)
    .filter((page) => page >= 1 && page <= pageCount), [pageCount, requestedPage])
  const [state, setState] = useState<State>({ entries: [], profileKey: null })
  const stateRef = useRef(state)
  const keyRef = useRef(profileKey)
  const pagesRef = useRef(pages)
  const requests = useRef(new Map<number, Request>())
  const [retryVersion, setRetryVersion] = useState(0)
  stateRef.current = state; keyRef.current = profileKey; pagesRef.current = pages

  useEffect(() => {
    abortAll(requests.current)
    setState({ profileKey, entries: profileKey ? pages.map((page) => ({ page, status: 'loading' })) : [] })
    return () => abortAll(requests.current)
  }, [profileKey])

  useEffect(() => {
    if (!profileKey || state.profileKey !== profileKey) return
    const wanted = new Set(pages)
    for (const [page, request] of requests.current) if (!wanted.has(page)) { request.controller.abort(); requests.current.delete(page) }
    setState((current) => current.profileKey !== profileKey ? current : {
      ...current,
      entries: pages.map((page) => current.entries.find((entry) => entry.page === page) ?? { page, status: 'loading' }),
    })
  }, [pages.join(':'), profileKey, state.profileKey])

  useEffect(() => {
    if (!context || !profileKey || state.profileKey !== profileKey) return
    const readyContext = context
    let alive = true
    const purposeFor = (page: number): Request['purpose'] => page === requestedPage
      ? 'current' : Math.abs(page - requestedPage) === 1 ? 'preview' : 'descriptor'
    async function run(): Promise<void> {
      await ensure(requestedPage, 'current')
      await Promise.all(pages.filter((page) => page !== requestedPage).map((page) => ensure(page, purposeFor(page))))
    }
    async function ensure(page: number, purpose: Request['purpose']): Promise<void> {
      if (!alive || !pagesRef.current.includes(page) || keyRef.current !== profileKey) return
      const existing = stateRef.current.entries.find((entry) => entry.page === page)
      if ((existing?.status === 'ready' && (existing.asset.media.kind === 'inline-svg' || purpose !== 'current' || existing.loadPurpose === 'current'))
        || (purpose === 'descriptor' && existing?.status === 'descriptor')) return
      const inFlight = requests.current.get(page)
      if (inFlight) {
        if (!isPurposeUpgrade(inFlight.purpose, purpose)) return inFlight.promise
        inFlight.controller.abort(); requests.current.delete(page)
      }
      const controller = new AbortController()
      const promise = Promise.resolve()
        .then(() => describeMushafPage(readyContext, page))
        .then(async (descriptor) => {
          if (controller.signal.aborted || keyRef.current !== profileKey || !pagesRef.current.includes(page)) return
          if (purpose === 'descriptor') return setEntry({ page, descriptor, status: 'descriptor' })
          const media = await prepareMushafDescriptorMedia(
            descriptor,
            descriptor.kind === 'inline-svg' || purpose !== 'current' ? 'readable' : 'full',
            controller.signal,
          )
          if (controller.signal.aborted || keyRef.current !== profileKey) return
          if (media.kind === 'inline-svg') {
            setEntry({ page, loadPurpose: purpose, status: 'ready', asset: { status: 'ready', media, resolved: descriptor.resolved } })
            return
          }
          const result = await prepareExternalMushafImage(media.source, controller.signal)
          if (controller.signal.aborted || keyRef.current !== profileKey || result.status !== 'ready') {
            if (result.status === 'error') setEntry({ page, status: 'error' })
            return
          }
          setEntry({ page, loadPurpose: purpose, status: 'ready', asset: { status: 'ready', media, resolved: descriptor.resolved } })
        })
        .catch(() => { if (!controller.signal.aborted && keyRef.current === profileKey) setEntry({ page, status: 'error' }) })
        .finally(() => { if (requests.current.get(page)?.controller === controller) requests.current.delete(page) })
      requests.current.set(page, { controller, promise, purpose })
      return promise
    }
    function setEntry(entry: MushafPageWindowEntry): void {
      setState((current) => current.profileKey === profileKey && pagesRef.current.includes(entry.page)
        ? { ...current, entries: current.entries.map((item) => item.page === entry.page ? entry : item) }
        : current)
    }
    void run()
    return () => { alive = false }
  }, [context, pages.join(':'), profileKey, requestedPage, retryVersion, state.profileKey])

  const retry = useCallback((page: number) => {
    requests.current.get(page)?.controller.abort(); requests.current.delete(page)
    setState((current) => ({ ...current, entries: current.entries.map((entry) => entry.page === page ? { page, status: 'loading' } : entry) }))
    setRetryVersion((value) => value + 1)
  }, [])
  const entries = state.profileKey === profileKey ? state.entries : []
  return { entries, requested: entries.find((entry) => entry.page === requestedPage) ?? null, retry }
}

function abortAll(requests: Map<number, Request>): void { for (const request of requests.values()) request.controller.abort(); requests.clear() }

function isPurposeUpgrade(current: Request['purpose'], next: Request['purpose']): boolean {
  return (current === 'descriptor' && next !== 'descriptor') || (current === 'preview' && next === 'current')
}
