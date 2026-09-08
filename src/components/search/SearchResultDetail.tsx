import { ArrowLeft } from 'lucide-react'
import { forwardRef, type ReactNode } from 'react'

import { Button, Card, IconButton } from '../ui'
import type { MatchCardLite } from '../../../shared/search'
import type { SearchDetailsViewModel, SearchExploreModuleId } from './search-presentation-model'
import { useMediaQuery } from './useMediaQuery'

export const SearchResultDetail = forwardRef<
  HTMLDivElement,
  {
    details: SearchDetailsViewModel | null
    previewMatch?: MatchCardLite | null
    onClose?: () => void
    onOpenExplore?: (result: SearchDetailsViewModel['result'], module?: SearchExploreModuleId) => void
  }
>(function SearchResultDetail({ details, onClose, onOpenExplore, previewMatch }, ref) {
  // D-M4: the mobile/desktop close split is conditional render, not a CSS
  // display rule a utility layer could override.
  const isMobileViewport = useMediaQuery('(max-width: 767px)')

  if (!details && !previewMatch) {
    return (
      <Card
        aria-label="Search result detail"
        className="qar-react-search-result-detail"
        ref={ref}
        role="region"
        tabIndex={-1}
      >
        <p className="qar:m-0 qar:text-sm qar:text-muted">Choose a verse and open Details to inspect why it matched.</p>
      </Card>
    )
  }

  const closeControl = onClose ? (
    isMobileViewport ? (
      <IconButton label="Back to search results" onClick={onClose}>
        <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.75} />
      </IconButton>
    ) : (
      <Button onClick={onClose} size="sm" variant="ghost">
        Close
      </Button>
    )
  ) : null

  if (previewMatch) {
    return (
      <Card
        aria-label={`Details for ${previewMatch.refLabel}`}
        className="qar-react-search-result-detail"
        ref={ref}
        role="region"
        tabIndex={-1}
      >
        <div className="qar:flex qar:items-start qar:justify-between qar:gap-3">
          <div>
            <p className="qar:m-0 qar:text-xs qar:font-semibold qar:uppercase qar:text-muted">Details</p>
            <h3 className="qar:m-0 qar:text-lg qar:leading-tight" dir="auto">
              <bdi>{previewMatch.title}</bdi>
            </h3>
          </div>
          {closeControl}
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
      </Card>
    )
  }

  if (!details) return null

  return (
    <Card
      aria-label={`Details for ${details.title}`}
      className="qar-react-search-result-detail"
      ref={ref}
      role="region"
      tabIndex={-1}
    >
      <div className="qar:flex qar:items-start qar:justify-between qar:gap-3">
        <div>
          <p className="qar:m-0 qar:text-xs qar:font-semibold qar:uppercase qar:text-muted">Details</p>
          <h3 className="qar:m-0 qar:text-lg qar:leading-tight" dir="auto">
            <bdi>{details.title}</bdi>
          </h3>
        </div>
        {closeControl}
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
    </Card>
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
