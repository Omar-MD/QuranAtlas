import * as ProgressPrimitive from '@radix-ui/react-progress'
import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '../../design-system/utils/cn'

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'qar:inline-flex qar:min-h-7 qar:items-center qar:rounded-control qar:border qar:border-border qar:bg-surface qar:px-2 qar:text-xs qar:font-medium qar:text-text',
        {
          'qar:border-accent qar:text-accent': tone === 'success',
          'qar:border-focus qar:text-text': tone === 'warning',
          'qar:border-danger qar:text-danger': tone === 'danger',
        },
        className,
      )}
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
      <ProgressPrimitive.Indicator
        className="qar:h-full qar:bg-accent qar:transition-transform"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export type SpinnerProps = HTMLAttributes<HTMLSpanElement> & { label: string }
export function Spinner({ label, className, ...props }: SpinnerProps) {
  return (
    <span
      aria-label={label}
      className={cn(
        'qar:inline-flex qar:size-5 qar:animate-spin qar:rounded-surface qar:border-2 qar:border-border qar:border-t-accent',
        className,
      )}
      role="status"
      {...props}
    />
  )
}

export type StatusProps = HTMLAttributes<HTMLDivElement> & {
  tone: 'info' | 'success' | 'warning' | 'error'
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

export function Status({ tone, title, description, action, icon, className, ...props }: StatusProps) {
  return (
    <div
      className={cn('qar-react-status qar:rounded-control qar:p-4', className)}
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
      {...props}
    >
      <div className="qar:flex qar:items-start qar:gap-2">
        {icon ? <span>{icon}</span> : null}
        <div>
          <div className="qar:text-sm qar:font-semibold qar:text-text">{title}</div>
          {description ? <div className="qar:text-sm qar:text-muted">{description}</div> : null}
        </div>
      </div>
      {action ? <div className="qar:flex qar:gap-2">{action}</div> : null}
    </div>
  )
}

export type ListRowProps = HTMLAttributes<HTMLDivElement> & {
  selected?: boolean
  current?: boolean
  num?: ReactNode
  title: ReactNode
  meta?: ReactNode
  arabic?: ReactNode
  onSelect?: () => void
  action?: ReactNode
}

export function ListRow({
  action,
  arabic,
  className,
  current,
  meta,
  num,
  onSelect,
  selected,
  title,
  ...props
}: ListRowProps) {
  const content = (
    <>
      {num != null ? <span className="qar-react-list-row-num qar:text-muted qar:tabular-nums">{num}</span> : null}
      <span className="qar:block qar:min-w-0">
        <span className="qar-react-list-row-title">{title}</span>
        {meta ? <span className="qar-react-list-row-meta">{meta}</span> : null}
      </span>
      {arabic ? (
        <span className="qar-react-list-row-arabic" dir="rtl">
          {arabic}
        </span>
      ) : null}
    </>
  )
  return (
    <div
      className={cn('qar-react-list-row qar:gap-3 qar:min-h-11 qar:px-3 qar:py-2', className)}
      aria-current={current ? 'true' : undefined}
      data-current={current || undefined}
      data-selected={selected || undefined}
      {...props}
    >
      {onSelect ? (
        <button
          className={cn('qar-react-list-row-select qar:gap-3', action ? 'qar:col-span-2' : 'qar:col-span-full')}
          onClick={onSelect}
          type="button"
        >
          {content}
        </button>
      ) : (
        content
      )}
      {action ? <ListRowActions>{action}</ListRowActions> : null}
    </div>
  )
}

export type ListRowActionsProps = HTMLAttributes<HTMLDivElement>

export function ListRowActions({ className, ...props }: ListRowActionsProps) {
  return <div className={cn('qar:flex qar:shrink-0 qar:items-center qar:gap-1', className)} {...props} />
}

export type CardProps = HTMLAttributes<HTMLDivElement> & { title?: ReactNode }

export function Card({ title, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4 qar:text-text', className)}
      {...props}
    >
      {title ? <div className="qar:text-sm qar:font-semibold qar:text-text">{title}</div> : null}
      {children}
    </div>
  )
}
