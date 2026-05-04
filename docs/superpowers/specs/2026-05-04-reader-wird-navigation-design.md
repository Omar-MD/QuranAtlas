# Reader Juz Navigation And Daily Wird Design

## Scope

Add two Reader-flow features as one `read` + `navigate` surface cluster:

- Juz navigation in the mobile navigation drawer.
- One active Daily Wird plan with automatic reading progress, configurable display unit, daily reminder support, and a dedicated continue action.

The feature extends the existing mobile drawer and reader-position system. It does not add a standalone route or a second reading surface.

## Product Decisions

- Daily Wird uses a completion target: the user chooses a finish horizon and the app calculates daily portions.
- Only one active wird plan exists at a time.
- The starting point is user-selectable. Setup defaults to the current reader position and offers "start from beginning".
- The user can choose the display/planning unit: `juz`, `hizb`, `page`, or `verse`.
- Missed days preserve the finish target by redistributing remaining reading across future days.
- Progress is automatic while reading. There is no required "mark done" action.
- Notifications are progressive enhancement: in-app reminder state is always available; browser notifications are offered when supported and permission is granted.

## Mobile Drawer UI

The drawer keeps the existing header wordmark and close action, but the `Read | Study` control moves into the top bar next to the close button.

Chosen top-bar pattern:

- Left: QuranAtlas wordmark / about entry.
- Right: squared two-state `Read | Study` switch.
- Far right: close button.
- The switch uses the existing hard-edged drawer control language rather than a pill.
- Close remains a separate minimum-size tap target.

In Read mode, the first content block is a Daily Wird card. It shows:

- `Today`
- progress percentage
- compact progress bar
- current next reference
- brief remaining amount

The card opens the Wird detail state.

Below the card, Read mode shows two primary destinations:

- `Browse`
- `Bookmarks`

Browse contains a secondary `Surah | Juz` switch. Surah mode preserves the existing surah search/list behavior. Juz mode renders 30 rows with:

- juz number
- start reference
- start surah name
- current marker when the active reader position sits inside that juz

Tapping a Juz row closes the drawer and navigates to the juz start reference.

## Wird Detail UI

Tapping the Daily Wird card opens the plan cockpit inside the drawer.

When no plan exists, show setup:

- completion horizon
- unit choice: `juz`, `hizb`, `page`, `verse`
- start point choice: current reader position or beginning
- reminder time and notification enablement

When a plan exists, show:

- today's assigned range
- current progress
- remaining amount in the selected display unit
- finish horizon
- notification/reminder state
- `Continue Wird` primary action

`Continue Wird` navigates to the next unread point inside today's assigned range. It does not overwrite ordinary reader resume semantics.

## Data Model

Persist one active plan as a new `settings` key with a sole writer module.

Initial implementation shape:

```ts
type WirdUnit = 'juz' | 'hizb' | 'page' | 'verse'

type WirdPlan = {
  id: string
  startRef: { surah: number; verse: number }
  endRef: { surah: number; verse: number }
  targetDays: number
  startedOn: string
  unit: WirdUnit
  reminder: {
    enabled: boolean
    time: string
    browserNotifications: 'unsupported' | 'default' | 'granted' | 'denied'
  }
  progress: {
    lastReadRef: { surah: number; verse: number }
    nextRef: { surah: number; verse: number }
    dayKey: string
    todayStartRef: { surah: number; verse: number }
    todayEndRef: { surah: number; verse: number }
    completedThroughRef: { surah: number; verse: number } | null
  }
  history: Array<{
    dayKey: string
    assignedStartRef: { surah: number; verse: number }
    assignedEndRef: { surah: number; verse: number }
    completedThroughRef: { surah: number; verse: number } | null
  }>
}
```

The stored record should stay compact. Derived totals, labels, and percentages are computed at runtime.

## Progress Math

All progress uses a canonical verse index internally, regardless of display unit.

- `verse`: exact verse-index range.
- `page`: map verses to the `AyahRecord.page` metadata already present in reader payloads.
- `juz`: use existing Juz starts and verse-index spans.
- `hizb`: add a small static or derived boundary table and map it to verse-index spans.

Daily assignment:

1. Determine remaining canonical verse span from plan progress.
2. Determine remaining days through the target horizon.
3. Divide remaining span across remaining days.
4. Convert the assigned canonical range to the user's selected display unit for labels.

If the user misses a day, the next app session recomputes the daily range from remaining span and remaining days, preserving the target finish horizon.

If the user reads beyond today's assigned range, the extra progress counts toward the plan's remaining total.

## Reader Integration

The existing reader position tracking remains authoritative for ordinary resume behavior through `settings.currentPosition`.

Daily Wird listens to reader position updates and updates the plan only when the position intersects or advances through the active plan range. It should not block reader rendering, scroll restoration, tafsir, bookmarks, or cross-surah swap behavior.

`Continue Wird` routes directly to the plan's `nextRef`. Normal reader scroll tracking then resumes and keeps both ordinary reader position and wird progress current.

## Notifications

Reminder behavior is layered:

- In-app reminder state is persisted in the plan.
- Browser notification permission is requested only after the user enables reminders.
- If notifications are unsupported or denied, the plan keeps the reminder time and surfaces it in-app only.
- Notification code must not make plan progress depend on service worker availability.

## Edge Cases

- Existing plan + setup entry: show current plan with edit/reset controls, not a second active plan.
- Plan start beyond final ayah: reject in setup.
- Target horizon with no remaining days: assign all remaining reading to today.
- Riwayah changes: plan references stay `{ surah, verse }`; display labels should use current active riwayah counts where needed, but plan progress should not corrupt if counts differ.
- Offline dataset: Juz and page labels should degrade to reference-only if metadata fetch fails; reader navigation remains available.

## Files Likely To Change

- `src/navigate/NavDrawer.svelte`
- `src/styles/surfaces/nav.css`
- `src/data/juz.ts`
- new `src/data/hizb.ts` or equivalent boundary helper
- new `src/read/wird/*` or `src/read/wird.ts` state/writer/progress helpers
- `src/configure/state.svelte.ts`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/context/data-model.md` if the settings key contract becomes cross-cutting

## Testing Plan

Unit tests:

- boundary conversion for verse/page/juz/hizb units
- missed-day redistribution
- next unread reference calculation
- single settings writer and stored plan shape
- drawer state for top-bar `Read | Study`, Browse `Surah | Juz`, Daily Wird card, and Wird detail

Reader tests:

- reader position updates feed wird progress without breaking `settings.currentPosition`
- `Continue Wird` routes to the plan's next reference

E2E / visual proof:

- mobile drawer opens from Reader
- top-bar switch is usable beside close
- Wird card appears first
- Browse switches between Surah and Juz
- Wird detail shows current plan and Continue action

Final verification should include the targeted unit tests, one mobile Playwright drawer journey, screenshot critique, and the repository validation gate selected by the QuranAtlas testing workflow.
