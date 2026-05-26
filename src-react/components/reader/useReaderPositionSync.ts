import { useCallback, useEffect } from 'react'

import { writeCurrentPosition } from '../../continuity/current-position'
import type { ReaderCorpusState } from '../../data/reader-corpus'
import { openReactDb } from '../../storage/db'

async function persistPosition(surah: number, verse: number): Promise<void> {
  const db = await openReactDb()
  await writeCurrentPosition(db, { surah, verse })
}

export function useReaderPositionSync(corpus: ReaderCorpusState) {
  useEffect(() => {
    if (corpus.status !== 'ready') return
    const firstVerse = corpus.verses[0]
    if (!firstVerse) return
    void persistPosition(firstVerse.surah, firstVerse.verse)
  }, [corpus])

  return useCallback((verseKey: string) => {
    const [surahPart, versePart] = verseKey.split(':')
    const surah = Number.parseInt(surahPart ?? '', 10)
    const verse = Number.parseInt(versePart ?? '', 10)
    if (!Number.isInteger(surah) || !Number.isInteger(verse)) return
    void persistPosition(surah, verse)
  }, [])
}
