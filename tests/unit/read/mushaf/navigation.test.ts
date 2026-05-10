import { describe, expect, it } from 'vitest'
import {
  clampMushafPage,
  firstVerseForPage,
  pageFromAyahRecord,
  pageHref,
  parseMushafPageParam,
  verseHref,
} from '../../../../src/read/mushaf/navigation'
import type { MushafManifest } from '../../../../src/read/mushaf/types'

const manifest: MushafManifest = {
  version: 1,
  riwayah: 'qaloon',
  sourceSlug: 'qalun',
  pageCount: 2,
  attribution: {
    provider: 'quran.ws',
    sourceUrl: 'https://pdf.quran.ws/',
  },
  verseToPage: {
    '1:1': 1,
    '2:255': 2,
  },
  pages: [
    {
      page: 1,
      assetPath: 'pages/001.svg',
      bytes: 1000,
      sourcePdfUrl: 'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-1.pdf',
      firstVerse: { surah: 1, verse: 1 },
    },
    {
      page: 2,
      assetPath: 'pages/002.svg',
      bytes: 1200,
      sourcePdfUrl: 'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-2.pdf',
      firstVerse: { surah: 2, verse: 255 },
    },
  ],
}

describe('mushaf navigation helpers', () => {
  it('parses positive integer page params only', () => {
    expect(parseMushafPageParam('42')).toBe(42)
    expect(parseMushafPageParam('001')).toBe(1)
    expect(parseMushafPageParam(42)).toBe(42)
    expect(parseMushafPageParam(0)).toBeNull()
    expect(parseMushafPageParam('0')).toBeNull()
    expect(parseMushafPageParam('-1')).toBeNull()
    expect(parseMushafPageParam('2.5')).toBeNull()
    expect(parseMushafPageParam(2.5)).toBeNull()
    expect(parseMushafPageParam('abc')).toBeNull()
    expect(parseMushafPageParam(null)).toBeNull()
  })

  it('clamps pages to manifest boundaries and rejects invalid page counts', () => {
    expect(clampMushafPage(0, 604)).toBe(1)
    expect(clampMushafPage(42, 604)).toBe(42)
    expect(clampMushafPage(999, 604)).toBe(604)
    expect(() => clampMushafPage(1, 0)).toThrow(/Invalid Mushaf page count/)
    expect(() => clampMushafPage(1, 1.5)).toThrow(/Invalid Mushaf page count/)
  })

  it('builds stable route hrefs', () => {
    expect(pageHref(42)).toBe('#/m/42')
    expect(verseHref({ surah: 2, verse: 255 })).toBe('#/s/2/255')
  })

  it('reads page numbers from ayah metadata', () => {
    expect(pageFromAyahRecord({ page: '42' })).toBe(42)
    expect(pageFromAyahRecord({ page: 43 })).toBe(43)
    expect(pageFromAyahRecord({ page: '85-86' })).toBe(85)
    expect(pageFromAyahRecord({ page: '' })).toBeNull()
    expect(pageFromAyahRecord({ page: 'x' })).toBeNull()
    expect(pageFromAyahRecord({ page: null })).toBeNull()
  })

  it('resolves first verse references from manifest pages as a defensive copy', () => {
    const ref = firstVerseForPage(manifest, 2)
    expect(ref).toEqual({ surah: 2, verse: 255 })
    expect(ref).not.toBe(manifest.pages[1]?.firstVerse)
    expect(() => firstVerseForPage(manifest, 604)).toThrow(/manifest has no page 604/i)
  })
})
