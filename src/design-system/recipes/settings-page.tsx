import type { ReactNode } from 'react'

import { cn } from '../utils/cn'

export function SettingsPageRecipe({ children, className, title = 'Settings' }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <main className={cn('qar:grid qar:gap-4 qar:px-5 qar:py-5', className)} aria-label={title}>
      <h2 className="qar:m-0 qar:text-xl qar:leading-tight">{title}</h2>
      {children}
    </main>
  )
}
