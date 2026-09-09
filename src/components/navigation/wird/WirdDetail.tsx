import { useState } from 'react'
import { Bell, CalendarDays, CircleDot, MapPin } from 'lucide-react'

import { getBrowserNotificationState } from '../../../continuity/wird/reminders'
import type {
  BrowserNotificationState,
  QuranRef,
  SurahCount,
  WirdSummary,
  WirdUnit,
} from '../../../continuity/wird/types'
import { Button, Checkbox, Input, SegmentedControl } from '../../ui'

export type WirdSetupPayload = {
  targetDays: number | null
  targetEndOn: string | null
  unit: WirdUnit
  startMode: 'current' | 'beginning'
  reminderEnabled: boolean
  reminderTime: string
  browserNotifications: BrowserNotificationState
}

type WirdDetailProps = {
  counts?: SurahCount[]
  currentPosition: QuranRef | null
  onBack: () => void
  onCreate: (payload: WirdSetupPayload) => void
  onContinue: () => void
  onReset: () => void
  onRequestBrowserNotifications: () => BrowserNotificationState | Promise<BrowserNotificationState>
  summary: WirdSummary
}

const UNITS: WirdUnit[] = ['juz', 'hizb', 'page', 'verse']

export function WirdDetail({
  currentPosition,
  onBack,
  onCreate,
  onContinue,
  onReset,
  onRequestBrowserNotifications,
  summary,
}: WirdDetailProps) {
  const [targetMode, setTargetMode] = useState<'preset' | 'custom'>('preset')
  const [targetDays, setTargetDays] = useState<number | null>(7)
  const [targetEndOn, setTargetEndOn] = useState('')
  const [unit, setUnit] = useState<WirdUnit>('juz')
  const [startMode, setStartMode] = useState<'current' | 'beginning'>('current')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('08:00')
  const [notificationState, setNotificationState] = useState<BrowserNotificationState | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [editing, setEditing] = useState(false)
  const activePlan = summary.plan
  const currentNotificationState = notificationState ?? activePlan?.reminder.browserNotifications ?? 'default'
  const currentRefLabel = currentPosition ? `${currentPosition.surah}:${currentPosition.verse}` : '1:1'
  const canCreate =
    (targetMode === 'preset' ? targetDays !== null : targetEndOn.length > 0) &&
    (startMode === 'beginning' || currentPosition !== null)

  function selectPreset(days: number): void {
    setTargetMode('preset')
    setTargetDays(days)
    setTargetEndOn('')
  }

  function startEditing(): void {
    setEditing(true)
    if (!activePlan) return
    setUnit(activePlan.unit)
    setReminderEnabled(activePlan.reminder.enabled)
    setReminderTime(activePlan.reminder.time)
    setNotificationState(activePlan.reminder.browserNotifications)
    setTargetMode('custom')
    setTargetDays(null)
    setTargetEndOn(activePlan.targetEndOn)
  }

  function submitCreate(): void {
    if (!canCreate) return
    onCreate({
      browserNotifications: currentNotificationState,
      reminderEnabled,
      reminderTime,
      startMode,
      targetDays: targetMode === 'preset' ? targetDays : null,
      targetEndOn: targetMode === 'custom' ? targetEndOn : null,
      unit,
    })
  }

  async function requestNotifications(): Promise<void> {
    const state = await onRequestBrowserNotifications()
    setNotificationState(state)
  }

  const showEditor = summary.state === 'no-plan' || editing

  return (
    <section aria-labelledby="wird-detail-title" className="qar-react-wird-detail">
      <div className="qar-react-wird-detail-head">
        <Button aria-label="Back" onClick={onBack} size="sm" variant="ghost">
          Back
        </Button>
        <h2 className="qar-react-wird-detail-title" id="wird-detail-title">
          Daily Wird
        </h2>
      </div>

      {showEditor ? (
        <div className="qar-react-wird-setup">
          <div>
            <p className="qar-react-wird-eyebrow">Plan setup</p>
            <p className="qar-react-wird-help">Choose a finish target and QuranAtlas will size each daily reading.</p>
          </div>

          <section className="qar-react-wird-field" aria-label="Completion target">
            <div className="qar-react-wird-field-head">
              <span className="qar-react-wird-field-label">
                <CalendarDays aria-hidden="true" size={16} />
                Completion target
              </span>
              <span className="qar-react-wird-field-value">
                {targetMode === 'custom' ? 'Custom' : targetDays ? `${targetDays} days` : 'Choose'}
              </span>
            </div>
            <SegmentedControl
              label="Completion target"
              onValueChange={(value) => {
                if (value === 'custom') {
                  setTargetMode('custom')
                  setTargetDays(null)
                  return
                }
                selectPreset(Number(value))
              }}
              options={[
                { label: '7 days', value: '7' },
                { label: '30 days', value: '30' },
                { label: '90 days', value: '90' },
                { label: 'Custom date', value: 'custom' },
              ]}
              value={targetMode === 'custom' ? 'custom' : String(targetDays)}
            />
            {targetMode === 'custom' && (
              <Input
                label="Finish date"
                onChange={(event) => setTargetEndOn(event.currentTarget.value)}
                type="date"
                value={targetEndOn}
              />
            )}
          </section>

          <section className="qar-react-wird-field" aria-label="Display unit">
            <div className="qar-react-wird-field-head">
              <span className="qar-react-wird-field-label">
                <CircleDot aria-hidden="true" size={16} />
                Display unit
              </span>
              <span className="qar-react-wird-field-value">{unit}</span>
            </div>
            <SegmentedControl
              label="Display unit"
              onValueChange={(value) => setUnit(value as WirdUnit)}
              options={UNITS.map((nextUnit) => ({ label: nextUnit, value: nextUnit }))}
              value={unit}
            />
          </section>

          <section className="qar-react-wird-field" aria-label="Start point">
            <div className="qar-react-wird-field-head">
              <span className="qar-react-wird-field-label">
                <MapPin aria-hidden="true" size={16} />
                Start point
              </span>
              <span className="qar-react-wird-field-value">{startMode === 'current' ? currentRefLabel : '1:1'}</span>
            </div>
            <SegmentedControl
              label="Start point"
              onValueChange={(value) => setStartMode(value as 'current' | 'beginning')}
              options={[
                { disabled: !currentPosition, label: `Current position ${currentRefLabel}`, value: 'current' },
                { label: 'Beginning 1:1', value: 'beginning' },
              ]}
              value={startMode}
            />
          </section>

          <section className="qar-react-wird-field" aria-label="Daily Wird reminders">
            <div className="qar-react-wird-field-head">
              <span className="qar-react-wird-field-label">
                <Bell aria-hidden="true" size={16} />
                Daily reminder
              </span>
              <span className="qar-react-wird-field-value">{reminderEnabled ? reminderTime : 'Off'}</span>
            </div>
            <Checkbox
              checked={reminderEnabled}
              className="qar-react-wird-reminder"
              label="Reminder"
              onCheckedChange={(checked) => {
                setReminderEnabled(checked === true)
                if (checked === true && getBrowserNotificationState() === 'default') void requestNotifications()
              }}
            />
            {reminderEnabled && (
              <>
                <Input
                  label="Reminder time"
                  onChange={(event) => setReminderTime(event.currentTarget.value)}
                  type="time"
                  value={reminderTime}
                />
                {currentNotificationState === 'unsupported' && (
                  <p className="qar-react-wird-note">In-app reminder only</p>
                )}
                {currentNotificationState === 'granted' && (
                  <p className="qar-react-wird-note">Browser notifications enabled</p>
                )}
                {currentNotificationState === 'denied' && (
                  <p className="qar-react-wird-note">Blocked in browser settings</p>
                )}
                {currentNotificationState !== 'unsupported' && currentNotificationState !== 'granted' && (
                  <Button
                    onClick={() => {
                      void requestNotifications()
                    }}
                    size="sm"
                    variant="secondary"
                  >
                    {currentNotificationState === 'denied' ? 'Request again' : 'Enable browser notifications'}
                  </Button>
                )}
              </>
            )}
          </section>

          <Button disabled={!canCreate} onClick={submitCreate}>
            {summary.state === 'no-plan' ? 'Create Plan' : 'Save Plan'}
          </Button>
        </div>
      ) : (
        <div className="qar-react-wird-current">
          <p className="qar-react-wird-range">{summary.todayRangeLabel}</p>
          <p className="qar-react-wird-remaining">{summary.remainingLabel}</p>
          {summary.reminderLabel && <p className="qar-react-wird-reminder-line">{summary.reminderLabel}</p>}
          <Button disabled={summary.state === 'plan-complete'} onClick={onContinue}>
            {summary.state === 'plan-complete' ? 'Plan complete' : 'Continue Wird'}
          </Button>
          <Button onClick={startEditing} variant="secondary">
            Edit Plan
          </Button>
          <Button onClick={() => setConfirmingReset(true)} variant="danger">
            Reset Plan
          </Button>
          {confirmingReset && (
            <Button onClick={onReset} variant="danger">
              Confirm reset
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
