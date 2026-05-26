import { BookOpen, Menu, Settings } from 'lucide-react'

import { IconButton, SegmentedControl } from '../ui'

export function ReaderChrome({ currentLabel, mode }: { currentLabel: string; mode: 'verse' | 'mushaf' }) {
  return (
    <nav className="qar:flex qar:items-center qar:justify-between qar:gap-3 qar:border-b qar:border-border qar:bg-surface qar:px-4 qar:py-2" aria-label="Reader chrome">
      <IconButton label="Open navigation"><Menu aria-hidden="true" size={18} /></IconButton>
      <div className="qar:grid qar:justify-items-center qar:gap-1">
        <span className="qar:text-xs qar:text-muted">QuranAtlas</span>
        <span className="qar:text-sm qar:text-muted">{currentLabel}</span>
        <SegmentedControl
          label="Reader mode"
          options={[{ label: 'Verse', value: 'verse' }, { label: 'Mushaf', value: 'mushaf' }]}
          value={mode}
        />
      </div>
      <IconButton label="Open settings">{mode === 'verse' ? <Settings aria-hidden="true" size={18} /> : <BookOpen aria-hidden="true" size={18} />}</IconButton>
    </nav>
  )
}
