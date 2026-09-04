import type { ReactNode } from 'react'

export function ReaderPageRecipe({ children }: { children: ReactNode }) {
  return <div className="qar:min-h-screen qar:bg-canvas qar:text-text">{children}</div>
}
