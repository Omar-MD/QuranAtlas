import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMushafPageWindow } from '../../../src/app/routes/read/useMushafPageWindow'
import { useMushafProfileSession } from '../../../src/app/routes/read/useMushafProfileSession'
import {
  describeMushafPage,
  deriveMushafFramingCapability,
  loadMushafPageProfileContext,
  prepareExternalMushafImage,
  prepareMushafDescriptorMedia,
  type MushafPageDescriptor,
  type MushafPageProfileContext,
  type MushafReadyPageAssetState,
} from '../../../src/packs/mushaf-page-asset'

vi.mock('../../../src/packs/mushaf-page-asset', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/packs/mushaf-page-asset')>()
  return {
    ...actual,
    describeMushafPage: vi.fn(),
    loadMushafPageProfileContext: vi.fn(),
    prepareExternalMushafImage: vi.fn(),
    prepareMushafDescriptorMedia: vi.fn(),
  }
})

const profile = { mushafEditionId: 'qalun-quran-ws-v1', riwayah: 'qaloon' as const }
const mockedDescribe = vi.mocked(describeMushafPage)
const mockedLoadContext = vi.mocked(loadMushafPageProfileContext)
const mockedPrepareExternalImage = vi.mocked(prepareExternalMushafImage)
const mockedPrepareMedia = vi.mocked(prepareMushafDescriptorMedia)

function contextFor(edition = profile.mushafEditionId): MushafPageProfileContext {
  return {
    ...profile,
    mushafEditionId: edition,
    index: {},
    manifest: {
      version: 1,
      riwayah: 'qaloon',
      mushafEditionId: edition,
      pageCount: 604,
      pages: [],
      verseToPage: {},
    },
  }
}

function session(context = contextFor()) {
  return {
    status: 'ready' as const,
    key: `${context.riwayah}:${context.mushafEditionId}`,
    context,
    framingCapability: { hasValidFraming: false },
    retry: vi.fn(),
  }
}

function descriptor(page: number, edition = profile.mushafEditionId) {
  const box = { x: 0, y: 0, width: 120, height: 180 }
  return {
    kind: 'inline-svg' as const,
    assetUrl: `/dataset/mushaf-pages/qaloon/${edition}/pages/${String(page).padStart(3, '0')}.svg`,
    sourceViewBox: box,
    displayViewBox: box,
    resolved: {
      assetUrl: `/dataset/mushaf-pages/qaloon/${edition}/pages/${String(page).padStart(3, '0')}.svg`,
      displaySize: { width: 120, height: 180 },
      firstVerse: { surah: 2, verse: page },
      mushafEditionId: edition,
      page,
      pageCount: 604,
      riwayah: 'qaloon' as const,
      riwayahLabel: 'Qaloon',
    },
  }
}

function inlineMedia(page: Extract<MushafPageDescriptor, { kind: 'inline-svg' }>) {
  return {
    kind: 'inline-svg' as const,
    inlineSvg: { markup: '<svg/>', viewBox: page.displayViewBox, viewBoxText: '0 0 120 180' },
  }
}

function externalDescriptor(page: number): Extract<MushafPageDescriptor, { kind: 'external-image' }> {
  const source = (width: number) => ({
    assetPath: `pages/${String(page).padStart(3, '0')}-${width}.webp`,
    assetUrl: `/pages/${page}-${width}.webp`,
    bytes: width,
    height: 1600,
    mimeType: 'image/webp' as const,
    sha256: 'a'.repeat(64),
    width,
  })
  const framing = { textFrame: { x: 0.1, y: 0, width: 0.8, height: 1 }, sideLane: 'right' as const }
  const full = source(2136)
  return {
    kind: 'external-image',
    firstVerse: { surah: 1, verse: 1 },
    framing,
    full,
    lastVerse: { surah: 1, verse: 1 },
    page,
    pageCount: 604,
    preview: source(1280),
    resolved: {
      assetUrl: full.assetUrl,
      displaySize: { height: full.height, width: full.width },
      firstVerse: { surah: 1, verse: 1 },
      framing,
      mushafEditionId: profile.mushafEditionId,
      page,
      pageCount: 604,
      riwayah: 'qaloon',
      riwayahLabel: 'Qaloon',
    },
  }
}

describe('Mushaf profile session and page window', () => {
  beforeEach(() => {
    mockedDescribe.mockReset()
    mockedLoadContext.mockReset()
    mockedPrepareExternalImage.mockReset()
    mockedPrepareMedia.mockReset()
    mockedDescribe.mockImplementation((_context, page) => descriptor(page))
    mockedPrepareMedia.mockImplementation(async (page) => {
      if (page.kind !== 'inline-svg') throw new Error('Expected inline descriptor')
      return inlineMedia(page)
    })
  })

  it('loads one route profile context and derives framing without another fetch', async () => {
    const context = contextFor()
    mockedLoadContext.mockResolvedValue(context)
    const { result } = renderHook(() => useMushafProfileSession({ enabled: true, profile }))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(mockedLoadContext).toHaveBeenCalledOnce()
    expect(result.current.status === 'ready' && result.current.framingCapability)
      .toEqual(deriveMushafFramingCapability(context))
    expect(mockedLoadContext).toHaveBeenCalledOnce()
  })

  it('creates five descriptors but prepares V1 media only for current and immediate pages', async () => {
    const pageSession = session()
    const { result } = renderHook(() => useMushafPageWindow({ enabled: true, page: 42, session: pageSession }))
    await waitFor(() => expect(result.current.entries.filter((entry) => entry.status === 'ready')).toHaveLength(3))
    expect(mockedDescribe).toHaveBeenCalledTimes(5)
    expect(mockedPrepareMedia).toHaveBeenCalledTimes(3)
    expect(result.current.entries.filter((entry) => entry.status === 'descriptor').map((entry) => entry.page)).toEqual([40, 44])
  })

  it('retains overlapping page-window entries and prepares only newly eligible V1 media after movement', async () => {
    const pageSession = session()
    const { rerender, result } = renderHook(({ page }) => useMushafPageWindow({ enabled: true, page, session: pageSession }), {
      initialProps: { page: 42 },
    })

    await waitFor(() => expect(result.current.entries.filter((entry) => entry.status === 'ready')).toHaveLength(3))
    rerender({ page: 43 })

    await waitFor(() => expect(result.current.entries.find((entry) => entry.page === 44)?.status).toBe('ready'))
    expect(result.current.entries.map((entry) => entry.page)).toEqual([41, 42, 43, 44, 45])
    expect(mockedDescribe.mock.calls.slice(5).map(([, page]) => page).sort((left, right) => left - right)).toEqual([44, 45])
    expect(mockedPrepareMedia.mock.calls.map(([page]) => page.resolved.page).sort((left, right) => left - right))
      .toEqual([41, 42, 43, 44])
  })

  it('promotes a ready V2 preview to its full rendition when it becomes the requested page', async () => {
    mockedDescribe.mockImplementation((_context, page) => externalDescriptor(page))
    mockedPrepareMedia.mockImplementation(async (page, purpose) => {
      if (page.kind !== 'external-image') throw new Error('Expected external descriptor')
      return { kind: 'external-image', source: purpose === 'full' ? page.full : page.preview }
    })
    mockedPrepareExternalImage.mockResolvedValue({ status: 'ready', image: {} as HTMLImageElement })
    const pageSession = session()
    const { rerender, result } = renderHook(({ page }) => useMushafPageWindow({ enabled: true, page, session: pageSession }), {
      initialProps: { page: 42 },
    })

    await waitFor(() => expect(readyAsset(result.current.entries.find((entry) => entry.page === 43) ?? null).media)
      .toMatchObject({ kind: 'external-image', source: { assetUrl: '/pages/43-1280.webp' } }))
    rerender({ page: 43 })

    await waitFor(() => expect(readyAsset(result.current.requested).media)
      .toMatchObject({ kind: 'external-image', source: { assetUrl: '/pages/43-2136.webp' } }))
    expect(mockedPrepareMedia.mock.calls
      .filter(([page]) => page.resolved.page === 43)
      .map(([, purpose]) => purpose)).toEqual(['readable', 'full'])
  })

  it('suppresses a stale page completion after the page leaves and re-enters the window', async () => {
    const staleMedia = deferred<ReturnType<typeof inlineMedia>>()
    const latestMedia = deferred<ReturnType<typeof inlineMedia>>()
    let page44Requests = 0
    mockedPrepareMedia.mockImplementation((page) => {
      if (page.kind !== 'inline-svg') throw new Error('Expected inline descriptor')
      if (page.resolved.page !== 44) return Promise.resolve(inlineMedia(page))
      page44Requests += 1
      return page44Requests === 1 ? staleMedia.promise : latestMedia.promise
    })
    const pageSession = session()
    const { rerender, result } = renderHook(({ page }) => useMushafPageWindow({ enabled: true, page, session: pageSession }), {
      initialProps: { page: 44 },
    })

    await waitFor(() => expect(page44Requests).toBe(1))
    rerender({ page: 50 })
    await waitFor(() => expect(result.current.requested?.status).toBe('ready'))
    rerender({ page: 44 })
    await waitFor(() => expect(page44Requests).toBe(2))

    await act(async () => staleMedia.resolve(inlineMedia(descriptor(44))))
    expect(result.current.requested?.status).toBe('loading')

    await act(async () => latestMedia.resolve(inlineMedia(descriptor(44))))
    await waitFor(() => expect(readyAsset(result.current.requested).resolved.page).toBe(44))
  })

  it('retries a failed page with a fresh media preparation', async () => {
    let page44Attempts = 0
    mockedPrepareMedia.mockImplementation(async (page) => {
      if (page.kind !== 'inline-svg') throw new Error('Expected inline descriptor')
      if (page.resolved.page === 44) {
        page44Attempts += 1
        if (page44Attempts === 1) throw new Error('network')
      }
      return inlineMedia(page)
    })
    const pageSession = session()
    const { result } = renderHook(() => useMushafPageWindow({ enabled: true, page: 43, session: pageSession }))

    await waitFor(() => expect(result.current.entries.find((entry) => entry.page === 44)?.status).toBe('error'))
    expect(result.current.requested?.status).toBe('ready')

    act(() => result.current.retry(44))

    await waitFor(() => expect(result.current.entries.find((entry) => entry.page === 44)?.status).toBe('ready'))
    expect(page44Attempts).toBe(2)
  })

  it('aborts every outstanding profile retry when the edition identity changes', async () => {
    const firstRetry = deferred<MushafPageProfileContext>()
    const secondRetry = deferred<MushafPageProfileContext>()
    mockedLoadContext
      .mockRejectedValueOnce(new Error('profile unavailable'))
      .mockImplementationOnce(() => firstRetry.promise)
      .mockImplementationOnce(() => secondRetry.promise)
      .mockResolvedValueOnce(contextFor('replacement-edition'))
    const { rerender, result } = renderHook(({ activeProfile }) => useMushafProfileSession({ enabled: true, profile: activeProfile }), {
      initialProps: { activeProfile: profile },
    })
    await waitFor(() => expect(result.current.status).toBe('error'))

    act(() => result.current.retry())
    await waitFor(() => expect(mockedLoadContext).toHaveBeenCalledTimes(2))
    const firstRetrySignal = mockedLoadContext.mock.calls[1]?.[0].signal

    act(() => result.current.retry())
    await waitFor(() => expect(mockedLoadContext).toHaveBeenCalledTimes(3))
    const secondRetrySignal = mockedLoadContext.mock.calls[2]?.[0].signal

    rerender({ activeProfile: { ...profile, mushafEditionId: 'replacement-edition' } })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(firstRetrySignal?.aborted).toBe(true)
    expect(secondRetrySignal?.aborted).toBe(true)
    expect(result.current.status === 'ready' && result.current.context.mushafEditionId).toBe('replacement-edition')
  })

  it('starts another same-key retry from the current callback without aborting active work', async () => {
    const firstRetry = deferred<MushafPageProfileContext>()
    const secondRetry = deferred<MushafPageProfileContext>()
    mockedLoadContext
      .mockRejectedValueOnce(new Error('profile unavailable'))
      .mockImplementationOnce(() => firstRetry.promise)
      .mockImplementationOnce(() => secondRetry.promise)
    const { result } = renderHook(() => useMushafProfileSession({ enabled: true, profile }))
    await waitFor(() => expect(result.current.status).toBe('error'))

    act(() => result.current.retry())
    await waitFor(() => expect(mockedLoadContext).toHaveBeenCalledTimes(2))
    const retrySignal = mockedLoadContext.mock.calls[1]?.[0].signal

    act(() => result.current.retry())
    await waitFor(() => expect(mockedLoadContext).toHaveBeenCalledTimes(3))
    expect(retrySignal?.aborted).toBe(false)

    await act(async () => {
      secondRetry.resolve(contextFor())
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    await act(async () => {
      firstRetry.reject(new Error('stale retry failed'))
    })
    expect(result.current.status).toBe('ready')
  })

  it('aborts every outstanding profile retry when the route unmounts', async () => {
    const firstRetry = deferred<MushafPageProfileContext>()
    const secondRetry = deferred<MushafPageProfileContext>()
    mockedLoadContext
      .mockRejectedValueOnce(new Error('profile unavailable'))
      .mockImplementationOnce(() => firstRetry.promise)
      .mockImplementationOnce(() => secondRetry.promise)
    const { result, unmount } = renderHook(() => useMushafProfileSession({ enabled: true, profile }))
    await waitFor(() => expect(result.current.status).toBe('error'))

    act(() => result.current.retry())
    await waitFor(() => expect(mockedLoadContext).toHaveBeenCalledTimes(2))
    const firstRetrySignal = mockedLoadContext.mock.calls[1]?.[0].signal

    act(() => result.current.retry())
    await waitFor(() => expect(mockedLoadContext).toHaveBeenCalledTimes(3))
    const secondRetrySignal = mockedLoadContext.mock.calls[2]?.[0].signal

    unmount()

    expect(firstRetrySignal?.aborted).toBe(true)
    expect(secondRetrySignal?.aborted).toBe(true)
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (cause: unknown) => void
  const promise = new Promise<T>((next, fail) => {
    resolve = next
    reject = fail
  })
  return { promise, reject, resolve }
}

function readyAsset(entry: ReturnType<typeof useMushafPageWindow>['requested']): MushafReadyPageAssetState {
  if (entry?.status !== 'ready') throw new Error('Expected a ready page entry')
  return entry.asset
}
