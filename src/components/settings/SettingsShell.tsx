import type { ReactNode } from 'react'

import { Sheet, SheetBody } from '../ui'

// Shared settings/Wird shell (brief §15.3): one 56 px title bar, ✕ tier,
// gutters and full-height/adaptive behaviour on every breakpoint. The Wird
// sheet renders through this shell with its own close label.
export function SettingsShell({
  children,
  closeLabel = 'Close settings',
  onClose,
  returnFocusId,
  subtitle,
  title,
}: {
  children: ReactNode
  closeLabel?: string
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
      variant="adaptive-settings"
    >
      <SheetBody className="qar-react-settings-shell">
        {subtitle ? <p className="qar-react-settings-subtitle">{subtitle}</p> : null}
        <div className="qar-react-settings-body">{children}</div>
      </SheetBody>
    </Sheet>
  )
}
