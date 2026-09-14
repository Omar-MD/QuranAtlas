import type { ReaderVerse } from '../../data/reader-corpus'
import type { VerseMetadata } from '../../metadata/metadata-state'
import { VerseBlock } from './VerseBlock'

export type VirtualVerseListProps = {
  bookmarkedVerseKeys?: ReadonlySet<string>
  metadata?: Map<string, VerseMetadata>
  /** The numbering explainer's open range, if any — feeds each passage
      eyebrow's live aria-expanded state (S2 a11y). */
  openPassageRange?: { from: number; to: number } | null
  onSelectVerse?: (verseKey: string) => void
  onToggleBookmark?: (verseKey: string) => void
  onCopyReference?: () => void
  onOpenPassageExplainer?: (range: { from: number; to: number }) => void
  selectedVerseKey?: string | null
  surahName: string
  translationVisible?: boolean
  verses: ReaderVerse[]
}

type VerseUnit =
  | { kind: 'single'; verse: ReaderVerse }
  | { continuationVerses: ReaderVerse[]; kind: 'passage'; primary: ReaderVerse; range: { from: number; to: number } }

// Passage groups (S2): a translation that covers several verses renders as one
// bracketed group — the primary verse followed by its continuation verses.
function groupVerses(verses: ReaderVerse[]): VerseUnit[] {
  const units: VerseUnit[] = []
  let index = 0
  while (index < verses.length) {
    const verse = verses[index]
    if (verse.translationRole === 'primary') {
      const continuationVerses: ReaderVerse[] = []
      let cursor = index + 1
      while (cursor < verses.length && verses[cursor]?.translationRole === 'continuation') {
        const continuation = verses[cursor]
        if (!continuation) break
        continuationVerses.push(continuation)
        cursor += 1
      }
      if (continuationVerses.length > 0 && verse.verse != null) {
        const last = continuationVerses[continuationVerses.length - 1]
        units.push({
          continuationVerses,
          kind: 'passage',
          primary: verse,
          range: { from: verse.verse, to: last?.verse ?? verse.verse },
        })
        index = cursor
        continue
      }
    }
    units.push({ kind: 'single', verse })
    index += 1
  }
  return units
}

export function VirtualVerseList({
  bookmarkedVerseKeys = new Set<string>(),
  metadata = new Map(),
  openPassageRange = null,
  onCopyReference,
  onOpenPassageExplainer,
  onSelectVerse,
  onToggleBookmark,
  selectedVerseKey = null,
  surahName,
  translationVisible = true,
  verses,
}: VirtualVerseListProps) {
  const units = groupVerses(verses)
  return (
    <div className="qar:grid qar:overflow-visible">
      {units.map((unit) => {
        const primary = unit.kind === 'passage' ? unit.primary : unit.verse
        const passageRange = unit.kind === 'passage' ? unit.range : null
        return (
          <VerseBlock
            bookmarked={bookmarkedVerseKeys.has(primary.key)}
            continuationVerses={unit.kind === 'passage' ? unit.continuationVerses : undefined}
            key={primary.key}
            metadata={metadata.get(primary.key)}
            onCopyReference={onCopyReference}
            onOpenPassageExplainer={onOpenPassageExplainer}
            onSelect={() => onSelectVerse?.(primary.key)}
            onToggleBookmark={() => onToggleBookmark?.(primary.key)}
            passageExplainerOpen={Boolean(
              passageRange && openPassageRange?.from === passageRange.from && openPassageRange.to === passageRange.to,
            )}
            passageRange={passageRange}
            selected={selectedVerseKey === primary.key}
            surahName={surahName}
            translationVisible={translationVisible}
            verse={primary}
          />
        )
      })}
    </div>
  )
}
