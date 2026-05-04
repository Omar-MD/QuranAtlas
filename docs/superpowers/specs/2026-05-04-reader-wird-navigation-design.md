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

The drawer keeps the existing full-screen mobile behavior and desktop side-panel fallback. The top bar becomes the only top-level mode row.

Top bar, left to right:

- Left: QuranAtlas wordmark / about entry.
- Middle/right: squared two-state `Read | Study` switch.
- Far right: close button.
- Implement as a safe-area-aware three-column row: `minmax(0, 1fr) auto 44px`.
- The switch uses the existing hard-edged drawer control language rather than a pill or soft chip.
- Close remains a separate 44 px minimum tap target and must never share its hit area with the switch.
- On narrow phones, the wordmark truncates before the switch or close shrink. Hide the secondary "about" label below 360 px.

In Read mode, the first content block directly below the top bar is a compact Daily Wird card. It is a single button surface, not a nested card stack. Active-plan content shows:

- `Today`
- progress percentage
- compact progress bar
- current next reference
- brief remaining amount

The card opens the Wird detail state. It also covers these states:

- **No plan:** `Start daily wird`, finish-target hint, no progress bar.
- **Active:** today's progress, next reference, remaining amount, reminder status when enabled.
- **Today complete:** `Today complete`, 100% bar, next due reference or tomorrow label.
- **Behind target:** neutral `Adjusted today` copy; no warning color unless calculation fails.
- **Plan complete:** completion message plus review/reset entry.
- **Loading / metadata missing:** skeleton or reference-only labels; navigation remains available.

Below the card, Read mode shows a hard-edged destination switch:

- `Browse`
- `Bookmarks`

`Browse` contains a secondary hard-edged `Surah | Juz` switch in the Browse rail. Surah mode preserves the existing search, `All | Recent` filter, current-surah highlight, and surah row layout. On phones below 360 px, search and `All | Recent` wrap into separate rows rather than compressing text.

Juz mode hides the surah search and `All | Recent` filter, then renders 30 rows with:

- juz number
- start reference
- start surah name
- Arabic start surah name on >=360 px widths; hide it below that if needed to protect reference and tap target clarity
- current marker when the active reader position sits inside that juz
- subdued progress marker when Daily Wird progress sits inside that juz

Each Browse, Bookmarks, Surah, Juz, and row control keeps at least a 44 px tap target. Tapping a Juz row closes the drawer and navigates to the juz start reference. Switching Browse modes does not close the drawer or clear the current reader position marker.

`Bookmarks` reuses the existing bookmark list behavior. The Daily Wird card remains above the Browse/Bookmarks destination switch in Read mode so the daily task is always discoverable without replacing bookmarks.

In Study mode, the Daily Wird card and Read destinations are hidden; the existing Study Hub and layer rows begin below the top bar.

## Wird Detail UI

Tapping the Daily Wird card opens a drawer subview under the same top bar. The subview has a 44 px Back control, title `Daily Wird`, and the normal close button remains available. Back returns to the prior Read destination; close dismisses the drawer.

When no plan exists, show setup:

- completion target: preset day counts plus a custom finish date
- unit choice: `juz`, `hizb`, `page`, `verse`; wrap to a 2 x 2 grid on narrow phones
- start point choice: current reader position or beginning, with the current reference shown inline
- reminder time toggle and time input
- optional browser notification enablement shown only after reminders are enabled
- primary `Create Plan` action disabled until the target and start point are valid

When a plan exists, show:

- today's assigned range
- current progress
- remaining amount in the selected display unit
- finish horizon
- notification/reminder state
- `Continue Wird` primary action
- `Edit Plan` secondary action
- `Reset Plan` destructive action behind confirmation

`Continue Wird` navigates to the next unread point inside today's assigned range. It does not overwrite ordinary reader resume semantics.

If today's range is complete but the plan is not complete, `Continue Wird` remains available and routes to the next plan reference so the user can read ahead. If the full plan is complete, replace it with a disabled `Plan complete` state and keep review/reset actions.

The detail body scrolls independently below the top bar. The primary action stays reachable above the safe-area inset on short phones without covering form controls.

## Data Model

Persist one active plan as `settings.wirdPlan` with a sole writer module under `src/read/wird/`.

Initial implementation shape:

```ts
type WirdUnit = 'juz' | 'hizb' | 'page' | 'verse'

type WirdPlan = {
  id: string
  startRef: { surah: number; verse: number }
  endRef: { surah: number; verse: number }
  targetDays: number
  targetEndOn: string
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

Daily assignment uses the user's local calendar day:

1. Determine remaining canonical verse span from plan progress.
2. Determine remaining days through `targetEndOn`, including today.
3. Divide remaining span across remaining days.
4. Convert the assigned canonical range to the user's selected display unit for labels.

If the user misses a day, the next app session recomputes the daily range from remaining span and remaining days, preserving the target finish horizon.

If the user reads beyond today's assigned range, the extra progress counts toward the plan's remaining total.

Progress is monotonic inside the plan range: ordinary reader movement can advance `completedThroughRef`, but scrolling backward must not reduce it.

## Reader Integration

The existing reader position tracking remains authoritative for ordinary resume behavior through `settings.currentPosition`.

Daily Wird listens to reader position updates and updates the plan only when the position intersects or advances through the active plan range. It should not block reader rendering, scroll restoration, tafsir, bookmarks, or cross-surah swap behavior.

`Continue Wird` routes directly to the plan's `nextRef`. Normal reader scroll tracking then resumes and keeps both ordinary reader position and wird progress current.

The drawer's Daily Wird card reads plan state passively. It must not write progress from drawer render alone.

## Notifications

Reminder behavior is layered:

- In-app reminder state is persisted in the plan.
- Browser notification permission is requested only after the user enables reminders.
- If notifications are unsupported, show `In-app reminder only` and do not show a permission button.
- If permission is default, show a secondary `Enable browser notifications` action.
- If permission is granted, show the scheduled reminder time.
- If permission is denied, keep the reminder time, show `Blocked in browser settings`, and do not reprompt.
- Notification code must not make plan progress depend on service worker availability.

## Edge Cases

- Existing plan + setup entry: show current plan with edit/reset controls, not a second active plan.
- Plan start beyond final ayah: reject in setup.
- Start point at or beyond the plan end reference: reject in setup with inline error.
- Target horizon with no remaining days: assign all remaining reading to today.
- Completion target before today: reject in setup.
- Riwayah changes: plan references stay `{ surah, verse }`; display labels should use current active riwayah counts where needed, but plan progress should not corrupt if counts differ.
- Offline dataset: Juz and page labels should degrade to reference-only if metadata fetch fails; reader navigation remains available.
- Drawer opened on a 320 px wide phone: top bar controls keep 44 px targets, no horizontal scroll, and at least the first active list row is visible after the card and switches.

## Accessibility And Visual Requirements

- Use semantic buttons for wordmark, close, destination switches, rows, and setup actions.
- Mode, destination, and Browse switches expose grouped labels and `aria-selected` or equivalent selected state.
- The Daily Wird progress bar has an accessible name and value; scroll-driven progress updates are debounced and announced politely only when the card/detail is focused.
- Focus returns to the opener when the drawer closes. Opening Wird detail moves focus to its title or Back control.
- Touch targets are at least 44 px; close and back controls are 44-48 px square icon buttons.
- Use QuranAtlas tokens, hard-edged segmented controls, warm parchment surfaces, muted meta text, mono references, and hairline progress treatments. Avoid purple/blue gradients, soft marketing cards, nested cards, and oversized hero typography.
- Verify 320 x 568, 390 x 844, and tablet-width drawer layouts. Text must not overlap or truncate critical controls.

## Files Likely To Change

- `src/navigate/NavDrawer.svelte`
- `src/styles/surfaces/nav.css`
- `src/data/juz.ts`
- new `src/data/hizb.ts` or equivalent boundary helper
- `src/read/wird/*` state/writer/progress helpers
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
- card/detail states: no plan, active, today complete, behind target, plan complete, notification denied/unsupported

Reader tests:

- reader position updates feed wird progress without breaking `settings.currentPosition`
- `Continue Wird` routes to the plan's next reference

E2E / visual proof:

- mobile drawer opens from Reader
- top-bar switch is usable beside close
- Wird card appears first
- Browse switches between Surah and Juz
- narrow-phone top bar keeps wordmark, `Read | Study`, and close usable without horizontal overflow
- Daily Wird card states fit above Browse/Bookmarks without hiding the first list row
- Wird detail shows current plan and Continue action

Final verification should include the targeted unit tests, one mobile Playwright drawer journey, screenshot critique, and the repository validation gate selected by the QuranAtlas testing workflow.
