import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { matchReactRoute, REACT_ROUTES } from '../../app/router/routes'
import { Button, Status } from '../ui'
import { SettingsShell } from '../settings/SettingsShell'
import { openReactDb } from '../../storage/db'
import { nativeSettingsReader, readNativeSetting, writeNativeSetting } from '../../storage/native-reader-store'
import { resolveDrawerHrefForReaderMode } from '../reader/reader-mode-routing'
import { createWirdPlan, deriveWirdSummary, getLocalDayKey, updateWirdPlanTarget } from '../../continuity/wird/progress'
import { createWirdBoundaries } from '../../continuity/wird/metadata'
import { loadReactWirdPageBoundaries } from '../../continuity/wird/page-boundaries'
import { getBrowserNotificationState } from '../../continuity/wird/reminders'
import { loadWirdSurahCounts } from '../../continuity/wird/surah-counts'
import {
  readWirdPlan,
  updateWirdPlanNotificationState,
  WIRD_NOTIFICATION_PERMISSION_PROMPTED_KEY,
  writeWirdPlan,
} from '../../continuity/wird/store'
import type {
  BrowserNotificationState,
  QuranRef,
  SurahCount,
  WirdBoundary,
  WirdPlan,
} from '../../continuity/wird/types'
import { WirdOverview } from './WirdOverview'
import { WirdPlanForm, type WirdFormPayload } from './WirdPlanForm'

type SavedPosition = QuranRef

// Loader seams (brief §15.10 stories): product code uses the defaults; stories
// inject mocks per state.
export type WirdSheetDeps = {
  loadCounts?: () => Promise<SurahCount[]>
  loadPageBoundaries?: (counts: SurahCount[]) => Promise<WirdBoundary[]>
  loadPlan?: () => Promise<WirdPlan | null>
  loadPosition?: () => Promise<SavedPosition | null>
  persistPlan?: (plan: WirdPlan | null) => Promise<void>
  requestNotifications?: () => Promise<BrowserNotificationState>
}

function defaultLoadPlan(): Promise<WirdPlan | null> {
  return readWirdPlan(nativeSettingsReader())
}

function defaultLoadPosition(): Promise<SavedPosition | null> {
  return nativeSettingsReader()
    .settings.get('currentPosition')
    .then((record) => asSavedPosition(record?.value))
    .catch(() => null)
}

function defaultPersistPlan(plan: WirdPlan | null): Promise<void> {
  return openReactDb().then((db) => writeWirdPlan(db, plan))
}

async function defaultRequestNotifications(): Promise<BrowserNotificationState> {
  if (typeof Notification === 'undefined' || typeof Notification.requestPermission !== 'function')
    return 'unsupported' as const

  const markerPromise = (async () => {
    try {
      const prompted = await readNativeSetting(WIRD_NOTIFICATION_PERMISSION_PROMPTED_KEY)
      if (prompted?.value !== true) {
        await writeNativeSetting({ key: WIRD_NOTIFICATION_PERMISSION_PROMPTED_KEY, value: true })
      }
    } catch {
      // Permission requests remain available when the marker store is unavailable.
    }
  })()

  const permission = await Notification.requestPermission()
  const state = getBrowserNotificationState(permission)
  await markerPromise
  try {
    const db = await openReactDb()
    await updateWirdPlanNotificationState(db, state)
  } catch {
    // The sheet reflects the browser result; persistence retries on the next save.
  }
  return state
}

const SAVED_STATUS_MS = 4000

// The app-level Daily Wird surface (brief §15.3): a full-height modal sheet
// rendered from the shared SettingsShell, mounted once by App.tsx on request.
// Real 114-surah counts only — fallback counts are never displayed or used
// for creation.
export function WirdSheet({
  deps = {},
  initialView,
  onClose,
  returnFocusId,
}: {
  deps?: WirdSheetDeps
  /** Story seam: force the first surface when a plan exists. */
  initialView?: 'overview' | 'form'
  onClose: () => void
  returnFocusId?: string
}) {
  const loadCounts = deps.loadCounts ?? loadWirdSurahCounts
  const loadPageBoundaries = deps.loadPageBoundaries ?? loadReactWirdPageBoundaries
  const loadPlan = deps.loadPlan ?? defaultLoadPlan
  const loadPosition = deps.loadPosition ?? defaultLoadPosition
  const persistPlan = deps.persistPlan ?? defaultPersistPlan
  const requestNotifications = deps.requestNotifications ?? defaultRequestNotifications

  const [attempt, setAttempt] = useState(0)
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [plan, setPlan] = useState<WirdPlan | null>(null)
  const [counts, setCounts] = useState<SurahCount[]>([])
  const [pageBoundaries, setPageBoundaries] = useState<WirdBoundary[]>([])
  const [currentPosition, setCurrentPosition] = useState<SavedPosition | null>(null)
  const [editing, setEditing] = useState(() => initialView === 'form')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [savedStatus, setSavedStatus] = useState<string | null>(null)
  const [notificationState, setNotificationState] = useState<BrowserNotificationState>(() =>
    getBrowserNotificationState(),
  )
  const lastPayloadRef = useRef<WirdFormPayload | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt intentionally retriggers the loaders for Try again.
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setLoadState('loading')
    setPlan(null)
    setCounts([])

    const planPromise = loadPlan().catch(() => null)
    const positionPromise = loadPosition().catch(() => null)
    loadCounts()
      .then(async (loadedCounts) => {
        if (!active) return
        const [loadedPlan, position] = await Promise.all([planPromise, positionPromise])
        if (!active) return
        setCounts(loadedCounts)
        setPlan(loadedPlan)
        setCurrentPosition(position)
        setLoadState('ready')
        return loadPageBoundaries(loadedCounts).then((boundaries) => {
          if (active && !controller.signal.aborted) setPageBoundaries(boundaries ?? [])
        })
      })
      .catch(() => {
        if (active) setLoadState('error')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [attempt, loadCounts, loadPageBoundaries, loadPlan, loadPosition])

  useEffect(() => {
    if (!savedStatus) return undefined
    const timer = window.setTimeout(() => setSavedStatus(null), SAVED_STATUS_MS)
    return () => window.clearTimeout(timer)
  }, [savedStatus])

  const boundaries = useMemo(() => createWirdBoundaries(counts, pageBoundaries), [counts, pageBoundaries])
  const summary = useMemo(
    () => (counts.length === 114 ? deriveWirdSummary(plan, counts, { boundaries }) : null),
    [boundaries, counts, plan],
  )

  const persist = useCallback(
    async (next: WirdPlan | null) => {
      setSaving(true)
      setSaveError(false)
      try {
        await persistPlan(next)
        setPlan(next)
        return true
      } catch {
        setSaveError(true)
        return false
      } finally {
        setSaving(false)
      }
    },
    [persistPlan],
  )

  function handleCreate(payload: WirdFormPayload): void {
    if (counts.length !== 114) return
    lastPayloadRef.current = payload
    const today = getLocalDayKey()
    const last = counts[counts.length - 1]
    const startRef: QuranRef =
      payload.startMode === 'current' && currentPosition ? currentPosition : { surah: 1, verse: 1 }
    const next = createWirdPlan(
      {
        endRef: { surah: last.n, verse: last.count },
        reminder: {
          browserNotifications: notificationState,
          enabled: payload.reminderEnabled,
          time: payload.reminderTime,
        },
        startedOn: today,
        startRef,
        targetEndOn: payload.targetEndOn,
        unit: payload.unit,
      },
      counts,
      today,
    )
    void persist(next).then((saved) => {
      if (saved) {
        setEditing(false)
        setSavedStatus('Plan saved')
      }
    })
  }

  function handleEditSave(payload: WirdFormPayload): void {
    if (!plan) return
    lastPayloadRef.current = payload
    const next = updateWirdPlanTarget(
      plan,
      {
        reminder: {
          browserNotifications: notificationState,
          enabled: payload.reminderEnabled,
          time: payload.reminderTime,
        },
        targetEndOn: payload.targetEndOn,
        unit: payload.unit,
      },
      counts,
    )
    void persist(next).then((saved) => {
      if (saved) {
        setEditing(false)
        setSavedStatus('Plan saved')
      }
    })
  }

  function retrySave(): void {
    const payload = lastPayloadRef.current
    if (!payload) return
    if (plan) handleEditSave(payload)
    else handleCreate(payload)
  }

  function handleReset(): void {
    void persist(null).then(() => {
      setEditing(false)
    })
  }

  function handleContinue(): void {
    if (!summary?.nextRef) return
    const target = REACT_ROUTES.surah(summary.nextRef.surah, summary.nextRef.verse)
    const navigate = (href: string) => {
      window.location.hash = href
      onClose()
    }
    if (matchReactRoute(window.location.hash).type === 'mushaf') {
      void resolveDrawerHrefForReaderMode('mushaf', target).then(navigate)
      return
    }
    navigate(target)
  }

  const reminderValue = plan
    ? plan.reminder.enabled
      ? getBrowserNotificationState() === 'granted'
        ? plan.reminder.time
        : `${plan.reminder.time} · notifications off`
      : 'Off'
    : 'Off'

  return (
    <SettingsShell
      closeLabel="Close Daily Wird"
      layout="full"
      onClose={onClose}
      returnFocusId={returnFocusId}
      subtitle=""
      title="Daily Wird"
    >
      {loadState === 'loading' ? (
        <div aria-label="Loading Daily Wird" className="qar-react-wird-loading" role="status">
          <div className="qar-reader-skeleton-bar" style={{ width: '38%' }} />
          <div className="qar-reader-skeleton-bar" style={{ width: '82%' }} />
          <div className="qar-reader-skeleton-bar" style={{ width: '60%' }} />
        </div>
      ) : loadState === 'error' ? (
        <Status
          action={
            <Button onClick={() => setAttempt((value) => value + 1)} size="sm" variant="secondary">
              Try again
            </Button>
          }
          description="Check your connection and try again."
          title="Reading plan data couldn't load"
          tone="warning"
        />
      ) : plan && summary && !editing ? (
        <WirdOverview
          onContinue={handleContinue}
          onEdit={() => setEditing(true)}
          onReset={handleReset}
          reminderValue={reminderValue}
          savedStatus={savedStatus}
          summary={summary}
        />
      ) : (
        <WirdPlanForm
          counts={counts}
          currentPosition={currentPosition}
          mode={plan ? 'edit' : 'create'}
          notificationState={notificationState}
          onCancel={plan ? () => setEditing(false) : undefined}
          onRequestNotifications={() =>
            requestNotifications().then((state) => {
              setNotificationState(state)
              return state
            })
          }
          onSubmit={plan ? handleEditSave : handleCreate}
          onRetrySave={retrySave}
          pageBoundaries={pageBoundaries}
          plan={plan}
          saveError={saveError}
          saving={saving}
        />
      )}
    </SettingsShell>
  )
}

function asSavedPosition(value: unknown): SavedPosition | null {
  if (!value || typeof value !== 'object') return null
  const position = value as Partial<SavedPosition>
  if (!Number.isInteger(position.surah) || !Number.isInteger(position.verse)) return null
  if ((position.surah ?? 0) < 1 || (position.surah ?? 0) > 114 || (position.verse ?? 0) < 1) return null
  return { surah: position.surah as number, verse: position.verse as number }
}
