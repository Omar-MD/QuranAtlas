import type { ReactNode } from 'react'

import { Sheet, SheetBody } from '../ui'

// Shared settings/Wird shell: one title bar, ✕ tier and gutters on every
// breakpoint. Compact settings (verse/mushaf reading controls) render as a
// content-height sheet/dialog so no empty page surrounds them; tall surfaces
// (Downloads, Wird plan form) keep the full-height adaptive behaviour. The
// Wird sheet renders through this shell with its own close label.
export function SettingsShell({
  children,
  closeLabel = 'Close settings',
  layout = 'compact',
  onClose,
  returnFocusId,
  subtitle,
  title,
}: {
  children: ReactNode
  closeLabel?: string
  /** compact = content-height sheet/dialog; full = full-height adaptive. */
  layout?: 'compact' | 'full'
  onClose: () => void
  returnFocusId?: string
  subtitle: string
  title: string
}) {
  return (
    <Sheet
      closeLabel={closeLabel}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      open
      returnFocusId={returnFocusId}
      title={title}
      variant={layout === 'full' ? 'adaptive-settings' : 'settings'}
    >
      <SheetBody className="qar-react-settings-shell">
        {subtitle ? <p className="qar-react-settings-subtitle">{subtitle}</p> : null}
        <div className="qar-react-settings-body">{children}</div>
      </SheetBody>
    </Sheet>
  )
}
