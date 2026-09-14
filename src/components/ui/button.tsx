import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

import { cn } from '../../design-system/utils/cn'
import { Spinner } from './feedback'

// Three tiers only (brief §2.1): primary (solid accent, one per view),
// secondary (hairline outline), ghost/danger retained for quiet and
// destructive confirms. Loading renders an inline spinner, keeps the label,
// and disables without layout shift (brief §2.3).
const buttonVariants = cva(
  'qar:inline-flex qar:min-h-11 qar:items-center qar:justify-center qar:gap-2 qar:border qar:px-4 qar:py-2 qar:font-ui qar:text-sm qar:font-medium qar:transition-colors qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus qar:disabled:pointer-events-none qar:disabled:opacity-40',
  {
    variants: {
      variant: {
        primary:
          'qar:rounded-control qar:border-transparent qar:bg-accent qar:text-on-accent qar:hover:bg-accent-strong',
        secondary: 'qar:rounded-control qar:border-border qar:bg-transparent qar:text-text qar:hover:bg-accent-tint',
        ghost: 'qar:rounded-control qar:border-transparent qar:bg-transparent qar:text-text qar:hover:bg-accent-tint',
        danger: 'qar:rounded-control qar:border-transparent qar:bg-danger qar:text-on-danger qar:hover:opacity-90',
      },
      size: {
        sm: 'qar:min-h-11 qar:px-3 qar:text-xs',
        md: 'qar:min-h-11 qar:px-4 qar:text-sm',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    children: ReactNode
    loading?: boolean
  }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading = false, type = 'button', disabled, children, ...props },
  ref,
) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      ref={ref}
      type={type}
      {...props}
    >
      {loading ? <Spinner className="qar:size-4" label="" aria-hidden="true" /> : null}
      {children}
    </button>
  )
})
