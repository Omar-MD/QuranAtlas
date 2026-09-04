import { Bookmark } from 'lucide-react'

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
      aria-label={bookmarked ? `Remove bookmark for verse ${verse}` : `Bookmark verse ${verse}`}
      aria-pressed={bookmarked}
      className={cn('qar-reader-verse-number', bookmarked && 'qar-reader-verse-number--bookmarked')}
      onClick={handleClick}
      size="sm"
      variant="ghost"
    >
      <Bookmark
        aria-hidden="true"
        className="qar-reader-verse-bookmark-glyph"
        data-active={bookmarked ? 'true' : 'false'}
        fill={bookmarked ? 'currentColor' : 'none'}
        size={13}
        strokeWidth={1.9}
      />
      <span className="qar-reader-verse-number-text">{verse}</span>
    </Button>
  )
}
