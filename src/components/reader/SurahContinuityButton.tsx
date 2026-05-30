import { Button } from '../ui'
import type { ReaderSurahIndexEntry } from '../../data/surah-index'
import { adjacentSurahNumber, type ReaderSurahDirection } from '../../data/surah-index'
import { REACT_ROUTES } from '../../app/router/routes'

const ANCHOR_KEY = 'qa-react-reader-anchor'

function navigateToSurah(surah: number, direction: ReaderSurahDirection) {
  if (direction === 'previous') sessionStorage.setItem(ANCHOR_KEY, 'bottom')
  else sessionStorage.removeItem(ANCHOR_KEY)
  window.location.hash = REACT_ROUTES.surah(surah)
}

export function consumeReactReaderAnchor(): 'top' | 'bottom' {
  const value = sessionStorage.getItem(ANCHOR_KEY)
  sessionStorage.removeItem(ANCHOR_KEY)
  return value === 'bottom' ? 'bottom' : 'top'
}

export function SurahContinuityButton({
  currentSurah,
  direction,
  target,
}: {
  currentSurah: number
  direction: ReaderSurahDirection
  target: ReaderSurahIndexEntry
}) {
  const targetSurah = adjacentSurahNumber(currentSurah, direction)
  const isPrevious = direction === 'previous'
  return (
    <Button
      aria-label={`${isPrevious ? 'Previous' : 'Next'} surah: ${target.name}`}
      className="qar-reader-continue"
      data-continue-next={isPrevious ? undefined : ''}
      data-continue-prev={isPrevious ? '' : undefined}
      onClick={() => navigateToSurah(targetSurah, direction)}
      variant="ghost"
    >
      {isPrevious && <span className="qar-reader-continue-arrow" aria-hidden="true">↑</span>}
      <span className="qar-reader-continue-title">{target.name}</span>
      {!isPrevious && <span className="qar-reader-continue-arrow" aria-hidden="true">↓</span>}
    </Button>
  )
}
