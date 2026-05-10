import type { MushafManifest, QuranRef } from './types'

export const MIN_MUSHAF_PAGE = 1

export function parseMushafPageParam(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && raw >= MIN_MUSHAF_PAGE ? raw : null
  }
  if (typeof raw !== 'string') return null

  const text = raw.trim()
  if (!/^\d+$/.test(text)) return null

  const page = Number.parseInt(text, 10)
  return Number.isInteger(page) && page >= MIN_MUSHAF_PAGE ? page : null
}

export function clampMushafPage(page: number, pageCount: number): number {
  if (!Number.isInteger(pageCount) || pageCount < MIN_MUSHAF_PAGE) {
    throw new Error(`Invalid Mushaf page count: ${pageCount}`)
  }
  if (!Number.isInteger(page)) return MIN_MUSHAF_PAGE
  return Math.min(pageCount, Math.max(MIN_MUSHAF_PAGE, page))
}

export function pageHref(page: number): string {
  return `#/m/${page}`
}

export function verseHref(ref: QuranRef): string {
  return `#/s/${ref.surah}/${ref.verse}`
}

export function pageFromAyahRecord(ayah: { page?: string | number | null }): number | null {
  const raw = ayah.page
  if (raw === null || raw === undefined) return null

  if (typeof raw === 'string') {
    const range = raw.trim().match(/^(\d+)-(\d+)$/)
    if (range) {
      const start = parseMushafPageParam(range[1])
      const end = parseMushafPageParam(range[2])
      return start !== null && end !== null && start <= end ? start : null
    }
  }

  return parseMushafPageParam(raw)
}

export function firstVerseForPage(manifest: MushafManifest, page: number): QuranRef {
  const entry = manifest.pages.find((candidate) => candidate.page === page)
  if (!entry) {
    throw new Error(`Mushaf manifest has no page ${page}`)
  }
  return { surah: entry.firstVerse.surah, verse: entry.firstVerse.verse }
}
