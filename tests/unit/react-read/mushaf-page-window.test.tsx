import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMushafPageWindow } from '../../../src/app/routes/read/useMushafPageWindow'
import { useMushafProfileSession } from '../../../src/app/routes/read/useMushafProfileSession'
import {
  describeMushafPage,
  deriveMushafFramingCapability,
  loadMushafPageProfileContext,
  prepareMushafDescriptorMedia,
  type MushafPageProfileContext,
} from '../../../src/packs/mushaf-page-asset'

vi.mock('../../../src/packs/mushaf-page-asset', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/packs/mushaf-page-asset')>()
  return {
    ...actual,
    describeMushafPage: vi.fn(),
    loadMushafPageProfileContext: vi.fn(),
    prepareMushafDescriptorMedia: vi.fn(),
  }
})

const profile = { mushafEditionId: 'qalun-quran-ws-v1', riwayah: 'qaloon' as const }
const mockedDescribe = vi.mocked(describeMushafPage)
const mockedLoadContext = vi.mocked(loadMushafPageProfileContext)
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

describe('Mushaf profile session and page window', () => {
  beforeEach(() => {
    mockedDescribe.mockReset()
    mockedLoadContext.mockReset()
    mockedPrepareMedia.mockReset()
    mockedDescribe.mockImplementation((_context, page) => descriptor(page))
    mockedPrepareMedia.mockImplementation(async (page) => ({
      kind: 'inline-svg',
      inlineSvg: { markup: '<svg/>', viewBox: page.displayViewBox, viewBoxText: '0 0 120 180' },
    }))
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
    const { result } = renderHook(() => useMushafPageWindow({ enabled: true, page: 42, session: session() }))
    await waitFor(() => expect(result.current.entries.filter((entry) => entry.status === 'ready')).toHaveLength(3))
    expect(mockedDescribe).toHaveBeenCalledTimes(5)
    expect(mockedPrepareMedia).toHaveBeenCalledTimes(3)
    expect(result.current.entries.filter((entry) => entry.status === 'descriptor').map((entry) => entry.page)).toEqual([40, 44])
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
