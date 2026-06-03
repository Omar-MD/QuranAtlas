export type QuranRef = { surah: number; verse: number }
export type WirdUnit = 'juz' | 'hizb' | 'page' | 'verse'
export type BrowserNotificationState = 'unsupported' | 'default' | 'granted' | 'denied'
export type SurahCount = { n: number; count: number }

export type WirdReminder = { enabled: boolean; time: string; browserNotifications: BrowserNotificationState }
export type WirdProgress = {
  completedThroughRef: QuranRef | null
  lastReadRef: QuranRef
  nextRef: QuranRef
  dayKey: string
  todayStartRef: QuranRef
  todayEndRef: QuranRef
}

export type WirdHistoryEntry = {
  dayKey: string
  assignedStartRef: QuranRef
  assignedEndRef: QuranRef
  completedThroughRef: QuranRef | null
}

export type WirdPlan = {
  id: string
  startRef: QuranRef
  endRef: QuranRef
  targetDays: number
  targetEndOn: string
  startedOn: string
  unit: WirdUnit
  reminder: WirdReminder
  progress: WirdProgress
  history: WirdHistoryEntry[]
}

export type WirdSummaryState =
  | 'no-plan'
  | 'active'
  | 'today-complete'
  | 'behind-target'
  | 'plan-complete'
  | 'loading'
  | 'metadata-missing'

export type WirdBoundary = {
  n: number
  start: QuranRef
  end: QuranRef
}

export type WirdBoundaries = {
  juz: WirdBoundary[]
  hizb: WirdBoundary[]
  page: WirdBoundary[]
}

export type WirdSummary =
  {
    state: WirdSummaryState
    plan: WirdPlan | null
    percent: number
    todayPercent: number
    nextRef: QuranRef | null
    todayRangeLabel: string
    todayRemainingLabel?: string
    remainingLabel: string
    reminderLabel: string | null
  }
