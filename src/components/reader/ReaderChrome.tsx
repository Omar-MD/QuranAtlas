import type { ReactNode } from 'react'
import { Menu, Settings } from 'lucide-react'

import { cn } from '../../design-system/utils/cn'
import { IconButton } from '../ui'
import { ReadingViewToggle } from './ReadingViewToggle'

export type ReaderMode = 'verse' | 'mushaf'

export function ReaderChrome({
  hideSettings = false,
  mode,
  onModeChange,
  onOpenNavigation,
  onOpenSettings,
  visible = true,
  wirdStatus,
}: {
  hideSettings?: boolean
  mode: ReaderMode
  onOpenNavigation?: () => void
  onOpenSettings?: () => void
  onModeChange?: (mode: ReaderMode) => void
  visible?: boolean
  wirdStatus?: ReactNode
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
      {wirdStatus}
      {onModeChange ? <ReadingViewToggle mode={mode} onModeChange={onModeChange} /> : null}
      {!hideSettings && (
        <IconButton className="qar-reader-chrome-icon" label="Open settings" onClick={onOpenSettings}>
          <Settings aria-hidden="true" size={26} strokeWidth={1.6} />
        </IconButton>
      )}
    </nav>
  )
}
