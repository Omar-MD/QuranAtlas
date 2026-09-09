import * as AccordionPrimitive from '@radix-ui/react-accordion'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

export type TabsProps = {
  label: string
  items: Array<{ label: string; value: string; content: ReactNode }>
  defaultValue?: string
  onValueChange?: (value: string) => void
  value?: string
}

export function Tabs({ label, items, defaultValue, onValueChange, value }: TabsProps) {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue ?? items[0]?.value} onValueChange={onValueChange} value={value}>
      <TabsPrimitive.List
        aria-label={label}
        className="qar:inline-flex qar:rounded-control qar:border qar:border-border qar:bg-surface qar:p-1"
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            className="qar-react-tab-trigger qar:min-h-11 qar:rounded-control qar:px-3 qar:text-sm"
            key={item.value}
            value={item.value}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content
          aria-label={item.label}
          className="qar:pt-3 qar:text-sm qar:text-text"
          key={item.value}
          value={item.value}
        >
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
        <AccordionPrimitive.Item
          className="qar:border-b qar:border-border"
          key={item.value ?? item.title}
          value={item.value ?? String(index)}
        >
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="qar:flex qar:min-h-10 qar:w-full qar:items-center qar:justify-between qar:text-sm qar:text-text">
              {item.title}
              <ChevronDown aria-hidden="true" size={16} />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="qar:pb-3 qar:text-sm qar:text-muted">
            {item.content}
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  )
}
