import * as ProgressPrimitive from '@radix-ui/react-progress'
import type { HTMLAttributes } from 'react'

import { cn } from '../../design-system/utils/cn'

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn('qar:inline-flex qar:min-h-7 qar:items-center qar:rounded-control qar:border qar:border-border qar:bg-surface qar:px-2 qar:text-xs qar:font-medium qar:text-text', {
        'qar:border-accent qar:text-accent': tone === 'success',
        'qar:border-focus qar:text-text': tone === 'warning',
        'qar:border-danger qar:text-danger': tone === 'danger',
      }, className)}
      data-tone={tone}
      {...props}
    />
  )
}

export type ProgressProps = ProgressPrimitive.ProgressProps & {
  label: string
  value: number
}

export function Progress({ label, value, className, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      aria-label={label}
      className={cn('qar:h-2 qar:w-full qar:overflow-hidden qar:rounded-surface qar:bg-border', className)}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator className="qar:h-full qar:bg-accent qar:transition-transform" style={{ transform: `translateX(-${100 - value}%)` }} />
    </ProgressPrimitive.Root>
  )
}

export type SpinnerProps = HTMLAttributes<HTMLSpanElement> & { label: string }
export function Spinner({ label, className, ...props }: SpinnerProps) {
  return (
    <span aria-label={label} className={cn('qar:inline-flex qar:size-5 qar:animate-spin qar:rounded-surface qar:border-2 qar:border-border qar:border-t-accent', className)} role="status" {...props} />
  )
}
