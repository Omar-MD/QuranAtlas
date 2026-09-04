import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type TouchEvent } from 'react'

import { isMushafPageBookmark, pageNumberForBookmark } from '../../continuity/bookmarks/page-bookmark'
import type { Riwayah } from '../../storage/types'
import { pulseBookmarkLandingWhenRouteReady } from '../../continuity/bookmarks/pulse'
import { cn } from '../../design-system/utils/cn'
import { Button } from '../ui'

export type BookmarkListItem = {
  arabicSnippet?: string
  createdAt?: number
  kind?: 'verse' | 'page'
  page?: number
  riwayah: Riwayah
  surah: number
  surahName?: string
  verseKey: string
}

type BookmarkMeta = {
  snippets: Map<string, string>
  surahNames: Map<number, string>
}

type TouchStart = { key: string; t: number; x: number; y: number }
type SwipePoint = { x: number; y: number }

const EMPTY_BOOKMARKS: BookmarkListItem[] = []
const REVEAL_PX = 76
const SNAP_THRESHOLD_PX = 38
const VELOCITY_SNAP = 0.45
const AXIS_LOCK_PX = 8
const SUPPRESS_CLICK_MS = 600
const SNIPPET_CHARS = 50

export function BookmarksList({
  bookmarks = EMPTY_BOOKMARKS,
  onDeleteBookmark,
  onNavigate,
}: {
  bookmarks?: BookmarkListItem[]
  onDeleteBookmark?: (bookmark: Pick<BookmarkListItem, 'riwayah' | 'verseKey'>) => void
  onNavigate?: (hash: string) => void
}) {
  const [meta, setMeta] = useState<BookmarkMeta>(() => bookmarkMetaFromRows(bookmarks))
  const [openSwipeKey, setOpenSwipeKey] = useState<string | null>(null)
  const [activeSwipe, setActiveSwipe] = useState<{ dx: number; key: string } | null>(null)
  const touchStartRef = useRef<TouchStart | null>(null)
  const activeSwipeDxRef = useRef(0)
  const scrollAxisRef = useRef<'horizontal' | 'vertical' | null>(null)
  const suppressClickRef = useRef<{ at: number; key: string } | null>(null)
  const groupedBookmarks = useMemo(() => groupBookmarks(bookmarks), [bookmarks])

  useEffect(() => {
    let active = true
    void loadBookmarkMeta(bookmarks).then((nextMeta) => {
      if (active) setMeta(nextMeta)
    })
    return () => {
      active = false
    }
  }, [bookmarks])

  function jumpToBookmark(bookmark: BookmarkListItem) {
    const page = pageNumberForBookmark(bookmark)
    if (isMushafPageBookmark(bookmark) && page) {
      onNavigate?.(`#/m/${page}`)
      return
    }
    const verse = bookmark.verseKey.split(':')[1]
    const targetHash = `#/s/${bookmark.surah}/${verse}`
    onNavigate?.(targetHash)
    pulseBookmarkLandingWhenRouteReady(bookmark.verseKey, targetHash)
  }

  function handleRowClick(bookmark: BookmarkListItem) {
    const suppressed = suppressClickRef.current
    if (suppressed?.key === bookmark.verseKey && Date.now() - suppressed.at < SUPPRESS_CLICK_MS) {
      suppressClickRef.current = null
      return
    }
    if (openSwipeKey === bookmark.verseKey) {
      setOpenSwipeKey(null)
      return
    }
    jumpToBookmark(bookmark)
  }

  function rowBaseDx(key: string): number {
    return openSwipeKey === key ? -REVEAL_PX : 0
  }

  function beginSwipe(point: SwipePoint, key: string): void {
    if (openSwipeKey && openSwipeKey !== key) setOpenSwipeKey(null)
    const restingDx = rowBaseDx(key)
    touchStartRef.current = { key, t: performance.now(), x: point.x, y: point.y }
    activeSwipeDxRef.current = restingDx
    scrollAxisRef.current = null
    setActiveSwipe({ dx: restingDx, key })
  }

  function moveSwipe(point: SwipePoint, key: string): 'horizontal' | 'vertical' | null {
    const touchStart = touchStartRef.current
    if (!touchStart || touchStart.key !== key) return null
    const dx = point.x - touchStart.x
    const dy = point.y - touchStart.y
    const nextAxis = scrollAxisRef.current ?? ((Math.abs(dx) > AXIS_LOCK_PX || Math.abs(dy) > AXIS_LOCK_PX)
      ? Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
      : null)

    if (nextAxis !== scrollAxisRef.current) {
      scrollAxisRef.current = nextAxis
    }
    if (nextAxis !== 'horizontal') return nextAxis

    const nextDx = rowBaseDx(key) + dx
    const clampedDx = Math.max(-REVEAL_PX * 1.18, Math.min(0, nextDx))
    activeSwipeDxRef.current = clampedDx
    setActiveSwipe({ dx: clampedDx, key })
    return nextAxis
  }

  function endSwipe(point: SwipePoint | null, key: string): 'horizontal' | 'vertical' | null {
    const touchStart = touchStartRef.current
    if (!touchStart || touchStart.key !== key) {
      touchStartRef.current = null
      setActiveSwipe(null)
      scrollAxisRef.current = null
      activeSwipeDxRef.current = 0
      return null
    }

    const wasHorizontal = scrollAxisRef.current === 'horizontal'
    if (wasHorizontal) {
      suppressClickRef.current = { at: Date.now(), key }
    }
    if (point && wasHorizontal) {
      const dx = point.x - touchStart.x
      const dt = Math.max(1, performance.now() - touchStart.t)
      const velocity = -dx / dt
      const activeDx = activeSwipeDxRef.current
      if (activeDx <= -SNAP_THRESHOLD_PX || velocity > VELOCITY_SNAP) {
        setOpenSwipeKey(key)
      } else {
        setOpenSwipeKey(null)
      }
    }
    touchStartRef.current = null
    setActiveSwipe(null)
    scrollAxisRef.current = null
    activeSwipeDxRef.current = 0
    return wasHorizontal ? 'horizontal' : scrollAxisRef.current
  }

  function onTouchStart(event: TouchEvent<HTMLButtonElement>, key: string): void {
    const touch = event.touches[0]
    if (!touch) return
    beginSwipe({ x: touch.clientX, y: touch.clientY }, key)
  }

  function onTouchMove(event: TouchEvent<HTMLButtonElement>, key: string): void {
    const touch = event.touches[0]
    if (!touch) return
    if (moveSwipe({ x: touch.clientX, y: touch.clientY }, key) === 'horizontal') {
      event.stopPropagation()
    }
  }

  function onTouchEnd(event: TouchEvent<HTMLButtonElement>, key: string): void {
    const touch = event.changedTouches[0]
    if (endSwipe(touch ? { x: touch.clientX, y: touch.clientY } : null, key) === 'horizontal') {
      event.stopPropagation()
    }
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, key: string): void {
    if (event.pointerType === 'touch') return
    if (event.button !== 0) return
    beginSwipe({ x: event.clientX, y: event.clientY }, key)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>, key: string): void {
    if (event.pointerType === 'touch') return
    if (moveSwipe({ x: event.clientX, y: event.clientY }, key) === 'horizontal') {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>, key: string): void {
    if (event.pointerType === 'touch') return
    if (endSwipe({ x: event.clientX, y: event.clientY }, key) === 'horizontal') {
      event.preventDefault()
      event.stopPropagation()
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  function rowStyle(key: string): CSSProperties | undefined {
    if (activeSwipe?.key !== key) return undefined
    return { transform: `translateX(${activeSwipe.dx}px)`, transition: 'none' }
  }

  function deleteStyle(key: string): CSSProperties | undefined {
    if (activeSwipe?.key !== key) return undefined
    return { opacity: Math.min(1, Math.abs(activeSwipe.dx) / REVEAL_PX), transition: 'none' }
  }

  if (bookmarks.length === 0) {
    return (
      <div className="qar-react-bookmarks-empty" data-bookmarks-empty="">
        Tap a verse number in the reader to bookmark it.
      </div>
    )
  }
  return (
    <div className="qar-react-bookmarks-list" aria-label="Bookmarks" data-bookmarks-list="">
      {groupedBookmarks.map(([surah, list]) => (
        <div className="qar-react-bookmarks-section" data-surah={surah} key={surah}>
          <div className="qar-react-bookmarks-section-hdr">
            <span className="qar-react-bookmarks-section-name">{sectionName(surah, list, meta)}</span>
            <span className="qar-react-bookmarks-section-count" aria-label={`${list.length} bookmarks`}>{list.length}</span>
          </div>
          <ul className="qar-react-bookmarks-rows">
            {list.map((bookmark) => {
              const pageBookmark = isMushafPageBookmark(bookmark)
              const displayRef = bookmarkDisplayRef(bookmark)
              const preview = pageBookmark ? 'Mushaf page bookmark' : (meta.snippets.get(bookmark.verseKey) ?? '')
              return (
                <li
                  className={cn('qar-react-bookmarks-row', openSwipeKey === bookmark.verseKey && 'qar-react-bookmarks-row--swiped')}
                  data-bookmark-kind={pageBookmark ? 'page' : 'verse'}
                  data-verse-key={bookmark.verseKey}
                  key={`${bookmark.riwayah}:${bookmark.verseKey}`}
                >
                  <Button
                    aria-label={bookmarkJumpLabel(bookmark)}
                    className="qar-react-bookmarks-row-btn"
                    onClick={() => handleRowClick(bookmark)}
                    onPointerDown={(event) => onPointerDown(event, bookmark.verseKey)}
                    onPointerMove={(event) => onPointerMove(event, bookmark.verseKey)}
                    onPointerUp={(event) => onPointerUp(event, bookmark.verseKey)}
                    onTouchEnd={(event) => onTouchEnd(event, bookmark.verseKey)}
                    onTouchMove={(event) => onTouchMove(event, bookmark.verseKey)}
                    onTouchStart={(event) => onTouchStart(event, bookmark.verseKey)}
                    style={rowStyle(bookmark.verseKey)}
                    type="button"
                    unstyled
                  >
                    <span className="qar-react-bookmarks-row-ref">
                      <span>{displayRef}</span>
                      {pageBookmark ? <span className="qar-react-bookmarks-row-kind">Page</span> : null}
                    </span>
                    <span
                      className={cn('qar-react-bookmarks-row-ar', pageBookmark && 'qar-react-bookmarks-row-ar--page')}
                      data-riwayah={bookmark.riwayah}
                      dir={pageBookmark ? 'ltr' : 'rtl'}
                      lang={pageBookmark ? undefined : 'ar'}
                    >
                      {preview}
                    </span>
                    <span className="qar-react-bookmarks-row-chev" aria-hidden="true">›</span>
                  </Button>
                  <Button
                    aria-label={bookmarkDeleteLabel(bookmark)}
                    className="qar-react-bookmarks-row-del"
                    onClick={() => {
                      setOpenSwipeKey(null)
                      onDeleteBookmark?.({ riwayah: bookmark.riwayah, verseKey: bookmark.verseKey })
                    }}
                    style={deleteStyle(bookmark.verseKey)}
                    type="button"
                    unstyled
                  >
                    Delete
                  </Button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function groupBookmarks(bookmarks: BookmarkListItem[]): Array<[number, BookmarkListItem[]]> {
  const grouped = new Map<number, BookmarkListItem[]>()
  for (const bookmark of bookmarks) {
    const list = grouped.get(bookmark.surah) ?? []
    list.push(bookmark)
    grouped.set(bookmark.surah, list)
  }
  return Array.from(grouped.entries())
    .sort(([a, aRows], [b, bRows]) => groupSortKey(a, aRows) - groupSortKey(b, bRows))
    .map(([surah, rows]) => [
      surah,
      [...rows].sort(compareBookmarkRows),
    ])
}

function bookmarkMetaFromRows(bookmarks: BookmarkListItem[]): BookmarkMeta {
  return {
    snippets: new Map(bookmarks.flatMap((bookmark) => bookmark.arabicSnippet ? [[bookmark.verseKey, bookmark.arabicSnippet]] : [])),
    surahNames: new Map(bookmarks.flatMap((bookmark) => bookmark.surahName ? [[bookmark.surah, bookmark.surahName]] : [])),
  }
}

async function loadBookmarkMeta(bookmarks: BookmarkListItem[]): Promise<BookmarkMeta> {
  const meta = bookmarkMetaFromRows(bookmarks)
  if (bookmarks.length === 0) return meta
  if (bookmarks.every((bookmark) => meta.surahNames.has(bookmark.surah) && meta.snippets.has(bookmark.verseKey))) return meta
  if (typeof fetch === 'undefined') return meta

  await loadSurahNames(meta, bookmarks)
  await loadSnippets(meta, bookmarks)
  return meta
}

async function loadSurahNames(meta: BookmarkMeta, bookmarks: BookmarkListItem[]): Promise<void> {
  const verseBookmarks = bookmarks.filter((bookmark) => !isMushafPageBookmark(bookmark))
  if (verseBookmarks.every((bookmark) => meta.surahNames.has(bookmark.surah))) return
  try {
    const response = await fetch('/dataset/surahs.json')
    if (!response.ok) return
    const rows = await response.json() as Array<{ n?: number; name?: string }>
    for (const row of rows) {
      if (Number.isInteger(row.n) && typeof row.name === 'string') meta.surahNames.set(row.n as number, row.name)
    }
  } catch {
    // Bookmark rows remain navigable without snippets or localized names.
  }
}

async function loadSnippets(meta: BookmarkMeta, bookmarks: BookmarkListItem[]): Promise<void> {
  const missingBySurah = new Map<number, BookmarkListItem[]>()
  for (const bookmark of bookmarks) {
    if (isMushafPageBookmark(bookmark)) continue
    if (meta.snippets.has(bookmark.verseKey)) continue
    const rows = missingBySurah.get(bookmark.surah) ?? []
    rows.push(bookmark)
    missingBySurah.set(bookmark.surah, rows)
  }

  await Promise.all(Array.from(missingBySurah.entries()).map(async ([surah, rows]) => {
    try {
      const padded = String(surah).padStart(3, '0')
      const response = await fetch(`/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/${padded}.json`)
      if (!response.ok) return
      const payload = await response.json() as { ayat?: Array<{ aya_no?: number; aya_text?: string }> }
      for (const row of rows) {
        const verse = verseNumber(row.verseKey)
        const ayah = payload.ayat?.find((candidate) => candidate.aya_no === verse)
        if (typeof ayah?.aya_text === 'string') meta.snippets.set(row.verseKey, truncateArabic(ayah.aya_text))
      }
    } catch {
      // Missing snippets do not block jump/delete behavior.
    }
  }))
}

function truncateArabic(text: string): string {
  if (text.length <= SNIPPET_CHARS) return text
  return `${text.slice(0, SNIPPET_CHARS).trimEnd()}…`
}

function verseNumber(verseKey: string): number {
  const parsed = Number.parseInt(verseKey.split(':')[1] ?? '', 10)
  return Number.isInteger(parsed) ? parsed : 0
}

function sectionName(surah: number, rows: BookmarkListItem[], meta: BookmarkMeta): string {
  if (rows.every(isMushafPageBookmark)) return 'Mushaf pages'
  return meta.surahNames.get(surah) ?? `Surah ${surah}`
}

function groupSortKey(surah: number, rows: BookmarkListItem[]): number {
  return rows.every(isMushafPageBookmark) ? 1000 : surah
}

function compareBookmarkRows(a: BookmarkListItem, b: BookmarkListItem): number {
  const aPage = isMushafPageBookmark(a)
  const bPage = isMushafPageBookmark(b)
  if (aPage || bPage) {
    if (aPage && bPage) return (pageNumberForBookmark(a) ?? 0) - (pageNumberForBookmark(b) ?? 0)
    return aPage ? 1 : -1
  }
  return verseNumber(a.verseKey) - verseNumber(b.verseKey)
}

function bookmarkDisplayRef(bookmark: BookmarkListItem): string {
  const page = pageNumberForBookmark(bookmark)
  return isMushafPageBookmark(bookmark) && page ? `Page ${page}` : bookmark.verseKey
}

function bookmarkJumpLabel(bookmark: BookmarkListItem): string {
  const page = pageNumberForBookmark(bookmark)
  return isMushafPageBookmark(bookmark) && page ? `Jump to Mushaf page ${page}` : `Jump to verse ${bookmark.verseKey}`
}

function bookmarkDeleteLabel(bookmark: BookmarkListItem): string {
  const page = pageNumberForBookmark(bookmark)
  return isMushafPageBookmark(bookmark) && page ? `Delete bookmark Mushaf page ${page}` : `Delete bookmark ${bookmark.verseKey}`
}
