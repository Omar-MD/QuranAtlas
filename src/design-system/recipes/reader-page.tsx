import type { ReactNode } from 'react'

import { cn } from '../utils/cn'

/**
 * Reader page canvas: full-bleed reading surface with an optional chrome slot
 * and a centered prose column capped at --qa-react-page-max-width (>=1180px).
 */
export function ReaderPageRecipe({
  children,
  chrome,
  contentClassName,
}: {
  children: ReactNode
  chrome?: ReactNode
  contentClassName?: string
}) {
  return (
    <div className="qar:flex qar:min-h-screen qar:flex-col qar:bg-canvas qar:text-text">
      {chrome}
      <div className={cn('qar:mx-auto qar:w-full qar:max-w-page qar:px-5 qar:py-5', contentClassName)}>{children}</div>
    </div>
  )
}
