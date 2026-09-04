import type { SearchCountsPatternsSection } from '../../search/graph'

export function SearchCountsPatterns({ section }: { section: SearchCountsPatternsSection }) {
  return (
    <div className="qar:grid qar:gap-3">
      <dl className="qar:grid qar:grid-cols-2 qar:gap-2">
        <div>
          <dt className="qar:text-muted">Indexed tokens</dt>
          <dd className="qar:m-0">{section.summary.tokenCounts.totalTokens.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="qar:text-muted">Unique tokens</dt>
          <dd className="qar:m-0">{section.summary.tokenCounts.uniqueTokens.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="qar:text-muted">Shared wording edges</dt>
          <dd className="qar:m-0">{section.summary.adjacencyCounts.sharedEdges.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="qar:text-muted">Ayahs with shared wording</dt>
          <dd className="qar:m-0">{section.summary.adjacencyCounts.ayahsWithSharedWording.toLocaleString()}</dd>
        </div>
      </dl>
      <PatternList
        items={section.summary.phraseCounts.map((row) => [`${row.length}-word phrases`, row.count.toLocaleString()])}
        title="Phrase counts"
      />
      <PatternList
        items={section.summary.rootCounts.slice(0, 6).map((row) => [row.root, row.count.toLocaleString()])}
        title="Root counts"
      />
      <PatternList
        items={section.summary.ayahEndings.slice(0, 6).map((row) => [row.term, row.count.toLocaleString()])}
        title="Ayah endings"
      />
      <PatternList
        items={section.summary.surahDistribution.slice(0, 6).map((row) => [`Surah ${row.surah}`, `${row.tokenCount.toLocaleString()} tokens`])}
        title="Surah distribution"
      />
    </div>
  )
}

function PatternList({ items, title }: { items: Array<[string, string]>; title: string }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="qar:m-0 qar:text-xs qar:font-semibold qar:uppercase qar:text-muted">{title}</p>
      <ul className="qar:m-0 qar:grid qar:list-none qar:gap-1 qar:p-0">
        {items.map(([label, value]) => (
          <li className="qar:flex qar:justify-between qar:gap-3" key={`${title}:${label}`}>
            <span dir="auto"><bdi>{label}</bdi></span>
            <span>{value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
