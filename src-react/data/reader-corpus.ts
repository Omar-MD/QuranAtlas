import { assertRuntimeDatasetUrl } from './runtime-boundary'
import type { Riwayah } from '../storage/types'

export type ReaderVerse = {
  key: string
  surah: number
  verse: number
  arabic: string
  translation?: string
}

const FALLBACK_VERSES: Record<number, ReaderVerse[]> = {
  1: [
    { key: '1:1', surah: 1, verse: 1, arabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', translation: 'In the Name of Allah, the Most Compassionate, the Most Merciful.' },
    { key: '1:2', surah: 1, verse: 2, arabic: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', translation: 'All praise is for Allah, Lord of all worlds.' },
  ],
  2: [
    { key: '2:255', surah: 2, verse: 255, arabic: 'آية', translation: 'Verse text unavailable in the React preview.' },
  ],
}

export async function loadReaderSurah(
  surah: number,
  options: { riwayah?: Riwayah; quranTextStyleId?: string; fetcher?: typeof fetch } = {},
): Promise<ReaderVerse[]> {
  const fetcher = options.fetcher ?? fetch
  const riwayah = options.riwayah ?? 'qaloon'
  const quranTextStyleId = options.quranTextStyleId ?? 'uthmani'
  const padded = String(surah).padStart(3, '0')
  try {
    const url = `/dataset/quran-text/${riwayah}/${quranTextStyleId}/${padded}.json`
    assertRuntimeDatasetUrl(url)
    const response = await fetcher(url)
    if (!response.ok) throw new Error('reader text unavailable')
    const payload = await response.json() as { verses?: Array<{ key?: string; ayah?: number; verse?: number; text?: string; arabic?: string }> }
    const verses = payload.verses ?? []
    return verses.map((verse, index) => {
      const verseNo = verse.verse ?? verse.ayah ?? index + 1
      return {
        key: verse.key ?? `${surah}:${verseNo}`,
        surah,
        verse: verseNo,
        arabic: verse.arabic ?? verse.text ?? '',
      }
    })
  } catch {
    return FALLBACK_VERSES[surah] ?? [{ key: `${surah}:1`, surah, verse: 1, arabic: 'آية', translation: 'Verse text unavailable in the React preview.' }]
  }
}
