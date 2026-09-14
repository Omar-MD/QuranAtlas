import { useEffect, useRef, useState } from 'react'
import { Bookmark as BookmarkIcon, Trash2 } from 'lucide-react'

import { isMushafPageBookmark, pageNumberForBookmark } from '../../continuity/bookmarks/page-bookmark'
import { verseNumberOfKey } from '../../continuity/verse-key'
import type { Riwayah } from '../../storage/types'
import { Button, IconButton, ListRow, ListRowActions, Status } from '../ui'

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
  excerpts: Map<string, string>
  surahNames: Map<number, string>
}

const EMPTY_BOOKMARKS: BookmarkListItem[] = []

function formatDate(timestamp?: number): string | null {
  if (!timestamp) return null
  try {
    return new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return null
  }
}

// S7 bookmarks route: one ListRow per bookmark — verse reference eyebrow,
// translation excerpt, saved date — with Open in reader and Remove (immediate,
// with a 5-second undo toast). Fully local: works offline.
export function BookmarksList({
  bookmarks = EMPTY_BOOKMARKS,
  onDeleteBookmark,
  onNavigate,
}: {
  bookmarks?: BookmarkListItem[]
  onDeleteBookmark?: (bookmark: BookmarkListItem) => void
  onNavigate?: (hash: string) => void
}) {
  const pendingRemovalFocus = useRef(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: bookmarks is the re-render trigger that consumes the pending focus request after a removal lands
  useEffect(() => {
    if (!pendingRemovalFocus.current) return
    pendingRemovalFocus.current = false
    document.getElementById('bookmark-undo')?.focus()
  }, [bookmarks])
  const [meta, setMeta] = useState<BookmarkMeta>(() => bookmarkMetaFromRows(bookmarks))
  useEffect(() => {
    let active = true
    void loadBookmarkMeta(bookmarks).then((nextMeta) => {
      if (active) setMeta(nextMeta)
    })
    return () => {
      active = false
    }
  }, [bookmarks])

  if (bookmarks.length === 0) {
    return (
      <div className="qar-empty-state" data-bookmarks-empty="true">
        <span aria-hidden="true" className="qar-ornament-rule-star">
          ۞
        </span>
        <p className="qar:m-0 qar:text-base qar:font-semibold">No bookmarks yet</p>
        <p className="qar:m-0 qar:text-sm qar:text-muted">Tap the bookmark icon on any verse to save it here.</p>
        <Button onClick={() => onNavigate?.('#/s/1')} variant="secondary">
          Start reading
        </Button>
      </div>
    )
  }

  const ordered = orderBookmarks(bookmarks)
  return (
    <ul aria-label="Bookmarks" className="qar:grid qar:m-0 qar:list-none qar:p-0" data-bookmarks-list="">
      {ordered.map((bookmark) => {
        const pageBookmark = isMushafPageBookmark(bookmark)
        const page = pageNumberForBookmark(bookmark)
        const reference =
          pageBookmark && page
            ? `Mushaf page ${page}`
            : `${meta.surahNames.get(bookmark.surah) ?? `Surah ${bookmark.surah}`} ${bookmark.verseKey}`
        const excerpt = meta.excerpts.get(bookmark.verseKey)
        const date = formatDate(bookmark.createdAt)
        const openHash =
          pageBookmark && page ? `#/m/${page}` : `#/s/${bookmark.surah}/${verseNumberOfKey(bookmark.verseKey)}`
        return (
          <li key={`${bookmark.riwayah}:${bookmark.verseKey}`}>
            <ListRow
              action={
                <ListRowActions>
                  <Button onClick={() => onNavigate?.(openHash)} size="sm" variant="secondary">
                    Open in reader
                  </Button>
                  <IconButton
                    className="qar-react-nav-row-delete"
                    label={
                      pageBookmark && page
                        ? `Remove bookmark from Mushaf page ${page}`
                        : `Remove bookmark from ${meta.surahNames.get(bookmark.surah) ?? `Surah ${bookmark.surah}`} ${bookmark.verseKey}`
                    }
                    onClick={() => {
                      pendingRemovalFocus.current = true
                      onDeleteBookmark?.(bookmark)
                    }}
                  >
                    <Trash2 aria-hidden="true" size={16} strokeWidth={1.8} />
                  </IconButton>
                </ListRowActions>
              }
              arabic={pageBookmark ? undefined : <span lang="ar">{bookmark.arabicSnippet ?? ''}</span>}
              data-bookmark-kind={pageBookmark ? 'page' : 'verse'}
              data-verse-key={bookmark.verseKey}
              meta={
                <>
                  {date ? <span>{date}</span> : null}
                  {!pageBookmark && excerpt ? <span>{excerpt}</span> : null}
                </>
              }
              num={<BookmarkIcon aria-hidden="true" size={16} strokeWidth={1.8} />}
              title={<span className="qar-bookmark-row-ref">{reference}</span>}
            />
          </li>
        )
      })}
    </ul>
  )
}

export function BookmarkUndoToast({ onUndo }: { onUndo: () => void }) {
  return (
    <Status
      action={
        <Button id="bookmark-undo" onClick={onUndo} size="sm" variant="secondary">
          Undo
        </Button>
      }
      aria-live="polite"
      data-bookmark-undo-toast="true"
      title="Bookmark removed — Undo"
      tone="info"
    />
  )
}

function orderBookmarks(bookmarks: BookmarkListItem[]): BookmarkListItem[] {
  return [...bookmarks].sort(compareBookmarkRows)
}

function bookmarkMetaFromRows(bookmarks: BookmarkListItem[]): BookmarkMeta {
  return {
    excerpts: new Map(),
    surahNames: new Map(
      bookmarks.flatMap((bookmark) => (bookmark.surahName ? [[bookmark.surah, bookmark.surahName]] : [])),
    ),
  }
}

async function loadBookmarkMeta(bookmarks: BookmarkListItem[]): Promise<BookmarkMeta> {
  const meta = bookmarkMetaFromRows(bookmarks)
  if (bookmarks.length === 0) return meta
  if (typeof fetch === 'undefined') return meta
  await loadSurahNames(meta, bookmarks)
  await loadExcerpts(meta, bookmarks)
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
      if (Number.isInteger(row.n) && typeof row.name === 'string')
        meta.surahNames.set(row.n as number, row.name as string)
    }
  } catch {
    // Bookmark rows remain navigable without names or excerpts.
  }
}

async function loadExcerpts(meta: BookmarkMeta, bookmarks: BookmarkListItem[]): Promise<void> {
  const missingBySurah = new Map<number, BookmarkListItem[]>()
  for (const bookmark of bookmarks) {
    if (isMushafPageBookmark(bookmark)) continue
    if (meta.excerpts.has(bookmark.verseKey)) continue
    const rows = missingBySurah.get(bookmark.surah) ?? []
    rows.push(bookmark)
    missingBySurah.set(bookmark.surah, rows)
  }

  await Promise.all(
    Array.from(missingBySurah.entries()).map(async ([surah, rows]) => {
      try {
        const { loadReaderSurah } = await import('../../data/reader-corpus')
        for (const riwayah of new Set(rows.map((row) => row.riwayah))) {
          const corpus = await loadReaderSurah(surah, { riwayah })
          if (corpus.status !== 'ready') continue
          for (const row of rows.filter((row) => row.riwayah === riwayah)) {
            const verse = corpus.verses.find((verse) => verse.key === row.verseKey)
            const text =
              verse?.translation ??
              corpus.verses.find(
                (candidate) => candidate.translation && candidate.translationSourceKey === verse?.translationSourceKey,
              )?.translation
            if (text) meta.excerpts.set(row.verseKey, firstLine(text))
          }
        }
      } catch {
        // Missing excerpts do not block jump/delete behavior.
      }
    }),
  )
}

function firstLine(text: string): string {
  const trimmed = text.trim()
  const sentenceEnd = trimmed.search(/[.!?](\s|$)/)
  return sentenceEnd > 0 ? trimmed.slice(0, sentenceEnd + 1) : trimmed.slice(0, 160)
}

function compareBookmarkRows(a: BookmarkListItem, b: BookmarkListItem): number {
  const aPage = isMushafPageBookmark(a)
  const bPage = isMushafPageBookmark(b)
  if (aPage || bPage) {
    if (aPage && bPage) return (pageNumberForBookmark(a) ?? 0) - (pageNumberForBookmark(b) ?? 0)
    return aPage ? 1 : -1
  }
  if (a.surah !== b.surah) return a.surah - b.surah
  return verseNumberOfKey(a.verseKey) - verseNumberOfKey(b.verseKey)
}
