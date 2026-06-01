import type { AnswerClaim, AnswerPreview, ClaimSupport, EvidenceCardLite, MatchCardLite } from '../../../shared/search'
import { Badge, Button } from '../ui'

type SearchAnswerPreviewProps = {
  preview: AnswerPreview | null
  allMatches: MatchCardLite[]
  allMatchesOpen: boolean
  canLoadAllMatches: boolean
  loadingAllMatches: boolean
  onOpenAllMatches: () => void
  onLoadMoreAllMatches: () => void
  onOpenInRead: (ref: string) => void
}

type PreviewCard = EvidenceCardLite | MatchCardLite

export function SearchAnswerPreview({
  preview,
  allMatches,
  allMatchesOpen,
  canLoadAllMatches,
  loadingAllMatches,
  onLoadMoreAllMatches,
  onOpenAllMatches,
  onOpenInRead,
}: SearchAnswerPreviewProps) {
  if (!preview) {
    return <p className="qar-search-results-empty">Enter a word, phrase, or ayah reference.</p>
  }

  const supportById = new Map(preview.claimSupports.map((support) => [support.id, support]))
  const supportedClaims = preview.claims.filter((claim) => supportById.get(claim.supportId)?.verdict === 'supported')
  const hasClaims = supportedClaims.length > 0

  return (
    <section aria-labelledby="search-answer-preview-title" className="qar-search-answer-preview">
      <div className="qar-search-answer-head">
        <div>
          <p className="qar-search-overview-eyebrow">Answer preview</p>
          <h2 className="qar-search-overview-title" id="search-answer-preview-title" dir="auto">
            <bdi>{preview.query}</bdi>
          </h2>
          <p className="qar-search-overview-mode">{answerModeLabel(preview)}</p>
        </div>
        <Badge>{sourceLabel(preview.searchPlan.primaryLens)}</Badge>
      </div>

      {hasClaims ? (
        <ol className="qar-search-answer-claims">
          {supportedClaims.map((claim) => (
            <li key={claim.id}>
              <p dir="auto">
                <bdi>{claim.text}</bdi>
              </p>
              <ClaimSupportChip claim={claim} support={supportById.get(claim.supportId)} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="qar-search-answer-limits" dir="auto">
          <bdi>{preview.recovery?.message ?? 'The available evidence is shown without answer prose.'}</bdi>
        </p>
      )}

      <section aria-labelledby="search-evidence-basis-title" className="qar-search-evidence-basis">
        <h3 id="search-evidence-basis-title">Evidence basis</h3>
        <dl className="qar-search-evidence-basis-grid">
          <EvidenceBasisItem label="Quran text" value={preview.evidenceBasis.quranText} />
          <EvidenceBasisItem label="Translation" value={preview.evidenceBasis.translation} />
          <EvidenceBasisItem label="Morphology" value={preview.evidenceBasis.morphology} />
        </dl>
        <p dir="auto">
          <bdi>{preview.evidenceBasis.note}</bdi>
        </p>
      </section>

      <section aria-labelledby="search-best-evidence-title" className="qar-search-best-evidence">
        <h3 id="search-best-evidence-title">Best evidence</h3>
        {preview.evidenceCards.length > 0 ? (
          <div className="qar-search-answer-card-list">
            {preview.evidenceCards.map((card) => (
              <PreviewEvidenceCard card={card} key={card.id} onOpenInRead={onOpenInRead} />
            ))}
          </div>
        ) : (
          <p className="qar-search-results-empty">No best evidence is available for this preview.</p>
        )}
      </section>

      {!allMatchesOpen ? (
        <div className="qar-search-answer-actions">
          <Button disabled={loadingAllMatches} onClick={onOpenAllMatches} size="sm" variant="secondary">
            {loadingAllMatches ? 'Loading matches' : 'Show all matches'}
          </Button>
        </div>
      ) : null}

      {allMatchesOpen ? (
        <section aria-labelledby="search-all-matches-title" className="qar-search-all-matches">
          <div className="qar-search-all-matches-head">
            <h3 id="search-all-matches-title">All matches</h3>
            {loadingAllMatches ? <span>Loading matches</span> : null}
          </div>
          {allMatches.length > 0 ? (
            <div className="qar-search-answer-card-list">
              {allMatches.map((card) => (
                <PreviewEvidenceCard card={card} key={card.id} onOpenInRead={onOpenInRead} />
              ))}
            </div>
          ) : (
            <p className="qar-search-results-empty">No matches are loaded yet.</p>
          )}
          {canLoadAllMatches ? (
            <Button disabled={loadingAllMatches} onClick={onLoadMoreAllMatches} size="sm" variant="secondary">
              {loadingAllMatches ? 'Loading more matches' : 'Load more matches'}
            </Button>
          ) : null}
        </section>
      ) : null}
    </section>
  )
}

function ClaimSupportChip({ claim, support }: { claim: AnswerClaim; support?: ClaimSupport }) {
  const count = support?.supportIds.length ?? 0
  return (
    <Badge className="qar-search-citation-chip">
      {count}
      {' '}
      {count === 1 ? 'citation' : 'citations'}
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

function PreviewEvidenceCard({ card, onOpenInRead }: { card: PreviewCard; onOpenInRead: (ref: string) => void }) {
  const readerAction = card.readerAction
  return (
    <article aria-label={`Evidence ${card.refLabel}`} className="qar-search-result-row">
      <div className="qar-search-result-row-head">
        <p className="qar-search-result-ref" dir="auto">
          <bdi>{card.refLabel}</bdi>
        </p>
        <Badge>{sourceLabel(card.snippetSource)}</Badge>
      </div>
      <div className="qar-search-result-passages">
        <p className="qar-search-result-snippet" dir="auto">
          <bdi>{card.snippet}</bdi>
        </p>
      </div>
      <p className="qar-search-result-why" dir="auto">
        <span>Matched:</span>
        {' '}
        <bdi>{card.matchReason}</bdi>
      </p>
      {readerAction.type !== 'unavailable' && readerAction.mappingWarning ? (
        <p className="qar-search-mapping-warning" dir="auto">
          <bdi>{readerAction.mappingWarning}</bdi>
        </p>
      ) : null}
      <div className="qar-search-result-actions">
        {readerAction.type !== 'unavailable' ? (
          <Button onClick={() => onOpenInRead(readerAction.type === 'open-source-in-reader' ? readerAction.sourceRef : readerAction.ref)} size="sm" variant="primary">
            Open in Read
          </Button>
        ) : null}
      </div>
    </article>
  )
}

function answerModeLabel(preview: AnswerPreview): string {
  if (preview.mode === 'answer') return 'Supported answer preview'
  if (preview.mode === 'partial-answer') return 'Partial answer with evidence limits'
  if (preview.mode === 'evidence-only') return 'Evidence shown without answer claims'
  return 'No answer claims available'
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
