import { useMemo, useState } from 'react'

import { Button, Input, SegmentedControl, Status, Switch } from '../ui'
import { SettingsRow } from '../settings/SettingsRow'
import { createWirdBoundaries } from '../../continuity/wird/metadata'
import { getLocalDayKey, inclusiveDays } from '../../continuity/wird/progress'
import { formatDate, formatPaceDate } from './format'
import { refToIndex } from '../../continuity/verse-key'
import type {
  BrowserNotificationState,
  QuranRef,
  SurahCount,
  WirdBoundary,
  WirdPlan,
  WirdUnit,
} from '../../continuity/wird/types'

export type WirdFormPayload = {
  reminderEnabled: boolean
  reminderTime: string
  startMode: 'current' | 'beginning'
  targetEndOn: string
  unit: WirdUnit
}

const FINISH_PRESETS = [
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
  { label: 'Date', value: 'date' },
]

const UNIT_OPTIONS: Array<{ label: string; value: WirdUnit }> = [
  { label: 'Juz', value: 'juz' },
  { label: 'Hizb', value: 'hizb' },
  { label: 'Page', value: 'page' },
  { label: 'Verse', value: 'verse' },
]

const NOTIFICATION_HELP: Record<BrowserNotificationState, string> = {
  granted: 'Notifications on',
  default: 'Allow notifications so the reminder can reach you.',
  denied: 'Notifications are blocked in your browser settings.',
  unsupported: "This browser can't show notifications, so reminders aren't available here.",
}

function addDays(dayKey: string, days: number): string {
  const date = new Date(`${dayKey}T00:00:00`)
  date.setDate(date.getDate() + days)
  return getLocalDayKey(date)
}

function resolveFinishDay(finishBy: string, targetEndOn: string, todayKey: string): string {
  if (finishBy === 'date') return targetEndOn
  return addDays(todayKey, Number(finishBy) - 1)
}

function countUnitsInRange(
  unit: WirdUnit,
  boundaries: ReturnType<typeof createWirdBoundaries>,
  counts: ReadonlyArray<SurahCount>,
  startIndex: number,
  endIndex: number,
): number {
  if (unit === 'verse') return Math.max(0, endIndex - startIndex + 1)
  const items = unit === 'juz' ? boundaries.juz : unit === 'hizb' ? boundaries.hizb : boundaries.page
  if (!items.length || startIndex > endIndex) return Math.max(0, endIndex - startIndex + 1)
  return items.filter((item) => {
    const itemStart = refToIndex(item.start, counts)
    const itemEnd = refToIndex(item.end, counts)
    return itemEnd >= startIndex && itemStart <= endIndex
  }).length
}

function unitNamePlural(unit: WirdUnit, amount: number): string {
  if (unit === 'verse') return amount === 1 ? 'verse' : 'verses'
  if (unit === 'page') return amount === 1 ? 'page' : 'pages'
  // juz and hizb are invariant in English usage — no ajza/ahzab plurals.
  if (unit === 'juz') return 'juz'
  return 'hizb'
}

// Screen W-B (brief §15.6): the one place the app asks about time — finish
// date, count unit, start point, reminder. Content-sized controls under
// eyebrow labels; the full-width primary CTA is the only stretched control.
export function WirdPlanForm({
  counts,
  currentPosition,
  mode,
  notificationState,
  onCancel,
  onRequestNotifications,
  onSubmit,
  onRetrySave,
  pageBoundaries,
  plan,
  saveError,
  saving,
}: {
  counts: SurahCount[]
  currentPosition: QuranRef | null
  mode: 'create' | 'edit'
  notificationState: BrowserNotificationState
  onCancel?: () => void
  onRequestNotifications: () => Promise<BrowserNotificationState>
  onSubmit: (payload: WirdFormPayload) => void
  onRetrySave?: () => void
  pageBoundaries: WirdBoundary[]
  plan: WirdPlan | null
  saveError: boolean
  saving: boolean
}) {
  const todayKey = getLocalDayKey()
  const tomorrowKey = addDays(todayKey, 1)
  const atEnd = Boolean(
    currentPosition && currentPosition.surah === 114 && currentPosition.verse >= (counts[113]?.count ?? 6),
  )
  const [finishBy, setFinishBy] = useState(() => (mode === 'edit' && plan ? 'date' : '30'))
  const [targetEndOn, setTargetEndOn] = useState(() => (mode === 'edit' && plan ? plan.targetEndOn : tomorrowKey))
  const [unit, setUnit] = useState<WirdUnit>(() => (mode === 'edit' && plan ? plan.unit : 'page'))
  const [startMode, setStartMode] = useState<'current' | 'beginning'>(() => {
    if (mode === 'edit') return 'current'
    return currentPosition && !atEnd ? 'current' : 'beginning'
  })
  const [reminderEnabled, setReminderEnabled] = useState(() =>
    mode === 'edit' && plan ? plan.reminder.enabled : false,
  )
  const [reminderTime, setReminderTime] = useState(() => (mode === 'edit' && plan ? plan.reminder.time : '08:00'))

  const finishDay = resolveFinishDay(finishBy, targetEndOn, todayKey)
  const dateInvalid = finishBy === 'date' && (targetEndOn.length === 0 || finishDay < tomorrowKey)
  const countsReady = counts.length === 114
  const canSubmit = countsReady && !dateInvalid && !saving

  const boundaries = useMemo(() => createWirdBoundaries(counts, pageBoundaries), [counts, pageBoundaries])
  const pace = useMemo(() => {
    if (!countsReady) return null
    const end = counts.length - 1
    const endIndex = refToIndex({ surah: counts[end].n, verse: counts[end].count }, counts)
    let startIndex: number
    if (mode === 'edit' && plan) {
      const completed = plan.progress.completedThroughRef
      startIndex = completed ? refToIndex(completed, counts) + 1 : refToIndex(plan.startRef, counts)
    } else {
      const startRef: QuranRef = startMode === 'current' && currentPosition ? currentPosition : { surah: 1, verse: 1 }
      startIndex = refToIndex(startRef, counts)
    }
    const days = Math.max(1, inclusiveDays(todayKey, finishDay))
    // While the chosen unit's boundaries are still loading, count in verses
    // (brief §15.6 pace helper).
    const effectiveUnit: WirdUnit = unit === 'page' && pageBoundaries.length === 0 ? 'verse' : unit
    const perDay = Math.ceil(countUnitsInRange(effectiveUnit, boundaries, counts, startIndex, endIndex) / days)
    return {
      date: formatPaceDate(finishDay),
      label: `about ${perDay} ${unitNamePlural(effectiveUnit, perDay)} a day`,
    }
  }, [
    boundaries,
    counts,
    countsReady,
    currentPosition,
    finishDay,
    mode,
    pageBoundaries,
    plan,
    startMode,
    todayKey,
    unit,
  ])

  function submit() {
    if (!canSubmit) return
    onSubmit({
      reminderEnabled,
      reminderTime,
      startMode,
      targetEndOn: finishDay,
      unit,
    })
  }

  const paceId = 'wird-pace-helper'
  const dateErrorId = 'wird-date-error'
  const dateInputId = 'wird-date-input'

  return (
    <form
      className="qar-react-wird-form"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {mode === 'create' ? (
        <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
          Choose when to finish; each day's portion is sized for you.
        </p>
      ) : null}

      <section aria-label="Finish by">
        <p className="qar-eyebrow">Finish by</p>
        <SegmentedControl
          label="Finish by"
          onValueChange={(value) => {
            setFinishBy(value)
            if (value !== 'date') setTargetEndOn(tomorrowKey)
          }}
          options={FINISH_PRESETS}
          value={finishBy}
        />
        {finishBy === 'date' ? (
          <SettingsRow htmlFor={dateInputId} label="Pick a date">
            <Input
              aria-describedby={`${paceId}${dateInvalid ? ` ${dateErrorId}` : ''}`}
              aria-invalid={dateInvalid || undefined}
              className="qar-react-field-date"
              hideLabel
              id={dateInputId}
              label="Pick a date"
              min={tomorrowKey}
              onChange={(event) => setTargetEndOn(event.currentTarget.value)}
              type="date"
              value={targetEndOn}
            />
          </SettingsRow>
        ) : null}
        <p className="qar-react-wird-helper" id={paceId}>
          {dateInvalid ? (
            <span className="qar:text-danger" id={dateErrorId} role="alert">
              Pick a date from tomorrow onwards.
            </span>
          ) : pace ? (
            `Ends ${pace.date} · ${pace.label}`
          ) : null}
        </p>
      </section>

      <section aria-label="Count in">
        <p className="qar-eyebrow">Count in</p>
        <SegmentedControl
          label="Count in"
          onValueChange={(value) => setUnit(value as WirdUnit)}
          options={UNIT_OPTIONS}
          value={unit}
        />
      </section>

      {mode === 'create' ? (
        <section aria-label="Start from">
          <p className="qar-eyebrow">Start from</p>
          <SegmentedControl
            label="Start from"
            onValueChange={(value) => setStartMode(value as 'current' | 'beginning')}
            options={[
              {
                disabled: !currentPosition || atEnd,
                label: `Current · ${currentPosition ? `${currentPosition.surah}:${currentPosition.verse}` : '1:1'}`,
                value: 'current',
              },
              { label: 'Beginning', value: 'beginning' },
            ]}
            value={startMode}
          />
          <p className="qar-react-wird-helper">
            {!currentPosition
              ? 'Open the reader once to start from where you are.'
              : atEnd
                ? "You're at the end of the Quran — start from the beginning."
                : null}
          </p>
        </section>
      ) : plan ? (
        <SettingsRow label="Started">
          <span className="qar-react-wird-row-value">
            {`${plan.startRef.surah}:${plan.startRef.verse} · ${formatDate(plan.startedOn)}`}
          </span>
        </SettingsRow>
      ) : null}

      <section aria-label="Reminder">
        <p className="qar-eyebrow">Reminder</p>
        <SettingsRow label="Daily reminder">
          <Switch
            checked={reminderEnabled}
            disabled={notificationState === 'unsupported'}
            hideLabel
            label="Daily reminder"
            onCheckedChange={(next) => {
              setReminderEnabled(next)
              if (next && notificationState === 'default') {
                void onRequestNotifications()
              }
            }}
          />
        </SettingsRow>
        {reminderEnabled && notificationState !== 'unsupported' ? (
          <SettingsRow label="Time">
            <Input
              className="qar-react-field-time"
              hideLabel
              label="Time"
              onChange={(event) => setReminderTime(event.currentTarget.value)}
              type="time"
              value={reminderTime}
            />
          </SettingsRow>
        ) : null}
        <p className="qar-react-wird-helper">{NOTIFICATION_HELP[notificationState]}</p>
        {reminderEnabled && (notificationState === 'default' || notificationState === 'denied') ? (
          <Button onClick={() => void onRequestNotifications()} size="sm" variant="secondary">
            {notificationState === 'default' ? 'Allow notifications' : 'Try again'}
          </Button>
        ) : null}
      </section>

      <div className="qar-react-wird-form-footer">
        <Button className="qar:w-full" disabled={!canSubmit} loading={saving} onClick={submit} type="submit">
          {mode === 'edit' ? 'Save changes' : 'Create plan'}
        </Button>
        {mode === 'edit' && onCancel ? (
          <Button className="qar:w-full" onClick={onCancel} variant="ghost">
            Cancel
          </Button>
        ) : null}
        {saveError ? (
          <Status
            action={
              onRetrySave ? (
                <Button onClick={onRetrySave} size="sm" variant="secondary">
                  Try again
                </Button>
              ) : undefined
            }
            title="Couldn't save your plan"
            tone="error"
          />
        ) : null}
      </div>
    </form>
  )
}
