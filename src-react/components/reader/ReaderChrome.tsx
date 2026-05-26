import { Menu, Settings } from 'lucide-react'

import { IconButton, SegmentedControl } from '../ui'

export type ReaderMode = 'verse' | 'mushaf'

export function ReaderChrome({
  currentLabel,
  mode,
  onOpenNavigation,
  onOpenSettings,
  onModeChange,
}: {
  currentLabel: string
  mode: ReaderMode
  onOpenNavigation?: () => void
  onOpenSettings?: () => void
  onModeChange?: (mode: ReaderMode) => void
}) {
  return (
    <nav className="qar-reader-chrome qar:grid qar:min-h-14 qar:items-center qar:border-b qar:border-border qar:bg-surface qar:px-2" aria-label="Reader chrome">
      <IconButton className="qar:min-h-12 qar:min-w-12 qar:border-transparent qar:bg-transparent" label="Open navigation" onClick={onOpenNavigation}><Menu aria-hidden="true" size={26} /></IconButton>
      <div className="qar:grid qar:justify-items-center qar:gap-1 qar:self-center">
        <span className="qar-reader-chrome-title qar:text-sm qar:font-semibold qar:text-text">{currentLabel}</span>
        {mode === 'verse' && (
          <SegmentedControl
            label="Reader mode"
            onValueChange={(value) => onModeChange?.(value as ReaderMode)}
            options={[{ label: 'Verse', value: 'verse' }, { label: 'Mushaf', value: 'mushaf' }]}
            value={mode}
          />
        )}
      </div>
      <IconButton className="qar:min-h-12 qar:min-w-12 qar:border-transparent qar:bg-transparent" label="Open settings" onClick={onOpenSettings}><Settings aria-hidden="true" size={26} /></IconButton>
    </nav>
  )
}
