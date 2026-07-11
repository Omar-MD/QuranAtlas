import { IconButton, Tooltip } from '../ui'

function OpenMushafGlyph() {
  return (
    <svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24">
      <path d="M3.5 5.5c2.9-.8 5.7-.2 8.5 1.7v12c-2.8-1.9-5.6-2.5-8.5-1.7v-12Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
      <path d="M20.5 5.5c-2.9-.8-5.7-.2-8.5 1.7v12c2.8-1.9 5.6-2.5 8.5-1.7v-12Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  )
}

function VerseLinesGlyph() {
  return (
    <svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24">
      <path d="M4 6.5h16M4 11.5h16M4 16.5h11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <circle cx="18.5" cy="16.5" r="1.8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="18.5" cy="16.5" fill="currentColor" r=".45" />
    </svg>
  )
}

export function ReadingViewToggle({ mode, onModeChange }: {
  mode: 'verse' | 'mushaf'
  onModeChange: (mode: 'verse' | 'mushaf') => void
}) {
  const destination = mode === 'verse' ? 'mushaf' : 'verse'
  const label = destination === 'mushaf' ? 'Switch to Mushaf view' : 'Switch to Verse view'

  return (
    <Tooltip content={label}>
      <IconButton className="qar-reader-chrome-view-toggle" label={label} onClick={() => onModeChange(destination)}>
        {destination === 'mushaf' ? <OpenMushafGlyph /> : <VerseLinesGlyph />}
      </IconButton>
    </Tooltip>
  )
}
