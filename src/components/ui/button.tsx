import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

import { cn } from '../../design-system/utils/cn'

const buttonVariants = cva(
  'qar:inline-flex qar:min-h-11 qar:items-center qar:justify-center qar:gap-2 qar:border qar:border-border qar:px-4 qar:py-2 qar:font-ui qar:text-sm qar:font-medium qar:transition-colors qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus qar:disabled:pointer-events-none qar:disabled:opacity-55',
  {
    variants: {
      variant: {
        primary: 'qar:rounded-control qar:bg-accent qar:text-surface qar:hover:bg-accent-strong',
        secondary: 'qar:rounded-control qar:bg-surface qar:text-text qar:hover:border-accent',
        ghost: 'qar:rounded-control qar:border-transparent qar:bg-transparent qar:text-text qar:hover:bg-surface',
        danger: 'qar:rounded-control qar:bg-danger qar:text-text-on-danger qar:hover:opacity-90',
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
  }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = 'button', ...props },
  ref,
) {
  return <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} type={type} {...props} />
})
