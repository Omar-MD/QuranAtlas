import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Button, Spinner, Status } from '../ui'

export type ReaderAssetState = 'ready' | 'missing' | 'stale' | 'installing' | 'error'

export function ReaderAssetGate({
  children,
  label,
  onManageAssets,
  onRetry,
  state = 'ready',
}: {
  children?: ReactNode
  label: string
  onManageAssets?: () => void
  onRetry?: () => void
  state?: ReaderAssetState
}) {
  if (state === 'ready') return <>{children}</>
  const message =
    state === 'missing'
      ? `${label} page pack is not installed.`
      : state === 'stale'
        ? `${label} page pack needs verification before use.`
        : state === 'installing'
          ? `${label} page pack is installing.`
          : `${label} page pack could not be loaded.`
  const tone = state === 'error' ? 'error' : state === 'missing' || state === 'stale' ? 'warning' : 'info'
  return (
    <Status
      action={
        <>
          {onManageAssets ? (
            <Button onClick={onManageAssets} size="sm">
              Manage assets
            </Button>
          ) : null}
          {onRetry ? (
            <Button onClick={onRetry} size="sm" variant="secondary">
              Retry
            </Button>
          ) : null}
        </>
      }
      aria-live={state === 'error' ? 'assertive' : 'polite'}
      description={message}
      icon={
        state === 'installing' ? (
          <Spinner label={`${label} page pack loading`} />
        ) : (
          <AlertTriangle aria-hidden="true" size={18} />
        )
      }
      title={state === 'installing' ? `Installing ${label} page pack` : `${label} page pack`}
      tone={tone}
    />
  )
}
