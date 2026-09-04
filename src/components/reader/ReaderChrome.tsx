import type { FocusEventHandler, ReactNode } from 'react'
import { Menu, Settings } from 'lucide-react'

import { cn } from '../../design-system/utils/cn'
import { IconButton } from '../ui'
import { ReadingViewToggle } from './ReadingViewToggle'

export type ReaderMode = 'verse' | 'mushaf'

export function ReaderChrome({
  hideSettings = false,
  mode,
  onBlurCapture,
  onFocusCapture,
  onModeChange,
  onOpenNavigation,
  onOpenSettings,
  title,
  visible = true,
  wirdStatus,
}: {
  hideSettings?: boolean
  mode: ReaderMode
  onBlurCapture?: FocusEventHandler<HTMLElement>
  onFocusCapture?: FocusEventHandler<HTMLElement>
  onOpenNavigation?: () => void
  onOpenSettings?: () => void
  onModeChange?: (mode: ReaderMode) => void
  title?: ReactNode
  visible?: boolean
  wirdStatus?: ReactNode
}) {
  return (
    <nav
      className={cn('qar-reader-chrome', !visible && 'qar-reader-chrome--hidden')}
      aria-label="Primary navigation"
      aria-hidden={!visible}
      data-visible={visible ? 'true' : 'false'}
      inert={!visible ? true : undefined}
      onBlurCapture={onBlurCapture}
      onFocusCapture={onFocusCapture}
    >
      <div className="qar-reader-chrome-left">
        <IconButton className="qar-reader-chrome-icon" id="reader-navigation-trigger" label="Open navigation" onClick={onOpenNavigation}>
          <Menu aria-hidden="true" size={26} strokeWidth={1.8} />
        </IconButton>
      </div>
      {title ? <div className="qar-reader-chrome-title" dir="rtl" lang="ar">{title}</div> : null}
      <div className="qar-reader-chrome-right">
        {wirdStatus}
        {onModeChange ? <ReadingViewToggle mode={mode} onModeChange={onModeChange} /> : null}
        {!hideSettings ? (
          <IconButton className="qar-reader-chrome-icon" id="reader-settings-trigger" label="Open settings" onClick={onOpenSettings}>
            <Settings aria-hidden="true" size={26} strokeWidth={1.6} />
          </IconButton>
        ) : null}
      </div>
    </nav>
  )
}
