import type { CSSProperties } from 'react'
import { BookOpen } from 'lucide-react'

import { Button } from '../../ui'
import { deriveWirdSummary } from '../../../continuity/wird/progress'
import type { SurahCount, WirdPlan } from '../../../continuity/wird/types'

export function DailyWirdCard({ counts, onOpen, plan }: { counts: SurahCount[]; onOpen?: () => void; plan: WirdPlan | null }) {
  const summary = deriveWirdSummary(plan, counts)
  const title = summary.state === 'no-plan' ? 'Start daily wird' : summary.state === 'complete' ? 'Plan complete' : 'Today'
  const rangeLabel = summary.state === 'no-plan'
    ? 'Create a plan to build a consistent rhythm.'
    : summary.nextRef
      ? `${summary.nextRef.surah}:${summary.nextRef.verse} ${summary.label}`
      : summary.label

  return (
    <Button
      aria-label={title}
      className={[
        'qar-react-wird-card',
        summary.state === 'no-plan' ? 'qar-react-wird-card--setup' : '',
        summary.state === 'complete' ? 'qar-react-wird-card--complete' : '',
      ].filter(Boolean).join(' ')}
      onClick={onOpen}
      variant="ghost"
    >
      <span className="qar-react-wird-card-main">
        <span className="qar-react-wird-card-status-badge" aria-hidden="true">
          <BookOpen size={19} strokeWidth={1.65} />
        </span>
        <span className="qar-react-wird-card-copy">
          <span className="qar-react-wird-card-head">
            <span className="qar-react-wird-card-kicker">{title}</span>
          </span>
          <span className="qar-react-wird-card-line">
            <span className="qar-react-wird-card-range">{rangeLabel}</span>
          </span>
          {summary.state !== 'no-plan' && <span className="qar-react-wird-card-meta">{summary.label}</span>}
        </span>
        <span className="qar-react-wird-card-end">
          {summary.state !== 'no-plan' && (
            <span
              aria-label="Daily wird progress"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={summary.percent}
              className="qar-react-wird-card-meter"
              role="progressbar"
              style={{ '--qa-react-wird-card-progress': `${summary.percent * 3.6}deg` } as CSSProperties}
            >
              <span className="qar-react-wird-card-pct">{summary.percent}%</span>
            </span>
          )}
          <span className="qar-react-wird-card-chev" aria-hidden="true">›</span>
        </span>
      </span>
    </Button>
  )
}
