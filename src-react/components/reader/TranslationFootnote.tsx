import { useState } from 'react'

import { Button } from '../ui'

export function TranslationFootnote({ marker, text }: { marker: string; text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="qar:inline-grid qar:gap-1">
      <Button aria-expanded={open} onClick={() => setOpen((value) => !value)} size="sm" variant="ghost">
        [{marker}]
      </Button>
      {open && <span className="qar:rounded-control qar:border qar:border-border qar:bg-surface qar:p-2 qar:text-sm qar:text-muted">{text}</span>}
    </span>
  )
}
