import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { loadLaunchRouteFromDb, resolveHashWithLaunchState, resolveLaunchRoute, shouldPersistLastSurface } from '../../../src/continuity/launch-restore'
import { BOOKMARKS_TOPIC, broadcastBookmarkChange, createBookmarkSyncMessage } from '../../../src/continuity/bookmarks/sync'
import { deleteBookmark, listBookmarks, toggleBookmark } from '../../../src/continuity/bookmarks/store'
import { useBookmarks } from '../../../src/continuity/bookmarks/use-bookmarks'
import { ensureReactMvpAssetContractReset } from '../../../src/launch/asset-contract-reset'
import { MUSHAF_EDITION_SETUP_VERSION, resolveMushafEditionSetup } from '../../../src/launch/mushaf-edition-setup'
import { closeReactDb, openReactDb } from '../../../src/storage/db'
import { QURAN_ATLAS_DB_NAME } from '../../../src/storage/schema'

const quranWsIndex = { assets: [{ label: 'Qalun Quran.ws', mushafEditionId: 'qalun-quran-ws-v1', pageCount: 604, riwayah: 'qaloon', shipped: true }] }

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } })
}

async function resetReactDb() {
  closeReactDb()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(QURAN_ATLAS_DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
}

describe('React continuity coverage', () => {
  it('ignores legacy onboarding state and restores reader surfaces directly', () => {
    expect(resolveLaunchRoute({ onboardingComplete: false, lastSurface: '#/s/2', currentPosition: { surah: 3, verse: 4 } })).toBe('#/s/2')
  })

  it('uses valid launchable lastSurface before saved position', () => {
    expect(resolveLaunchRoute({ onboardingComplete: true, lastSurface: '#/m/12', currentPosition: { surah: 3, verse: 4 } })).toBe('#/m/12')
  })

  it('excludes operational routes from launch surfaces', () => {
    expect(shouldPersistLastSurface('#/assets')).toBe(false)
    expect(shouldPersistLastSurface('#/settings')).toBe(false)
    expect(shouldPersistLastSurface('#/onboarding')).toBe(false)
    expect(shouldPersistLastSurface('#/search')).toBe(false)
    expect(shouldPersistLastSurface('#/search?q=mercy')).toBe(false)
  })

  it('falls back to currentPosition then Al-Fatihah', () => {
    expect(resolveLaunchRoute({ onboardingComplete: true, lastSurface: '#/assets', currentPosition: { surah: 2, verse: 255 } })).toBe('#/s/2/255')
    expect(resolveLaunchRoute({ onboardingComplete: true })).toBe('#/s/1')
  })

  it('reads launch state from the React settings store', async () => {
    const settings = {
      get: async (key: string) => {
        const records: Record<string, { value: unknown }> = {
          onboardingComplete: { value: true },
          lastSurface: { value: '#/m/8' },
          currentPosition: { value: { surah: 2, verse: 255 } },
        }
        return records[key] ?? undefined
      },
    }

    await expect(loadLaunchRouteFromDb({ settings })).resolves.toBe('#/m/8')
  })

  it('migrates a valid existing profile without clearing its continuity or bookmarks', async () => {
    await resetReactDb()
    const db = await openReactDb()
    await db.settings.bulkPut([
      { key: 'mvpAssetContractId', value: 'mvp-default-assets-qaloon-bridges-v1' },
      { key: 'lastSurface', value: '#/m/42' },
      { key: 'theme', value: 'dark' },
    ])
    await db.bookmarks.put({ createdAt: 1, riwayah: 'qaloon', surah: 2, verseKey: '2:255' })

    try {
      const contract = await ensureReactMvpAssetContractReset()
      const setup = await resolveMushafEditionSetup({
        contractWasValid: contract.hadValidContract,
        fetcher: async () => jsonResponse(quranWsIndex),
      })

      expect(contract).toMatchObject({ hadValidContract: true, resetApplied: false })
      expect(setup).toEqual({ status: 'complete', mushafEditionId: 'qalun-quran-ws-v1' })
      await expect(db.settings.bulkGet(['lastSurface', 'theme', 'mushafEditionId', 'mushafEditionSetupVersion'])).resolves.toEqual([
        { key: 'lastSurface', value: '#/m/42' },
        { key: 'theme', value: 'dark' },
        { key: 'mushafEditionId', value: 'qalun-quran-ws-v1' },
        { key: 'mushafEditionSetupVersion', value: MUSHAF_EDITION_SETUP_VERSION },
      ])
      await expect(db.bookmarks.get(['qaloon', '2:255'])).resolves.toMatchObject({ verseKey: '2:255' })
    } finally {
      await resetReactDb()
    }
  })

  it('requires setup after fresh or incompatible contracts and does not revive missing completed editions', async () => {
    await resetReactDb()
    const db = await openReactDb()
    await db.settings.put({ key: 'mvpAssetContractId', value: 'incompatible-profile' })
    await db.bookmarks.put({ createdAt: 1, riwayah: 'qaloon', surah: 2, verseKey: '2:255' })

    try {
      const reset = await ensureReactMvpAssetContractReset()
      const choose = await resolveMushafEditionSetup({
        contractWasValid: reset.hadValidContract,
        fetcher: async () => jsonResponse(quranWsIndex),
      })
      expect(reset).toMatchObject({ hadValidContract: false, resetApplied: true })
      expect(choose).toEqual({ status: 'choose', editions: [{ id: 'qalun-quran-ws-v1', label: 'Qalun Quran.ws' }] })
      await expect(db.bookmarks.count()).resolves.toBe(0)

      await db.settings.bulkPut([
        { key: 'mushafEditionId', value: 'qalun-furatiyyah-2023-v1' },
        { key: 'mushafEditionSetupVersion', value: MUSHAF_EDITION_SETUP_VERSION },
      ])
      await expect(resolveMushafEditionSetup({
        contractWasValid: true,
        fetcher: async () => jsonResponse(quranWsIndex),
      })).resolves.toEqual({ status: 'missing', mushafEditionId: 'qalun-furatiyyah-2023-v1' })
    } finally {
      await resetReactDb()
    }
  })

  it('preserves a requested Mushaf deep link instead of replacing it with the launch route', async () => {
    const settings = { get: async () => undefined }

    await expect(resolveHashWithLaunchState({ settings }, '#/m/42')).resolves.toBe('#/m/42')
  })

  it('creates bookmark sync messages on the shared topic envelope', () => {
    expect(createBookmarkSyncMessage(['2:255'], 'qaloon')).toEqual({
      payload: { riwayah: 'qaloon', verseKeys: ['2:255'] },
      topic: BOOKMARKS_TOPIC,
    })
  })

  it('refreshes bookmark hooks when a same-device bookmark change is broadcast', async () => {
    await resetReactDb()
    const db = await openReactDb()
    await db.settings.put({ key: 'riwayah', value: 'qaloon' })

    try {
      const { result } = renderHook(() => useBookmarks())
      await waitFor(() => expect(result.current.status).toBe('ready'))
      expect(result.current.bookmarks).toEqual([])

      await db.bookmarks.put({ createdAt: 1, riwayah: 'qaloon', surah: 1, verseKey: '1:1' })
      broadcastBookmarkChange(['1:1'], 'qaloon')

      await waitFor(() => expect(result.current.bookmarks).toEqual([
        { createdAt: 1, riwayah: 'qaloon', surah: 1, verseKey: '1:1' },
      ]))
    } finally {
      await resetReactDb()
    }
  })

  it('refreshes bookmark hooks when a Mushaf page bookmark change is broadcast', async () => {
    await resetReactDb()
    const db = await openReactDb()
    await db.settings.put({ key: 'riwayah', value: 'qaloon' })

    try {
      const { result } = renderHook(() => useBookmarks())
      await waitFor(() => expect(result.current.status).toBe('ready'))

      await db.bookmarks.put({ createdAt: 1, kind: 'page', page: 42, riwayah: 'qaloon', surah: 0, verseKey: 'm:42' })
      broadcastBookmarkChange(['m:42'], 'qaloon')

      await waitFor(() => expect(result.current.bookmarks).toEqual([
        { createdAt: 1, kind: 'page', page: 42, riwayah: 'qaloon', surah: 0, verseKey: 'm:42' },
      ]))
    } finally {
      await resetReactDb()
    }
  })

  it('reads, writes, sorts, and deletes riwayah-scoped shared bookmark records', async () => {
    const records: Array<{ createdAt: number; kind?: 'verse' | 'page'; page?: number; riwayah: string; surah: number; verseKey: string }> = []
    const db = {
      bookmarks: {
        delete: async ([riwayah, verseKey]: [string, string]) => {
          const index = records.findIndex((record) => record.riwayah === riwayah && record.verseKey === verseKey)
          if (index >= 0) records.splice(index, 1)
        },
        get: async ([riwayah, verseKey]: [string, string]) => records.find((record) => record.riwayah === riwayah && record.verseKey === verseKey),
        put: async (record: { createdAt: number; kind?: 'verse' | 'page'; page?: number; riwayah: string; surah: number; verseKey: string }) => {
          records.push(record)
        },
        where: () => ({
          equals: (riwayah: string) => ({
            toArray: async () => records.filter((record) => record.riwayah === riwayah),
          }),
        }),
      },
    }

    await expect(toggleBookmark(db, { createdAt: 3, riwayah: 'qaloon', surah: 2, verseKey: '2:255' })).resolves.toBe('saved')
    await expect(toggleBookmark(db, { createdAt: 1, riwayah: 'warsh', surah: 1, verseKey: '1:1' })).resolves.toBe('saved')
    await expect(toggleBookmark(db, { createdAt: 2, riwayah: 'qaloon', surah: 1, verseKey: '1:1' })).resolves.toBe('saved')
    await expect(toggleBookmark(db, { createdAt: 4, kind: 'page', page: 42, riwayah: 'qaloon', surah: 0, verseKey: 'm:42' })).resolves.toBe('saved')

    await expect(listBookmarks(db, 'qaloon')).resolves.toEqual([
      { createdAt: 2, riwayah: 'qaloon', surah: 1, verseKey: '1:1' },
      { createdAt: 3, riwayah: 'qaloon', surah: 2, verseKey: '2:255' },
      { createdAt: 4, kind: 'page', page: 42, riwayah: 'qaloon', surah: 0, verseKey: 'm:42' },
    ])

    await deleteBookmark(db, { riwayah: 'qaloon', verseKey: '1:1' })
    await expect(listBookmarks(db, 'qaloon')).resolves.toEqual([
      { createdAt: 3, riwayah: 'qaloon', surah: 2, verseKey: '2:255' },
      { createdAt: 4, kind: 'page', page: 42, riwayah: 'qaloon', surah: 0, verseKey: 'm:42' },
    ])

    await deleteBookmark(db, { riwayah: 'qaloon', verseKey: 'm:42' })
    await expect(listBookmarks(db, 'qaloon')).resolves.toEqual([
      { createdAt: 3, riwayah: 'qaloon', surah: 2, verseKey: '2:255' },
    ])
  })
})
