import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '../../design-system/utils/cn'

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> & {
  label: string
  children: ReactNode
}

export function IconButton({ label, className, children, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(
        'qar:inline-flex qar:min-h-10 qar:min-w-10 qar:items-center qar:justify-center qar:rounded-control qar:border qar:border-border qar:bg-surface qar:text-text qar:transition-colors qar:hover:border-accent qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus qar:disabled:pointer-events-none qar:disabled:opacity-55',
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}
