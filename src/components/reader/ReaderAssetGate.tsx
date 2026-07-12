import type { ReactNode } from 'react'

import { Button } from '../ui'

export type ReaderAssetState = 'ready' | 'missing' | 'stale' | 'installing' | 'error'

export function ReaderAssetGate({ children, label, onRetry, state = 'ready' }: {
  children?: ReactNode
  label: string
  onRetry?: () => void
  state?: ReaderAssetState
}) {
  if (state === 'ready') return <>{children}</>
  const message = state === 'missing'
    ? `${label} page pack is not installed.`
    : state === 'stale'
      ? `${label} page pack needs verification before use.`
      : state === 'installing'
        ? `${label} page pack is installing.`
        : `${label} page pack could not be loaded.`
  return (
    <section className="qar:m-5 qar:grid qar:gap-3 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4" aria-live="polite">
      <p className="qar:m-0 qar:text-sm qar:text-muted">{message}</p>
      <div className="qar:flex qar:flex-wrap qar:gap-2">
        <Button size="sm">Manage assets</Button>
        <Button onClick={onRetry} size="sm" variant="secondary">Retry</Button>
      </div>
    </section>
  )
}
