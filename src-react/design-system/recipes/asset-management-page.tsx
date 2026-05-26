import type { ReactNode } from 'react'

export function AssetManagementPageRecipe({ children }: { children: ReactNode }) {
  return (
    <main className="qar:grid qar:gap-4 qar:px-5 qar:py-5" aria-label="Asset management">
      <h2 className="qar:m-0 qar:text-xl qar:leading-tight">Assets</h2>
      {children}
    </main>
  )
}
