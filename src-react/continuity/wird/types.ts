export type QuranRef = { surah: number; verse: number }
export type WirdUnit = 'juz' | 'hizb' | 'page' | 'verse'
export type BrowserNotificationState = 'unsupported' | 'default' | 'granted' | 'denied'
export type SurahCount = { n: number; count: number }

export type WirdReminder = { enabled: boolean; time: string; browserNotifications: BrowserNotificationState }
export type WirdProgress = {
  completedThroughRef: QuranRef
  lastReadRef: QuranRef
  nextRef: QuranRef
  dayKey: string
}

export type WirdPlan = {
  startRef: QuranRef
  endRef: QuranRef
  targetEndOn: string
  startedOn: string
  unit: WirdUnit
  reminder: WirdReminder
  progress: WirdProgress
}

export type WirdSummary =
  | { state: 'no-plan'; label: 'No Daily Wird plan' }
  | { state: 'active' | 'complete'; label: string; nextRef: QuranRef; percent: number }
