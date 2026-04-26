import { describe, it, expect } from 'vitest'
import { formatSurahMeta, formatArabicSurahName, shouldRenderBasmala } from '../../../src/reader/render-helpers.ts'
import { settings } from '../../../src/state/settings.svelte.ts'
import type { SurahMeta } from '../../../src/data/dataset.ts'

const meta = (n: number, name: string, name_ar: string, hafs: number, warsh = hafs, qaloon = hafs): SurahMeta => ({
  n, name, name_ar,
  counts: { hafs, warsh, qaloon },
})

describe('reader/render-helpers', () => {
  describe('formatSurahMeta', () => {
    it('returns SURAH N · COUNT VERSES (no surah name segment)', () => {
      settings.riwayah = 'hafs'
      expect(formatSurahMeta(meta(2, 'Al-Baqarah', 'البقرة', 286))).toBe('SURAH 2 · 286 VERSES')
    })

    it('uses active riwayah verse count', () => {
      settings.riwayah = 'qaloon'
      expect(formatSurahMeta(meta(2, 'Al-Baqarah', 'البقرة', 286, 286, 287))).toBe('SURAH 2 · 287 VERSES')
    })

    it('does NOT include the surah English name (Arabic title now carries it)', () => {
      settings.riwayah = 'hafs'
      const m = meta(1, 'Al-Fatihah', 'الفاتحة', 7)
      expect(formatSurahMeta(m)).not.toContain('AL-FATIHAH')
      expect(formatSurahMeta(m)).toBe('SURAH 1 · 7 VERSES')
    })
  })

  describe('formatArabicSurahName', () => {
    it('returns the Arabic name', () => {
      expect(formatArabicSurahName({ name_ar: 'البقرة' } as SurahMeta)).toBe('البقرة')
    })
    it('returns empty string when missing', () => {
      expect(formatArabicSurahName({} as SurahMeta)).toBe('')
    })
  })

  describe('shouldRenderBasmala', () => {
    it('false for surah 1 + 9, true otherwise', () => {
      expect(shouldRenderBasmala(1)).toBe(false)
      expect(shouldRenderBasmala(9)).toBe(false)
      expect(shouldRenderBasmala(2)).toBe(true)
      expect(shouldRenderBasmala(114)).toBe(true)
    })
  })
})
