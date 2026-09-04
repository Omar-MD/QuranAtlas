import type { ReactNode } from 'react'

export function SearchIndexGate({
  children,
  message = 'Search data is not available on this device.',
  ready,
}: {
  children?: ReactNode
  message?: string
  ready: boolean
}) {
  if (ready) return <>{children}</>
  return (
    <p className="qar:m-0 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-3 qar:text-sm qar:text-muted">
      {message}
    </p>
  )
}
