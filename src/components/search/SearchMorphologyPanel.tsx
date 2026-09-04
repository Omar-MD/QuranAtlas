import type { SearchResultDto } from '../../search/schema'
import { SEARCH_MORPHOLOGY_SOURCE_NOTE, SEARCH_SAME_ROOT_NOTE } from '../../search/morphology'

export function SearchMorphologyPanel({ result }: { result: SearchResultDto | null }) {
  const morphology = result?.morphology
  if (!morphology) {
    return (
      <div className="qar:grid qar:gap-3">
        <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
          Morphology is available for same written form, same root, lemma, and Surah context searches when the active Search index includes the morphology feature.
        </p>
        <div role="status" className="qar:rounded-surface qar:border qar:border-border qar:bg-canvas qar:p-3 qar:text-sm">
          Morphology details do not apply to this selected result because no morphology token was selected.
        </div>
      </div>
    )
  }

  return (
    <div className="qar:grid qar:gap-3 qar:text-sm">
      <dl className="qar:grid qar:grid-cols-2 qar:gap-3">
        <div>
          <dt className="qar:text-muted">Same written form</dt>
          <dd className="qar:m-0" dir="auto">{morphology.sourceToken || 'Unavailable'}</dd>
        </div>
        <div>
          <dt className="qar:text-muted">Same root</dt>
          <dd className="qar:m-0" dir="auto">{morphology.root ?? 'Unavailable'}</dd>
        </div>
        <div>
          <dt className="qar:text-muted">Lemma</dt>
          <dd className="qar:m-0" dir="auto">{morphology.lemma ?? 'Unavailable'}</dd>
        </div>
        <div>
          <dt className="qar:text-muted">Word position</dt>
          <dd className="qar:m-0">{morphology.wordPosition}</dd>
        </div>
      </dl>
      <dl className="qar:grid qar:grid-cols-3 qar:gap-3">
        <div>
          <dt className="qar:text-muted">Form count</dt>
          <dd className="qar:m-0">{morphology.sameWrittenFormCount ?? 'Unavailable'}</dd>
        </div>
        <div>
          <dt className="qar:text-muted">Root count</dt>
          <dd className="qar:m-0">{morphology.sameRootCount ?? 'Unavailable'}</dd>
        </div>
        <div>
          <dt className="qar:text-muted">Lemma count</dt>
          <dd className="qar:m-0">{morphology.lemmaCount ?? 'Unavailable'}</dd>
        </div>
      </dl>
      {morphology.surahContext?.length ? (
        <div>
          <p className="qar:m-0 qar:text-xs qar:text-muted">Surah context</p>
          <ul className="qar:m-0 qar:grid qar:list-none qar:gap-1 qar:p-0">
            {morphology.surahContext.map((row) => (
              <li key={row.surah}>Surah {row.surah}: {row.count}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="qar:grid qar:gap-2 qar:rounded-surface qar:border qar:border-border qar:bg-canvas qar:p-3">
        <p className="qar:m-0">{SEARCH_MORPHOLOGY_SOURCE_NOTE}</p>
        <p className="qar:m-0">{SEARCH_SAME_ROOT_NOTE}</p>
        <p className="qar:m-0">Hafs source only</p>
        <p className="qar:m-0">Word-level match not available in Reader text</p>
      </div>
    </div>
  )
}
