import { useState } from 'react'

import type { BrowserNotificationState, QuranRef, SurahCount, WirdSummary, WirdUnit } from '../../../continuity/wird/types'
import { Button, Checkbox, Input } from '../../ui'

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
  const [targetDays, setTargetDays] = useState<number | null>(null)
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
  const canCreate = (targetMode === 'preset' ? targetDays !== null : targetEndOn.length > 0)
    && (startMode === 'beginning' || currentPosition !== null)

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
        <Button aria-label="Back" className="qar-react-wird-back" onClick={onBack} size="sm" variant="ghost">Back</Button>
        <h2 className="qar-react-wird-detail-title" id="wird-detail-title">Daily Wird</h2>
      </div>

      {showEditor ? (
        <div className="qar-react-wird-setup">
          <div className="qar-react-wird-setup-intro">
            <p className="qar-react-wird-eyebrow">Plan setup</p>
            <p className="qar-react-wird-help">Choose a finish target and QuranAtlas will size each daily reading.</p>
          </div>

          <section className="qar-react-wird-field" aria-label="Completion target">
            <div className="qar-react-wird-field-head">
              <span className="qar-react-wird-field-label">Completion target</span>
              <span className="qar-react-wird-field-value">{targetMode === 'custom' ? 'Custom' : targetDays ? `${targetDays} days` : 'Choose'}</span>
            </div>
            <div className="qar-react-wird-options" role="group" aria-label="Completion target">
              {[7, 30, 90].map((days) => (
                <Button
                  aria-pressed={targetMode === 'preset' && targetDays === days}
                  className="qar-react-wird-option"
                  key={days}
                  onClick={() => selectPreset(days)}
                  size="sm"
                  variant={targetMode === 'preset' && targetDays === days ? 'secondary' : 'ghost'}
                >
                  {days} days
                </Button>
              ))}
              <Button
                aria-pressed={targetMode === 'custom'}
                className="qar-react-wird-option"
                onClick={() => {
                  setTargetMode('custom')
                  setTargetDays(null)
                }}
                size="sm"
                variant={targetMode === 'custom' ? 'secondary' : 'ghost'}
              >
                Custom date
              </Button>
            </div>
            {targetMode === 'custom' && (
              <Input
                className="qar-react-wird-input"
                label="Finish date"
                onChange={(event) => setTargetEndOn(event.currentTarget.value)}
                type="date"
                value={targetEndOn}
              />
            )}
          </section>

          <section className="qar-react-wird-field" aria-label="Display unit">
            <div className="qar-react-wird-field-head">
              <span className="qar-react-wird-field-label">Display unit</span>
              <span className="qar-react-wird-field-value">{unit}</span>
            </div>
            <div className="qar-react-wird-options" role="group" aria-label="Display unit">
              {UNITS.map((nextUnit) => (
                <Button
                  aria-pressed={unit === nextUnit}
                  className="qar-react-wird-option"
                  key={nextUnit}
                  onClick={() => setUnit(nextUnit)}
                  size="sm"
                  variant={unit === nextUnit ? 'secondary' : 'ghost'}
                >
                  {nextUnit}
                </Button>
              ))}
            </div>
          </section>

          <section className="qar-react-wird-field" aria-label="Start point">
            <div className="qar-react-wird-field-head">
              <span className="qar-react-wird-field-label">Start point</span>
              <span className="qar-react-wird-field-value">{startMode === 'current' ? currentRefLabel : '1:1'}</span>
            </div>
            <div className="qar-react-wird-options" role="group" aria-label="Start point">
              <Button
                aria-pressed={startMode === 'current'}
                className="qar-react-wird-option"
                disabled={!currentPosition}
                onClick={() => setStartMode('current')}
                size="sm"
                variant={startMode === 'current' ? 'secondary' : 'ghost'}
              >
                Current position {currentRefLabel}
              </Button>
              <Button
                aria-pressed={startMode === 'beginning'}
                className="qar-react-wird-option"
                onClick={() => setStartMode('beginning')}
                size="sm"
                variant={startMode === 'beginning' ? 'secondary' : 'ghost'}
              >
                Beginning 1:1
              </Button>
            </div>
          </section>

          <section className="qar-react-wird-field qar-react-wird-field--reminder" aria-label="Daily Wird reminders">
            <Checkbox
              checked={reminderEnabled}
              className="qar-react-wird-reminder"
              label="Reminder"
              onCheckedChange={(checked) => setReminderEnabled(checked === true)}
            />
            {reminderEnabled && (
              <>
                <Input
                  className="qar-react-wird-input"
                  label="Reminder time"
                  onChange={(event) => setReminderTime(event.currentTarget.value)}
                  type="time"
                  value={reminderTime}
                />
                {currentNotificationState === 'unsupported' && <p className="qar-react-wird-note">In-app reminder only</p>}
                {currentNotificationState === 'granted' && <p className="qar-react-wird-note">Browser notifications enabled</p>}
                {currentNotificationState === 'denied' && <p className="qar-react-wird-note">Blocked in browser settings</p>}
                {currentNotificationState !== 'unsupported' && currentNotificationState !== 'granted' && (
                  <Button className="qar-react-wird-secondary" onClick={() => { void requestNotifications() }} size="sm" variant="secondary">
                    {currentNotificationState === 'denied' ? 'Request again' : 'Enable browser notifications'}
                  </Button>
                )}
              </>
            )}
          </section>

          <Button className="qar-react-wird-primary" disabled={!canCreate} onClick={submitCreate}>
            {summary.state === 'no-plan' ? 'Create Plan' : 'Save Plan'}
          </Button>
        </div>
      ) : (
        <div className="qar-react-wird-current">
          <p className="qar-react-wird-range">{summary.todayRangeLabel}</p>
          <p className="qar-react-wird-remaining">{summary.remainingLabel}</p>
          {summary.reminderLabel && <p className="qar-react-wird-reminder-line">{summary.reminderLabel}</p>}
          <Button className="qar-react-wird-primary" disabled={summary.state === 'plan-complete'} onClick={onContinue}>
            {summary.state === 'plan-complete' ? 'Plan complete' : 'Continue Wird'}
          </Button>
          <Button className="qar-react-wird-secondary" onClick={startEditing} variant="secondary">Edit Plan</Button>
          <Button className="qar-react-wird-danger" onClick={() => setConfirmingReset(true)} variant="danger">Reset Plan</Button>
          {confirmingReset && (
            <Button className="qar-react-wird-danger" onClick={onReset} variant="danger">Confirm reset</Button>
          )}
        </div>
      )}
    </section>
  )
}
