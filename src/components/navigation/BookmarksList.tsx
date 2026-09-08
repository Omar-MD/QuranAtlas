import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { X } from 'lucide-react'

import { isMushafPageBookmark, pageNumberForBookmark } from '../../continuity/bookmarks/page-bookmark'
import type { Riwayah } from '../../storage/types'
import { pulseBookmarkLandingWhenRouteReady } from '../../continuity/bookmarks/pulse'
import { Badge, IconButton, ListRow, Status } from '../ui'

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
  const groupedBookmarks = useMemo(() => groupBookmarks(bookmarks), [bookmarks])
  const listRef = useRef<HTMLElement>(null)
  const pendingFocusIndexRef = useRef<number | null>(null)
  useEffect(() => {
    let active = true
    void loadBookmarkMeta(bookmarks).then((nextMeta) => {
      if (active) setMeta(nextMeta)
    })
    return () => {
      active = false
    }
  }, [bookmarks])

  // After a delete re-render lands, restore focus to the next remaining row's
  // delete control, else the previous one, else the persistent list container.
  // biome-ignore lint/correctness/useExhaustiveDependencies: bookmarks is the re-render trigger that consumes the pending focus index
  useEffect(() => {
    const index = pendingFocusIndexRef.current
    if (index == null) return
    pendingFocusIndexRef.current = null
    const deletes = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('.qar-react-nav-row-delete') ?? [])
    const target = deletes[Math.min(index, deletes.length - 1)]
    if (target) target.focus()
    else listRef.current?.focus()
  }, [bookmarks])

  function handleDelete(
    bookmark: Pick<BookmarkListItem, 'riwayah' | 'verseKey'>,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    const buttons = Array.from(listRef.current?.querySelectorAll('.qar-react-nav-row-delete') ?? [])
    pendingFocusIndexRef.current = buttons.indexOf(event.currentTarget)
    onDeleteBookmark?.(bookmark)
  }

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

  return (
    <section
      className="qar-react-bookmarks-list"
      aria-label="Bookmarks"
      data-bookmarks-list=""
      ref={listRef}
      tabIndex={-1}
    >
      {bookmarks.length === 0 ? (
        <Status
          className="qar:mx-3.5 qar:my-3.5"
          data-bookmarks-empty=""
          description="Tap a verse number in the reader to bookmark it."
          title="No bookmarks"
          tone="info"
        />
      ) : (
        groupedBookmarks.map(([surah, list]) => (
          <div className="qar-react-bookmarks-section" data-surah={surah} key={surah}>
            <div className="qar-react-bookmarks-section-hdr">
              <span className="qar-react-bookmarks-section-name">{sectionName(surah, list, meta)}</span>
              <Badge tone="neutral">
                <span className="qar:sr-only">{`${list.length} bookmarks`}</span>
                <span aria-hidden="true">{list.length}</span>
              </Badge>
            </div>
            <ul className="qar-react-bookmarks-rows">
              {list.map((bookmark) => {
                const pageBookmark = isMushafPageBookmark(bookmark)
                const snippet = meta.snippets.get(bookmark.verseKey) ?? ''
                return (
                  <li key={`${bookmark.riwayah}:${bookmark.verseKey}`}>
                    <ListRow
                      action={
                        <>
                          <span aria-hidden="true" className="qar-react-list-row-chevron">
                            ›
                          </span>
                          <IconButton
                            className="qar-react-nav-row-delete"
                            label={bookmarkDeleteLabel(bookmark)}
                            onClick={(event) =>
                              handleDelete({ riwayah: bookmark.riwayah, verseKey: bookmark.verseKey }, event)
                            }
                          >
                            <X aria-hidden="true" size={16} />
                          </IconButton>
                        </>
                      }
                      arabic={pageBookmark ? undefined : <span lang="ar">{snippet}</span>}
                      data-bookmark-kind={pageBookmark ? 'page' : 'verse'}
                      data-verse-key={bookmark.verseKey}
                      meta={pageBookmark ? 'Mushaf page bookmark' : undefined}
                      num={bookmarkDisplayRef(bookmark)}
                      onSelect={() => jumpToBookmark(bookmark)}
                      title={
                        <>
                          {bookmarkRowTitle(bookmark.surah, meta)}
                          {pageBookmark ? (
                            <Badge className="qar:ml-2" tone="neutral">
                              Page
                            </Badge>
                          ) : null}
                        </>
                      }
                    />
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}
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
          if (typeof ayah?.aya_text === 'string') meta.snippets.set(row.verseKey, ayah.aya_text)
        }
      } catch {
        // Missing snippets do not block jump/delete behavior.
      }
    }),
  )
}

function verseNumber(verseKey: string): number {
  const parsed = Number.parseInt(verseKey.split(':')[1] ?? '', 10)
  return Number.isInteger(parsed) ? parsed : 0
}

function sectionName(surah: number, rows: BookmarkListItem[], meta: BookmarkMeta): string {
  if (rows.every(isMushafPageBookmark)) return 'Mushaf pages'
  return meta.surahNames.get(surah) ?? `Surah ${surah}`
}

function bookmarkRowTitle(surah: number, meta: BookmarkMeta): string {
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

function bookmarkDeleteLabel(bookmark: BookmarkListItem): string {
  const page = pageNumberForBookmark(bookmark)
  return isMushafPageBookmark(bookmark) && page
    ? `Delete bookmark Mushaf page ${page}`
    : `Delete bookmark ${bookmark.verseKey}`
}
