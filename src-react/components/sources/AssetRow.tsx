import { Badge, Button, Progress } from '../ui'

export function AssetRow({ label, progress = 100, status }: { label: string; progress?: number; status: 'installed' | 'missing' | 'installing' | 'failed' }) {
  return (
    <div className="qar:grid qar:gap-2 qar:border-b qar:border-border qar:py-3">
      <div className="qar:flex qar:items-center qar:justify-between qar:gap-3">
        <span className="qar:text-sm qar:text-text">{label}</span>
        <Badge tone={status === 'installed' ? 'success' : status === 'failed' ? 'danger' : 'neutral'}>{status}</Badge>
      </div>
      {status === 'installing' && <Progress label={`${label} install progress`} value={progress} />}
      {status !== 'installed' && <Button size="sm" variant="secondary">Manage</Button>}
    </div>
  )
}
