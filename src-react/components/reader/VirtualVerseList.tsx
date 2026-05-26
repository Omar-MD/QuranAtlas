import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

import type { ReaderVerse } from '../../data/reader-corpus'
import type { VerseMetadata } from '../../metadata/metadata-state'
import { VerseBlock } from './VerseBlock'

export function VirtualVerseList({ metadata = new Map(), verses }: { metadata?: Map<string, VerseMetadata>; verses: ReaderVerse[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: verses.length,
    estimateSize: () => 220,
    getScrollElement: () => parentRef.current,
    overscan: 4,
  })
  const virtualItems = virtualizer.getVirtualItems()

  if (verses.length < 40) {
    return (
      <div className="qar:grid">
        {verses.map((verse) => (
          <VerseBlock arabic={verse.arabic} key={verse.key} metadata={metadata.get(verse.key)} translation={verse.translation} verse={verse.verse} verseKey={verse.key} />
        ))}
      </div>
    )
  }

  return (
    <div ref={parentRef} className="qar:max-h-screen qar:overflow-auto" data-virtualized="true">
      <div className="qar:relative qar:w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        <div className="qar:absolute qar:left-0 qar:top-0 qar:w-full" style={{ transform: `translateY(${virtualItems[0]?.start ?? 0}px)` }}>
          {virtualItems.map((item) => {
            const verse = verses[item.index]
            return (
              <div data-index={item.index} key={item.key} ref={virtualizer.measureElement}>
                <VerseBlock arabic={verse.arabic} metadata={metadata.get(verse.key)} translation={verse.translation} verse={verse.verse} verseKey={verse.key} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
