import type { ReactNode } from 'react'

import { Sheet, SheetBody } from '../ui'

// Shared settings/Wird shell: one title bar, ✕ tier and gutters on every
// breakpoint, and ONE frame for every screen-level surface — full-screen
// cover on phones, the shared centred dialog on desktop — so switching
// between surfaces (Settings, Downloads, Wird, About, Bookmarks, Surahs)
// never resizes or repositions the modal. The Wird sheet renders through
// this shell with its own close label.
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
