import { IconButton } from '../ui'
import type { WirdSummary } from '../../continuity/wird/types'
import { WirdRing } from './WirdRing'

// Desktop reader-header indicator (brief §15.3): the one ring implementation
// at 28 px; opens the Wird sheet via requestReactWirdOverlay.
export function ReaderWirdStatusIndicator({ onOpen, summary }: { onOpen: () => void; summary: WirdSummary }) {
  const complete = summary.state === 'today-complete' || summary.state === 'plan-complete'
  const label = statusLabel(summary)

  return (
    <span className="qar-reader-chrome-wird-anchor">
      <IconButton
        className="qar-reader-chrome-pill qar-reader-chrome-wird-status"
        data-wird-state={summary.state}
        id="reader-wird-status-trigger"
        label={label}
        onClick={onOpen}
      >
        <WirdRing label="Today's Wird progress" size="sm" value={complete ? 100 : summary.todayPercent} />
      </IconButton>
    </span>
  )
}

function statusLabel(summary: WirdSummary): string {
  if (!summary.plan || summary.state === 'no-plan') return 'Open Daily Wird'
  if (summary.state === 'plan-complete') return 'Daily Wird: plan complete'
  if (summary.state === 'today-complete') return 'Daily Wird: today complete'
  return `Daily Wird: ${summary.todayPercent}% today, ${summary.todayRemainingLabel ?? 'today assignment in progress'}`
}
