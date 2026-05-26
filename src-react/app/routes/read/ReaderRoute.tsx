import { useEffect, useState } from 'react'

import { loadReaderSurah, type ReaderVerse } from '../../../data/reader-corpus'
import { loadKnowledgeForSurah } from '../../../metadata/knowledge'
import type { VerseMetadata } from '../../../metadata/metadata-state'
import { ReaderPageShell } from '../../../components/reader/ReaderPageShell'
import { VirtualVerseList } from '../../../components/reader/VirtualVerseList'
import { DailyWirdCard } from '../../../components/reader/wird/DailyWirdCard'

export function ReaderRoute({ ayah, surah }: { ayah?: number; surah: number }) {
  const [verses, setVerses] = useState<ReaderVerse[]>([])
  const [metadata, setMetadata] = useState<Map<string, VerseMetadata>>(new Map())

  useEffect(() => {
    let active = true
    void loadReaderSurah(surah).then((loaded) => {
      if (active) setVerses(loaded)
    })
    void loadKnowledgeForSurah(surah).then((result) => {
      if (active) setMetadata(result.rows)
    })
    return () => {
      active = false
    }
  }, [surah])

  const focusedVerses = ayah ? verses.filter((verse) => verse.verse >= ayah) : verses

  return (
    <ReaderPageShell label={`Surah ${surah}`} mode="verse">
      <section className="qar:grid qar:gap-4 qar:px-5 qar:py-5">
        <DailyWirdCard counts={[{ n: 1, count: 7 }, { n: 2, count: 286 }]} plan={null} />
      </section>
      <VirtualVerseList metadata={metadata} verses={focusedVerses.length > 0 ? focusedVerses : verses} />
    </ReaderPageShell>
  )
}
