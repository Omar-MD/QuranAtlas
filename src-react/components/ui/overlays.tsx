import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from './button'

type OverlayBaseProps = {
  title: string
  trigger: ReactNode
  children: ReactNode
}

function CloseButton() {
  return (
    <DialogPrimitive.Close asChild>
      <Button aria-label="Close" size="sm" variant="ghost">
        <X aria-hidden="true" size={16} />
      </Button>
    </DialogPrimitive.Close>
  )
}

export type DialogProps = OverlayBaseProps
export function Dialog({ title, trigger, children }: DialogProps) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="qar:fixed qar:inset-0 qar:z-40 qar:bg-text/30" />
        <DialogPrimitive.Content aria-describedby={undefined} className="qar:fixed qar:left-1/2 qar:top-1/2 qar:z-50 qar:grid qar:w-96 qar:max-w-full qar:-translate-x-1/2 qar:-translate-y-1/2 qar:gap-4 qar:rounded-surface qar:border qar:border-border qar:bg-canvas qar:p-5 qar:text-text qar:shadow-lg">
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

export type SheetProps = OverlayBaseProps
export function Sheet({ title, trigger, children }: SheetProps) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="qar:fixed qar:inset-0 qar:z-40 qar:bg-text/30" />
        <DialogPrimitive.Content aria-describedby={undefined} className="qar:fixed qar:bottom-0 qar:left-0 qar:right-0 qar:z-50 qar:grid qar:max-h-screen qar:gap-4 qar:rounded-t-surface qar:border qar:border-border qar:bg-canvas qar:p-5 qar:text-text qar:shadow-lg md:qar:left-auto md:qar:top-0 md:qar:w-96 md:qar:rounded-l-surface md:qar:rounded-t-none">
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

export type PopoverProps = PopoverPrimitive.PopoverProps & {
  trigger: ReactNode
  children: ReactNode
}

export function Popover({ trigger, children, ...props }: PopoverProps) {
  return (
    <PopoverPrimitive.Root {...props}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content className="qar:z-50 qar:max-w-sm qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-3 qar:text-sm qar:text-text qar:shadow-lg" sideOffset={8}>
          {children}
          <PopoverPrimitive.Arrow className="qar:fill-surface" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export type ToastProps = ToastPrimitive.ToastProps & {
  title: string
  description?: string
}

export function Toast({ title, description, ...props }: ToastProps) {
  return (
    <ToastPrimitive.Provider>
      <ToastPrimitive.Root className="qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-3 qar:text-text qar:shadow-lg" {...props}>
        <ToastPrimitive.Title className="qar:text-sm qar:font-semibold">{title}</ToastPrimitive.Title>
        {description ? <ToastPrimitive.Description className="qar:text-sm qar:text-muted">{description}</ToastPrimitive.Description> : null}
      </ToastPrimitive.Root>
      <ToastPrimitive.Viewport className="qar:fixed qar:bottom-4 qar:right-4 qar:z-50 qar:grid qar:w-80 qar:gap-2" />
    </ToastPrimitive.Provider>
  )
}
