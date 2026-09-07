import { Badge, Button, Status } from '../ui'
import type { SearchOverviewAction, SearchOverviewViewModel } from './search-presentation-model'

type SearchOverviewProps = {
  onAction: (action: SearchOverviewAction) => void
  overview: SearchOverviewViewModel | null
}

export function SearchOverview({ onAction, overview }: SearchOverviewProps) {
  if (!overview) {
    return <Status description="Enter a word, phrase, or ayah reference." title="Search the Quran" tone="info" />
  }

  return (
    <section aria-labelledby="search-overview-title" className="qar-react-search-overview">
      <div className="qar-react-search-overview-head">
        <div>
          <p className="qar-react-search-overview-eyebrow">Overview</p>
          <h2 className="qar-react-search-overview-title" id="search-overview-title" dir="auto">
            <bdi>{overview.queryLabel}</bdi>
          </h2>
          <p className="qar-react-search-overview-mode">{overview.interpretedAs}</p>
        </div>
        <Badge>{overview.primaryMatchType}</Badge>
      </div>

      <dl className="qar-react-search-overview-facts">
        {overview.facts.map((fact) => (
          <div key={`${fact.label}:${fact.scope}`}>
            <dt>{fact.label}</dt>
            <dd>
              <bdi>{fact.value}</bdi>
              <small>{fact.scope}</small>
            </dd>
          </div>
        ))}
      </dl>

      {overview.recoveryMessage ? (
        <Status description={overview.recoveryMessage} title="Search overview recovered" tone="info" />
      ) : null}

      {overview.topSurahs.length > 0 ? (
        <section aria-label="Top surah distribution" className="qar-react-search-overview-list">
          <h3>Top Surahs</h3>
          {overview.topSurahs.map((row) => (
            <p key={row.label}>
              <span>{row.label}</span>
              <bdi>{row.value}</bdi>
              <small>{row.scope}</small>
            </p>
          ))}
        </section>
      ) : null}

      {overview.topForms.length > 0 ? (
        <section aria-label="Top forms" className="qar-react-search-overview-list">
          <h3>Forms by count</h3>
          {overview.topForms.map((row) => (
            <p key={row.label}>
              <span>{row.label}</span>
              <bdi>{row.value}</bdi>
              <small>{row.scope}</small>
            </p>
          ))}
        </section>
      ) : null}

      {overview.caveat ? <p className="qar-react-search-overview-note">{overview.caveat}</p> : null}

      <div className="qar-react-search-overview-actions">
        {overview.actions.map((action, index) => (
          <Button
            key={action.label}
            onClick={() => onAction(action)}
            size="sm"
            variant={index === 0 ? 'primary' : 'secondary'}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </section>
  )
}
