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

  it('rejects a stale profile request when the edition identity changes', async () => {
    const first = deferred<MushafPageProfileContext>()
    mockedLoadContext.mockImplementationOnce(() => first.promise).mockResolvedValueOnce(contextFor('replacement-edition'))
    const { rerender, result } = renderHook(({ activeProfile }) => useMushafProfileSession({ enabled: true, profile: activeProfile }), {
      initialProps: { activeProfile: profile },
    })
    await waitFor(() => expect(mockedLoadContext).toHaveBeenCalledOnce())
    const staleSignal = mockedLoadContext.mock.calls[0]?.[0].signal
    rerender({ activeProfile: { ...profile, mushafEditionId: 'replacement-edition' } })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(staleSignal?.aborted).toBe(true)
    await act(async () => first.resolve(contextFor()))
    expect(result.current.status === 'ready' && result.current.context.mushafEditionId).toBe('replacement-edition')
  })

  it('does not abort an active retry while the edition identity is unchanged', async () => {
    const firstRetry = deferred<MushafPageProfileContext>()
    const secondRetry = deferred<MushafPageProfileContext>()
    mockedLoadContext
      .mockRejectedValueOnce(new Error('profile unavailable'))
      .mockImplementationOnce(() => firstRetry.promise)
      .mockImplementationOnce(() => secondRetry.promise)
    const { result } = renderHook(() => useMushafProfileSession({ enabled: true, profile }))
    await waitFor(() => expect(result.current.status).toBe('error'))

    const retry = result.current.retry
    act(() => retry())
    await waitFor(() => expect(mockedLoadContext).toHaveBeenCalledTimes(2))
    const retrySignal = mockedLoadContext.mock.calls[1]?.[0].signal

    act(() => retry())
    await waitFor(() => expect(mockedLoadContext).toHaveBeenCalledTimes(3))
    expect(retrySignal?.aborted).toBe(false)

    await act(async () => {
      firstRetry.resolve(contextFor())
      secondRetry.resolve(contextFor())
    })
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => { resolve = next })
  return { promise, resolve }
}
