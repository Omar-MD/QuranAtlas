import type { ReactNode } from 'react'

import { Sheet, SheetBody } from '../ui'
import { ThemeNightControls } from './ThemeNightControls'
import type { ReactNightModePreference, ReactThemePreference } from '../../storage/settings-writer'

export function SettingsShell({
  children,
  nightMode,
  onClose,
  onNightModeChange,
  onThemeChange,
  returnFocusId,
  subtitle,
  theme,
  title,
}: {
  children: ReactNode
  nightMode: ReactNightModePreference
  onClose: () => void
  onNightModeChange: (value: ReactNightModePreference) => void
  onThemeChange: (value: ReactThemePreference) => void
  returnFocusId?: string
  subtitle: string
  theme: ReactThemePreference
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
      <SheetBody>
        {subtitle ? <p className="qar-react-settings-subtitle">{subtitle}</p> : null}
        <div className="qar-react-settings-body">
          {children}
        </div>

        <footer className="qar-react-settings-footer">
          <ThemeNightControls
            nightMode={nightMode}
            onNightModeChange={onNightModeChange}
            onThemeChange={onThemeChange}
            theme={theme}
          />
        </footer>
      </SheetBody>
    </Sheet>
  )
}
