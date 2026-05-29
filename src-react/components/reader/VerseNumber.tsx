import { Button } from '../ui'
import { cn } from '../../design-system/utils/cn'

export function VerseNumber({
  bookmarked = false,
  onSelect,
  onToggleBookmark,
  verse,
}: {
  bookmarked?: boolean
  onSelect?: () => void
  onToggleBookmark?: () => void
  verse: number
}) {
  function handleClick() {
    onToggleBookmark?.()
    onSelect?.()
  }

  return (
    <Button
      aria-label={`Verse ${verse}`}
      aria-pressed={bookmarked}
      className={cn('qar-reader-verse-number', bookmarked && 'qar-reader-verse-number--bookmarked')}
      onClick={handleClick}
      size="sm"
      variant="ghost"
    >
      <span
        aria-hidden="true"
        className="qar-reader-verse-bookmark-glyph"
        data-active={bookmarked ? 'true' : 'false'}
      />
      <span className="qar-reader-verse-number-text">{verse}</span>
    </Button>
  )
}
