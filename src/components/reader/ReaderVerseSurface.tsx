import { useState } from 'react'

import type { ReaderCorpusState } from '../../data/reader-corpus'
import type { VerseMetadata } from '../../metadata/metadata-state'
import { Button, Dialog, Sheet, Status } from '../ui'
import { VirtualVerseList } from './VirtualVerseList'

export type ReaderVerseSurfaceProps = {
  bookmarkedVerseKeys?: ReadonlySet<string>
  corpus: ReaderCorpusState
  metadata?: Map<string, VerseMetadata>
  onRetry?: () => void
  onSelectVerse?: (verseKey: string) => void
  onToggleBookmark?: (verseKey: string) => void
  onCopyReference?: () => void
  selectedVerseKey?: string | null
}

// Numbering explainer (S2/S10): shared copy from the brief §5 deck.
export const NUMBERING_EXPLAINER =
  'This translation renders one passage across several verses. Verse references follow the Hafs counting; the printed Qalūn edition may number these verses differently. Nothing is missing or repeated — the words are the same.'

export function ReaderVerseSurface({
  bookmarkedVerseKeys = new Set<string>(),
  corpus,
  metadata = new Map(),
  onCopyReference,
  onRetry,
  onSelectVerse,
  onToggleBookmark,
  selectedVerseKey = null,
}: ReaderVerseSurfaceProps) {
  const [explainerRange, setExplainerRange] = useState<{ from: number; to: number } | null>(null)
  const isDesktopViewport = () =>
    typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(min-width: 768px)').matches

  if (corpus.status === 'loading' || corpus.status === 'idle') {
    return (
      <section
        aria-label="Loading reader"
        aria-live="polite"
        className="qar-reader-verse-surface"
        data-reader-loading="true"
      >
        {[0, 1, 2].map((group) => (
          <div className="qar-reader-verse-skeleton" key={group}>
            <span className="qar-reader-skeleton-ring" />
            <div>
              <div className="qar-reader-skeleton-bar" style={{ width: '86%' }} />
              <div className="qar-reader-skeleton-bar" style={{ width: '64%' }} />
            </div>
          </div>
        ))}
      </section>
    )
  }

  if (corpus.status === 'aborted') {
    return (
      <div className="qar-reader-column">
        <Status
          aria-live="polite"
          description="Reader request was cancelled."
          title="Reader unavailable"
          tone="warning"
        />
      </div>
    )
  }

  if (corpus.status === 'unavailable') {
    return (
      <div className="qar-reader-column">
        <Status
          action={
            onRetry ? (
              <Button onClick={onRetry} size="sm" variant="secondary">
                Try again
              </Button>
            ) : undefined
          }
          aria-live="polite"
          description={corpus.reason}
          title="Reader text unavailable"
          tone="warning"
        />
      </div>
    )
  }

  if (corpus.status === 'error') {
    return (
      <div className="qar-reader-column">
        <Status
          action={
            onRetry ? (
              <Button onClick={onRetry} size="sm">
                Try again
              </Button>
            ) : undefined
          }
          aria-live="assertive"
          description={corpus.error.message}
          title="Failed to load reader text"
          tone="error"
        />
      </div>
    )
  }

  if (corpus.status !== 'ready') return null
  const readyCorpus = corpus
  const startsAtSurahBeginning = readyCorpus.verses[0]?.verse === 1

  return (
    <>
      <section className="qar-reader-verse-surface" data-reader-verse-surface="true">
        {startsAtSurahBeginning && (
          <header className="qar-reader-surah-header" data-surah-header="true">
            <p className="qar-eyebrow">
              Surah {readyCorpus.surah.number} · {readyCorpus.surah.verseCount} verses
            </p>
            <h1 className="qar:sr-only" lang="en">
              {readyCorpus.surah.nameEnglish}
            </h1>
            <p aria-hidden="true" className="qar-reader-surah-display" dir="rtl" lang="ar">
              {readyCorpus.surah.nameArabic}
            </p>
            <div aria-hidden="true" className="qar-ornament-rule">
              <span className="qar-ornament-rule-star">۞</span>
            </div>
          </header>
        )}
        {startsAtSurahBeginning && readyCorpus.surah.number !== 9 && (
          <section aria-label="Basmala" className="qar-reader-basmala">
            <span
              aria-label="بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ"
              className="qar-reader-basmala-text"
              dir="rtl"
              lang="ar"
              role="img"
            >
              ﷽
            </span>
          </section>
        )}
        <VirtualVerseList
          bookmarkedVerseKeys={bookmarkedVerseKeys}
          metadata={metadata}
          onCopyReference={onCopyReference}
          onOpenPassageExplainer={setExplainerRange}
          onSelectVerse={onSelectVerse}
          onToggleBookmark={onToggleBookmark}
          openPassageRange={explainerRange}
          selectedVerseKey={selectedVerseKey}
          surahName={readyCorpus.surah.nameEnglish}
          translationVisible={readyCorpus.translationVisible}
          verses={readyCorpus.verses}
        />
        <footer className="qar-reader-surah-end" data-surah-end="true">
          <div aria-hidden="true" className="qar-ornament-rule">
            <span className="qar-ornament-rule-star">۞</span>
          </div>
          <p className="qar-eyebrow">End of {readyCorpus.surah.nameEnglish}</p>
        </footer>
      </section>
      {explainerRange ? (
        isDesktopViewport() ? (
          <Dialog
            onOpenChange={(open) => {
              if (!open) setExplainerRange(null)
            }}
            open
            title={`Translation covers ${readyCorpus.surah.number}:${explainerRange.from}–${explainerRange.to}`}
          >
            <p className="qar:m-0 qar:text-sm qar:leading-6">{NUMBERING_EXPLAINER}</p>
          </Dialog>
        ) : (
          <Sheet
            closeLabel="Close"
            onOpenChange={(open) => {
              if (!open) setExplainerRange(null)
            }}
            open
            title={`Translation covers ${readyCorpus.surah.number}:${explainerRange.from}–${explainerRange.to}`}
          >
            <p className="qar:m-0 qar:text-sm qar:leading-6">{NUMBERING_EXPLAINER}</p>
          </Sheet>
        )
      ) : null}
    </>
  )
}

// Exported so journeys can assert the skeleton contract without DOM internals.
export const VERSE_SKELETON_GROUPS = 3
