import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMushafPageWindow } from '../../../src/app/routes/read/useMushafPageWindow'
import { useMushafProfileSession } from '../../../src/app/routes/read/useMushafProfileSession'
import {
  describeMushafPage,
  deriveMushafFramingCapability,
  loadMushafPageProfileContext,
  MushafAssetHttpError,
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

function externalDescriptor(page: number, edition = profile.mushafEditionId): Extract<MushafPageDescriptor, { kind: 'external-image' }> {
  const source = (width: number) => ({
    assetPath: `pages/${String(page).padStart(3, '0')}-${width}.webp`,
    assetUrl: edition === profile.mushafEditionId ? `/pages/${page}-${width}.webp` : `/${edition}/pages/${page}-${width}.webp`,
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
      mushafEditionId: edition,
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

  afterEach(() => {
    vi.useRealTimers()
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
    expect(mockedDescribe.mock.calls.slice(5).map(([, page]) => page).sort((left, right) => left - right)).toEqual([45])
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

  it('starts current and neighbor previews together, then decodes the current 2136 rendition with an abort signal', async () => {
    const fullImage = deferred<{ status: 'ready'; image: HTMLImageElement }>()
    mockedDescribe.mockImplementation((_context, page) => externalDescriptor(page))
    mockedPrepareMedia.mockImplementation(async (page, purpose) => {
      if (page.kind !== 'external-image') throw new Error('Expected external descriptor')
      return { kind: 'external-image', source: purpose === 'full' ? page.full : page.preview }
    })
    mockedPrepareExternalImage.mockImplementation((source) => source.width === 2136
      ? fullImage.promise
      : Promise.resolve({ status: 'ready', image: {} as HTMLImageElement }))

    const pageSession = session()
    const { result } = renderHook(() => useMushafPageWindow({ enabled: true, page: 42, session: pageSession }))

    await waitFor(() => expect([41, 42, 43].map((page) => readyWidth(result.current.entries, page))).toEqual([1280, 1280, 1280]))
    expect(mockedPrepareMedia.mock.calls.slice(0, 3).map(([page, purpose]) => [page.resolved.page, purpose]))
      .toEqual([[42, 'readable'], [41, 'readable'], [43, 'readable']])
    const fullCall = mockedPrepareExternalImage.mock.calls.find(([source]) => source.width === 2136)
    expect(fullCall?.[0].width).toBe(2136)
    expect(fullCall?.[1]).toBeInstanceOf(AbortSignal)

    await act(async () => fullImage.resolve({ status: 'ready', image: {} as HTMLImageElement }))
    await waitFor(() => expect(readyWidth(result.current.entries, 42)).toBe(2136))
  })

  it('keeps an in-flight neighbor preview alive when that neighbor becomes current', async () => {
    const neighborPreview = deferred<{ status: 'ready'; image: HTMLImageElement }>()
    mockedDescribe.mockImplementation((_context, page) => externalDescriptor(page))
    mockedPrepareMedia.mockImplementation(async (page, purpose) => {
      if (page.kind !== 'external-image') throw new Error('Expected external descriptor')
      return { kind: 'external-image', source: purpose === 'full' ? page.full : page.preview }
    })
    mockedPrepareExternalImage.mockImplementation((source) => source.assetUrl === '/pages/43-1280.webp'
      ? neighborPreview.promise
      : Promise.resolve({ status: 'ready', image: {} as HTMLImageElement }))
    const pageSession = session()
    const { rerender, result } = renderHook(({ page }) => useMushafPageWindow({ enabled: true, page, session: pageSession }), {
      initialProps: { page: 42 },
    })
    await waitFor(() => expect(mockedPrepareExternalImage.mock.calls.some(([source]) => source.assetUrl === '/pages/43-1280.webp')).toBe(true))
    const previewSignal = mockedPrepareExternalImage.mock.calls.find(([source]) => source.assetUrl === '/pages/43-1280.webp')?.[1]

    rerender({ page: 43 })
    expect(previewSignal?.aborted).toBe(false)
    expect(mockedPrepareMedia.mock.calls.filter(([page, purpose]) => page.resolved.page === 43 && purpose === 'readable')).toHaveLength(1)

    await act(async () => neighborPreview.resolve({ status: 'ready', image: {} as HTMLImageElement }))
    await waitFor(() => expect(readyWidth(result.current.entries, 43)).toBe(2136))
    expect(mockedPrepareMedia.mock.calls.filter(([page, purpose]) => page.resolved.page === 43 && purpose === 'full')).toHaveLength(1)
  })

  it('retains a readable V2 preview when full promotion exhausts transient retries', async () => {
    vi.useFakeTimers()
    mockedDescribe.mockImplementation((_context, page) => externalDescriptor(page))
    mockedPrepareMedia.mockImplementation(async (page, purpose) => {
      if (page.kind !== 'external-image') throw new Error('Expected external descriptor')
      return { kind: 'external-image', source: purpose === 'full' ? page.full : page.preview }
    })
    mockedPrepareExternalImage.mockImplementation(async (source) => source.width === 2136
      ? { status: 'error', error: new Error('decode failed') }
      : { status: 'ready', image: {} as HTMLImageElement })
    const pageSession = session()
    const { result } = renderHook(() => useMushafPageWindow({ enabled: true, page: 42, session: pageSession }))
    await act(async () => undefined)
    expect(readyWidth(result.current.entries, 42)).toBe(1280)

    await act(async () => vi.advanceTimersByTimeAsync(150))
    await act(async () => vi.advanceTimersByTimeAsync(500))
    const current = result.current.entries.find((entry) => entry.page === 42)
    expect(current).toMatchObject({ rendition: 'preview', status: 'ready', upgradeStatus: 'failed' })
    expect(readyWidth(result.current.entries, 42)).toBe(1280)
    expect(mockedPrepareExternalImage.mock.calls.filter(([source]) => source.width === 2136)).toHaveLength(3)
  })

  it('uses exactly three attempts for transient readable failure and commits without a terminal state', async () => {
    vi.useFakeTimers()
    let attempts = 0
    mockedPrepareMedia.mockImplementation(async (page) => {
      if (page.kind !== 'inline-svg') throw new Error('Expected inline descriptor')
      if (page.resolved.page === 42 && ++attempts < 3) throw new TypeError('network unavailable')
      return inlineMedia(page)
    })
    const pageSession = session()
    const { result } = renderHook(() => useMushafPageWindow({ enabled: true, page: 42, session: pageSession }))
    await act(async () => undefined)
    await act(async () => vi.advanceTimersByTimeAsync(150))
    await act(async () => vi.advanceTimersByTimeAsync(500))

    expect(attempts).toBe(3)
    expect(result.current.entries.find((entry) => entry.page === 42)?.status).toBe('ready')
  })

  it.each([
    ['404', new MushafAssetHttpError('/page.svg', 404), 'confirmed-missing'],
    ['contract error', new Error('Unsafe SVG contract'), 'contract-error'],
  ] as const)('does not retry a %s readable failure', async (_label, failure, status) => {
    let attempts = 0
    mockedPrepareMedia.mockImplementation(async (page) => {
      if (page.resolved.page === 42) {
        attempts += 1
        throw failure
      }
      if (page.kind !== 'inline-svg') throw new Error('Expected inline descriptor')
      return inlineMedia(page)
    })
    const pageSession = session()
    const { result } = renderHook(() => useMushafPageWindow({ enabled: true, page: 42, session: pageSession }))

    await waitFor(() => expect(result.current.entries.find((entry) => entry.page === 42)?.status).toBe(status))
    expect(attempts).toBe(1)
  })

  it('starts a fresh attempt-zero cycle only after explicit retry of a terminal page', async () => {
    let attempts = 0
    mockedPrepareMedia.mockImplementation(async (page) => {
      if (page.kind !== 'inline-svg') throw new Error('Expected inline descriptor')
      if (page.resolved.page === 42 && attempts++ === 0) throw new Error('Unsafe SVG contract')
      return inlineMedia(page)
    })
    const pageSession = session()
    const { result } = renderHook(() => useMushafPageWindow({ enabled: true, page: 42, session: pageSession }))
    await waitFor(() => expect(result.current.entries.find((entry) => entry.page === 42)?.status).toBe('contract-error'))

    act(() => result.current.retry(42))

    await waitFor(() => expect(result.current.entries.find((entry) => entry.page === 42)?.status).toBe('ready'))
    expect(attempts).toBe(2)
  })

  it('rejects a stale retry timer and stale full completion after their pages leave the window', async () => {
    vi.useFakeTimers()
    const staleFull = deferred<{ status: 'ready'; image: HTMLImageElement }>()
    mockedDescribe.mockImplementation((_context, page) => page === 42 ? externalDescriptor(page) : descriptor(page))
    mockedPrepareMedia.mockImplementation(async (page, purpose) => {
      if (page.resolved.page === 41) throw new TypeError('temporary network failure')
      if (page.kind === 'external-image') return { kind: 'external-image', source: purpose === 'full' ? page.full : page.preview }
      return inlineMedia(page)
    })
    mockedPrepareExternalImage.mockImplementation((source) => source.width === 2136
      ? staleFull.promise
      : Promise.resolve({ status: 'ready', image: {} as HTMLImageElement }))
    const pageSession = session()
    const { rerender, result } = renderHook(({ page }) => useMushafPageWindow({ enabled: true, page, session: pageSession }), {
      initialProps: { page: 42 },
    })
    await act(async () => undefined)

    rerender({ page: 50 })
    await act(async () => vi.advanceTimersByTimeAsync(650))
    await act(async () => staleFull.resolve({ status: 'ready', image: {} as HTMLImageElement }))

    expect(result.current.entries.map((entry) => entry.page)).toEqual([48, 49, 50, 51, 52])
    expect(result.current.entries.some((entry) => entry.page === 41 || entry.page === 42)).toBe(false)
  })

  it('rejects a stale full completion after a newer profile generation is ready', async () => {
    const staleFull = deferred<{ status: 'ready'; image: HTMLImageElement }>()
    mockedDescribe.mockImplementation((context, page) => externalDescriptor(page, context.mushafEditionId))
    mockedPrepareMedia.mockImplementation(async (page, purpose) => {
      if (page.kind !== 'external-image') throw new Error('Expected external descriptor')
      return { kind: 'external-image', source: purpose === 'full' ? page.full : page.preview }
    })
    mockedPrepareExternalImage.mockImplementation((source) => source.assetUrl === '/pages/42-2136.webp'
      ? staleFull.promise
      : Promise.resolve({ status: 'ready', image: {} as HTMLImageElement }))
    const originalSession = session()
    const replacementSession = session(contextFor('replacement-edition'))
    const { rerender, result } = renderHook(({ activeSession }) => useMushafPageWindow({
      enabled: true,
      page: 42,
      session: activeSession,
    }), { initialProps: { activeSession: originalSession } })
    await waitFor(() => expect(readyWidth(result.current.entries, 42)).toBe(1280))

    rerender({ activeSession: replacementSession })
    await waitFor(() => expect(result.current.entries.find((entry) => entry.page === 42)?.status).toBe('ready'))
    expect(result.current.entries.find((entry) => entry.page === 42)).toMatchObject({
      asset: { resolved: { mushafEditionId: 'replacement-edition' } },
    })

    await act(async () => staleFull.resolve({ status: 'ready', image: {} as HTMLImageElement }))
    expect(result.current.entries.find((entry) => entry.page === 42)).toMatchObject({
      asset: { resolved: { mushafEditionId: 'replacement-edition' } },
    })
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

  it('automatically retries a transient page preparation', async () => {
    let page44Attempts = 0
    mockedPrepareMedia.mockImplementation(async (page) => {
      if (page.kind !== 'inline-svg') throw new Error('Expected inline descriptor')
      if (page.resolved.page === 44) {
        page44Attempts += 1
        if (page44Attempts === 1) throw new TypeError('network')
      }
      return inlineMedia(page)
    })
    const pageSession = session()
    const { result } = renderHook(() => useMushafPageWindow({ enabled: true, page: 43, session: pageSession }))

    await waitFor(() => expect(result.current.entries.find((entry) => entry.page === 44)?.status).toBe('ready'))
    expect(result.current.requested?.status).toBe('ready')
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

function readyWidth(entries: ReturnType<typeof useMushafPageWindow>['entries'], page: number): number | null {
  const entry = entries.find((candidate) => candidate.page === page)
  if (entry?.status !== 'ready' || entry.asset.media.kind !== 'external-image') return null
  return entry.asset.media.source.width
}
