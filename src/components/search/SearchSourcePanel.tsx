import type { SearchResultDto } from '../../search/schema'
import { mappingLabel } from './search-labels'

export function SearchSourcePanel({
  packVersion,
  result,
}: {
  packVersion?: string
  result: SearchResultDto
}) {
  return (
    <div className="qar:grid qar:gap-3 qar:text-sm">
      <dl className="qar:grid qar:gap-2">
        <div className="qar:grid qar:gap-1">
          <dt className="qar:text-muted">Source ref</dt>
          <dd className="qar:m-0" dir="auto">{result.sourceRef}</dd>
        </div>
        <div className="qar:grid qar:gap-1">
          <dt className="qar:text-muted">Mapping state</dt>
          <dd className="qar:m-0" dir="auto">{mappingLabel(result.mappingState)}</dd>
        </div>
        <div className="qar:grid qar:gap-1">
          <dt className="qar:text-muted">Pack version</dt>
          <dd className="qar:m-0" dir="auto">{packVersion ?? 'Active Search index'}</dd>
        </div>
      </dl>
      <div className="qar:grid qar:gap-2 qar:rounded-surface qar:border qar:border-border qar:bg-canvas qar:p-3">
        <p className="qar:m-0">Search analysis currently uses a Hafs text source for word forms, roots, morphology, and wording patterns. The Reader opens verses in the Qalun text.</p>
        <p className="qar:m-0">Open in Read always uses the verified Reader text.</p>
        <p className="qar:m-0">Results show attested wording in the indexed Quran text. They are not generated suggestions, paraphrases, or tafsir.</p>
        <p className="qar:m-0">Same-root matches are morphological aids. They do not mean the verses have the same interpretation.</p>
        {result.morphology ? (
          <>
            <p className="qar:m-0">Hafs source only</p>
            <p className="qar:m-0">Word-level match not available in Reader text</p>
          </>
        ) : null}
      </div>
    </div>
  )
}
