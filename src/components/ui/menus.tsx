import * as AccordionPrimitive from '@radix-ui/react-accordion'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type DropdownMenuProps = {
  trigger: ReactNode
  items: Array<{ label: string; destructive?: boolean; disabled?: boolean; onSelect?: () => void }>
}

export function DropdownMenu({ trigger, items }: DropdownMenuProps) {
  return (
    <DropdownMenuPrimitive.Root modal={false}>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content className="qar:z-50 qar:min-w-40 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-1 qar:text-text qar:shadow-lg" sideOffset={8}>
          {items.map((item) => (
            <DropdownMenuPrimitive.Item
              className="qar:rounded-control qar:px-3 qar:py-2 qar:text-sm qar:outline-none qar:focus:bg-canvas qar:data-[disabled]:opacity-50"
              data-destructive={item.destructive ? 'true' : undefined}
              disabled={item.disabled}
              key={item.label}
              onSelect={item.onSelect}
            >
              {item.label}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

export type TabsProps = {
  label: string
  items: Array<{ label: string; value: string; content: ReactNode }>
  defaultValue?: string
}

export function Tabs({ label, items, defaultValue }: TabsProps) {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue ?? items[0]?.value}>
      <TabsPrimitive.List aria-label={label} className="qar:inline-flex qar:rounded-control qar:border qar:border-border qar:bg-surface qar:p-1">
        {items.map((item) => (
          <TabsPrimitive.Trigger className="qar:min-h-9 qar:rounded-control qar:px-3 qar:text-sm qar:data-[state=active]:bg-accent qar:data-[state=active]:text-surface" key={item.value} value={item.value}>
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content aria-label={item.label} className="qar:pt-3 qar:text-sm qar:text-text" key={item.value} value={item.value}>
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}

export type AccordionProps = {
  items: Array<{ title: string; content: ReactNode; value?: string }>
}

export function Accordion({ items }: AccordionProps) {
  return (
    <AccordionPrimitive.Root collapsible type="single">
      {items.map((item, index) => (
        <AccordionPrimitive.Item className="qar:border-b qar:border-border" key={item.value ?? item.title} value={item.value ?? String(index)}>
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="qar:flex qar:min-h-10 qar:w-full qar:items-center qar:justify-between qar:text-sm qar:text-text">
              {item.title}
              <ChevronDown aria-hidden="true" size={16} />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="qar:pb-3 qar:text-sm qar:text-muted">{item.content}</AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  )
}

export type CommandProps = {
  label: string
  items: Array<{ label: string; icon?: LucideIcon; onSelect?: () => void }>
}

export function Command({ label, items }: CommandProps) {
  return (
    <div aria-label={label} className="qar:grid qar:gap-1 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-1" role="listbox">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button className="qar:flex qar:min-h-9 qar:items-center qar:gap-2 qar:rounded-control qar:px-3 qar:text-left qar:text-sm qar:text-text qar:hover:bg-canvas qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus" key={item.label} onClick={item.onSelect} role="option" type="button">
            {Icon ? <Icon aria-hidden="true" size={16} /> : null}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
