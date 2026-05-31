import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { loadLaunchRouteFromDb, resolveLaunchRoute, shouldPersistLastSurface, useLaunchRestore } from '../../../src/continuity/launch-restore'
import { BOOKMARKS_TOPIC, broadcastBookmarkChange, createBookmarkSyncMessage } from '../../../src/continuity/bookmarks/sync'
import { deleteBookmark, listBookmarks, toggleBookmark } from '../../../src/continuity/bookmarks/store'
import { useBookmarks } from '../../../src/continuity/bookmarks/use-bookmarks'
import { closeReactDb, openReactDb } from '../../../src/storage/db'
import { QURAN_ATLAS_DB_NAME } from '../../../src/storage/schema'

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

  it('keeps resolved reader hashes ready across internal route changes', async () => {
    await resetReactDb()
    const db = await openReactDb()
    await db.settings.put({ key: 'onboardingComplete', value: false })

    try {
      const { result, rerender } = renderHook(({ hash }: { hash: string }) => useLaunchRestore(hash), {
        initialProps: { hash: '#/m/42' },
      })

      expect(result.current.status).toBe('loading')
      await waitFor(() => expect(result.current).toMatchObject({ hash: '#/m/42', sourceHash: '#/m/42', status: 'ready' }))

      await act(async () => {
        rerender({ hash: '#/m/43' })
      })

      await waitFor(() => expect(result.current).toMatchObject({ hash: '#/m/43', sourceHash: '#/m/43', status: 'ready' }))
    } finally {
      await resetReactDb()
    }
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
