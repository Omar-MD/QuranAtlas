import type { ReactNode } from 'react'

export function SettingsPageRecipe({ children, title = 'Settings' }: { children: ReactNode; title?: string }) {
  return (
    <main className="qar:grid qar:gap-4 qar:px-5 qar:py-5" aria-label={title}>
      <h2 className="qar:m-0 qar:text-xl qar:leading-tight">{title}</h2>
      {children}
    </main>
  )
}
