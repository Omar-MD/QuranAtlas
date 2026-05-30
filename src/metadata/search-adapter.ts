import type { SearchEntry } from '../search/schema'
import type { VerseMetadata } from './metadata-state'

export function metadataToSearchEntries(rows: Iterable<VerseMetadata>): SearchEntry[] {
  return [...rows].flatMap((row) => {
    const [surah, verse] = row.verseKey.split(':').map(Number)
    const text = [row.themes.map((theme) => theme.label).join(' '), row.passageSummary].filter(Boolean).join(' ')
    return text
      ? [{
          id: `metadata:${row.verseKey}`,
          lane: 'metadata' as const,
          sourceRiwayah: 'qaloon' as const,
          sourceRef: { surah, verse },
          text,
        }]
      : []
  })
}
