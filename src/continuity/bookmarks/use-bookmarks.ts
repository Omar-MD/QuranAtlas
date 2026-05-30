import { useCallback, useEffect, useMemo, useState } from 'react'

import { openReactDb } from '../../storage/db'
import type { BookmarkKind, BookmarkRecord, Riwayah } from '../../storage/types'
import { deleteBookmark, listBookmarks, toggleBookmark as toggleStoredBookmark, type BookmarkIdentity } from './store'
import { subscribeBookmarkChanges } from './sync'

const DEFAULT_RIWAYAH: Riwayah = 'qaloon'

function isRiwayah(value: unknown): value is Riwayah {
  return value === 'hafs' || value === 'warsh' || value === 'qaloon'
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([])
  const [riwayah, setRiwayah] = useState<Riwayah>(DEFAULT_RIWAYAH)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const reload = useCallback(async (active = true) => {
    const db = await openReactDb()
    const setting = await db.settings.get('riwayah')
    const nextRiwayah = isRiwayah(setting?.value) ? setting.value : DEFAULT_RIWAYAH
    const rows = await listBookmarks(db, nextRiwayah)
    if (!active) return
    setRiwayah(nextRiwayah)
    setBookmarks(rows)
    setStatus('ready')
  }, [])

  useEffect(() => {
    let active = true
    setStatus('loading')
    void reload(active).catch(() => {
      if (active) setStatus('error')
    })
    const unsubscribe = subscribeBookmarkChanges(() => {
      void reload(active).catch(() => {
        if (active) setStatus('error')
      })
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [reload])

  const bookmarkedVerseKeys = useMemo(() => new Set(bookmarks.map((bookmark) => bookmark.verseKey)), [bookmarks])

  return {
    bookmarkedVerseKeys,
    bookmarks,
    deleteBookmark: async (bookmark: BookmarkIdentity) => {
      const db = await openReactDb()
      await deleteBookmark(db, bookmark)
      setBookmarks((current) => current.filter((row) => row.riwayah !== bookmark.riwayah || row.verseKey !== bookmark.verseKey))
    },
    riwayah,
    status,
    toggleBookmark: async (bookmark: { kind?: BookmarkKind; page?: number; riwayah?: Riwayah; surah: number; verseKey: string }) => {
      const db = await openReactDb()
      await toggleStoredBookmark(db, {
        kind: bookmark.kind,
        page: bookmark.page,
        riwayah: bookmark.riwayah ?? riwayah,
        surah: bookmark.surah,
        verseKey: bookmark.verseKey,
      })
      await reload()
    },
  }
}
