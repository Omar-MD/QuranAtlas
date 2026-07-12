import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  loadPreparedMushafPage,
  loadMushafPageAsset,
  prepareExternalMushafImage,
  selectExternalMushafSource,
  type MushafPageLoadPurpose,
  type MushafReadyPageAssetState,
  type PreparedMushafPage,
} from '../../../packs/mushaf-page-asset'
import type { Riwayah } from '../../../storage/types'

export type MushafPageWindowEntry =
  | { page: number; status: 'loading' }
  | { page: number; prepared: PreparedMushafPage; status: 'descriptor' }
  | { page: number; status: 'error' | 'unavailable' }
  | { asset: MushafReadyPageAssetState; page: number; status: 'ready' }

type State = { entries: MushafPageWindowEntry[]; profileKey: string | null }
type Request = { controller: AbortController; promise: Promise<void>; purpose: 'current' | 'preview' | 'descriptor' }

export function useMushafPageWindow(input: {
  enabled: boolean
  page: number
  pageCount: number
  profile: { mushafEditionId: string; riwayah: Riwayah } | null
}): { entries: readonly MushafPageWindowEntry[]; requested: MushafPageWindowEntry | null; retry: (page: number) => void } {
  const profileKey = input.enabled && input.profile ? `${input.profile.riwayah}:${input.profile.mushafEditionId}` : null
  const requestedPage = Math.min(input.pageCount, Math.max(1, input.page))
  const pages = useMemo(() => Array.from({ length: 5 }, (_, i) => requestedPage - 2 + i)
    .filter((page) => page >= 1 && page <= input.pageCount), [input.pageCount, requestedPage])
  const [state, setState] = useState<State>({ entries: [], profileKey: null })
  const stateRef = useRef(state)
  const profileRef = useRef(input.profile)
  const keyRef = useRef(profileKey)
  const pagesRef = useRef(pages)
  const requests = useRef(new Map<number, Request>())
  const [retryVersion, setRetryVersion] = useState(0)
  stateRef.current = state; profileRef.current = input.profile; keyRef.current = profileKey; pagesRef.current = pages

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
    if (!profileKey || !input.profile || state.profileKey !== profileKey) return
    let alive = true
    const purposeFor = (page: number): 'current' | 'preview' | 'descriptor' => page === requestedPage
      ? 'current' : Math.abs(page - requestedPage) === 1 ? 'preview' : 'descriptor'
    async function run(): Promise<void> {
      await ensure(requestedPage, 'current')
      await Promise.all(pages.filter((page) => page !== requestedPage).map((page) => ensure(page, purposeFor(page))))
    }
    async function ensure(page: number, purpose: 'current' | 'preview' | 'descriptor'): Promise<void> {
      if (!alive || !pagesRef.current.includes(page) || keyRef.current !== profileKey) return
      const existing = stateRef.current.entries.find((entry) => entry.page === page)
      if (existing?.status === 'ready' || (purpose === 'descriptor' && existing?.status === 'descriptor')) return
      const inFlight = requests.current.get(page)
      if (inFlight) {
        if (!isPurposeUpgrade(inFlight.purpose, purpose)) return inFlight.promise
        inFlight.controller.abort()
        requests.current.delete(page)
      }
      const profile = profileRef.current
      if (!profile) return
      const controller = new AbortController()
      const promise = loadWindowPage({ ...profile, page, signal: controller.signal })
        .then(async (prepared) => {
          if (controller.signal.aborted || keyRef.current !== profileKey || !pagesRef.current.includes(page)) return
          if (purpose === 'descriptor') return setEntry({ page, prepared, status: 'descriptor' })
          if (prepared.kind === 'inline-svg') {
            return setEntry({ page, status: 'ready', asset: { status: 'ready', media: { kind: 'inline-svg', inlineSvg: prepared.inlineSvg }, resolved: prepared.resolved } })
          }
          const source = selectExternalMushafSource(prepared, purpose as MushafPageLoadPurpose)
          const result = await prepareExternalMushafImage(source, controller.signal)
          if (controller.signal.aborted || keyRef.current !== profileKey || result.status !== 'ready') {
            if (result.status === 'error') setEntry({ page, status: 'error' })
            return
          }
          setEntry({ page, status: 'ready', asset: { status: 'ready', media: { kind: 'external-image', source }, resolved: prepared.resolved } })
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
  }, [input.profile, pages.join(':'), profileKey, requestedPage, retryVersion, state.profileKey])

  const retry = useCallback((page: number) => {
    requests.current.get(page)?.controller.abort(); requests.current.delete(page)
    setState((current) => ({ ...current, entries: current.entries.map((entry) => entry.page === page ? { page, status: 'loading' } : entry) }))
    setRetryVersion((value) => value + 1)
  }, [])
  const entries = state.profileKey === profileKey ? state.entries : []
  return { entries, requested: entries.find((entry) => entry.page === requestedPage) ?? null, retry }
}

function abortAll(requests: Map<number, Request>): void { for (const request of requests.values()) request.controller.abort(); requests.clear() }

function isPurposeUpgrade(
  current: Request['purpose'],
  next: Request['purpose'],
): boolean {
  return (current === 'descriptor' && next !== 'descriptor') || (current === 'preview' && next === 'current')
}

async function loadWindowPage(input: Parameters<typeof loadMushafPageAsset>[0]): Promise<PreparedMushafPage> {
  const v1 = await loadMushafPageAsset(input)
  if (v1.status === 'ready') {
    if (v1.media.kind !== 'inline-svg') throw new Error('Mushaf SVG unavailable')
    return { kind: 'inline-svg', assetUrl: v1.resolved.assetUrl, inlineSvg: v1.media.inlineSvg, resolved: v1.resolved }
  }
  if (v1.status === 'error' && /V2 reader loader|External-image/i.test(v1.error.message)) return loadPreparedMushafPage(input)
  throw v1.status === 'error' ? v1.error : new Error('Mushaf page unavailable')
}
