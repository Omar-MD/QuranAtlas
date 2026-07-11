import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMushafPageWindow } from '../../../src/app/routes/read/useMushafPageWindow'
import { loadMushafPageAsset, type MushafReadyPageAssetState } from '../../../src/packs/mushaf-page-asset'

vi.mock('../../../src/packs/mushaf-page-asset', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/packs/mushaf-page-asset')>()
  return { ...actual, loadMushafPageAsset: vi.fn() }
})

const mockedLoadMushafPageAsset = vi.mocked(loadMushafPageAsset)
const primaryProfile = { mushafEditionId: 'qalun-quran-ws-v1', riwayah: 'qaloon' as const }

describe('useMushafPageWindow', () => {
  beforeEach(() => {
    mockedLoadMushafPageAsset.mockReset()
  })

  it('resolves the requested page before loading its neighbors without clearing it', async () => {
    const requested = deferred<MushafReadyPageAssetState>()
    mockedLoadMushafPageAsset.mockImplementation(({ mushafEditionId, page, riwayah }) => {
      if (page === 42) return requested.promise
      return Promise.resolve(readyPage(page, mushafEditionId, riwayah))
    })

    const { result } = renderHook(() => useMushafPageWindow({
      enabled: true,
      page: 42,
      pageCount: 604,
      profile: primaryProfile,
    }))

    await waitFor(() => expect(mockedLoadMushafPageAsset).toHaveBeenCalledTimes(1))
    expect(mockedLoadMushafPageAsset.mock.calls[0]?.[0].page).toBe(42)

    await act(async () => requested.resolve(readyPage(42)))
    await waitFor(() => expect(mockedLoadMushafPageAsset).toHaveBeenCalledTimes(5))

    expect(result.current.requested?.status).toBe('ready')
    expect(result.current.entries.find((entry) => entry.page === 42)?.status).toBe('ready')
    expect(mockedLoadMushafPageAsset.mock.calls.slice(1).map(([input]) => input.page).sort((a, b) => a - b))
      .toEqual([40, 41, 43, 44])
  })

  it('retains the overlapping ready window and requests only the new edge', async () => {
    mockedLoadMushafPageAsset.mockImplementation(async ({ mushafEditionId, page, riwayah }) => (
      readyPage(page, mushafEditionId, riwayah)
    ))
    const { rerender, result } = renderHook(({ page }) => useMushafPageWindow({
      enabled: true,
      page,
      pageCount: 604,
      profile: primaryProfile,
    }), { initialProps: { page: 42 } })

    await waitFor(() => expect(result.current.entries.every((entry) => entry.status === 'ready')).toBe(true))
    expect(mockedLoadMushafPageAsset).toHaveBeenCalledTimes(5)

    rerender({ page: 43 })
    await waitFor(() => expect(result.current.entries.every((entry) => entry.status === 'ready')).toBe(true))

    expect(mockedLoadMushafPageAsset).toHaveBeenCalledTimes(6)
    expect(mockedLoadMushafPageAsset.mock.calls[5]?.[0].page).toBe(45)
    expect(result.current.entries.map((entry) => entry.page)).toEqual([41, 42, 43, 44, 45])
    expect(result.current.entries.slice(0, 4).every((entry) => entry.status === 'ready')).toBe(true)
  })

  it('ignores stale completions from the previous profile', async () => {
    const oldPage = deferred<MushafReadyPageAssetState>()
    mockedLoadMushafPageAsset.mockImplementation(({ mushafEditionId, page, riwayah }) => {
      if (mushafEditionId === primaryProfile.mushafEditionId && page === 44) return oldPage.promise
      return Promise.resolve(readyPage(page, mushafEditionId, riwayah))
    })
    const { rerender, result } = renderHook(({ profile }) => useMushafPageWindow({
      enabled: true,
      page: 44,
      pageCount: 604,
      profile,
    }), { initialProps: { profile: primaryProfile } })

    await waitFor(() => expect(mockedLoadMushafPageAsset).toHaveBeenCalledTimes(1))
    const replacementProfile = { ...primaryProfile, mushafEditionId: 'replacement-edition' }
    rerender({ profile: replacementProfile })
    await waitFor(() => expect(result.current.requested?.status).toBe('ready'))
    expect(readyAsset(result.current.requested).resolved.mushafEditionId).toBe('replacement-edition')

    await act(async () => oldPage.resolve(readyPage(44, primaryProfile.mushafEditionId)))
    expect(readyAsset(result.current.requested).resolved.mushafEditionId).toBe('replacement-edition')
  })

  it('keeps failed pages non-ready and retries them with a new request generation', async () => {
    mockedLoadMushafPageAsset.mockImplementation(async ({ mushafEditionId, page, riwayah }) => {
      if (page === 44 && mockedLoadMushafPageAsset.mock.calls.filter(([input]) => input.page === 44).length === 1) {
        return { error: new Error('network'), status: 'error' }
      }
      return readyPage(page, mushafEditionId, riwayah)
    })
    const { result } = renderHook(() => useMushafPageWindow({
      enabled: true,
      page: 43,
      pageCount: 604,
      profile: primaryProfile,
    }))

    await waitFor(() => expect(result.current.entries.find((entry) => entry.page === 44)?.status).toBe('error'))
    expect(mockedLoadMushafPageAsset.mock.calls.filter(([input]) => input.page === 44)).toHaveLength(1)

    act(() => result.current.retry(44))
    await waitFor(() => expect(result.current.entries.find((entry) => entry.page === 44)?.status).toBe('ready'))
    expect(mockedLoadMushafPageAsset.mock.calls.filter(([input]) => input.page === 44)).toHaveLength(2)
  })
})

function readyPage(
  page: number,
  mushafEditionId = primaryProfile.mushafEditionId,
  riwayah: 'qaloon' = primaryProfile.riwayah,
): MushafReadyPageAssetState {
  return {
    inlineSvg: {
      markup: '<svg viewBox="0 0 120 180" />',
      viewBox: { height: 180, width: 120, x: 0, y: 0 },
      viewBoxText: '0 0 120 180',
    },
    resolved: {
      assetUrl: `/dataset/mushaf-pages/${riwayah}/${mushafEditionId}/pages/${page}.svg`,
      firstVerse: { surah: 2, verse: page },
      mushafEditionId,
      page,
      pageCount: 604,
      riwayah,
      riwayahLabel: 'Qaloon',
      viewBox: { height: 180, width: 120, x: 0, y: 0 },
      viewBoxText: '0 0 120 180',
    },
    status: 'ready',
  }
}

function deferred<T>() {
  let resolvePromise!: (value: T) => void
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve
  })
  return { promise, resolve: resolvePromise }
}

function readyAsset(entry: ReturnType<typeof useMushafPageWindow>['requested']): MushafReadyPageAssetState {
  if (entry?.status !== 'ready') throw new Error('Expected a ready page entry')
  return entry.asset
}
