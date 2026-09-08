import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { openReactDb } from '../../storage/db'
import { listNativeBookmarks, readNativeSetting } from '../../storage/native-reader-store'
import type { BookmarkKind, BookmarkRecord, Riwayah } from '../../storage/types'
import { deleteBookmark, toggleBookmark as toggleStoredBookmark, type BookmarkIdentity } from './store'
import { subscribeBookmarkChanges } from './sync'

const DEFAULT_RIWAYAH: Riwayah = 'qaloon'

function isRiwayah(value: unknown): value is Riwayah {
  return value === 'hafs' || value === 'warsh' || value === 'qaloon'
}

export type BookmarksStatus = 'loading' | 'ready' | 'error'

export type BookmarksController = {
  bookmarkedVerseKeys: Set<string>
  bookmarks: BookmarkRecord[]
  deleteBookmark: (bookmark: BookmarkIdentity) => Promise<void>
  riwayah: Riwayah
  retry: () => void
  status: BookmarksStatus
  toggleBookmark: (bookmark: {
    kind?: BookmarkKind
    page?: number
    riwayah?: Riwayah
    surah: number
    verseKey: string
  }) => Promise<void>
}

export function useBookmarks(options: { enabled?: boolean } = {}): BookmarksController {
  const enabled = options.enabled ?? true
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([])
  const [riwayah, setRiwayah] = useState<Riwayah>(DEFAULT_RIWAYAH)
  const [status, setStatus] = useState<BookmarksStatus>('loading')
  const generationRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const reload = useCallback(async (active = true) => {
    const generation = ++generationRef.current
    try {
      const setting = await readNativeSetting('riwayah')
      const nextRiwayah = isRiwayah(setting?.value) ? setting.value : DEFAULT_RIWAYAH
      const rows = await listNativeBookmarks(nextRiwayah)
      if (!active || !mountedRef.current || generation !== generationRef.current) return
      setRiwayah(nextRiwayah)
      setBookmarks(rows)
      setStatus('ready')
    } catch {
      if (!active || !mountedRef.current || generation !== generationRef.current) return
      setStatus('error')
    }
  }, [])

  const retry = useCallback(() => {
    setStatus('loading')
    void reload()
  }, [reload])

  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    setStatus('loading')
    void reload(active)
    const unsubscribe = subscribeBookmarkChanges(() => {
      void reload(active)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [enabled, reload])

  const bookmarkedVerseKeys = useMemo(() => new Set(bookmarks.map((bookmark) => bookmark.verseKey)), [bookmarks])

  return {
    bookmarkedVerseKeys,
    bookmarks,
    deleteBookmark: async (bookmark: BookmarkIdentity) => {
      const db = await openReactDb()
      await deleteBookmark(db, bookmark)
      // The local filtered rows are authoritative post-delete; mark ready so a
      // pending reload invalidated by the generation bump cannot strand status.
      generationRef.current += 1
      setBookmarks((current) =>
        current.filter((row) => row.riwayah !== bookmark.riwayah || row.verseKey !== bookmark.verseKey),
      )
      setStatus('ready')
    },
    riwayah,
    retry,
    status,
    toggleBookmark: async (bookmark: {
      kind?: BookmarkKind
      page?: number
      riwayah?: Riwayah
      surah: number
      verseKey: string
    }) => {
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

const BookmarksContext = createContext<BookmarksController | null>(null)

/**
 * One shared bookmarks controller for every consumer under the provider
 * (route + drawer mount the controller once instead of per consumer, so a
 * route Retry recovers the drawer too). Surfaces without the provider keep
 * their own controller through `useSharedBookmarks`.
 */
export function BookmarksProvider({ children }: { children: ReactNode }) {
  const controller = useBookmarks()
  return createElement(BookmarksContext.Provider, { value: controller }, children)
}

export function useSharedBookmarks(): BookmarksController {
  const shared = useContext(BookmarksContext)
  const fallback = useBookmarks({ enabled: shared == null })
  return shared ?? fallback
}
