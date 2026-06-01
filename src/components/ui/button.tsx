import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

import { cn } from '../../design-system/utils/cn'

export const buttonVariants = cva(
  'qar:inline-flex qar:min-h-10 qar:items-center qar:justify-center qar:gap-2 qar:rounded-control qar:border qar:border-border qar:px-4 qar:py-2 qar:font-ui qar:text-sm qar:font-medium qar:transition-colors qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus qar:disabled:pointer-events-none qar:disabled:opacity-55',
  {
    variants: {
      variant: {
        primary: 'qar:bg-accent qar:text-surface qar:hover:bg-accent-strong',
        secondary: 'qar:bg-surface qar:text-text qar:hover:border-accent',
        ghost: 'qar:border-transparent qar:bg-transparent qar:text-text qar:hover:bg-surface',
        danger: 'qar:bg-danger qar:text-surface qar:hover:opacity-90',
      },
      size: {
        sm: 'qar:min-h-10 qar:px-3 qar:text-xs',
        md: 'qar:min-h-10 qar:px-4 qar:text-sm',
        lg: 'qar:min-h-11 qar:px-5 qar:text-base',
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
    asChild?: boolean
    children: ReactNode
    unstyled?: boolean
  }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { asChild = false, className, unstyled = false, variant, size, type = 'button', ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(unstyled ? undefined : buttonVariants({ variant, size }), className)} ref={ref} type={asChild ? undefined : type} {...props} />
})
