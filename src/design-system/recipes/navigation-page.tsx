import type { ReactNode } from 'react'

/**
 * Navigation page: single h1 page heading with an optional muted kicker,
 * list content rhythm, and standard gutters.
 */
export function NavigationPageRecipe({
  children,
  kicker,
  title,
}: {
  children: ReactNode
  kicker?: string
  title: string
}) {
  return (
    <main className="qar:grid qar:gap-4 qar:px-5 qar:py-5" aria-label={title}>
      <header className="qar:grid qar:gap-1">
        {kicker ? <p className="qar:m-0 qar:text-sm qar:text-muted">{kicker}</p> : null}
        <h1 className="qar:m-0 qar:text-2xl qar:font-semibold qar:leading-tight qar:text-text">{title}</h1>
      </header>
      {children}
    </main>
  )
}
