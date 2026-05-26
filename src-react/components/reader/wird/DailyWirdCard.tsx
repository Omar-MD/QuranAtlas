import { Button } from '../../ui'
import { deriveWirdSummary } from '../../../continuity/wird/progress'
import type { SurahCount, WirdPlan } from '../../../continuity/wird/types'
import { WirdProgressMeter } from './WirdProgressMeter'

export function DailyWirdCard({ counts, plan }: { counts: SurahCount[]; plan: WirdPlan | null }) {
  const summary = deriveWirdSummary(plan, counts)
  return (
    <section className="qar:grid qar:gap-3 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4" aria-label="Daily Wird">
      <div>
        <p className="qar:m-0 qar:text-xs qar:text-muted">Daily Wird</p>
        <h2 className="qar:m-0 qar:text-base">{summary.state === 'no-plan' ? 'No active plan' : summary.label}</h2>
      </div>
      {summary.state === 'no-plan'
        ? <Button size="sm" variant="secondary">Create plan</Button>
        : (
            <>
              <WirdProgressMeter percent={summary.percent} />
              <Button size="sm">Continue Wird</Button>
            </>
          )}
    </section>
  )
}
