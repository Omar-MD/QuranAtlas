import { X } from 'lucide-react'
import { type ReactNode, useEffect, useRef } from 'react'

import { Button } from '../ui'
import { ThemeNightControls } from './ThemeNightControls'
import type { ReactNightModePreference, ReactThemePreference } from '../../storage/settings-writer'

export function SettingsShell({
  children,
  nightMode,
  onClose,
  onNightModeChange,
  onThemeChange,
  subtitle,
  theme,
  title,
}: {
  children: ReactNode
  nightMode: ReactNightModePreference
  onClose: () => void
  onNightModeChange: (value: ReactNightModePreference) => void
  onThemeChange: (value: ReactThemePreference) => void
  subtitle: string
  theme: ReactThemePreference
  title: string
}) {
  const shellRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    shellRef.current?.focus({ preventScroll: true })
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <>
      <Button
        aria-label="Close settings backdrop"
        className="qar-react-settings-backdrop"
        onClick={onClose}
        variant="ghost"
      >
        <span className="qar:sr-only">Close settings backdrop</span>
      </Button>
      <div
        aria-labelledby="qar-react-settings-title"
        aria-modal="true"
        className="qar-react-settings-shell"
        ref={shellRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="qar-react-settings-header">
          <div className="qar-react-settings-title-block">
            {subtitle ? <p className="qar-react-settings-subtitle">{subtitle}</p> : null}
            <h2 className="qar-react-settings-title" id="qar-react-settings-title">{title}</h2>
          </div>
          <Button aria-label="Close settings" className="qar-react-settings-close" onClick={onClose} size="sm" variant="ghost">
            <X aria-hidden="true" size={18} />
          </Button>
        </header>

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
      </div>
    </>
  )
}
