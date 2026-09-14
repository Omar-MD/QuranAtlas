import { SegmentedControl } from '../ui'

// Verses/Mushaf is a labelled segmented control, never an icon toggle
// (brief §1.7, supersedes §8 item 9).
export function ReadingViewToggle({
  compact = false,
  mode,
  onModeChange,
}: {
  compact?: boolean
  mode: 'verse' | 'mushaf'
  onModeChange: (mode: 'verse' | 'mushaf') => void
}) {
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
