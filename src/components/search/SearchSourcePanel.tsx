import type { SearchSourcesViewModel } from './search-presentation-model'
import { Status } from '../ui'

export function SearchSourcePanel({ sources }: { packVersion?: string; sources: SearchSourcesViewModel | null }) {
  if (!sources) {
    return <Status description="Run a search to inspect query sources." title="Search sources" tone="info" />
  }
  return (
    <div className="qar-react-search-source-panel">
      <SourceRows rows={sources.sourceRows} title="Search index" />
      <SourceRows rows={sources.mappingSummary} title="Reader mapping summary" />
      <SourceRows rows={sources.sourceNotes} title="Result boundary notes" />
    </div>
  )
}

function SourceRows({ rows, title }: { rows: Array<{ label: string; value: string }>; title: string }) {
  if (rows.length === 0) return null
  return (
    <section className="qar:grid qar:gap-2 qar:text-sm">
      <h3 className="qar:m-0 qar:text-sm qar:font-semibold">{title}</h3>
      <dl className="qar:grid qar:gap-2">
        {rows.map((row) => (
          <div className="qar:grid qar:gap-1" key={`${title}:${row.label}`}>
            <dt className="qar:text-muted">{row.label}</dt>
            <dd className="qar:m-0" dir="auto">
              <bdi>{row.value}</bdi>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
