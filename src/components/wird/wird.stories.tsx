import type { Meta, StoryObj } from '@storybook/react-vite'

import { getLocalDayKey } from '../../continuity/wird/progress'
import type { QuranRef, SurahCount, WirdBoundary, WirdPlan } from '../../continuity/wird/types'
import { ReaderWirdStatusIndicator } from './ReaderWirdStatusIndicator'
import { WirdRing } from './WirdRing'
import { WirdSheet } from './WirdSheet'
import type { WirdSummary } from '../../continuity/wird/types'

const meta = {
  title: 'React Continuity/Wird',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj

// 114 fabricated surah counts bracketing the mushaf shape — the sheet's
// summaries need a complete index, not exact verse counts.
const storyCounts: SurahCount[] = Array.from({ length: 114 }, (_, index) => {
  if (index === 0) return { n: 1, count: 7 }
  if (index === 1) return { n: 2, count: 286 }
  if (index === 113) return { n: 114, count: 6 }
  return { n: index + 1, count: 55 }
})

function addDays(dayKey: string, days: number): string {
  const date = new Date(`${dayKey}T00:00:00`)
  date.setDate(date.getDate() + days)
  return getLocalDayKey(date)
}

function buildPlan(overrides: Partial<WirdPlan> = {}): WirdPlan {
  const today = getLocalDayKey()
  return {
    endRef: { surah: 114, verse: 6 },
    history: [],
    id: 'story-wird',
    progress: {
      completedThroughRef: null,
      dayKey: today,
      lastReadRef: { surah: 1, verse: 1 },
      nextRef: { surah: 1, verse: 1 },
      todayEndRef: { surah: 2, verse: 155 },
      todayStartRef: { surah: 1, verse: 1 },
    },
    reminder: { browserNotifications: 'default', enabled: false, time: '08:00' },
    startRef: { surah: 1, verse: 1 },
    startedOn: today,
    targetDays: 30,
    targetEndOn: addDays(today, 29),
    unit: 'page',
    ...overrides,
  }
}

const neverCounts = (): Promise<SurahCount[]> => new Promise(() => undefined)
const failedCounts = (): Promise<SurahCount[]> => Promise.reject(new Error('story'))

function sheetDeps(plan: WirdPlan | null, position: QuranRef | null = { surah: 2, verse: 255 }) {
  return {
    deps: {
      loadCounts: () => Promise.resolve(storyCounts),
      loadPageBoundaries: (): Promise<WirdBoundary[]> => Promise.resolve([]),
      loadPlan: () => Promise.resolve(plan),
      loadPosition: () => Promise.resolve(position),
      persistPlan: () => Promise.resolve(),
      requestNotifications: () => Promise.resolve('default' as const),
    },
  }
}

export const Setup: Story = {
  render: () => <WirdSheet initialView="form" onClose={() => undefined} {...sheetDeps(null)} />,
}

export const SetupNoPosition: Story = {
  render: () => <WirdSheet initialView="form" onClose={() => undefined} {...sheetDeps(null, null)} />,
}

export const Active: Story = {
  render: () => (
    <WirdSheet
      onClose={() => undefined}
      {...sheetDeps(
        buildPlan({
          progress: {
            completedThroughRef: { surah: 12, verse: 20 },
            dayKey: getLocalDayKey(),
            lastReadRef: { surah: 12, verse: 20 },
            nextRef: { surah: 12, verse: 21 },
            todayEndRef: { surah: 13, verse: 20 },
            todayStartRef: { surah: 12, verse: 21 },
          },
        }),
      )}
    />
  ),
}

export const Behind: Story = {
  render: () => (
    <WirdSheet
      onClose={() => undefined}
      {...sheetDeps(
        buildPlan({
          startedOn: addDays(getLocalDayKey(), -3),
          progress: {
            completedThroughRef: null,
            dayKey: getLocalDayKey(),
            lastReadRef: { surah: 1, verse: 1 },
            nextRef: { surah: 8, verse: 1 },
            todayEndRef: { surah: 9, verse: 30 },
            todayStartRef: { surah: 8, verse: 1 },
          },
        }),
      )}
    />
  ),
}

export const TodayComplete: Story = {
  render: () => (
    <WirdSheet
      onClose={() => undefined}
      {...sheetDeps(
        buildPlan({
          progress: {
            completedThroughRef: { surah: 13, verse: 20 },
            dayKey: getLocalDayKey(),
            lastReadRef: { surah: 13, verse: 20 },
            nextRef: { surah: 13, verse: 21 },
            todayEndRef: { surah: 13, verse: 20 },
            todayStartRef: { surah: 12, verse: 21 },
          },
        }),
      )}
    />
  ),
}

export const PlanComplete: Story = {
  render: () => (
    <WirdSheet
      onClose={() => undefined}
      {...sheetDeps(
        buildPlan({
          progress: {
            completedThroughRef: { surah: 114, verse: 6 },
            dayKey: getLocalDayKey(),
            lastReadRef: { surah: 114, verse: 6 },
            nextRef: { surah: 114, verse: 6 },
            todayEndRef: { surah: 114, verse: 6 },
            todayStartRef: { surah: 113, verse: 1 },
          },
        }),
      )}
    />
  ),
}

export const Edit: Story = {
  render: () => (
    <WirdSheet
      initialView="form"
      onClose={() => undefined}
      {...sheetDeps(
        buildPlan({
          reminder: { browserNotifications: 'granted', enabled: true, time: '06:30' },
          targetEndOn: addDays(getLocalDayKey(), 59),
          targetDays: 60,
          unit: 'juz',
        }),
      )}
    />
  ),
}

export const ResetDialog: Story = {
  render: () => (
    <WirdSheet
      onClose={() => undefined}
      {...sheetDeps(
        buildPlan({
          progress: {
            completedThroughRef: { surah: 12, verse: 20 },
            dayKey: getLocalDayKey(),
            lastReadRef: { surah: 12, verse: 20 },
            nextRef: { surah: 12, verse: 21 },
            todayEndRef: { surah: 13, verse: 20 },
            todayStartRef: { surah: 12, verse: 21 },
          },
        }),
      )}
    />
  ),
}

export const Loading: Story = {
  render: () => (
    <WirdSheet
      deps={{
        loadCounts: neverCounts,
        loadPlan: () => Promise.resolve(null),
        loadPosition: () => Promise.resolve(null),
      }}
      onClose={() => undefined}
    />
  ),
}

export const LoadError: Story = {
  render: () => (
    <WirdSheet
      deps={{
        loadCounts: failedCounts,
        loadPlan: () => Promise.resolve(null),
        loadPosition: () => Promise.resolve(null),
      }}
      onClose={() => undefined}
    />
  ),
}

export const WirdRingSizes: Story = {
  render: () => (
    <div className="qar:flex qar:items-center qar:gap-6 qar:bg-canvas qar:p-6 qar:text-text">
      {[0, 42, 100].map((value) => (
        <div className="qar:flex qar:items-center qar:gap-3" key={value}>
          <WirdRing label={`Ring at ${value}%`} size="sm" value={value} />
          <WirdRing label={`Ring at ${value}%`} size="md" value={value} />
        </div>
      ))}
    </div>
  ),
}

export const HeaderIndicator: Story = {
  render: () => {
    const summary = {
      nextRef: { surah: 12, verse: 21 },
      percent: 20,
      plan: buildPlan(),
      remainingLabel: '90 pages left',
      reminderLabel: null,
      state: 'active',
      todayPercent: 42,
      todayRangeLabel: '12:21-13:20',
      todayRemainingLabel: '3 pages left today',
    } as WirdSummary
    return (
      <div className="qar:flex qar:items-center qar:bg-surface qar:p-4">
        <ReaderWirdStatusIndicator onOpen={() => undefined} summary={summary} />
      </div>
    )
  },
}
