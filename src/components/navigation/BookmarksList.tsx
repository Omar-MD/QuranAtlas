import { useEffect, useMemo, useState } from 'react'

import { isMushafPageBookmark, pageNumberForBookmark } from '../../continuity/bookmarks/page-bookmark'
import type { Riwayah } from '../../storage/types'
import { pulseBookmarkLandingWhenRouteReady } from '../../continuity/bookmarks/pulse'
import { cn } from '../../design-system/utils/cn'
import { Button, Status } from '../ui'
import { useSwipeToDelete } from './use-swipe-to-delete'

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

const EMPTY_BOOKMARKS: BookmarkListItem[] = []
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
  const swipe = useSwipeToDelete()
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
    swipe.handleClick(bookmark.verseKey, () => jumpToBookmark(bookmark))
  }

  if (bookmarks.length === 0) {
    return (
      <Status
        data-bookmarks-empty=""
        description="Tap a verse number in the reader to bookmark it."
        title="No bookmarks"
        tone="info"
      />
    )
  }
  return (
    <section className="qar-react-bookmarks-list" aria-label="Bookmarks" data-bookmarks-list="">
      {groupedBookmarks.map(([surah, list]) => (
        <div className="qar-react-bookmarks-section" data-surah={surah} key={surah}>
          <div className="qar-react-bookmarks-section-hdr">
            <span className="qar-react-bookmarks-section-name">{sectionName(surah, list, meta)}</span>
            <span className="qar-react-bookmarks-section-count">
              <span className="qar:sr-only">{`${list.length} bookmarks`}</span>
              <span aria-hidden="true">{list.length}</span>
            </span>
          </div>
          <ul className="qar-react-bookmarks-rows">
            {list.map((bookmark) => {
              const pageBookmark = isMushafPageBookmark(bookmark)
              const displayRef = bookmarkDisplayRef(bookmark)
              const preview = pageBookmark ? 'Mushaf page bookmark' : (meta.snippets.get(bookmark.verseKey) ?? '')
              return (
                <li
                  className={cn(
                    'qar-react-bookmarks-row',
                    swipe.isOpen(bookmark.verseKey) && 'qar-react-bookmarks-row--swiped',
                  )}
                  data-bookmark-kind={pageBookmark ? 'page' : 'verse'}
                  data-verse-key={bookmark.verseKey}
                  key={`${bookmark.riwayah}:${bookmark.verseKey}`}
                >
                  <Button
                    aria-label={bookmarkJumpLabel(bookmark)}
                    className="qar-react-bookmarks-row-btn"
                    onClick={() => handleRowClick(bookmark)}
                    onPointerDown={(event) => swipe.pointerDown(event, bookmark.verseKey)}
                    onPointerMove={(event) => swipe.pointerMove(event, bookmark.verseKey)}
                    onPointerUp={(event) => swipe.pointerUp(event, bookmark.verseKey)}
                    onTouchEnd={(event) => swipe.touchEnd(event, bookmark.verseKey)}
                    onTouchMove={(event) => swipe.touchMove(event, bookmark.verseKey)}
                    onTouchStart={(event) => swipe.touchStart(event, bookmark.verseKey)}
                    style={swipe.rowStyle(bookmark.verseKey)}
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
                    <span className="qar-react-bookmarks-row-chev" aria-hidden="true">
                      ›
                    </span>
                  </Button>
                  <Button
                    aria-label={bookmarkDeleteLabel(bookmark)}
                    className="qar-react-bookmarks-row-del"
                    onClick={() => {
                      swipe.closeSwipe()
                      onDeleteBookmark?.({ riwayah: bookmark.riwayah, verseKey: bookmark.verseKey })
                    }}
                    style={swipe.deleteStyle(bookmark.verseKey)}
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
    </section>
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
    .map(([surah, rows]) => [surah, [...rows].sort(compareBookmarkRows)])
}

function bookmarkMetaFromRows(bookmarks: BookmarkListItem[]): BookmarkMeta {
  return {
    snippets: new Map(
      bookmarks.flatMap((bookmark) => (bookmark.arabicSnippet ? [[bookmark.verseKey, bookmark.arabicSnippet]] : [])),
    ),
    surahNames: new Map(
      bookmarks.flatMap((bookmark) => (bookmark.surahName ? [[bookmark.surah, bookmark.surahName]] : [])),
    ),
  }
}

async function loadBookmarkMeta(bookmarks: BookmarkListItem[]): Promise<BookmarkMeta> {
  const meta = bookmarkMetaFromRows(bookmarks)
  if (bookmarks.length === 0) return meta
  if (bookmarks.every((bookmark) => meta.surahNames.has(bookmark.surah) && meta.snippets.has(bookmark.verseKey)))
    return meta
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
    const rows = (await response.json()) as Array<{ n?: number; name?: string }>
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

  await Promise.all(
    Array.from(missingBySurah.entries()).map(async ([surah, rows]) => {
      try {
        const padded = String(surah).padStart(3, '0')
        const response = await fetch(`/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/${padded}.json`)
        if (!response.ok) return
        const payload = (await response.json()) as { ayat?: Array<{ aya_no?: number; aya_text?: string }> }
        for (const row of rows) {
          const verse = verseNumber(row.verseKey)
          const ayah = payload.ayat?.find((candidate) => candidate.aya_no === verse)
          if (typeof ayah?.aya_text === 'string') meta.snippets.set(row.verseKey, truncateArabic(ayah.aya_text))
        }
      } catch {
        // Missing snippets do not block jump/delete behavior.
      }
    }),
  )
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
  return isMushafPageBookmark(bookmark) && page
    ? `Delete bookmark Mushaf page ${page}`
    : `Delete bookmark ${bookmark.verseKey}`
}
