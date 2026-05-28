import { Badge } from '../ui'

export function AssetRow({ label, status }: { label: string; status: 'included' | 'unavailable' }) {
  return (
    <div className="qar:grid qar:gap-2 qar:border-b qar:border-border qar:py-3">
      <div className="qar:flex qar:items-center qar:justify-between qar:gap-3">
        <span className="qar:text-sm qar:text-text">{label}</span>
        <Badge tone={status === 'included' ? 'success' : 'neutral'}>{status}</Badge>
      </div>
    </div>
  )
}
