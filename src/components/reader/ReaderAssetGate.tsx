import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Button, Spinner, Status } from '../ui'

export type ReaderAssetState = 'ready' | 'missing' | 'stale' | 'installing' | 'error'

// S4 offline state: "Page images not downloaded" with a Download pages
// deep-link into the Downloads surface (S9) — never a blank viewer.
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
      ? `The ${label} page images are not downloaded, so this page cannot be shown offline. Your bookmarks and settings are not affected.`
      : state === 'stale'
        ? `${label} page pack needs verification before use.`
        : state === 'installing'
          ? `${label} page pack is installing.`
          : `${label} page pack could not be loaded.`
  const tone = state === 'error' ? 'error' : 'info'
  return (
    <Status
      action={
        <>
          {state === 'missing' && onManageAssets ? (
            <Button onClick={onManageAssets} size="sm">
              Download pages
            </Button>
          ) : null}
          {state !== 'missing' && onManageAssets ? (
            <Button onClick={onManageAssets} size="sm" variant="secondary">
              Manage assets
            </Button>
          ) : null}
          {onRetry && state !== 'missing' ? (
            <Button onClick={onRetry} size="sm" variant="secondary">
              Try again
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
      title={
        state === 'missing'
          ? 'Page images not downloaded'
          : state === 'installing'
            ? `Installing ${label} page pack`
            : `${label} page pack`
      }
      tone={tone}
    />
  )
}
