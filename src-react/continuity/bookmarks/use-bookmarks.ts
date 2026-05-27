import { useEffect, useState } from 'react'

import { openReactDb } from '../../storage/db'
import type { BookmarkRecord, Riwayah } from '../../storage/types'
import { deleteBookmark, listBookmarks, type BookmarkIdentity } from './store'

const DEFAULT_RIWAYAH: Riwayah = 'qaloon'

function isRiwayah(value: unknown): value is Riwayah {
  return value === 'hafs' || value === 'warsh' || value === 'qaloon'
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([])
  const [riwayah, setRiwayah] = useState<Riwayah>(DEFAULT_RIWAYAH)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  async function reload(active = true) {
    const db = await openReactDb()
    const setting = await db.settings.get('riwayah')
    const nextRiwayah = isRiwayah(setting?.value) ? setting.value : DEFAULT_RIWAYAH
    const rows = await listBookmarks(db, nextRiwayah)
    if (!active) return
    setRiwayah(nextRiwayah)
    setBookmarks(rows)
    setStatus('ready')
  }

  useEffect(() => {
    let active = true
    setStatus('loading')
    void reload(active).catch(() => {
      if (active) setStatus('error')
    })
    return () => {
      active = false
    }
  }, [])

  return {
    bookmarks,
    deleteBookmark: async (bookmark: BookmarkIdentity) => {
      const db = await openReactDb()
      await deleteBookmark(db, bookmark)
      setBookmarks((current) => current.filter((row) => row.riwayah !== bookmark.riwayah || row.verseKey !== bookmark.verseKey))
    },
    riwayah,
    status,
  }
}
