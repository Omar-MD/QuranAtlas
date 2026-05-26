import type { ReactNode } from 'react'

import { ReaderChrome } from './ReaderChrome'

export function ReaderPageShell({ children, label, mode }: { children: ReactNode; label: string; mode: 'verse' | 'mushaf' }) {
  return (
    <main className="qar:min-h-screen qar:bg-canvas qar:text-text" aria-label={mode === 'verse' ? 'Verse reader' : 'Mushaf reader'}>
      <ReaderChrome currentLabel={label} mode={mode} />
      {children}
    </main>
  )
}
