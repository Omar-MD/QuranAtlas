import type { VerseMetadata } from './metadata-state'

export type ContextSearchEntry = {
  id: string
  lane: 'context'
  sourceRef: `${number}:${number}`
  text: string
}

export function metadataToSearchEntries(rows: Iterable<VerseMetadata>): ContextSearchEntry[] {
  return [...rows].flatMap((row) => {
    const [surah, verse] = row.verseKey.split(':').map(Number)
    const text = [row.themes.map((theme) => theme.label).join(' '), row.passageSummary].filter(Boolean).join(' ')
    return text
      ? [{
          id: `context:${row.verseKey}`,
          lane: 'context' as const,
          sourceRef: `${surah}:${verse}` as const,
          text,
        }]
      : []
  })
}
