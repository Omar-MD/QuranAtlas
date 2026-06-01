import type { ReactNode } from 'react'

import { Button } from '../ui'
import type { SearchDetailsViewModel, SearchExploreModuleId } from './search-presentation-model'

export function SearchResultDetail({
  details,
  onClose,
  onOpenExplore,
}: {
  details: SearchDetailsViewModel | null
  onClose?: () => void
  onOpenExplore?: (result: SearchDetailsViewModel['result'], module?: SearchExploreModuleId) => void
}) {
  if (!details) {
    return (
      <div aria-label="Search result detail" className="qar-search-result-detail" role="group">
        <p className="qar:m-0 qar:text-sm qar:text-muted">Choose a verse and open Details to inspect why it matched.</p>
      </div>
    )
  }

  return (
    <div aria-label={`Details for ${details.title}`} className="qar-search-result-detail" role="group">
      <div className="qar:flex qar:items-start qar:justify-between qar:gap-3">
        <div>
          <p className="qar:m-0 qar:text-xs qar:font-semibold qar:uppercase qar:text-muted">Details</p>
          <h3 className="qar:m-0 qar:text-lg qar:leading-tight" dir="auto">
            <bdi>{details.title}</bdi>
          </h3>
        </div>
        {onClose ? <Button onClick={onClose} size="sm" variant="ghost">Close</Button> : null}
      </div>
      <DetailSection title="Why this matched">
        <p className="qar:m-0" dir="auto">
          <bdi>{details.whyMatched}</bdi>
        </p>
        {details.alsoMatched.length > 0 ? (
          <p className="qar:m-0 qar:text-sm qar:text-muted" dir="auto">
            Also matched: <bdi>{details.alsoMatched.join(', ')}</bdi>
          </p>
        ) : null}
        {onOpenExplore ? (
          <Button onClick={() => onOpenExplore(details.result, 'selected-token')} size="sm" variant="secondary">
            Explore selected result
          </Button>
        ) : null}
      </DetailSection>
      <DetailRows rows={details.textRows} title="Texts" />
      <DetailRows rows={details.readerMappingRows} title="Reader mapping" />
      <DetailRows rows={details.evidenceRows} title="Evidence" />
      <DetailRows rows={details.sourceRows} title="Sources" />
    </div>
  )
}

function DetailSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="qar:grid qar:gap-2">
      <h4 className="qar:m-0 qar:text-sm qar:font-semibold">{title}</h4>
      {children}
    </section>
  )
}

function DetailRows({ rows, title }: { rows: Array<{ label: string; value: string }>; title: string }) {
  if (rows.length === 0) return null
  return (
    <DetailSection title={title}>
      <dl className="qar:grid qar:gap-2">
        {rows.map((row) => (
          <div className="qar:grid qar:gap-1" key={`${title}:${row.label}`}>
            <dt className="qar:text-xs qar:text-muted">{row.label}</dt>
            <dd className="qar:m-0" dir="auto"><bdi>{row.value}</bdi></dd>
          </div>
        ))}
      </dl>
    </DetailSection>
  )
}
