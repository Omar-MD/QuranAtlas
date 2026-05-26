import type { ReaderVerse } from '../../data/reader-corpus'
import type { VerseMetadata } from '../../metadata/metadata-state'
import { VerseBlock } from './VerseBlock'

export function VirtualVerseList({
  metadata = new Map(),
  onSelectVerse,
  selectedVerseKey = null,
  translationVisible = true,
  verses,
}: {
  metadata?: Map<string, VerseMetadata>
  onSelectVerse?: (verseKey: string) => void
  selectedVerseKey?: string | null
  translationVisible?: boolean
  verses: ReaderVerse[]
}) {
  return (
    <div className="qar:grid qar:overflow-visible">
      {verses.map((verse, index) => (
        <VerseBlock
          arabic={verse.arabic}
          divided={index > 0}
          footnotes={verse.footnotes}
          key={verse.key}
          metadata={metadata.get(verse.key)}
          onSelect={() => onSelectVerse?.(verse.key)}
          selected={selectedVerseKey === verse.key}
          translation={verse.translation}
          translationRole={verse.translationRole}
          translationVisible={translationVisible}
          verse={verse.verse}
          verseKey={verse.key}
        />
      ))}
    </div>
  )
}
