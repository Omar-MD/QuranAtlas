import { Button } from '../ui'

export function VerseNumber({ verse, onSelect }: { verse: number; onSelect?: () => void }) {
  return (
    <Button aria-label={`Verse ${verse}`} onClick={onSelect} size="sm" variant="ghost">
      {verse}
    </Button>
  )
}
