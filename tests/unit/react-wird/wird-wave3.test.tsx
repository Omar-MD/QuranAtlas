import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DailyWirdCard } from '../../../src-react/components/reader/wird/DailyWirdCard'
import { advanceWirdProgress, createWirdPlan, deriveWirdSummary } from '../../../src-react/continuity/wird/progress'
import type { SurahCount } from '../../../src-react/continuity/wird/types'

const counts: SurahCount[] = [{ n: 1, count: 7 }, { n: 2, count: 286 }]

describe('React Daily Wird parity', () => {
  it('does not move completed progress backward', () => {
    const plan = createWirdPlan({
      startRef: { surah: 1, verse: 1 },
      endRef: { surah: 2, verse: 10 },
      targetEndOn: '2026-06-01',
      startedOn: '2026-05-25',
      unit: 'verse',
      reminder: { enabled: false, time: '07:00', browserNotifications: 'default' },
    }, counts, '2026-05-25')
    const progressed = advanceWirdProgress(plan, { surah: 2, verse: 5 }, counts, '2026-05-25')
    const backward = advanceWirdProgress(progressed, { surah: 1, verse: 3 }, counts, '2026-05-25')
    expect(backward.progress.completedThroughRef).toEqual({ surah: 2, verse: 5 })
  })

  it('summarizes no-plan state without writing progress', () => {
    expect(deriveWirdSummary(null, counts).state).toBe('no-plan')
  })

  it('renders the reader-adjacent no-plan card', () => {
    render(<DailyWirdCard plan={null} counts={counts} />)
    const card = screen.getByRole('button', { name: /start daily wird/i })
    expect(card).toHaveClass('qar-react-wird-card')
    expect(screen.getByText('Create a plan to build a consistent rhythm.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create plan/i })).toBeNull()
  })
})
