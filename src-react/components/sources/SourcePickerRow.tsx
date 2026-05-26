import { Badge, Button } from '../ui'

export function SourcePickerRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="qar:flex qar:items-center qar:justify-between qar:gap-3 qar:border-b qar:border-border qar:py-2">
      <div>
        <p className="qar:m-0 qar:text-sm qar:text-text">{label}</p>
        <p className="qar:m-0 qar:text-xs qar:text-muted">{status}</p>
      </div>
      <div className="qar:flex qar:items-center qar:gap-2">
        <Badge tone={status === 'Active' ? 'success' : 'neutral'}>{status}</Badge>
        {status !== 'Active' && <Button size="sm" variant="secondary">Install</Button>}
      </div>
    </div>
  )
}
