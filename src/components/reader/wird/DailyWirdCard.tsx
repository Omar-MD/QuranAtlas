import type { CSSProperties } from 'react'
import { BookOpen } from 'lucide-react'

import { Button } from '../../ui'
import { createWirdBoundaries } from '../../../continuity/wird/metadata'
import { deriveWirdSummary } from '../../../continuity/wird/progress'
import type { SurahCount, WirdBoundaries, WirdPlan } from '../../../continuity/wird/types'

export function DailyWirdCard({
  boundaries,
  counts,
  onOpen,
  plan,
}: {
  boundaries?: WirdBoundaries
  counts: SurahCount[]
  onOpen?: () => void
  plan: WirdPlan | null
}) {
  const summary = deriveWirdSummary(plan, counts, boundaries ?? createWirdBoundaries(counts))
  const nextLabel = summary.nextRef ? `${summary.nextRef.surah}:${summary.nextRef.verse}` : ''
  const title = summary.state === 'no-plan'
    ? 'Start daily wird'
    : summary.state === 'today-complete'
      ? 'Today complete'
      : summary.state === 'plan-complete'
        ? 'Plan complete'
        : summary.state === 'behind-target'
          ? 'Adjusted today'
          : 'Today'
  const rangeLabel = summary.state === 'no-plan'
    ? 'Create a plan to build a consistent rhythm.'
    : nextLabel && summary.state !== 'today-complete' && summary.state !== 'plan-complete'
      ? `Continue from ${nextLabel}`
      : summary.remainingLabel
  const metaLabel = summary.state !== 'no-plan' && summary.nextRef
    ? summary.state === 'today-complete' || summary.state === 'plan-complete'
      ? summary.remainingLabel
      : `${summary.todayRangeLabel} · ${summary.remainingLabel}`
    : null

  return (
    <Button
      aria-label={title}
      className={[
        'qar-react-wird-card',
        summary.state === 'no-plan' ? 'qar-react-wird-card--setup' : '',
        summary.state === 'today-complete' || summary.state === 'plan-complete' ? 'qar-react-wird-card--complete' : '',
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
          {metaLabel && <span className="qar-react-wird-card-meta">{metaLabel}</span>}
        </span>
        <span className="qar-react-wird-card-end">
          {summary.state !== 'no-plan' && (
            <span
              aria-label="Daily wird progress"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={summary.todayPercent}
              className="qar-react-wird-card-meter"
              role="progressbar"
              style={{ '--qa-react-wird-card-progress': `${summary.todayPercent * 3.6}deg` } as CSSProperties}
            >
              <span className="qar-react-wird-card-pct">{summary.todayPercent}%</span>
            </span>
          )}
          <span className="qar-react-wird-card-chev" aria-hidden="true">›</span>
        </span>
      </span>
      {summary.reminderLabel && (
        <span className="qar-react-wird-card-reminder-row">
          <span className="qar-react-wird-card-reminder-icon" aria-hidden="true">○</span>
          <span className="qar-react-wird-card-reminder">{summary.reminderLabel}</span>
        </span>
      )}
    </Button>
  )
}
