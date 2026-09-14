import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '../../design-system/utils/cn'
import { Tooltip } from './tooltip'

// Plain icon tier (brief §2.1): no fill, muted icon that inks on hover,
// 44 px target, accessible name, and a matching desktop tooltip.
export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> & {
  label: string
  children: ReactNode
}

export function IconButton({ label, className, children, type = 'button', ...props }: IconButtonProps) {
  return (
    <Tooltip content={label}>
      <button
        aria-label={label}
        className={cn(
          'qar:inline-flex qar:min-h-11 qar:min-w-11 qar:items-center qar:justify-center qar:rounded-control qar:border qar:border-transparent qar:bg-transparent qar:text-muted qar:transition-colors qar:hover:bg-accent-tint qar:hover:text-text qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus qar:disabled:pointer-events-none qar:disabled:opacity-40',
          className,
        )}
        type={type}
        {...props}
      >
        {children}
      </button>
    </Tooltip>
  )
}
