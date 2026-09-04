import { useId, useState, type ReactNode } from 'react'

export type DisclosureProps = {
  title: string
  children: ReactNode
}

export function Disclosure({ title, children }: DisclosureProps) {
  const [open, setOpen] = useState(false)
  const contentId = useId()
  return (
    <div className="qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-3">
      <button
        aria-controls={contentId}
        aria-expanded={open}
        className="qar:w-full qar:cursor-pointer qar:text-left qar:text-sm qar:font-medium qar:text-text qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {title}
      </button>
      {open ? (
        <div className="qar:pt-2 qar:text-sm qar:text-muted" id={contentId}>
          {children}
        </div>
      ) : null}
    </div>
  )
}
