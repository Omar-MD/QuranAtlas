import type { ReactNode } from 'react'

import { cn } from '../utils/cn'

/**
 * Settings page: single h1 page heading (used by About and the settings
 * overlay content) with standard gutters and content rhythm.
 */
export function SettingsPageRecipe({
  children,
  className,
  kicker,
  title = 'Settings',
}: {
  children: ReactNode
  className?: string
  kicker?: string
  title?: string
}) {
  return (
    <main className={cn('qar:grid qar:gap-4 qar:px-5 qar:py-5', className)} aria-label={title}>
      <header className="qar:grid qar:gap-1">
        {kicker ? <p className="qar:m-0 qar:text-sm qar:text-muted">{kicker}</p> : null}
        <h1 className="qar:m-0 qar:text-2xl qar:font-semibold qar:leading-tight qar:text-text">{title}</h1>
      </header>
      {children}
    </main>
  )
}
