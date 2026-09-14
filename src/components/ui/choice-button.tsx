import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '../../design-system/utils/cn'

// Plain choice button: a bare button element for custom selection treatments
// (theme swatches, fit thumbnails, edition rows, chrome triggers) that need
// radio/pressed semantics without a tier fill. Styling comes from the
// design-system classes the consumer passes.
export type ChoiceButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}

export function ChoiceButton({ className, children, type = 'button', onKeyDown, ...props }: ChoiceButtonProps) {
  return (
    <button
      className={cn(className)}
      type={type}
      {...props}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || props.role !== 'radio') return
        const direction = ['ArrowRight', 'ArrowDown'].includes(event.key)
          ? 1
          : ['ArrowLeft', 'ArrowUp'].includes(event.key)
            ? -1
            : 0
        if (!direction) return
        const radios = Array.from(
          event.currentTarget
            .closest('[role="radiogroup"]')
            ?.querySelectorAll<HTMLButtonElement>('button[role="radio"]:not(:disabled)') ?? [],
        )
        const index = radios.indexOf(event.currentTarget)
        if (index < 0) return
        event.preventDefault()
        const next = radios[(index + direction + radios.length) % radios.length]
        next?.focus()
        next?.click()
      }}
    >
      {children}
    </button>
  )
}
