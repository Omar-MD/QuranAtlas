import { type ReactNode, useState } from 'react'

import { ReaderChrome, type ReaderMode } from './ReaderChrome'
import { NavDrawer } from '../navigation/NavDrawer'

export function ReaderPageShell({
  children,
  label,
  mode,
  onModeChange,
}: {
  children: ReactNode
  label: string
  mode: ReaderMode
  onModeChange?: (mode: ReaderMode) => void
}) {
  const [navigationOpen, setNavigationOpen] = useState(false)

  function navigate(hash: string) {
    window.location.hash = hash
    setNavigationOpen(false)
  }

  return (
    <main className="qar:min-h-screen qar:bg-canvas qar:text-text" aria-label={mode === 'verse' ? 'Verse reader' : 'Mushaf reader'}>
      <ReaderChrome
        currentLabel={label}
        mode={mode}
        onModeChange={onModeChange}
        onOpenNavigation={() => setNavigationOpen(true)}
        onOpenSettings={() => {
          window.location.hash = '#/settings'
        }}
      />
      {navigationOpen && (
        <div className="qar:fixed qar:inset-0 qar:z-50 qar:bg-canvas" role="presentation">
          <NavDrawer
            currentLabel={label}
            mode={mode}
            onClose={() => setNavigationOpen(false)}
            onNavigate={navigate}
            open
          />
        </div>
      )}
      {children}
    </main>
  )
}
