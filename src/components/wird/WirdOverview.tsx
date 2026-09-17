import { useRef, useState } from 'react'

import { Button, Dialog, Status } from '../ui'
import { SettingsRow } from '../settings/SettingsRow'
import { formatDate, finishByValue, unitPluralLabel } from './format'
import type { WirdSummary } from '../../continuity/wird/types'
import { getLocalDayKey } from '../../continuity/wird/progress'
import { WirdRing } from './WirdRing'

const HAIR_SPACE = '\u200A'

function rangeLabel(raw: string): string {
  return raw.replace('-', `${HAIR_SPACE}–${HAIR_SPACE}`)
}

function kickerFor(state: WirdSummary['state']): string {
  if (state === 'plan-complete') return 'Plan complete'
  if (state === 'today-complete') return 'Today complete'
  if (state === 'behind-target') return 'Adjusted today'
  return 'Today'
}

// Screen W-A (brief §15.5): one ring for today, one thin line for the whole
// plan, one sentence about pace, one clear next step. The reset-dialog props
// exist so stories can present the confirmation state.
export function WirdOverview({
  onContinue,
  onEdit,
  onReset,
  onResetDialogOpenChange,
  reminderValue,
  resetDialogOpen,
  savedStatus,
  summary,
}: {
  onContinue: () => void
  onEdit: () => void
  onReset: () => void
  onResetDialogOpenChange?: (open: boolean) => void
  reminderValue: string
  resetDialogOpen?: boolean
  savedStatus: string | null
  summary: WirdSummary
}) {
  const keepPlanRef = useRef<HTMLButtonElement>(null)
  const [uncontrolledResetOpen, setUncontrolledResetOpen] = useState(false)
  const resetOpen = resetDialogOpen ?? uncontrolledResetOpen
  const setResetOpen = (open: boolean) => {
    setUncontrolledResetOpen(open)
    onResetDialogOpenChange?.(open)
  }
  const todayComplete = summary.state === 'today-complete'
  const planComplete = summary.state === 'plan-complete'

  const range =
    summary.state === 'no-plan'
      ? ''
      : planComplete
        ? 'Finished'
        : todayComplete
          ? 'Done for today'
          : rangeLabel(summary.todayRangeLabel)
  const meta =
    summary.state === 'no-plan'
      ? ''
      : planComplete
        ? `Started ${formatDate(summary.plan?.startedOn ?? getLocalDayKey())}`
        : todayComplete
          ? summary.remainingLabel
          : (summary.todayRemainingLabel ?? '')

  return (
    <div className="qar-react-wird-overview">
      {savedStatus ? <Status role="status" title={savedStatus} tone="success" /> : null}
      <div className="qar-react-wird-hero">
        <WirdRing label="Today's Wird progress" size="md" value={summary.todayPercent} />
        <div className="qar-react-wird-hero-copy">
          <p className="qar-eyebrow">{kickerFor(summary.state)}</p>
          <p className="qar-react-wird-range" lang="en">
            {range}
          </p>
          <p className="qar-react-wird-meta">{meta}</p>
        </div>
      </div>
      <div className="qar-react-wird-whole-plan">
        <div className="qar-react-wird-whole-plan-head">
          <span>Whole plan</span>
          <span>{summary.percent}%</span>
        </div>
        <div
          aria-label="Whole plan progress"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={summary.percent}
          className="qar-react-wird-plan-bar"
          role="progressbar"
        >
          <span style={{ width: `${summary.percent}%` }} />
        </div>
      </div>
      {summary.state === 'behind-target' ? (
        <Status
          description="You're a little behind, so today's reading grew to keep your finish date."
          title="Today's portion was resized"
          tone="info"
        />
      ) : null}
      <section aria-label="Plan">
        <p className="qar-eyebrow">Plan</p>
        <div className="qar-react-settings-panel-controls">
          <SettingsRow label="Finish by">
            <span className="qar-react-wird-row-value">
              {finishByValue(summary.plan?.targetEndOn ?? getLocalDayKey(), getLocalDayKey())}
            </span>
          </SettingsRow>
          <SettingsRow label="Count in">
            <span className="qar-react-wird-row-value">{unitPluralLabel(summary.plan?.unit ?? 'page')}</span>
          </SettingsRow>
          <SettingsRow label="Reminder">
            <span className="qar-react-wird-row-value">{reminderValue}</span>
          </SettingsRow>
        </div>
      </section>
      <div className="qar-react-wird-actions">
        <Button className="qar:w-full" disabled={planComplete} onClick={onContinue} variant="primary">
          {planComplete ? 'Plan complete' : todayComplete ? 'Read ahead' : 'Continue reading'}
        </Button>
        <div className="qar-react-wird-secondary-actions">
          <Button onClick={onEdit} variant="secondary">
            Edit plan
          </Button>
          <Button onClick={() => setResetOpen(true)} variant="ghost">
            Reset plan
          </Button>
        </div>
      </div>
      <Dialog
        initialFocusRef={keepPlanRef}
        onOpenChange={(open) => {
          setResetOpen(open)
        }}
        open={resetOpen}
        title="Reset Daily Wird?"
      >
        <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
          This clears your plan and its progress. Your bookmarks and reading position are not affected.
        </p>
        <div className="qar:flex qar:justify-end qar:gap-2">
          <Button
            onClick={() => {
              setResetOpen(false)
              onReset()
            }}
            variant="danger"
          >
            Reset
          </Button>
          <Button onClick={() => setResetOpen(false)} ref={keepPlanRef} variant="secondary">
            Keep plan
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
