import type { ReactNode } from 'react'

import { Sheet, SheetBody } from '../ui'

export function SettingsShell({
  children,
  onClose,
  returnFocusId,
  subtitle,
  title,
}: {
  children: ReactNode
  onClose: () => void
  returnFocusId?: string
  subtitle: string
  title: string
}) {
  return (
    <Sheet
      closeLabel="Close settings"
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
