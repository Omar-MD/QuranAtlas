import { Book } from 'lucide-react'

import { IconButton, SegmentedControl } from '../ui'

// Reading-view control (brief §4.8): the segmented Verses/Mushaf pill remains
// the desktop treatment; phones get a single icon toggle — Book outline when
// unpressed, the Book inverted in a 32 px ink square when Mushaf is active
// (the same solid-ink idiom as the selected segment).
export function ReadingViewToggle({
  compact = false,
  mode,
  onModeChange,
  variant = 'segmented',
}: {
  compact?: boolean
  mode: 'verse' | 'mushaf'
  onModeChange: (mode: 'verse' | 'mushaf') => void
  variant?: 'segmented' | 'icon'
}) {
  if (variant === 'icon') {
    const pressed = mode === 'mushaf'
    return (
      <IconButton
        aria-pressed={pressed}
        className="qar-reader-chrome-icon"
        label="Mushaf view"
        onClick={() => onModeChange(pressed ? 'verse' : 'mushaf')}
      >
        {pressed ? (
          <span aria-hidden="true" className="qar-reader-mode-badge">
            <Book size={20} strokeWidth={1.7} />
          </span>
        ) : (
          <Book aria-hidden="true" size={22} strokeWidth={1.7} />
        )}
      </IconButton>
    )
  }
  return (
    <SegmentedControl
      compact={compact}
      label="View"
      onValueChange={(value) => onModeChange(value as 'verse' | 'mushaf')}
      options={[
        { label: 'Verses', value: 'verse' },
        { label: 'Mushaf', value: 'mushaf' },
      ]}
      value={mode}
    />
  )
}
