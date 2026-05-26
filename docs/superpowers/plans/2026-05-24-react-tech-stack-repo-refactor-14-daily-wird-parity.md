# React Tech Stack Refactor 14 - Daily Wird Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build React Daily Wird parity as reader-adjacent continuity with `settings.wirdPlan` ownership, monotonic progress, drawer integration, reminder state, and focused proof.

**Architecture:** Implement Daily Wird domain logic under `src-react/continuity/wird/**`, reader/navigation components under `src-react/components/{reader,navigation}/wird/**`, and compose through Wave 10 drawer and Wave 13 continuity without changing bookmark scope or launch restore. Persist only the existing `settings.wirdPlan` key through approved storage helpers; do not change the IDB schema.

**Tech Stack:** React, TypeScript, Dexie v7 settings key writes, Quran boundary metadata from runtime dataset, owned UI components, Storybook, Vitest, Playwright React e2e, browser Notification API behind user gestures only.

---

## Dependencies And Sequencing

This plan runs after Wave 09, Wave 10, and Wave 13. It must not add accounts, cloud sync, streaks, social features, analytics, import/export, or multiple concurrent plans.

## UI And Visual Proof Rule

Before implementing each Daily Wird component, read `DESIGN.md`, use the Wave 2 registry, choose exactly one active reference source for that component pass, and record whether it is a committed `docs/ui-references/**` image/note or an accepted current Svelte UI state from Wave 02. Storybook and Playwright proof must cover mobile `<768`, tablet `768-1179`, desktop `>=1180`, light/sepia/dark where relevant, and awkward states such as no plan, behind target, today complete, plan complete, reminder denied, reset confirmation, long range labels, and focus rings.

## File Structure

- Create: `src-react/continuity/wird/types.ts`
- Create: `src-react/continuity/wird/progress.ts`
- Create: `src-react/continuity/wird/store.ts`
- Create: `src-react/continuity/wird/metadata.ts`
- Create: `src-react/continuity/wird/reminders.ts`
- Create: `src-react/components/reader/wird/DailyWirdCard.tsx`
- Create: `src-react/components/reader/wird/WirdProgressMeter.tsx`
- Create: `src-react/components/navigation/wird/WirdDetail.tsx`
- Create: `src-react/components/navigation/wird/WirdPlanEditor.tsx`
- Create: `src-react/components/navigation/wird/WirdReminderControl.tsx`
- Create: `src-react/components/navigation/wird/WirdResetConfirm.tsx`
- Create: `src-react/components/navigation/wird/wird.stories.tsx`
- Modify: `src-react/components/navigation/NavDrawer.tsx`
- Modify: `src-react/components/navigation/JuzList.tsx`
- Modify: `src-react/app/routes/read/ReaderRoute.tsx` or reader position hook from Wave 13.
- Modify: `src-react/design-system/registry/component-registry.json`
- Create: `tests/unit/read/react-wird-progress.test.ts`
- Create: `tests/unit/read/react-wird-store.test.ts`
- Create: `tests/unit/read/react-wird-components.test.tsx`
- Create: `tests/e2e/read/react-wird-progress.spec.js`
- Create: `tests/e2e/navigate/react-wird-drawer.spec.js`
- Modify docs only if current behavior/ownership changes.

## Task 1: Preflight And Notification Docs Gate

**Files:**
- Read: required docs and Wave 09/10/13 outputs.
- Read: `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`.

- [ ] **Step 1: Confirm dependencies**

Run:

```bash
test -f src-react/app/routes/read/ReaderRoute.tsx
test -f src-react/components/navigation/NavDrawer.tsx
test -f src-react/continuity/current-position.ts
test -f src-react/storage/db.ts
```

Expected: all files exist. Stop if reader, drawer, continuity, or storage outputs are incomplete.

- [ ] **Step 2: Confirm no notification/date library is introduced**

Run:

```bash
rg -n "date-fns|luxon|dayjs|notification|scheduler" package.json src-react || true
```

Expected: no new library is needed. If a browser notification helper, date, scheduler, or service-worker notification library is added, run Context7 `library` then `docs` before implementation.

- [ ] **Step 3: Confirm schema stays v7**

Run:

```bash
rg -n "wirdPlan|QURAN_ATLAS_DB_VERSION|version\\(8\\)|createObjectStore" src-react src/core/db docs/context/data-model.md docs/context/surfaces/configure.md
```

Expected: `settings.wirdPlan` is an existing key, React DB remains v7, and no new store is added.

## Task 2: Types And Progress Reducer

**Files:**
- Create: `src-react/continuity/wird/types.ts`
- Create: `src-react/continuity/wird/progress.ts`
- Test: `tests/unit/read/react-wird-progress.test.ts`

- [ ] **Step 1: Write progress tests**

Create `tests/unit/read/react-wird-progress.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { advanceWirdProgress, createWirdPlan, deriveWirdSummary } from '../../../src-react/continuity/wird/progress'
import type { SurahCount } from '../../../src-react/continuity/wird/types'

const counts: SurahCount[] = [{ n: 1, count: 7 }, { n: 2, count: 286 }]

describe('React Daily Wird progress', () => {
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
})
```

Expected: fails until progress module exists.

- [ ] **Step 2: Add types**

Create `src-react/continuity/wird/types.ts` mirroring current product shape:

```ts
export type QuranRef = { surah: number; verse: number }
export type WirdUnit = 'juz' | 'hizb' | 'page' | 'verse'
export type BrowserNotificationState = 'unsupported' | 'default' | 'granted' | 'denied'
export type SurahCount = { n: number; count: number }

export type WirdReminder = { enabled: boolean; time: string; browserNotifications: BrowserNotificationState }
export type WirdProgress = {
  lastReadRef: QuranRef
  nextRef: QuranRef
  dayKey: string
  todayStartRef: QuranRef
  todayEndRef: QuranRef
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
  history: Array<{ dayKey: string; assignedStartRef: QuranRef; assignedEndRef: QuranRef; completedThroughRef: QuranRef | null }>
}
export type WirdSummaryState = 'no-plan' | 'active' | 'today-complete' | 'behind-target' | 'plan-complete' | 'loading' | 'metadata-missing'
export type WirdSummary = {
  state: WirdSummaryState
  plan: WirdPlan | null
  percent: number
  todayPercent: number
  nextRef: QuranRef | null
  todayRangeLabel: string
  remainingLabel: string
  reminderLabel: string | null
}
```

Expected: no settings schema change is introduced.

- [ ] **Step 3: Implement progress module**

Create `src-react/continuity/wird/progress.ts` with pure functions:

```ts
import type { QuranRef, SurahCount, WirdPlan, WirdReminder, WirdSummary, WirdUnit } from './types'

export function getLocalDayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function refToIndex(ref: QuranRef, counts: ReadonlyArray<SurahCount>): number {
  let offset = 0
  for (const surah of counts) {
    if (surah.n === ref.surah) return offset + ref.verse
    offset += surah.count
  }
  throw new Error(`Unknown surah ${ref.surah}`)
}

export function refFromIndex(index: number, counts: ReadonlyArray<SurahCount>): QuranRef {
  let remaining = index
  for (const surah of counts) {
    if (remaining <= surah.count) return { surah: surah.n, verse: remaining }
    remaining -= surah.count
  }
  const last = counts[counts.length - 1]
  return { surah: last.n, verse: last.count }
}

function compareRefs(a: QuranRef, b: QuranRef): number {
  return a.surah === b.surah ? a.verse - b.verse : a.surah - b.surah
}

function inclusiveDays(fromDay: string, toDay: string): number {
  return Math.max(1, Math.floor((new Date(`${toDay}T00:00:00`).getTime() - new Date(`${fromDay}T00:00:00`).getTime()) / 86400000) + 1)
}

export function createWirdPlan(input: {
  startRef: QuranRef
  endRef: QuranRef
  targetEndOn: string
  startedOn: string
  unit: WirdUnit
  reminder: WirdReminder
}, counts: ReadonlyArray<SurahCount>, todayKey = getLocalDayKey()): WirdPlan {
  if (compareRefs(input.startRef, input.endRef) >= 0) throw new Error('Start point must be before the plan end reference')
  return {
    id: `wird-${Date.now().toString(36)}`,
    ...input,
    targetDays: inclusiveDays(input.startedOn, input.targetEndOn),
    progress: {
      lastReadRef: input.startRef,
      nextRef: input.startRef,
      dayKey: todayKey,
      todayStartRef: input.startRef,
      todayEndRef: input.startRef,
      completedThroughRef: null,
    },
    history: [],
  }
}

export function advanceWirdProgress(plan: WirdPlan, readRef: QuranRef, counts: ReadonlyArray<SurahCount>, dayKey = getLocalDayKey()): WirdPlan {
  if (compareRefs(readRef, plan.startRef) < 0 || compareRefs(readRef, plan.endRef) > 0) return plan
  const previousIndex = plan.progress.completedThroughRef ? refToIndex(plan.progress.completedThroughRef, counts) : refToIndex(plan.startRef, counts) - 1
  const nextIndex = Math.max(previousIndex, refToIndex(readRef, counts))
  const planEndIndex = refToIndex(plan.endRef, counts)
  const completedThroughRef = refFromIndex(Math.min(nextIndex, planEndIndex), counts)
  const nextRef = refFromIndex(Math.min(nextIndex + 1, planEndIndex), counts)
  return {
    ...plan,
    progress: { ...plan.progress, dayKey, lastReadRef: readRef, completedThroughRef, nextRef },
  }
}

export function deriveWirdSummary(plan: WirdPlan | null, counts: ReadonlyArray<SurahCount>): WirdSummary {
  if (!plan) return { state: 'no-plan', plan: null, percent: 0, todayPercent: 0, nextRef: null, todayRangeLabel: 'Start daily wird', remainingLabel: 'Choose a finish target', reminderLabel: null }
  const start = refToIndex(plan.startRef, counts)
  const end = refToIndex(plan.endRef, counts)
  const completed = plan.progress.completedThroughRef ? refToIndex(plan.progress.completedThroughRef, counts) : start - 1
  const percent = Math.min(100, Math.round(((completed - start + 1) / Math.max(1, end - start + 1)) * 100))
  return {
    state: percent >= 100 ? 'plan-complete' : 'active',
    plan,
    percent,
    todayPercent: 0,
    nextRef: plan.progress.nextRef,
    todayRangeLabel: `${plan.progress.todayStartRef.surah}:${plan.progress.todayStartRef.verse} - ${plan.progress.todayEndRef.surah}:${plan.progress.todayEndRef.verse}`,
    remainingLabel: `${Math.max(0, end - completed)} verses remaining`,
    reminderLabel: plan.reminder.enabled ? plan.reminder.time : null,
  }
}
```

Expected: reducer is monotonic and pure; drawer render can call summary without writing progress.

- [ ] **Step 4: Run progress tests**

Run:

```bash
pnpm run test:react -- tests/unit/read/react-wird-progress.test.ts
```

Expected: tests pass.

## Task 3: Store, Metadata Boundaries, And Reminder State

**Files:**
- Create: `src-react/continuity/wird/store.ts`
- Create: `src-react/continuity/wird/metadata.ts`
- Create: `src-react/continuity/wird/reminders.ts`
- Test: `tests/unit/read/react-wird-store.test.ts`

- [ ] **Step 1: Write store tests**

Create `tests/unit/read/react-wird-store.test.ts`:

```ts
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearReactDbForTests } from '../utils/react-db-test-utils'
import { clearWirdPlan, loadWirdPlan, saveWirdPlan } from '../../../src-react/continuity/wird/store'
import { createWirdPlan } from '../../../src-react/continuity/wird/progress'

describe('React Daily Wird store', () => {
  beforeEach(async () => { await clearReactDbForTests() })

  it('persists only settings.wirdPlan', async () => {
    const plan = createWirdPlan({
      startRef: { surah: 1, verse: 1 },
      endRef: { surah: 2, verse: 10 },
      targetEndOn: '2026-06-01',
      startedOn: '2026-05-25',
      unit: 'verse',
      reminder: { enabled: false, time: '07:00', browserNotifications: 'default' },
    }, [{ n: 1, count: 7 }, { n: 2, count: 286 }], '2026-05-25')
    await saveWirdPlan(plan)
    expect((await loadWirdPlan())?.id).toBe(plan.id)
    await clearWirdPlan()
    expect(await loadWirdPlan()).toBeNull()
  })
})
```

Expected: fails until store exists.

- [ ] **Step 2: Implement store**

Create `src-react/continuity/wird/store.ts`:

```ts
import { openReactDb } from '../../storage/db'
import type { WirdPlan } from './types'

const KEY = 'wirdPlan'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isPlan(value: unknown): value is WirdPlan {
  const candidate = value as Partial<WirdPlan> | null
  return !!candidate && typeof candidate.id === 'string' && !!candidate.startRef && !!candidate.endRef && !!candidate.progress
}

export async function loadWirdPlan(): Promise<WirdPlan | null> {
  const db = await openReactDb()
  const record = await db.settings.get(KEY)
  return isPlan(record?.value) ? clone(record.value) : null
}

export async function saveWirdPlan(plan: WirdPlan): Promise<void> {
  const db = await openReactDb()
  await db.settings.put({ key: KEY, value: clone(plan) })
}

export async function clearWirdPlan(): Promise<void> {
  const db = await openReactDb()
  await db.settings.delete(KEY)
}
```

Expected: sole writer for `settings.wirdPlan` lives here.

- [ ] **Step 3: Implement metadata and reminder helpers**

Create `metadata.ts` to derive Juz/Hizb/Page boundaries from runtime Quran metadata already available under `/dataset/**`. Create `reminders.ts`:

```ts
import type { BrowserNotificationState } from './types'

export function getBrowserNotificationState(): BrowserNotificationState {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function requestReminderPermissionFromGesture(): Promise<BrowserNotificationState> {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.requestPermission()
}
```

Expected: permission is requested only from UI event handlers, never on render.

- [ ] **Step 4: Run store tests**

Run:

```bash
pnpm run test:react -- tests/unit/read/react-wird-store.test.ts
```

Expected: tests pass.

## Task 4: Components And Drawer Integration

**Files:**
- Create: `src-react/components/reader/wird/DailyWirdCard.tsx`
- Create: `src-react/components/reader/wird/WirdProgressMeter.tsx`
- Create: `src-react/components/navigation/wird/WirdDetail.tsx`
- Create: `src-react/components/navigation/wird/WirdPlanEditor.tsx`
- Create: `src-react/components/navigation/wird/WirdReminderControl.tsx`
- Create: `src-react/components/navigation/wird/WirdResetConfirm.tsx`
- Modify: `src-react/components/navigation/NavDrawer.tsx`
- Modify: `src-react/components/navigation/JuzList.tsx`
- Test: `tests/unit/read/react-wird-components.test.tsx`

- [ ] **Step 1: Write component tests**

Create `tests/unit/read/react-wird-components.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DailyWirdCard } from '../../../src-react/components/reader/wird/DailyWirdCard'

describe('DailyWirdCard', () => {
  it('renders no-plan state without advancing progress', () => {
    const onOpen = vi.fn()
    render(<DailyWirdCard summary={{ state: 'no-plan', plan: null, percent: 0, todayPercent: 0, nextRef: null, todayRangeLabel: 'Start daily wird', remainingLabel: 'Choose a finish target', reminderLabel: null }} onOpen={onOpen} />)
    expect(screen.getByText('Start daily wird')).toBeInTheDocument()
  })
})
```

Expected: fails until card exists.

- [ ] **Step 2: Implement Daily Wird card and meter**

Create components with props:

```ts
DailyWirdCard: { summary: WirdSummary; onOpen: () => void; onContinue?: (ref: QuranRef) => void }
WirdProgressMeter: { percent: number; label: string }
```

The card must not call `saveWirdPlan` or `advanceWirdProgress` during render.

Expected: drawer/card/detail render is read-only.

- [ ] **Step 3: Implement detail, editor, reminder, reset**

Create:

```text
WirdDetail - today range, remaining work, Continue, Edit, Reset
WirdPlanEditor - target date/duration, unit, start point, reminder
WirdReminderControl - requests permission only from click handler
WirdResetConfirm - explicit confirmation before clearWirdPlan
```

Expected: one active plan only; no streak/social/account language.

- [ ] **Step 4: Compose in drawer**

Modify `NavDrawer.tsx` so the Daily Wird card appears above read source controls. Modify `JuzList.tsx` to accept `wirdNextRef?: QuranRef` and mark the containing Juz.

Expected: navigation owns placement; Daily Wird domain remains under read/continuity.

- [ ] **Step 5: Run component tests**

Run:

```bash
pnpm run test:react -- tests/unit/read/react-wird-components.test.tsx
```

Expected: tests pass.

## Task 5: Reader Progress Hook

**Files:**
- Modify: `src-react/app/routes/read/ReaderRoute.tsx` or reader position hook from Wave 13.
- Test: extend `tests/unit/read/react-wird-progress.test.ts`

- [ ] **Step 1: Add reader progress test**

Append a test proving out-of-range saved position does not write progress and in-range saved position advances monotonically through `advanceWirdProgress`.

Expected: reducer remains the only progress mutation path.

- [ ] **Step 2: Wire reader position save**

When Wave 13 saves current position, load the active plan, call `advanceWirdProgress(plan, readRef, counts)`, and `saveWirdPlan(next)` only when the returned plan differs from the loaded plan.

Expected: ordinary `settings.currentPosition` remains normal resume source; Daily Wird Continue uses `plan.progress.nextRef`.

## Task 6: Registry, Stories, Visual Proof

**Files:**
- Create: `src-react/components/navigation/wird/wird.stories.tsx`
- Modify: `src-react/design-system/registry/component-registry.json`

- [ ] **Step 1: Add stories**

Create stories for:

```text
no-plan
in-progress
today-complete
plan-complete
behind-target
overdue/missed-day recompute
reminder default
reminder granted
reminder denied
reminder unsupported
mobile drawer
desktop drawer
reduced motion
```

Expected: stories use product-reader styling and no productivity-app framing.

- [ ] **Step 2: Extend registry**

Add sorted entries for:

```text
daily-wird-card
wird-detail
wird-plan-editor
wird-progress-meter
wird-reminder-control
wird-reset-confirm
```

Expected: entries are owned by `read`, reference stories/tests, and forbid accounts/sync/streaks/review.

- [ ] **Step 3: Run registry and Storybook checks**

Run:

```bash
pnpm run check:react-registry
pnpm run test:storybook:react
```

Expected: checks pass.

## Task 7: E2E, Docs, Verification, Commit

**Files:**
- Create: `tests/e2e/read/react-wird-progress.spec.js`
- Create: `tests/e2e/navigate/react-wird-drawer.spec.js`
- Modify docs if current behavior/ownership changes.

- [ ] **Step 1: Add e2e proof**

Add browser tests for:

```text
create plan from drawer
Continue routes to next unread reference
reader scroll/progress advances active plan
backward scroll does not reduce progress
edit plan updates settings.wirdPlan
reset requires confirmation
reminder permission default/granted/denied/unsupported states are visible
reload preserves plan and progress
```

Expected: notification permission request is initiated by a click, not by mount.

- [ ] **Step 2: Run verification**

Run:

```bash
pnpm run test:react -- tests/unit/read
pnpm run check:react
pnpm run build:react
pnpm run test:e2e:react -- tests/e2e/read/react-wird-progress.spec.js tests/e2e/navigate/react-wird-drawer.spec.js --reporter=line
pnpm run docs:check
git diff --check
pnpm run check
```

Expected: Daily Wird unit/e2e, React build, docs, whitespace, and shipped Svelte checks pass.

- [ ] **Step 3: Inspect changed files**

Run:

```bash
git diff --name-only
```

Expected: no settings schema migration, bookmark scope change, launch restore change, removed-scope branch, generated dataset hand edit, spec, or earlier Wave plan changes.

- [ ] **Step 4: Commit**

Run:

```bash
git add src-react tests docs
git commit -m "feat: add react daily wird parity"
```

Expected: commit succeeds. Do not push.

## Reviewer Checklist

- Verify `settings.wirdPlan` is the only persisted Daily Wird location.
- Verify card/detail render never advances progress.
- Verify backward reader movement cannot reduce progress.
- Verify notification permission is user-gesture initiated.
- Verify Daily Wird remains reader continuity, not accounts/sync/streaks/review.
