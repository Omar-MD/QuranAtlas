import { ArrowLeft } from 'lucide-react'
import { forwardRef, type ReactNode } from 'react'

import { Button, IconButton } from '../ui'
import type { MatchCardLite } from '../../../shared/search'
import type { SearchDetailsViewModel, SearchExploreModuleId } from './search-presentation-model'

export const SearchResultDetail = forwardRef<
  HTMLElement,
  {
    details: SearchDetailsViewModel | null
    previewMatch?: MatchCardLite | null
    onClose?: () => void
    onOpenExplore?: (result: SearchDetailsViewModel['result'], module?: SearchExploreModuleId) => void
  }
>(function SearchResultDetail({ details, onClose, onOpenExplore, previewMatch }, ref) {
  if (!details && !previewMatch) {
    return (
      <section aria-label="Search result detail" className="qar-search-result-detail" ref={ref} tabIndex={-1}>
        <p className="qar:m-0 qar:text-sm qar:text-muted">Choose a verse and open Details to inspect why it matched.</p>
      </section>
    )
  }

  if (previewMatch) {
    return (
      <section
        aria-label={`Details for ${previewMatch.refLabel}`}
        className="qar-search-result-detail"
        ref={ref}
        tabIndex={-1}
      >
        <div className="qar:flex qar:items-start qar:justify-between qar:gap-3">
          <div>
            <p className="qar:m-0 qar:text-xs qar:font-semibold qar:uppercase qar:text-muted">Details</p>
            <h3 className="qar:m-0 qar:text-lg qar:leading-tight" dir="auto">
              <bdi>{previewMatch.title}</bdi>
            </h3>
          </div>
          {onClose ? (
            <IconButton className="qar-search-detail-back" label="Back to search results" onClick={onClose}>
              <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.75} />
            </IconButton>
          ) : null}
        </div>
        <DetailSection title="Why this matched">
          <p className="qar:m-0" dir="auto">
            <bdi>{previewMatch.matchReason}</bdi>
          </p>
        </DetailSection>
        <DetailRows
          rows={[
            { label: 'Reference', value: previewMatch.refLabel },
            { label: 'Source', value: previewMatch.sourceText ?? previewMatch.snippet },
            ...(previewMatch.translationText ? [{ label: 'Translation', value: previewMatch.translationText }] : []),
          ]}
          title="Evidence"
        />
      </section>
    )
  }

  if (!details) return null

  return (
    <section aria-label={`Details for ${details.title}`} className="qar-search-result-detail" ref={ref} tabIndex={-1}>
      <div className="qar:flex qar:items-start qar:justify-between qar:gap-3">
        <div>
          <p className="qar:m-0 qar:text-xs qar:font-semibold qar:uppercase qar:text-muted">Details</p>
          <h3 className="qar:m-0 qar:text-lg qar:leading-tight" dir="auto">
            <bdi>{details.title}</bdi>
          </h3>
        </div>
        {onClose ? (
          <>
            <IconButton className="qar-search-detail-back" label="Back to search results" onClick={onClose}>
              <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.75} />
            </IconButton>
            <Button className="qar-search-detail-close" onClick={onClose} size="sm" variant="ghost">
              Close
            </Button>
          </>
        ) : null}
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
    </section>
  )
})

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
            <dd className="qar:m-0" dir="auto">
              <bdi>{row.value}</bdi>
            </dd>
          </div>
        ))}
      </dl>
    </DetailSection>
  )
}
