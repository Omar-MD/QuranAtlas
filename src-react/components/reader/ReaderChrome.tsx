import { BookOpenText, FileText, Menu, Settings } from 'lucide-react'

import { cn } from '../../design-system/utils/cn'
import { IconButton } from '../ui'

export type ReaderMode = 'verse' | 'mushaf'

export function ReaderChrome({
  mode,
  onModeChange,
  onOpenNavigation,
  onOpenSettings,
  visible = true,
}: {
  mode: ReaderMode
  onOpenNavigation?: () => void
  onOpenSettings?: () => void
  onModeChange?: (mode: ReaderMode) => void
  visible?: boolean
}) {
  return (
    <nav
      className={cn('qar-reader-chrome', !visible && 'qar-reader-chrome--hidden')}
      aria-label="Primary navigation"
      data-visible={visible ? 'true' : 'false'}
    >
      <IconButton className="qar-reader-chrome-icon" id="reader-navigation-trigger" label="Open navigation" onClick={onOpenNavigation}>
        <Menu aria-hidden="true" size={26} strokeWidth={1.8} />
      </IconButton>
      <div className="qar-reader-chrome-spacer" aria-hidden="true" />
      {onModeChange && (
        <IconButton
          aria-pressed={mode === 'mushaf'}
          className="qar-reader-chrome-mode-toggle"
          data-reader-mode={mode}
          label={mode === 'verse' ? 'Switch to Mushaf mode' : 'Switch to Verse mode'}
          onClick={() => onModeChange(mode === 'verse' ? 'mushaf' : 'verse')}
        >
          <span className="qar-reader-chrome-mode-glyph" aria-hidden="true">
            {mode === 'verse' ? <BookOpenText size={20} strokeWidth={1.7} /> : <FileText size={20} strokeWidth={1.75} />}
          </span>
        </IconButton>
      )}
      <IconButton className="qar-reader-chrome-icon" label="Open settings" onClick={onOpenSettings}>
        <Settings aria-hidden="true" size={26} strokeWidth={1.6} />
      </IconButton>
    </nav>
  )
}
