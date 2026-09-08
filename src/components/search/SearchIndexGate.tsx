import type { ReactNode } from 'react'

import { Spinner, Status } from '../ui'

/**
 * Gate in front of the search workspace (brief §3): loading renders an info
 * Status with a Spinner; an unavailable pack renders warning — never a raw
 * unroled box.
 */
export function SearchIndexGate({
  children,
  loading = false,
  message = 'Search data is not available on this device.',
  ready,
}: {
  children?: ReactNode
  loading?: boolean
  message?: string
  ready: boolean
}) {
  if (ready) return <>{children}</>
  if (loading) {
    return <Status icon={<Spinner label={message} />} title={message} tone="info" />
  }
  return <Status title={message} tone="warning" />
}
