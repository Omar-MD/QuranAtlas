import { ArrowUpRight } from 'lucide-react'
import { forwardRef } from 'react'

import type { AnswerClaim, AnswerPreview, ClaimSupport, EvidenceCardLite, MatchCardLite } from '../../../shared/search'
import { Badge, Button, Card, IconButton, ListRow, ListRowActions, Status, Tooltip } from '../ui'
import { previewIsAskIntent } from './search-presentation-model'
import { SearchResultDetail } from './SearchResultDetail'

type SearchAnswerPreviewProps = {
  allMatches: MatchCardLite[]
  allMatchesOpen: boolean
  canLoadAllMatches: boolean
  loadingAllMatches: boolean
  onLoadMoreAllMatches: () => void
  onOpenAllMatches: () => void
  onOpenInRead: (ref: string) => void
  onCloseMatch: () => void
  onSelectMatch?: (match: MatchCardLite, trigger: HTMLButtonElement) => void
  preview: AnswerPreview | null
  selectedMatch?: MatchCardLite | null
}

type PreviewCard = EvidenceCardLite | MatchCardLite

export const SearchAnswerPreview = forwardRef<HTMLDivElement, SearchAnswerPreviewProps>(function SearchAnswerPreview(
  {
    preview,
    allMatches,
    allMatchesOpen,
    canLoadAllMatches,
    loadingAllMatches,
    onLoadMoreAllMatches,
    onOpenAllMatches,
    onOpenInRead,
    onSelectMatch,
    onCloseMatch,
    selectedMatch,
  },
  ref,
) {
  if (!preview) {
    return <Status description="Enter a word, phrase, or ayah reference." title="Search the Quran" tone="info" />
  }

  const supportById = new Map(preview.claimSupports.map((support) => [support.id, support]))
  const supportedClaims = preview.claims.filter((claim) => supportById.get(claim.supportId)?.verdict === 'supported')
  const hasClaims = supportedClaims.length > 0
  // Lane contract (brief §5): the apology copy below is ask-lane-only; a
  // lookup's match list is its evidence.
  const askLane = previewIsAskIntent(preview)

  return (
    <Card
      aria-labelledby="search-answer-preview-title"
      className="qar-react-search-answer-preview"
      data-mobile-details={selectedMatch ? 'true' : 'false'}
    >
      <div className="qar-react-search-answer-head">
        <div>
          <p className="qar-react-search-overview-eyebrow">Answer preview</p>
          <h2 className="qar-react-search-overview-title" id="search-answer-preview-title" dir="auto">
            <bdi>{preview.query}</bdi>
          </h2>
          <p className="qar-react-search-overview-mode">{answerModeLabel(preview)}</p>
        </div>
        <Badge>{sourceLabel(preview.searchPlan.primaryLens)}</Badge>
      </div>

      {hasClaims ? (
        <ol className="qar-react-search-answer-claims">
          {supportedClaims.map((claim) => (
            <li key={claim.id}>
              <p dir="auto">
                <bdi>{claim.text}</bdi>
              </p>
              <ClaimSupportChip claim={claim} support={supportById.get(claim.supportId)} />
            </li>
          ))}
        </ol>
      ) : askLane ? (
        <Status
          description="The sources on this device do not contain enough evidence to answer this as a question. The matching verses are shown below."
          title="No supported answer"
          tone="info"
        />
      ) : null}

      <Card aria-labelledby="search-evidence-basis-title" className="qar-react-search-evidence-basis">
        <h3 id="search-evidence-basis-title">Evidence basis</h3>
        <dl className="qar-react-search-evidence-basis-grid">
          <EvidenceBasisItem label="Quran text" value={preview.evidenceBasis.quranText} />
          <EvidenceBasisItem label="Translation" value={preview.evidenceBasis.translation} />
          <EvidenceBasisItem label="Morphology" value={preview.evidenceBasis.morphology} />
        </dl>
        <p dir="auto">
          <bdi>{preview.evidenceBasis.note}</bdi>
        </p>
      </Card>

      {preview.evidenceCards.length > 0 ? (
        <section aria-labelledby="search-best-evidence-title" className="qar-react-search-best-evidence">
          <h3 id="search-best-evidence-title">Best evidence</h3>
          <div className="qar-react-search-answer-card-list">
            {preview.evidenceCards.map((card) => (
              <PreviewEvidenceCard card={card} key={card.id} onOpenInRead={onOpenInRead} />
            ))}
          </div>
        </section>
      ) : askLane ? (
        <section aria-labelledby="search-best-evidence-title" className="qar-react-search-best-evidence">
          <h3 id="search-best-evidence-title">Best evidence</h3>
          <Status description="No best evidence is available for this preview." title="No best evidence" tone="info" />
        </section>
      ) : null}

      {!allMatchesOpen ? (
        <div className="qar-react-search-answer-actions">
          <Button disabled={loadingAllMatches} onClick={onOpenAllMatches} size="sm" variant="secondary">
            {loadingAllMatches ? 'Loading matches' : 'Show all matches'}
          </Button>
        </div>
      ) : null}

      {allMatchesOpen ? (
        <section aria-labelledby="search-all-matches-title" className="qar-react-search-all-matches">
          <div className="qar-react-search-all-matches-head">
            <h3 id="search-all-matches-title">All matches</h3>
            {loadingAllMatches ? <span>Loading matches</span> : null}
          </div>
          {allMatches.length > 0 ? (
            <div className="qar-react-search-answer-card-list">
              {allMatches.map((card) => (
                <PreviewEvidenceCard
                  card={card}
                  current={selectedMatch?.id === card.id}
                  key={card.id}
                  onOpenInRead={onOpenInRead}
                  onSelectMatch={onSelectMatch}
                  previewMatch={card}
                />
              ))}
            </div>
          ) : (
            <Status description="No matches are loaded yet." title="No matches" tone="info" />
          )}
          {canLoadAllMatches ? (
            <Button disabled={loadingAllMatches} onClick={onLoadMoreAllMatches} size="sm" variant="secondary">
              {loadingAllMatches ? 'Loading more matches' : 'Load more matches'}
            </Button>
          ) : null}
        </section>
      ) : null}
      {selectedMatch ? (
        <SearchResultDetail details={null} onClose={onCloseMatch} previewMatch={selectedMatch} ref={ref} />
      ) : null}
    </Card>
  )
})

function ClaimSupportChip({ claim, support }: { claim: AnswerClaim; support?: ClaimSupport }) {
  const count = support?.supportIds.length ?? 0
  return (
    <Badge className="qar-react-search-citation-chip">
      {count} {count === 1 ? 'citation' : 'citations'}
      {' · '}
      {claimSourceLabel(claim)}
    </Badge>
  )
}

function EvidenceBasisItem({ label, value }: { label: string; value: AnswerPreview['evidenceBasis']['quranText'] }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{evidenceBasisLabel(value)}</dd>
    </div>
  )
}

function PreviewEvidenceCard({
  card,
  current,
  onOpenInRead,
  onSelectMatch,
  previewMatch,
}: {
  card: PreviewCard
  current?: boolean
  onOpenInRead: (ref: string) => void
  onSelectMatch?: (match: MatchCardLite, trigger: HTMLButtonElement) => void
  previewMatch?: MatchCardLite
}) {
  const readerAction = card.readerAction
  const primary = card.sourceText ?? card.snippet
  const secondary = card.translationText && card.translationText !== primary ? card.translationText : undefined
  return (
    <ListRow
      action={
        <ListRowActions>
          {readerAction.type !== 'unavailable' ? (
            <Tooltip content="Open in Reader">
              <IconButton
                label={`Open ${card.refLabel} in Reader`}
                onClick={() =>
                  onOpenInRead(
                    readerAction.type === 'open-source-in-reader' ? readerAction.sourceRef : readerAction.ref,
                  )
                }
              >
                <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.75} />
              </IconButton>
            </Tooltip>
          ) : null}
          {previewMatch && onSelectMatch ? (
            <Button onClick={(event) => onSelectMatch(previewMatch, event.currentTarget)} size="sm" variant="secondary">
              Details
            </Button>
          ) : null}
        </ListRowActions>
      }
      aria-label={`Evidence ${card.refLabel}`}
      current={current}
      meta={secondary ? <bdi>{secondary}</bdi> : undefined}
      num={card.refLabel}
      title={<bdi>{primary}</bdi>}
    />
  )
}

function answerModeLabel(preview: AnswerPreview): string {
  if (preview.mode === 'answer') return 'Answer preview'
  if (preview.mode === 'partial-answer') return 'Partial answer'
  if (preview.mode === 'evidence-only') return 'Evidence only'
  return 'No answer available'
}

function evidenceBasisLabel(value: AnswerPreview['evidenceBasis']['quranText']): string {
  if (value === 'used') return 'Used'
  if (value === 'available-not-used') return 'Available, not used'
  return 'Not available'
}

function claimSourceLabel(claim: AnswerClaim): string {
  if (claim.attribution === 'quran-mentions') return 'Quran mentions'
  if (claim.attribution === 'quran-states') return 'Quran states'
  if (claim.attribution === 'translation-renders') return 'Translation renders'
  return 'Morphology analyzes'
}

function sourceLabel(value: string): string {
  if (value === 'quran-text') return 'Quran text'
  if (value === 'translation') return 'Translation'
  if (value === 'deterministic-template') return 'Deterministic template'
  if (value === 'morphology') return 'Morphology'
  if (value === 'phrase') return 'Phrase'
  if (value === 'reference') return 'Reference'
  return 'Mixed'
}
