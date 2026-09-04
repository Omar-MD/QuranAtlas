import type { CSSProperties } from 'react'
import { BookOpen, Check } from 'lucide-react'

import { IconButton, Tooltip } from '../../ui'
import type { WirdSummary } from '../../../continuity/wird/types'

export function ReaderWirdStatusIndicator({
  onOpen,
  summary,
}: {
  onOpen: () => void
  summary: WirdSummary
}) {
  if (!summary.plan || summary.state === 'no-plan') return null

  const complete = summary.state === 'today-complete' || summary.state === 'plan-complete'
  const label = statusLabel(summary)

  return (
    <Tooltip content={label}>
      <span className="qar-reader-chrome-wird-anchor">
        <IconButton
          className="qar-reader-chrome-wird-status"
          data-wird-state={summary.state}
          id="reader-wird-status-trigger"
          label={label}
          onClick={onOpen}
          style={{ '--qa-react-wird-status-progress': `${summary.todayPercent * 3.6}deg` } as CSSProperties}
        >
          <span className="qar-reader-chrome-wird-ring" aria-hidden="true">
            <span className="qar-reader-chrome-wird-core">
              {complete ? <Check size={15} strokeWidth={2.2} /> : <BookOpen size={15} strokeWidth={1.65} />}
            </span>
          </span>
        </IconButton>
      </span>
    </Tooltip>
  )
}

function statusLabel(summary: WirdSummary): string {
  if (summary.state === 'plan-complete') return 'Daily Wird: plan complete'
  if (summary.state === 'today-complete') return 'Daily Wird: today complete'
  return `Daily Wird: ${summary.todayPercent}% today, ${summary.todayRemainingLabel ?? 'today assignment in progress'}`
}
