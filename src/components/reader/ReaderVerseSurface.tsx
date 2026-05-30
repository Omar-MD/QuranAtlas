import type { ReaderCorpusState } from '../../data/reader-corpus'
import { findAdjacentSurah, type ReaderSurahIndexEntry } from '../../data/surah-index'
import type { VerseMetadata } from '../../metadata/metadata-state'
import { SurahContinuityButton } from './SurahContinuityButton'
import { VirtualVerseList } from './VirtualVerseList'

export type ReaderVerseSurfaceProps = {
  bookmarkedVerseKeys?: ReadonlySet<string>
  corpus: ReaderCorpusState
  metadata?: Map<string, VerseMetadata>
  onSelectVerse?: (verseKey: string) => void
  onToggleBookmark?: (verseKey: string) => void
  selectedVerseKey?: string | null
  showVerseBookmarkHint?: boolean
  surahHeaderHidden?: boolean
  surahIndex?: ReaderSurahIndexEntry[]
}

function shouldRenderBasmala(corpus: Extract<ReaderCorpusState, { status: 'ready' }>): boolean {
  if (corpus.surah.number === 9) return false
  if (corpus.surah.number === 1) return true
  return true
}

export function ReaderVerseSurface({
  bookmarkedVerseKeys = new Set<string>(),
  corpus,
  metadata = new Map(),
  onSelectVerse,
  onToggleBookmark,
  selectedVerseKey = null,
  showVerseBookmarkHint = false,
  surahHeaderHidden = false,
  surahIndex = [],
}: ReaderVerseSurfaceProps) {
  if (corpus.status === 'loading' || corpus.status === 'idle') {
    return <section className="qar:px-5 qar:py-8 qar:text-muted" aria-live="polite">Loading reader text...</section>
  }

  if (corpus.status === 'aborted') {
    return <section className="qar:px-5 qar:py-8 qar:text-muted" aria-live="polite">Reader request was cancelled.</section>
  }

  if (corpus.status === 'unavailable') {
    return (
      <section className="qar:grid qar:gap-2 qar:px-5 qar:py-8" aria-live="polite">
        <h1 className="qar:m-0 qar:text-lg">Reader text unavailable</h1>
        <p className="qar:m-0 qar:text-sm qar:text-muted">{corpus.reason}</p>
      </section>
    )
  }

  if (corpus.status === 'error') {
    return (
      <section className="qar:grid qar:gap-2 qar:px-5 qar:py-8" aria-live="assertive">
        <h1 className="qar:m-0 qar:text-lg">Failed to load reader text</h1>
        <p className="qar:m-0 qar:text-sm qar:text-muted">{corpus.error.message}</p>
      </section>
    )
  }

  if (corpus.status !== 'ready') return null
  const readyCorpus = corpus
  const previousSurah = findAdjacentSurah(surahIndex, readyCorpus.surah.number, 'previous')
  const nextSurah = findAdjacentSurah(surahIndex, readyCorpus.surah.number, 'next')
  const startsAtSurahBeginning = readyCorpus.verses[0]?.verse === 1

  return (
    <section className="qar-reader-verse-surface" data-reader-verse-surface="true">
      {startsAtSurahBeginning && previousSurah && (
        <SurahContinuityButton currentSurah={readyCorpus.surah.number} direction="previous" target={previousSurah} />
      )}
      {startsAtSurahBeginning && !surahHeaderHidden && (
        <header
          aria-label={`Surah ${readyCorpus.surah.number} header`}
          className="qar-reader-surah-header"
          data-surah-header="true"
        >
          <div className="qar-reader-surah-meta-col">
            <p className="qar-reader-surah-meta">
              Surah {readyCorpus.surah.number} · {readyCorpus.surah.verseCount} verses
            </p>
            <p className="qar:m-0 qar:text-sm qar:text-muted">{readyCorpus.surah.nameEnglish}</p>
          </div>
          <h1 className="qar-reader-surah-name" dir="rtl" lang="ar">
            <span className="qar-reader-surah-ornament" aria-hidden="true">﴿</span>
            {readyCorpus.surah.nameArabic}
            <span className="qar-reader-surah-ornament" aria-hidden="true">﴾</span>
          </h1>
        </header>
      )}
      {startsAtSurahBeginning && shouldRenderBasmala(readyCorpus) && (
        <section className="qar-reader-basmala" aria-label="Basmala">
          <span className="qar-reader-basmala-text" dir="rtl" lang="ar" aria-label="بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ" role="img">﷽</span>
          <p className="qar-reader-basmala-translation">In the Name of Allah - the Most Compassionate, Most Merciful</p>
        </section>
      )}
      <VirtualVerseList
        bookmarkedVerseKeys={bookmarkedVerseKeys}
        metadata={metadata}
        onSelectVerse={onSelectVerse}
        onToggleBookmark={onToggleBookmark}
        selectedVerseKey={selectedVerseKey}
        showVerseBookmarkHint={showVerseBookmarkHint}
        translationVisible={readyCorpus.translationVisible}
        verses={readyCorpus.verses}
      />
      {nextSurah && (
        <SurahContinuityButton currentSurah={readyCorpus.surah.number} direction="next" target={nextSurah} />
      )}
    </section>
  )
}
