import { BookOpenText, ScrollText } from 'lucide-react'

import { IconButton, Tooltip } from '../ui'

export function ReadingViewToggle({
  mode,
  onModeChange,
}: {
  mode: 'verse' | 'mushaf'
  onModeChange: (mode: 'verse' | 'mushaf') => void
}) {
  const destination = mode === 'verse' ? 'mushaf' : 'verse'
  const label = destination === 'mushaf' ? 'Switch to Mushaf view' : 'Switch to Verse view'

  return (
    <Tooltip content={label}>
      <IconButton
        className="qar-reader-chrome-pill qar-reader-chrome-view-toggle"
        label={label}
        onClick={() => onModeChange(destination)}
      >
        {destination === 'mushaf' ? (
          <BookOpenText aria-hidden="true" size={24} strokeWidth={1.7} />
        ) : (
          <ScrollText aria-hidden="true" size={24} strokeWidth={1.7} />
        )}
      </IconButton>
    </Tooltip>
  )
}
