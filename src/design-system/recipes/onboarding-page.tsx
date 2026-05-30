import type { ReactNode } from 'react'

export function OnboardingPageRecipe({ children }: { children: ReactNode }) {
  return (
    <main className="qar:grid qar:min-h-screen qar:content-start qar:gap-4 qar:px-5 qar:py-6" aria-label="Onboarding">
      {children}
    </main>
  )
}
