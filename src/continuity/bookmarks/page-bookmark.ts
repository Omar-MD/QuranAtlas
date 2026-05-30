import type { BookmarkKind } from '../../storage/types'

const MUSHAF_PAGE_BOOKMARK_PREFIX = 'm:'

export function createMushafPageBookmarkKey(page: number): string {
  return `${MUSHAF_PAGE_BOOKMARK_PREFIX}${page}`
}

export function parseMushafPageBookmarkKey(verseKey: string): number | null {
  const match = /^m:(\d+)$/.exec(verseKey)
  if (!match) return null
  const page = Number(match[1])
  return Number.isInteger(page) && page > 0 ? page : null
}

export function isMushafPageBookmark(bookmark: { kind?: BookmarkKind; page?: number; verseKey: string }): boolean {
  return bookmark.kind === 'page' || parseMushafPageBookmarkKey(bookmark.verseKey) !== null
}

export function pageNumberForBookmark(bookmark: { page?: number; verseKey: string }): number | null {
  if (Number.isInteger(bookmark.page) && (bookmark.page ?? 0) > 0) return bookmark.page as number
  return parseMushafPageBookmarkKey(bookmark.verseKey)
}
