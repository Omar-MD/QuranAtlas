import { Button } from '../ui'

export function TranslationFootnote({
  controlsId,
  marker,
  onToggle,
  open,
}: {
  controlsId?: string
  marker: string
  onToggle: () => void
  open: boolean
}) {
  return (
    <Button
      aria-controls={controlsId}
      aria-expanded={open}
      aria-label={`Footnote ${marker}`}
      className="qar-reader-fn-marker"
      onClick={onToggle}
      size="sm"
      variant="ghost"
    >
      [{marker}]
    </Button>
  )
}
