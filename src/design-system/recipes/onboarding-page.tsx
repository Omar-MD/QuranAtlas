import type { ReactNode } from 'react'

/**
 * Onboarding page: centered max-w-md column per the director brief (6.1),
 * with the shared single-h1 heading hierarchy.
 */
export function OnboardingPageRecipe({
  children,
  kicker,
  title,
}: {
  children: ReactNode
  kicker?: string
  title?: string
}) {
  return (
    <main
      className="qar:grid qar:min-h-screen qar:content-start qar:gap-4 qar:px-5 qar:py-6"
      aria-label={title ?? 'Onboarding'}
    >
      <div className="qar:mx-auto qar:grid qar:w-full qar:max-w-md qar:content-start qar:gap-4">
        {title || kicker ? (
          <header className="qar:grid qar:gap-1">
            {kicker ? <p className="qar:m-0 qar:text-sm qar:text-muted">{kicker}</p> : null}
            {title ? (
              <h1 className="qar:m-0 qar:text-2xl qar:font-semibold qar:leading-tight qar:text-text">{title}</h1>
            ) : null}
          </header>
        ) : null}
        {children}
      </div>
    </main>
  )
}
