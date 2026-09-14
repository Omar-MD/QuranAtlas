import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useRef, useState, type ReactNode, type RefObject } from 'react'

import { cn } from '../../design-system/utils/cn'
import { Button } from './button'

type OverlayBaseProps = {
  title: string
  children: ReactNode
  contentClassName?: string
  onOpenChange?: (open: boolean) => void
  open?: boolean
  trigger?: ReactNode
}

export type DialogProps = OverlayBaseProps & {
  initialFocusRef?: RefObject<HTMLElement | null>
}

function CloseButton({ label = 'Close' }: { label?: string }) {
  return (
    <DialogPrimitive.Close asChild>
      <Button aria-label={label} size="sm" variant="ghost">
        <X aria-hidden="true" size={16} />
      </Button>
    </DialogPrimitive.Close>
  )
}

export function Dialog({
  contentClassName,
  initialFocusRef,
  title,
  trigger,
  children,
  onOpenChange,
  open,
}: DialogProps) {
  const invoker = useRef<HTMLElement | null>(null)
  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="qar:fixed qar:inset-0 qar:z-[125] qar-react-scrim" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={`qar:fixed qar:left-1/2 qar:top-1/2 qar:z-[130] qar:grid qar:w-96 qar:max-w-full qar:-translate-x-1/2 qar:-translate-y-1/2 qar:gap-4 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-5 qar:text-text qar-react-overlay-shadow${contentClassName ? ` ${contentClassName}` : ''}`}
          onCloseAutoFocus={(event) => {
            if (invoker.current?.isConnected) {
              event.preventDefault()
              invoker.current.focus({ preventScroll: true })
            }
          }}
          onOpenAutoFocus={(event) => {
            invoker.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
            if (!initialFocusRef?.current) return
            event.preventDefault()
            initialFocusRef.current.focus({ preventScroll: true })
          }}
        >
          <div className="qar:flex qar:items-center qar:justify-between qar:gap-3">
            <DialogPrimitive.Title className="qar:m-0 qar:text-base qar:font-semibold">{title}</DialogPrimitive.Title>
            <CloseButton />
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function SheetBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('qar-react-sheet-body', className)}>{children}</div>
}
export type SheetProps = OverlayBaseProps & {
  closeLabel?: string
  returnFocusId?: string
  suppressCloseAutoFocus?: boolean
  variant?: 'default' | 'adaptive-settings' | 'navigation-drawer'
}

export function Sheet({
  children,
  closeLabel,
  contentClassName,
  onOpenChange,
  open,
  returnFocusId,
  suppressCloseAutoFocus = false,
  title,
  trigger,
  variant = 'default',
}: SheetProps) {
  const invoker = useRef<HTMLElement | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const [expanded, setExpanded] = useState(false)
  const isNavigationDrawer = variant === 'navigation-drawer'
  // S6: the navigation drawer is unambiguously modal everywhere — scrim,
  // focus trap, Esc close; Radix owns the trap for every variant.
  return (
    <DialogPrimitive.Root
      modal
      onOpenChange={(nextOpen) => {
        onOpenChange?.(nextOpen)
      }}
      open={open}
    >
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={
            isNavigationDrawer
              ? 'qar:fixed qar:inset-0 qar:z-40 qar-react-scrim qar-react-sheet-scrim'
              : 'qar:fixed qar:inset-0 qar:z-[125] qar-react-scrim'
          }
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={
            isNavigationDrawer
              ? `qar-react-sheet-drawer qar:gap-4${contentClassName ? ` ${contentClassName}` : ''}`
              : `qar:fixed qar:bottom-0 qar:left-0 qar:right-0 qar:z-[130] qar:grid qar:max-h-screen qar-react-bottom-sheet qar:gap-4 qar:rounded-t-surface qar:border qar:border-border qar:bg-surface qar:p-5 qar:text-text qar-react-overlay-shadow md:qar:left-auto md:qar:top-0 md:qar:w-96 md:qar:rounded-l-surface md:qar:rounded-t-none${contentClassName ? ` ${contentClassName}` : ''}`
          }
          data-sheet-variant={variant}
          data-expanded={expanded ? 'true' : 'false'}
          onOpenAutoFocus={() => {
            invoker.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          }}
          onCloseAutoFocus={(event) => {
            // Route-transition closes hand focus to the destination route.
            if (suppressCloseAutoFocus) {
              event.preventDefault()
              return
            }
            if (variant !== 'adaptive-settings' && !returnFocusId && invoker.current?.isConnected) {
              event.preventDefault()
              invoker.current.focus({ preventScroll: true })
              return
            }
            const targetIds = [returnFocusId, 'chrome-settings-trigger', 'reader-settings-trigger', 'reader-main']
            const target = targetIds
              .filter((id): id is string => Boolean(id))
              .map((id) => document.getElementById(id))
              .find((element): element is HTMLElement => element instanceof HTMLElement && element.isConnected)
            if (!target) return
            event.preventDefault()
            target.focus({ preventScroll: true })
          }}
        >
          {isNavigationDrawer ? (
            <DialogPrimitive.Title className="qar:sr-only">{title}</DialogPrimitive.Title>
          ) : (
            <div
              className="qar:flex qar:items-center qar:justify-between qar:gap-3 qar-react-sheet-handle"
              onPointerDown={(event) => {
                if (variant !== 'default' || (event.target as HTMLElement).closest('button')) return
                dragStart.current = { x: event.clientX, y: event.clientY }
                event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onPointerUp={(event) => {
                const start = dragStart.current
                dragStart.current = null
                if (!start || Math.abs(event.clientX - start.x) > Math.abs(event.clientY - start.y)) return
                const delta = event.clientY - start.y
                if (delta < -60) setExpanded(true)
                if (delta > 60) {
                  if (expanded) setExpanded(false)
                  else onOpenChange?.(false)
                }
              }}
              onPointerCancel={() => {
                dragStart.current = null
              }}
            >
              <DialogPrimitive.Title className="qar:m-0 qar:text-base qar:font-semibold">{title}</DialogPrimitive.Title>
              <CloseButton label={closeLabel} />
            </div>
          )}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
