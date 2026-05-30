import type { ReactNode } from 'react'

export function SearchIndexGate({ children, ready }: { children: ReactNode; ready: boolean }) {
  if (ready) return <>{children}</>
  return <p className="qar:m-0 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-3 qar:text-sm qar:text-muted">Search index is unavailable until its verified pack is installed.</p>
}
