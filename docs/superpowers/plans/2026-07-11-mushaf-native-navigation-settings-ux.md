# Mushaf Native Navigation And Reader Settings UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Mushaf page fully reachable, replace fragile swiping and continuous-scroll routing with a native-feeling interaction architecture, and rebuild reader Settings around one topbar view action and a tokenized adaptive Sheet.

**Architecture:** Split pure gesture decisions, pointer lifecycle, retained page loading, and viewer rendering into focused reader modules. `App` remains the canonical hash-state owner, discrete page turns retain normal history, and passive continuous-page synchronization uses an explicit replace callback. Settings composes an owned Radix-backed Sheet, while feature components consume centralized primitives and semantic tokens rather than local visual literals.

**Tech Stack:** React 19, TypeScript, Vite, owned Radix UI wrappers, Tailwind v4 semantic tokens, Dexie settings, Vitest/Testing Library, Chromium Playwright/CDP touch input, Storybook.

## Global Constraints

- Approved design: `docs/superpowers/specs/2026-07-11-mushaf-navigation-settings-ux-design.md`.
- No new npm dependency or gesture/carousel library.
- Finger-right, `ArrowLeft`, and the left page action advance to the higher Mushaf page number; finger-left, `ArrowRight`, and the right page action return to the lower number.
- Single + Fit width owns native vertical stage scrolling; Scroll mode owns a retained vertical page stack; neither mode may intercept the other's axis.
- `mushafViewMode` and `mushafFitWidth` remain independent stored keys. `auto` resolves to Single and legacy `fit-width` still normalizes to Single plus Fit width.
- Public hashes remain `#/s/:surah/:ayah?` and `#/m/:page`; protected `?wird=1` intent must survive all Mushaf route updates.
- The only Verse/Mushaf view action is the icon-only reader-topbar action. Settings, About, and Search do not render it.
- Direct Radix imports remain confined to `src/components/ui/**`.
- New visual values belong in primitives or semantic tokens. Do not append sporadic Settings/Mushaf selector overrides or borrow Navigation tokens for Settings structure.
- QuranAtlas `AGENTS.md` overrides the generic test-first template: do not enforce TDD. Each behavior task still lands its durable tests before its commit.
- Unit tests assert roles, names, callbacks, state, and data contracts; browser geometry, scrolling, timing, pointer capture, focus traversal, contrast, and responsive layout remain in Playwright.
- Each task stages only its listed paths and preserves unrelated worktree changes.

---

## Handover Reconciliation

- No master-spec shared handoff log exists. Use the approved design spec, this plan, the prior responsive plan, current source, and local commit history as the coordination artifacts.
- `docs/superpowers/plans/2026-06-21-mushaf-view-responsive-fixes.md` has stale unchecked boxes, but its Single/Scroll preference split, adjacent-page rendering, metadata layout, and first responsive tests are present in current code.
- This plan supersedes the prior plan wherever it retained transparent viewport buttons, a 500 ms continuous cooldown, DOM-query overlay detection, mouse-only “mobile” swipes, or fixed no-scroll Settings assertions.
- Baseline branch is `dev`; the approved design is committed at `2a5cc730`; the worktree was clean when this plan was written.
- Dependency intake: none.

## File And Interface Map

### New focused files

- Create `src/components/reader/mushaf-gesture.ts`
  - Pure axis, direction, completion, velocity, and boundary-resistance decisions.
- Create `src/components/reader/useMushafPageGesture.ts`
  - Pointer lifecycle, capture, click suppression, settle completion, interruption cleanup, and reduced-motion behavior.
- Create `src/components/reader/ReaderInteractionContext.tsx`
  - Explicit reader-interaction suspension from Settings and Navigation overlays.
- Create `src/app/routes/read/useMushafPageWindow.ts`
  - Bounded five-entry page window, retained ready assets, stale-request cancellation, and neighbor retries.
- Create `src/components/reader/ReadingViewToggle.tsx`
  - Canonical icon-only topbar action with owned Tooltip and accessible destination copy.
- Create `src/components/settings/SettingsGroup.tsx`
  - Shared heading, description, and grouped-control surface for Settings.
- Create `tests/unit/react-read/mushaf-gesture.test.ts`
  - Pure named gesture decisions without DOM layout emulation.
- Create `tests/unit/react-read/mushaf-page-window.test.tsx`
  - Retained loading-window behavior with the asset loader mocked at its module boundary.
- Create paired UI-reference files under:
  - `docs/ui-references/configure/settings-shell/default.mobile.light.{png,md}`
  - `docs/ui-references/read/reading-view-toggle/default.mobile.light.{png,md}`

### Existing files with changed ownership

- `src/components/reader/MushafPageViewer.tsx`
  - Renders the stage, ordered Single strip, continuous stack, direct taps, visible page actions, keyboard scrolling, and dominant-page reconciliation.
- `src/app/routes/read/MushafRoute.tsx`
  - Loads active settings/profile, consumes the page-window hook, advances Wird, and selects push versus replace route updates.
- `src/app/App.tsx`
  - Supplies atomic replace-route and overlay-suspension props; removes Settings-driven reader-mode mutation.
- `src/components/reader/ReaderPageShell.tsx`
  - Provides interaction suspension and stable reader-main/settings-trigger focus targets.
- `src/components/reader/ReaderChrome.tsx`
  - Composes the canonical reading-view action only when a reader supplies `onModeChange`.
- `src/components/ui/overlays.tsx`
  - Owns the adaptive Sheet variant, structured body slot, and explicit return-focus behavior.
- `src/app/settings-overlay-events.ts`
  - Carries mode and return-focus identity without using the event as reader navigation.
- `src/app/routes/settings/SettingsRoute.tsx`
  - Treats mode as read-only, controls direct-assets expansion, and orders active/shared groups.
- `src/components/settings/{SettingsShell,VerseSettings,MushafSettings,ThemeNightControls,IncludedAssetsSection}.tsx`
  - Compose the adaptive grouped settings experience.
- `src/design-system/tokens/{primitives,semantic}.css`
  - Own touch-target, settle-motion, Settings surface, and selected-state semantics.
- `src/design-system/index.css`
  - Replaces overlapping Settings and Mushaf CSS with one coherent block per feature.

---

### Task 1: Add The Pure Mushaf Gesture Decision Module

**Files:**
- Create: `src/components/reader/mushaf-gesture.ts`
- Create: `tests/unit/react-read/mushaf-gesture.test.ts`

**Interfaces:**
- Produces `MushafGestureAxis`, `MushafPageDirection`, `MushafSettleDecision`.
- Produces `resolveMushafGestureAxis`, `mushafDirectionForDelta`, `decideMushafSettle`, `applyMushafBoundaryResistance`, and `mushafRecentVelocity`.
- Consumed by Task 2's `useMushafPageGesture`.

- [ ] **Step 1: Create the pure decision contract**

Add `src/components/reader/mushaf-gesture.ts` with private tuning constants and exported decisions:

```ts
export type MushafGestureAxis = 'pending' | 'horizontal' | 'vertical'
export type MushafPageDirection = 'next' | 'previous'
export type MushafGesturePoint = { at: number; x: number }
export type MushafSettleDecision =
  | { outcome: 'cancel'; direction: MushafPageDirection }
  | { outcome: 'commit'; direction: MushafPageDirection }

const AXIS_SLOP_PX = 8
const AMBIGUOUS_LOCK_PX = 16
const AXIS_DOMINANCE = 1.15
const MIN_DISTANCE_PX = 72
const MAX_DISTANCE_PX = 144
const DISTANCE_RATIO = 0.28
const MIN_FLICK_TRAVEL_PX = 24
const FLICK_VELOCITY_PX_PER_MS = 0.45
const VELOCITY_WINDOW_MS = 100
const BOUNDARY_RESISTANCE = 0.28

export function resolveMushafGestureAxis(deltaX: number, deltaY: number): MushafGestureAxis {
  const horizontal = Math.abs(deltaX)
  const vertical = Math.abs(deltaY)
  if (Math.max(horizontal, vertical) < AXIS_SLOP_PX) return 'pending'
  if (horizontal >= vertical * AXIS_DOMINANCE) return 'horizontal'
  if (vertical >= horizontal * AXIS_DOMINANCE) return 'vertical'
  if (Math.max(horizontal, vertical) < AMBIGUOUS_LOCK_PX) return 'pending'
  return horizontal > vertical ? 'horizontal' : 'vertical'
}

export function mushafDirectionForDelta(deltaX: number): MushafPageDirection {
  return deltaX >= 0 ? 'next' : 'previous'
}

export function mushafRecentVelocity(points: readonly MushafGesturePoint[]): number {
  const last = points.at(-1)
  if (!last) return 0
  const first = [...points].reverse().find((point) => last.at - point.at >= VELOCITY_WINDOW_MS) ?? points[0]
  if (!first || first === last) return 0
  return (last.x - first.x) / Math.max(1, last.at - first.at)
}

export function decideMushafSettle(input: {
  deltaX: number
  destinationReady: boolean
  velocityX: number
  width: number
}): MushafSettleDecision {
  const direction = mushafDirectionForDelta(input.deltaX)
  const distanceThreshold = Math.min(MAX_DISTANCE_PX, Math.max(MIN_DISTANCE_PX, input.width * DISTANCE_RATIO))
  const distanceMet = Math.abs(input.deltaX) >= distanceThreshold
  const flickMet = Math.abs(input.deltaX) >= MIN_FLICK_TRAVEL_PX
    && Math.abs(input.velocityX) >= FLICK_VELOCITY_PX_PER_MS
    && Math.sign(input.velocityX) === Math.sign(input.deltaX)
  return input.destinationReady && (distanceMet || flickMet)
    ? { direction, outcome: 'commit' }
    : { direction, outcome: 'cancel' }
}

export function applyMushafBoundaryResistance(deltaX: number): number {
  return deltaX * BOUNDARY_RESISTANCE
}
```

- [ ] **Step 2: Add named pure-decision tests**

Create `tests/unit/react-read/mushaf-gesture.test.ts` using clear scenarios rather than exporting or asserting the constants:

```ts
import { describe, expect, it } from 'vitest'

import {
  applyMushafBoundaryResistance,
  decideMushafSettle,
  mushafDirectionForDelta,
  resolveMushafGestureAxis,
} from '../../../src/components/reader/mushaf-gesture'

describe('Mushaf gesture decisions', () => {
  it('distinguishes clear horizontal intent from clear vertical intent', () => {
    expect(resolveMushafGestureAxis(96, 12)).toBe('horizontal')
    expect(resolveMushafGestureAxis(12, 96)).toBe('vertical')
  })

  it('maps physical right movement to next and left movement to previous', () => {
    expect(mushafDirectionForDelta(80)).toBe('next')
    expect(mushafDirectionForDelta(-80)).toBe('previous')
  })

  it('commits deliberate distance or velocity and cancels slow short movement', () => {
    expect(decideMushafSettle({ deltaX: 150, destinationReady: true, velocityX: 0.1, width: 390 })).toEqual({ direction: 'next', outcome: 'commit' })
    expect(decideMushafSettle({ deltaX: -48, destinationReady: true, velocityX: -0.8, width: 390 })).toEqual({ direction: 'previous', outcome: 'commit' })
    expect(decideMushafSettle({ deltaX: 48, destinationReady: true, velocityX: 0.1, width: 390 })).toEqual({ direction: 'next', outcome: 'cancel' })
  })

  it('cancels an unavailable destination and reduces outward boundary travel', () => {
    expect(decideMushafSettle({ deltaX: 160, destinationReady: false, velocityX: 1, width: 390 }).outcome).toBe('cancel')
    expect(Math.abs(applyMushafBoundaryResistance(100))).toBeLessThan(100)
  })
})
```

- [ ] **Step 3: Run the focused pure test and static gate**

Run:

```bash
pnpm run test:react -- tests/unit/react-read/mushaf-gesture.test.ts
pnpm run check
```

Expected: the new test passes; all static gates pass without exporting visual/behavior constants into CSS.

- [ ] **Step 4: Commit the decision module**

```bash
git add src/components/reader/mushaf-gesture.ts tests/unit/react-read/mushaf-gesture.test.ts
git commit -m "feat: add Mushaf gesture decisions"
```

---

### Task 2: Add Pointer Lifecycle And Explicit Reader Suspension

**Files:**
- Create: `src/components/reader/useMushafPageGesture.ts`
- Create: `src/components/reader/ReaderInteractionContext.tsx`
- Modify: `src/components/reader/ReaderPageShell.tsx`
- Modify: `tests/unit/react-read/reader-wave3.test.tsx`

**Interfaces:**
- Consumes Task 1's pure gesture functions.
- Produces `useMushafPageGesture(options)` with `phase`, `dragX`, `stageHandlers`, `cancel`, `finishSettle`, and `shouldSuppressClick`.
- Produces `ReaderInteractionProvider` and `useReaderInteractionSuspended()`.
- `ReaderPageShell` gains `interactionSuspended?: boolean` and exposes the `reader-main` fallback focus target.

- [ ] **Step 1: Add explicit reader suspension context**

Create `ReaderInteractionContext.tsx`:

```tsx
import { createContext, type ReactNode, useContext } from 'react'

const ReaderInteractionContext = createContext(false)

export function ReaderInteractionProvider({ children, suspended }: { children: ReactNode; suspended: boolean }) {
  return <ReaderInteractionContext.Provider value={suspended}>{children}</ReaderInteractionContext.Provider>
}

export function useReaderInteractionSuspended(): boolean {
  return useContext(ReaderInteractionContext)
}
```

In `ReaderPageShell`, add `interactionSuspended = false`, wrap chrome/drawer/content with the provider using `interactionSuspended || drawerState.open`, and give the main element `id="reader-main"` and `tabIndex={-1}`. Do not query the DOM to infer overlay state.

- [ ] **Step 2: Implement the pointer lifecycle hook**

Create `useMushafPageGesture.ts` with this public contract:

```ts
import type { JSX, RefObject } from 'react'

export type MushafGesturePhase = 'idle' | 'tracking' | 'horizontal' | 'settling'

export function useMushafPageGesture(options: {
  canNavigate: (direction: MushafPageDirection) => boolean
  disabled: boolean
  onCommit: (direction: MushafPageDirection) => void
  onRequestDestination: (direction: MushafPageDirection) => void
  stageRef: RefObject<HTMLElement | null>
}): {
  cancel: () => void
  dragX: number
  finishSettle: () => void
  phase: MushafGesturePhase
  shouldSuppressClick: () => boolean
  stageHandlers: Pick<JSX.IntrinsicElements['div'],
    'onLostPointerCapture' | 'onPointerCancel' | 'onPointerDown' | 'onPointerMove' | 'onPointerUp'>
}
```

Implement the lifecycle with one active primary pointer record containing start coordinates, starting scroll offset, width, samples, and locked axis. Apply these rules directly in the handlers:

```ts
// pointerdown: primary pointer, primary mouse button, non-interactive target only.
// tracking: do not capture and do not preventDefault.
// vertical: record click suppression, clear tracking, and leave native pan ownership untouched.
// horizontal: capture on the stage only after axis lock, preventDefault, follow the finger,
//             call onRequestDestination once when the target is not ready, and apply
//             boundary resistance while canNavigate(direction) remains false.
// pointerup: use recent velocity + decideMushafSettle; settle to 0 or +/- stage width.
// transitionend: emit onCommit once for a completed settle, then return to idle.
// reduced motion: finish the settle on the next animation frame without page travel.
// cancel/lost capture/disabled/unmount/resize/orientation: release safely and settle to idle.
// compatibility clicks: suppress for 600ms after either horizontal or vertical intent.
```

Use a settle fallback timer slightly longer than the 240 ms motion token so a missing `transitionend` cannot leave the hook locked. Clear that timer on every cleanup path.

- [ ] **Step 3: Connect drawer/settings suspension to the hook contract**

`ReaderPageShell` must provide suspension before rendering `children`, so `MushafPageViewer` can consume it in Task 4. Keep current Verse chrome auto-hide and drawer behavior unchanged.

Add an effect inside the hook:

```ts
useEffect(() => {
  if (options.disabled) cancel()
}, [cancel, options.disabled])
```

Add resize and orientation listeners that call the same `cancel` function; do not reset scroll offsets here.

- [ ] **Step 4: Update durable reader-shell tests**

In `reader-wave3.test.tsx`, add a small context probe that renders a child under `ReaderPageShell`, then assert:

```tsx
expect(screen.getByTestId('reader-suspended')).toHaveTextContent('false')
fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
expect(screen.getByTestId('reader-suspended')).toHaveTextContent('true')
```

Also assert `reader-main` is programmatically focusable. Do not simulate pointer travel or stub geometry in this unit suite.

- [ ] **Step 5: Run focused reader tests and commit**

```bash
pnpm run test:react -- tests/unit/react-read/reader-wave3.test.tsx tests/unit/react-read/mushaf-gesture.test.ts
pnpm run check
git add src/components/reader/useMushafPageGesture.ts src/components/reader/ReaderInteractionContext.tsx src/components/reader/ReaderPageShell.tsx tests/unit/react-read/reader-wave3.test.tsx
git commit -m "feat: coordinate Mushaf gesture lifecycle"
```

Expected: focused tests and static gates pass; no browser geometry appears in unit tests.

---

### Task 3: Add The Retained Page Window And Atomic Route Synchronization

**Files:**
- Create: `src/app/routes/read/useMushafPageWindow.ts`
- Create: `tests/unit/react-read/mushaf-page-window.test.tsx`
- Modify: `src/app/routes/read/MushafRoute.tsx`
- Modify: `src/app/App.tsx`
- Modify: `tests/unit/react-read/reader-wave3.test.tsx`

**Interfaces:**
- Produces `MushafPageWindowEntry` and `useMushafPageWindow`.
- `MushafRoute` gains `interactionSuspended?: boolean` and `onReplaceHash?: (hash: string) => void`.
- Task 4 consumes ordered window entries instead of `adjacentPages`.

- [ ] **Step 1: Implement the bounded page-window hook**

Create this public shape:

```ts
export type MushafPageWindowEntry =
  | { page: number; status: 'loading' }
  | { page: number; status: 'error' | 'unavailable' }
  | { asset: MushafReadyPageAssetState; page: number; status: 'ready' }

export function useMushafPageWindow(input: {
  enabled: boolean
  page: number
  pageCount: number
  profile: { mushafEditionId: string; riwayah: Riwayah } | null
}): {
  entries: readonly MushafPageWindowEntry[]
  requested: MushafPageWindowEntry | null
  retry: (page: number) => void
}
```

The hook must:

```ts
const desiredPages = Array.from({ length: 5 }, (_, index) => input.page - 2 + index)
  .filter((page) => page >= 1 && page <= input.pageCount)

// Retain ready/loading entries whose key is still desired.
// Add loading entries only for missing desired keys.
// Load the requested page first, then remaining neighbors in parallel.
// Key each request generation by `${riwayah}:${mushafEditionId}:${page}:${retryGeneration}`.
// Ignore aborted or stale completions.
// Convert ready/error/unavailable outcomes into entries without clearing other ready entries.
// Abort all in-flight loads when profile changes or the hook unmounts.
// Keep the returned array sorted by numeric page and bounded to desiredPages.
```

- [ ] **Step 2: Refactor MushafRoute around active settings and the window**

Load `ActiveMushafSettings` once into route state, keep the existing preference subscription for live updates, and call:

```ts
const windowState = useMushafPageWindow({
  enabled: assetState === 'ready',
  page,
  pageCount: visiblePage?.resolved.pageCount ?? 604,
  profile: activeSettings ? {
    mushafEditionId: activeSettings.mushafEditionId,
    riwayah: activeSettings.riwayah,
  } : null,
})
```

When the requested entry becomes ready, promote it to `visiblePage`. While a direct requested page is loading, retain the last ready current page. When the requested entry becomes `error` or `unavailable`, render the existing requested-page error/missing gate instead of turning an empty neighbor into current content.

Pass the ordered entries and `windowState.retry` to `MushafPageViewer` in Task 4. Remove `adjacentPages`, its clear-and-reload effect, and `requestId` logic after the window owns them.

- [ ] **Step 3: Add explicit replace-route ownership to App**

In `App`, add:

```ts
function replaceActiveHash(nextHash: string): void {
  window.history.replaceState(null, '', nextHash)
  setHash(nextHash)
}
```

Pass it only to Mushaf route:

```tsx
<MushafRoute
  interactionSuspended={Boolean(settingsOverlay)}
  onReplaceHash={replaceActiveHash}
  page={route.page}
/>
```

In `MushafRoute`, keep discrete swipe/key/button navigation on `window.location.hash`. Send continuous dominant-page changes through `onReplaceHash`. Build both URLs with `withWirdProgressIntent` when the current protected intent is active. Keep Wird advancement monotonic and unchanged.

- [ ] **Step 4: Add retained-window tests**

In `mushaf-page-window.test.tsx`, mock `loadMushafPageAsset` and use `renderHook` to prove:

- initial page resolves before neighbors without clearing it;
- moving from page 42 to 43 retains ready 41-44 entries and requests only the new edge;
- the returned window never exceeds pages 41-45 around page 43;
- a stale page-44 response from an old profile cannot replace the new profile entry;
- failed page 44 remains a non-ready entry and `retry(44)` requests it again.

Extend the existing `keeps the current Mushaf page mounted while the next page asset loads` route test to use the new hook behavior and accessible page names.

- [ ] **Step 5: Run focused tests and commit**

```bash
pnpm run test:react -- tests/unit/react-read/mushaf-page-window.test.tsx tests/unit/react-read/reader-wave3.test.tsx
pnpm run check
git add src/app/routes/read/useMushafPageWindow.ts src/app/routes/read/MushafRoute.tsx src/app/App.tsx tests/unit/react-read/mushaf-page-window.test.tsx tests/unit/react-read/reader-wave3.test.tsx
git commit -m "feat: retain Mushaf page windows"
```

Expected: page loading tests pass, static gates pass, and no route update can be emitted by an obsolete request.

---

### Task 4: Rebuild Mushaf Viewer Rendering And Tokenized Layout

**Files:**
- Modify: `src/components/reader/MushafPageViewer.tsx`
- Modify: `src/app/routes/read/MushafRoute.tsx`
- Modify: `src/design-system/tokens/primitives.css`
- Modify: `src/design-system/tokens/semantic.css`
- Modify: `src/design-system/index.css`
- Modify: `tests/unit/react-read/reader-wave3.test.tsx`

**Interfaces:**
- Consumes Tasks 1-3.
- `MushafPageViewer` receives `pages: readonly MushafPageWindowEntry[]`, `onDominantPageChange(page)`, `onRequestPage(page)`, and the existing current ready asset fields.
- Produces labeled current/continuous page images, `Next Mushaf page` and `Previous Mushaf page` actions, native stage scrolling, and dominant-page callbacks.

- [ ] **Step 1: Replace internal drag/cooldown state with the gesture hook**

Delete `dragRef`, `dragState`, `SCROLL_COOLDOWN_MS`, transparent-zone click suppression, `readerOverlayOpen()`, and the unused `onViewModeChange` viewer prop. Consume `useReaderInteractionSuspended()` and call:

```ts
const gesture = useMushafPageGesture({
  canNavigate: (direction) => direction === 'next'
    ? readyEntry(pages, resolved.page + 1) !== null
    : readyEntry(pages, resolved.page - 1) !== null,
  disabled: interactionSuspended || isScrollMode,
  onCommit: (direction) => navigateTo(resolved.page + (direction === 'next' ? 1 : -1)),
  onRequestDestination: (direction) => onRequestPage?.(resolved.page + (direction === 'next' ? 1 : -1)),
  stageRef,
})
```

Define the lookup used above in the viewer:

```ts
function readyEntry(entries: readonly MushafPageWindowEntry[], page: number): MushafReadyPageAssetState | null {
  const entry = entries.find((candidate) => candidate.page === page)
  return entry?.status === 'ready' ? entry.asset : null
}
```

Bind `gesture.stageHandlers` to the stage. Set `--qa-react-mushaf-drag-x` from `gesture.dragX` and expose only a phase attribute needed by CSS transition state.

- [ ] **Step 2: Render the correct physical Single strip and continuous stack**

Single DOM order must be:

```tsx
<div className="qar-react-mushaf-page-strip" onTransitionEnd={gesture.finishSettle}>
  <MushafPageCell entry={entryFor(resolved.page + 1)} hidden position="next" />
  <MushafPageCell entry={entryFor(resolved.page)} position="current" />
  <MushafPageCell entry={entryFor(resolved.page - 1)} hidden position="previous" />
</div>
```

Scroll mode renders `pages` in ascending page order. Every ready continuous page is a labeled `role="img"`; loading/error neighbors expose polite non-image status copy. Single adjacent cells remain `aria-hidden`, so the current page is the only Single image exposed to assistive technology.

- [ ] **Step 3: Replace viewport overlays with direct taps and real page actions**

Handle a stage click only when `gesture.shouldSuppressClick()` is false and the target is not interactive. Route edge actions through this helper so an unready neighbor is retried but never committed:

```ts
function requestOrNavigate(page: number): void {
  if (page < 1 || page > resolved.pageCount) return
  if (readyEntry(pages, page)) navigateTo(page)
  else onRequestPage?.(page)
}
```

Use the click's stage-relative X coordinate:

```ts
const EDGE_TAP_RATIO = 0.3
const ratio = (event.clientX - rect.left) / rect.width
if (ratio < EDGE_TAP_RATIO) requestOrNavigate(resolved.page + 1)
else if (ratio > 1 - EDGE_TAP_RATIO) requestOrNavigate(resolved.page - 1)
else onToggleChrome?.(!chromeVisible)
```

Render visible owned actions beside the page counter when chrome is visible:

```tsx
<nav aria-label="Mushaf page navigation" className="qar-react-mushaf-page-actions">
  <IconButton disabled={resolved.page >= resolved.pageCount} label="Next Mushaf page" onClick={() => requestOrNavigate(resolved.page + 1)}>
    <ChevronLeft aria-hidden="true" />
  </IconButton>
  <div aria-label={`Mushaf page ${resolved.page}`} className="qar-react-mushaf-page-counter">{resolved.page}</div>
  <IconButton disabled={resolved.page <= 1} label="Previous Mushaf page" onClick={() => requestOrNavigate(resolved.page - 1)}>
    <ChevronRight aria-hidden="true" />
  </IconButton>
</nav>
```

Remove `qar-react-mushaf-edge` and `qar-react-mushaf-center-toggle` elements and CSS entirely.

- [ ] **Step 4: Make the stage the real scroll owner**

Keep one stage with `touch-action: pan-y`. Make it focusable and named whenever `fitWidth || isScrollMode`.

Add keyboard behavior, routing every Single page turn through `requestOrNavigate` so an unready neighbor is retried but not committed:

- Single: left/right page navigation; when Fit width overflows, Up/Down/PageUp/PageDown/Home/End move the stage.
- Scroll: Up/Down/PageUp/PageDown/Home/End move the stage; left/right never turn pages.
- All keys return immediately for editable targets or suspended interaction.

Reset `stage.scrollTop = 0` in a layout effect keyed to `resolved.page` only when Single mode installs a new current page. Resize and Fit-width changes clamp the existing offset to the valid range instead of resetting it.

- [ ] **Step 5: Replace continuous cooldown with rAF reconciliation and anchor deltas**

On scroll, schedule one animation-frame callback. Measure each ready cell's intersection with the stage viewport, select greatest visible area with center distance as tie-breaker, and emit `onDominantPageChange` only when it differs from the last emitted page.

Before the ordered page list changes, capture `{ page, top }` for the dominant/nearest ready cell. In `useLayoutEffect`, measure the same cell and adjust `stage.scrollTop += nextTop - previousTop`. Mark this adjustment so the resulting scroll event cannot emit another route update. Run a final reconciliation after `scrollend` where supported, with a debounced rAF fallback, and after `ResizeObserver` notifications.

- [ ] **Step 6: Add shared touch/motion primitives and Mushaf semantics**

Add to `primitives.css`:

```css
--qar-size-touch-target: 2.75rem;
--qar-motion-settle: 240ms;
--qar-ease-direct-manipulation: cubic-bezier(0.32, 0.72, 0, 1);
```

Add to `semantic.css`:

```css
--qa-react-control-touch-target: var(--qar-size-touch-target);
--qa-react-mushaf-page-turn-duration: var(--qar-motion-settle);
--qa-react-mushaf-page-turn-easing: var(--qar-ease-direct-manipulation);
--qa-react-mushaf-boundary-surface: color-mix(in srgb, var(--qa-react-accent) 8%, var(--qa-react-mushaf-ground));
```

- [ ] **Step 7: Replace the coherent Mushaf CSS block**

Replace the block from `.qar-react-mushaf-page-surface` through the Mushaf responsive rules instead of adding overrides. Preserve safe-area/chrome geometry and use these mode rules:

```css
.qar-react-mushaf-page-stage {
  position: relative;
  min-height: 0;
  overflow-x: clip;
  touch-action: pan-y;
}

[data-mushaf-layout-mode='single'][data-mushaf-fit-width='false'] .qar-react-mushaf-page-stage {
  width: min(100%, calc(var(--qa-react-mushaf-available-height) * var(--qa-react-mushaf-page-ratio)));
  aspect-ratio: var(--qa-react-mushaf-page-ratio);
  overflow-y: hidden;
}

[data-mushaf-layout-mode='single'][data-mushaf-fit-width='true'] .qar-react-mushaf-page-stage,
[data-mushaf-layout-mode='scroll'] .qar-react-mushaf-page-stage {
  width: 100%;
  height: var(--qa-react-mushaf-available-height);
  overflow-y: auto;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}

.qar-react-mushaf-page-strip {
  display: flex;
  width: 300%;
  height: 100%;
  transform: translate3d(calc(-33.333333% + var(--qa-react-mushaf-drag-x, 0px)), 0, 0);
  transition: transform var(--qa-react-mushaf-page-turn-duration) var(--qa-react-mushaf-page-turn-easing);
}

.qar-react-mushaf-page-strip > .qar-react-mushaf-page-cell { flex: 0 0 33.333333%; }
[data-mushaf-gesture-phase='horizontal'] .qar-react-mushaf-page-strip { transition: none; }
```

Use `--qa-react-control-touch-target` for page actions and bookmark control. Add safe-area-aware horizontal padding in compact landscape. Under `prefers-reduced-motion: reduce`, set page-turn duration to `0ms` without changing route behavior.

Use `--qa-react-mushaf-boundary-surface` only for the bounded loading/error neighbor treatment; true page-count boundaries contain no destination cell.

- [ ] **Step 8: Replace implementation-trivia unit assertions**

Update `reader-wave3.test.tsx` so:

- Continuous mode exposes accessible images for pages 41, 42, and 43.
- Single mode exposes only current page 42 to assistive technology.
- `Next Mushaf page` and `Previous Mushaf page` invoke 43 and 41 and expose correct disabled boundaries.
- ArrowLeft/ArrowRight callbacks retain physical Mushaf direction.
- No unit test queries CSS classes, styling-only data attributes, or layout geometry.

- [ ] **Step 9: Run focused tests and commit**

```bash
pnpm run test:react -- tests/unit/react-read/mushaf-gesture.test.ts tests/unit/react-read/mushaf-page-window.test.tsx tests/unit/react-read/reader-wave3.test.tsx
pnpm run check
git add src/components/reader/MushafPageViewer.tsx src/app/routes/read/MushafRoute.tsx src/design-system/tokens/primitives.css src/design-system/tokens/semantic.css src/design-system/index.css tests/unit/react-read/reader-wave3.test.tsx
git commit -m "feat: rebuild Mushaf page interaction"
```

Expected: unit/static gates pass and no transparent control covers the stage.

---

### Task 5: Replace Mouse-Only Coverage With Real Mushaf Browser Proofs

**Files:**
- Modify: `tests/e2e/read/mushaf-responsive.spec.ts`
- Modify: `tests/e2e/fixtures/react-golden-routes.ts`

**Interfaces:**
- Uses the existing Chromium project; does not add a WebKit or dependency requirement.
- CDP helpers remain local to the Mushaf spec because no other surface consumes them.

- [ ] **Step 1: Add a genuine Chromium touch helper**

Replace `dragMushafPage` with a CDP helper:

```ts
async function touchPath(page: Page, points: Array<{ x: number; y: number }>, intervalMs = 16): Promise<void> {
  const session = await page.context().newCDPSession(page)
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  const [first, ...rest] = points
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...first, id: 1 }] })
  for (const point of rest) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, id: 1 }] })
    // Gesture timing is the assertion; this is the scoped AGENTS.md timing carve-out.
    await page.waitForTimeout(intervalMs)
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await session.detach()
}
```

Add `touchCancel` for interruption coverage and keep the helper coordinates derived from the visible stage bounding box.

- [ ] **Step 2: Prove Single + Fit width bottom reachability**

Add `@mobile` tests that:

- open page 42 in 320x568 portrait and 844x390 landscape;
- use upward touch paths with slight horizontal jitter;
- assert `scrollTop` increases, the route stays page 42, and `scrollTop + clientHeight >= scrollHeight - 2` after repeated pans;
- rotate portrait to landscape without reload, preserve a clamped offset, and reach the bottom;
- scroll partway, navigate through `Next Mushaf page`, and assert page 43's stage starts at zero.

Keep wheel proofs for 768x1024, 1180x820, and 1440x900. Every responsive case must also call `expectNoHorizontalOverflow`.

Add one compact mode-matrix case that opens Single/Fit page, Single/Fit width, Scroll/Fit page, and Scroll/Fit width at phone landscape and tablet portrait. Assert the complete Single page or a valid stage scroll range is reachable as appropriate, and assert Scroll mode never responds to horizontal page gestures.

- [ ] **Step 3: Prove native horizontal gesture behavior**

Replace mouse “mobile” swipes with touch cases for:

- a short fast right flick commits page 43;
- a slow short right drag cancels on page 42;
- a vertical/diagonal pan scrolls Fit width without route change;
- during a right drag, the rendered incoming cell is page 43 before release;
- a left drag returns from 43 to 42;
- rapid settled right gestures reach 44 one page at a time without stale content;
- page 1 and page 604 resist outward gestures and never reveal a blank destination;
- `touchCancel`, overlay opening, and viewport resize return the reader to a usable idle state;
- reduced-motion context commits the same route without waiting for travel animation.

Use visible page names and route outcomes first. A stable page-cell hook is allowed only for the mid-drag incoming-page identity proof.

- [ ] **Step 4: Prove continuous anchoring, history, and protected intent**

Add a test that enters `#/m/42?wird=1` from `#/s/1`, scrolls until pages 43 and 44 become dominant, and asserts:

```ts
await expect(page).toHaveURL(/#\/m\/44\?wird=1$/)
await page.goBack()
await expect(page).toHaveURL(/#\/s\/1$/)
```

Also assert the anchor page's viewport-relative top changes by no more than 2 CSS pixels when the rendered five-page window shifts. Prove sustained wheel/touch momentum does not stop at a stale three-page boundary.

- [ ] **Step 5: Update existing overlay/chrome assertions**

Query the active Settings dialog by `Verse settings` or `Mushaf settings`. Replace opacity/class assertions where a visible control or accessible name proves the same outcome. Keep page/content geometry only for bottom reachability, anchor stability, safe-area containment, and overlap regressions.

- [ ] **Step 6: Run and time the owning browser spec**

```bash
time pnpm exec playwright test tests/e2e/read/mushaf-responsive.spec.ts --project=chromium --reporter=line
```

Expected: all Mushaf responsive tests pass with genuine touch cases; added coverage has one shared setup path and no unscoped fixed sleeps.

- [ ] **Step 7: Commit browser coverage**

```bash
git add tests/e2e/read/mushaf-responsive.spec.ts tests/e2e/fixtures/react-golden-routes.ts
git commit -m "test: prove native Mushaf navigation"
```

---

### Task 6: Add The Canonical Reading View Toggle

**Files:**
- Create: `src/components/reader/ReadingViewToggle.tsx`
- Modify: `src/components/reader/ReaderChrome.tsx`
- Modify: `src/app/routes/settings/AboutRoute.tsx`
- Modify: `src/design-system/index.css`
- Modify: `tests/unit/react-read/reader-wave3.test.tsx`
- Modify: `tests/unit/react-shell/about-route.test.tsx`
- Modify: `src/components/reader/reader.stories.tsx`

**Interfaces:**
- Produces `ReadingViewToggle({ mode, onModeChange })`.
- `ReaderChrome` remains the only consumer and renders it only when `onModeChange` exists.

- [ ] **Step 1: Create the icon-only destination action**

Create `ReadingViewToggle.tsx`:

```tsx
export function ReadingViewToggle({ mode, onModeChange }: {
  mode: 'verse' | 'mushaf'
  onModeChange: (mode: 'verse' | 'mushaf') => void
}) {
  const destination = mode === 'verse' ? 'mushaf' : 'verse'
  const label = destination === 'mushaf' ? 'Switch to Mushaf view' : 'Switch to Verse view'
  return (
    <Tooltip content={label}>
      <IconButton className="qar-reader-chrome-view-toggle" label={label} onClick={() => onModeChange(destination)}>
        {destination === 'mushaf' ? <OpenMushafGlyph /> : <VerseLinesGlyph />}
      </IconButton>
    </Tooltip>
  )
}
```

Use code-native inline SVG glyphs: an open two-page outline for Mushaf, and three stacked text lines ending in a small ayah marker for Verse. Mark the glyph SVG `aria-hidden`; do not export or unit-test its paths.

- [ ] **Step 2: Make ReaderChrome the only consumer**

Replace the current `BookOpenText`/`ListOrdered` block with:

```tsx
{onModeChange ? <ReadingViewToggle mode={mode} onModeChange={onModeChange} /> : null}
```

Remove `aria-pressed`, the dot, mirror transform, `data-reader-mode`, and asymmetric Mushaf styling. Give the control `--qa-react-control-touch-target` dimensions and symmetric semantic surface/border/focus styling.

- [ ] **Step 3: Remove the action from About**

In `AboutRoute`, omit `onModeChange` from `ReaderChrome`. Keep navigation and Settings actions. Search already omits it and must remain unchanged.

- [ ] **Step 4: Update unit and story coverage**

In `reader-wave3.test.tsx`, assert destination labels use “view,” callbacks bridge the same routes, and neither action has `aria-pressed`. In `about-route.test.tsx`, assert About has no `Switch to Mushaf view` or `Switch to Verse view` button. Add Verse and Mushaf toggle states to `reader.stories.tsx`.

- [ ] **Step 5: Run focused tests and commit**

```bash
pnpm run test:react -- tests/unit/react-read/reader-wave3.test.tsx tests/unit/react-shell/about-route.test.tsx
pnpm run check
git add src/components/reader/ReadingViewToggle.tsx src/components/reader/ReaderChrome.tsx src/app/routes/settings/AboutRoute.tsx src/design-system/index.css tests/unit/react-read/reader-wave3.test.tsx tests/unit/react-shell/about-route.test.tsx src/components/reader/reader.stories.tsx
git commit -m "feat: clarify the reading view action"
```

Expected: only actual reader routes expose the canonical toggle.

---

### Task 7: Move Settings Onto The Owned Adaptive Sheet

**Files:**
- Modify: `src/components/ui/overlays.tsx`
- Modify: `src/components/ui/index.ts`
- Modify: `src/app/settings-overlay-events.ts`
- Modify: `src/components/reader/ReaderChrome.tsx`
- Modify: `src/components/reader/ReaderPageShell.tsx`
- Modify: `src/components/settings/SettingsShell.tsx`
- Modify: `src/app/routes/settings/SettingsRoute.tsx`
- Modify: `src/app/App.tsx`
- Modify: `tests/unit/react-components/ui-components.test.tsx`
- Modify: `tests/unit/react-shell/settings-route.test.tsx`
- Modify: `tests/unit/react-navigate/navigation-wave3.test.tsx`

**Interfaces:**
- `Sheet` gains `variant?: 'default' | 'adaptive-settings'`, `closeLabel?: string`, and `returnFocusId?: string`.
- Export `SheetBody` from the owned UI layer.
- Settings open events carry `{ mode?, returnFocusId? }`.
- `SettingsRoute` removes `onReaderModeChange` and gains `initialAssetsExpanded?: boolean` plus `returnFocusId?: string`.

- [ ] **Step 1: Extend the owned Sheet API**

In `overlays.tsx`, keep all Radix imports inside the UI layer and implement:

```tsx
import { cn } from '../../design-system/utils/cn'

export type SheetProps = OverlayBaseProps & {
  closeLabel?: string
  returnFocusId?: string
  variant?: 'default' | 'adaptive-settings'
}

export function SheetBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('qar-react-sheet-body', className)}>{children}</div>
}
```

Set `data-sheet-variant={variant}` on content. In `onCloseAutoFocus`, prevent the default only when a valid explicit target or fallback is found, then call `focus({ preventScroll: true })` on `returnFocusId`, `#reader-settings-trigger`, or `#reader-main` in that order. Keep default Sheet behavior unchanged for callers without these props.

- [ ] **Step 2: Carry return-focus identity through settings events**

Change the event contract to:

```ts
export type ReactOpenSettingsRequest = {
  mode?: SettingsRouteMode
  returnFocusId?: string
}

export function requestReactSettingsOverlay(mode: SettingsRouteMode, returnFocusId = 'reader-settings-trigger'): void
export function subscribeReactSettingsOverlayRequests(listener: (request: ReactOpenSettingsRequest) => void): () => void
```

Give the ReaderChrome settings action `id="reader-settings-trigger"`. Preserve the existing Verse anchor capture/restore behavior.

- [ ] **Step 3: Rebuild SettingsShell as Sheet composition**

Remove the manual backdrop, dialog root focus effect, and document Escape listener. Render:

```tsx
<Sheet
  closeLabel="Close settings"
  onOpenChange={(open) => { if (!open) onClose() }}
  open
  returnFocusId={returnFocusId}
  title={title}
  variant="adaptive-settings"
>
  <SheetBody>{children}</SheetBody>
</Sheet>
```

Do not import Radix in `SettingsShell`.

- [ ] **Step 4: Remove Settings-driven reader-mode navigation**

Delete the Settings Reader mode card and `onReaderModeChange` prop. In `App`, remove:

- `settingsOverlay.verseHash`;
- `updateSettingsReaderHash`;
- `changeSettingsReaderMode`;
- `currentReaderVerseHash`, `currentReaderVerseRef`, `findVisibleReaderVerse`, and parsing helpers used only by Settings switching;
- Settings-only imports of reader-mode route conversion helpers.

Keep `settingsOverlay.mode` read-only from the preserved reader hash.

- [ ] **Step 5: Make compatibility routes deterministic**

Track whether the transient route was `#/assets` before replacing it with the reader hash. Pass `initialAssetsExpanded` to SettingsRoute for that path. For Search/About/direct Settings, resolve mode from `lastReaderHash`, falling back to `#/s/1`. Opening or closing Settings must never change reader mode.

Initialize the controlled disclosure deterministically:

```ts
const [includedAssetsVisible, setIncludedAssetsVisible] = useState(
  () => initialAssetsExpanded ?? shouldShowIncludedAssetsByDefault(),
)
```

- [ ] **Step 6: Update modal and Settings ownership tests**

In `ui-components.test.tsx`, prove the adaptive Sheet is a labelled modal, Escape calls `onOpenChange(false)`, and explicit close restores focus to the named opener.

In `settings-route.test.tsx`:

- delete tests that switch the underlying reader from Settings;
- assert no `Reader mode` radiogroup exists;
- assert titles are `Verse settings` and `Mushaf settings`;
- retain active-mode-only controls and persistence assertions;
- assert direct `#/assets` starts its disclosure expanded;
- assert direct/controlled close uses the Settings trigger or reader-main fallback.

- [ ] **Step 7: Run focused tests and commit**

```bash
pnpm run test:react -- tests/unit/react-components/ui-components.test.tsx tests/unit/react-shell/settings-route.test.tsx tests/unit/react-read/reader-wave3.test.tsx
pnpm run check
git add src/components/ui/overlays.tsx src/components/ui/index.ts src/app/settings-overlay-events.ts src/components/reader/ReaderChrome.tsx src/components/reader/ReaderPageShell.tsx src/components/settings/SettingsShell.tsx src/app/routes/settings/SettingsRoute.tsx src/app/App.tsx tests/unit/react-components/ui-components.test.tsx tests/unit/react-shell/settings-route.test.tsx
git commit -m "refactor: move Settings to the owned Sheet"
```

Expected: modal semantics, route preservation, and focus restoration pass without a custom backdrop implementation.

---

### Task 8: Build The Grouped Tokenized Settings Experience

**Files:**
- Create: `src/components/settings/SettingsGroup.tsx`
- Modify: `src/app/routes/settings/SettingsRoute.tsx`
- Modify: `src/components/settings/SettingsShell.tsx`
- Modify: `src/components/settings/VerseSettings.tsx`
- Modify: `src/components/settings/MushafSettings.tsx`
- Modify: `src/components/settings/ThemeNightControls.tsx`
- Modify: `src/components/settings/IncludedAssetsSection.tsx`
- Modify: `src/design-system/tokens/semantic.css`
- Modify: `src/design-system/index.css`
- Modify: `tests/unit/react-shell/settings-route.test.tsx`
- Modify: `tests/unit/react-navigate/navigation-wave3.test.tsx`

**Interfaces:**
- Produces `SettingsGroup({ title, description?, children })`.
- `SettingsShell` owns only Sheet framing; SettingsRoute owns ordered content groups.
- `IncludedAssetsSection` keeps controlled `visible`/`onVisibleChange` and uses truthful disclosure labels.

- [ ] **Step 1: Add a reusable grouped surface**

Create `SettingsGroup.tsx` using `useId`:

```tsx
import { type ReactNode, useId } from 'react'

export function SettingsGroup({ children, description, title }: {
  children: ReactNode
  description?: string
  title: string
}) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="qar-react-settings-group">
      <header className="qar-react-settings-group-heading">
        <h3 id={titleId}>{title}</h3>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="qar-react-settings-group-content">{children}</div>
    </section>
  )
}
```

- [ ] **Step 2: Compose the approved group order**

Make VerseSettings render `SettingsGroup title="Verse reading"`; make MushafSettings render `SettingsGroup title="Page layout"`. Wrap Daily Wird in `Reading continuity`, ThemeNightControls in `Appearance`, and render IncludedAssetsSection last.

SettingsShell no longer accepts theme/night props; SettingsRoute passes them directly to ThemeNightControls in the Appearance group. Preserve live optimistic writes and queued persistence.

- [ ] **Step 3: Make Included assets a truthful disclosure**

Use button labels `Show included reading assets` and `Hide included reading assets`, keep `aria-controls`/`aria-expanded`, and preserve controlled expansion. Remove `ChevronRight` from read-only rows. Rows display only icon, asset label, and Included status.

- [ ] **Step 4: Add dedicated Settings semantics**

Add root semantics derived from global theme tokens:

```css
--qa-react-settings-backdrop: color-mix(in srgb, var(--qa-react-text) 34%, transparent);
--qa-react-settings-sheet: var(--qa-react-sheet);
--qa-react-settings-header: color-mix(in srgb, var(--qa-react-sheet) 88%, var(--qa-react-surface));
--qa-react-settings-group: color-mix(in srgb, var(--qa-react-surface) 82%, var(--qa-react-sheet));
--qa-react-settings-group-border: color-mix(in srgb, var(--qa-react-border) 58%, var(--qa-react-accent));
--qa-react-settings-divider: color-mix(in srgb, var(--qa-react-settings-group-border) 58%, transparent);
--qa-react-settings-selected: color-mix(in srgb, var(--qa-react-accent) 15%, var(--qa-react-settings-group));
--qa-react-settings-selected-text: var(--qa-react-accent-strong);
--qa-react-settings-muted: var(--qa-react-text-muted);
--qa-react-settings-shadow: 0 18px 48px rgb(0 0 0 / 18%);
```

Override only the shadow/mixture proportions that require deliberate dark-theme adjustment. Sepia and auto-resolved themes inherit through their base semantic mappings. Do not use `--qa-react-nav-*` in the Settings block.

- [ ] **Step 5: Replace all overlapping Settings CSS generations**

Delete the existing Settings blocks from `.qar-react-settings-backdrop` through the last narrow Settings media query. Add one coherent scoped block with:

- adaptive Sheet overlay/content/header/body;
- full viewport on phone and short landscape;
- right rail with bounded width on tablet/desktop;
- sticky header and one `overflow-y: auto` body;
- group spacing using `--qar-space-*` primitives;
- row dividers and selected states using Settings semantics;
- 44px minimum controls via `--qa-react-control-touch-target`;
- Appearance grids that wrap without shrinking targets;
- safe-area top/bottom padding;
- no fixed footer, fixed mode-panel height, or no-scroll body rule.

Scope ThemeNightControls rules under `.qar-react-settings-shell` so Search's existing appearance reuse is not unintentionally restyled.

- [ ] **Step 6: Update Settings unit coverage**

Assert by accessible heading/region names that group order is Verse reading/Page layout, Reading continuity, Appearance, Included reading assets. Assert the inactive mode's controls are absent. Assert the assets disclosure expands/collapses and rows have no link/button navigation affordance beyond the disclosure itself.

- [ ] **Step 7: Run focused tests and commit**

```bash
pnpm run test:react -- tests/unit/react-shell/settings-route.test.tsx tests/unit/react-components/ui-components.test.tsx
pnpm run check
git add src/components/settings/SettingsGroup.tsx src/app/routes/settings/SettingsRoute.tsx src/components/settings/SettingsShell.tsx src/components/settings/VerseSettings.tsx src/components/settings/MushafSettings.tsx src/components/settings/ThemeNightControls.tsx src/components/settings/IncludedAssetsSection.tsx src/design-system/tokens/semantic.css src/design-system/index.css tests/unit/react-shell/settings-route.test.tsx
git commit -m "feat: redesign active reader Settings"
```

Expected: Settings unit/static gates pass and the feature CSS contains one Settings architecture using dedicated tokens.

---

### Task 9: Add Settings Browser, Story, Registry, And Visual Proof

**Files:**
- Modify: `docs/superpowers/plans/2026-07-11-mushaf-native-navigation-settings-ux.md` (controller scope reconciliation)
- Modify: `src/design-system/index.css` (controller-authorized browser proof fixes)
- Modify: `tests/e2e/configure/react-golden.spec.ts`
- Modify: `tests/e2e/navigate/react-golden.spec.ts`
- Modify: `tests/e2e/fixtures/react-a11y.ts`
- Modify: `tests/e2e/fixtures/react-golden-routes.ts`
- Modify: `src/components/settings/settings.stories.tsx`
- Modify: `src/components/reader/reader.stories.tsx`
- Modify: `src/components/ui/ui.stories.tsx`
- Modify: `src/design-system/registry/component-registry.json`
- Create: `docs/ui-references/configure/settings-shell/default.mobile.light.png`
- Create: `docs/ui-references/configure/settings-shell/default.mobile.light.md`
- Create: `docs/ui-references/read/reading-view-toggle/default.mobile.light.png`
- Create: `docs/ui-references/read/reading-view-toggle/default.mobile.light.md`

**Interfaces:**
- Adds browser-only responsive, focus, touch-target, axe, and rendered contrast proofs.
- Registry entries reference real exports, stories, and tests only.

- [ ] **Step 1: Expand the settings viewport matrix**

Add `tablet-landscape: { width: 1024, height: 768 }` to `GoldenViewportId`/`GOLDEN_VIEWPORTS`. Configure Settings for phone-small, phone-standard, phone-landscape, tablet-portrait, tablet-landscape, and desktop.

Replace the old “body never scrolls” assertion with:

- shell stays within viewport;
- header remains visible;
- body has a valid scroll range when content exceeds it;
- scrolling reaches Included reading assets and the last option;
- phone/short landscape fills the viewport;
- tablet/desktop is a right-side rail;
- all close, disclosure, appearance, switch, and segmented targets pass `expectMinTouchTarget(locator, 44)`.

- [ ] **Step 2: Add focus and route ownership journeys**

Prove:

- Tab/Shift+Tab remain inside Settings while open;
- Escape and outside dismissal close it;
- focus returns to `Open settings`;
- direct `#/settings` derives the last reader mode;
- direct `#/assets` opens Included reading assets expanded;
- About and Search have no reading-view action;
- Mushaf Settings contains Page layout but not Verse reading, and Verse Settings shows the inverse.

- [ ] **Step 3: Add theme and contrast verification**

Add `expectRenderedContrast` in `react-a11y.ts`. Resolve computed colors in the browser and calculate WCAG relative luminance in the fixture:

```ts
export async function expectRenderedContrast(foreground: Locator, background: Locator, minimum: number) {
  const [foregroundColor, backgroundColor] = await Promise.all([
    foreground.evaluate((element) => getComputedStyle(element).color),
    background.evaluate((element) => getComputedStyle(element).backgroundColor),
  ])
  const parse = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
  const luminance = (value: string) => {
    const channels = parse(value).map((channel) => {
      const normalized = channel / 255
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
    })
    return (0.2126 * channels[0]!) + (0.7152 * channels[1]!) + (0.0722 * channels[2]!)
  }
  const lighter = Math.max(luminance(foregroundColor), luminance(backgroundColor))
  const darker = Math.min(luminance(foregroundColor), luminance(backgroundColor))
  expect((lighter + 0.05) / (darker + 0.05)).toBeGreaterThanOrEqual(minimum)
}
```

Use this helper only on opaque Settings group/control surfaces; axe remains the full-page authority for composited backgrounds. In the settings spec, combine `expectAxeClean` with representative checks:

- normal row text >= 4.5:1;
- large heading >= 3:1;
- selected option text and essential group/control boundaries >= 3:1.

Exercise light, sepia, dark, auto-resolved appearance, and night-on states. Wait for the root `data-theme`/`data-night-mode` change before running axe or contrast assertions.

- [ ] **Step 4: Expand stories**

Add Settings stories for Verse, Mushaf, compact assets-collapsed, dark, and night states. Add an open adaptive Sheet story to `ui.stories.tsx`. Keep Reader stories for both ReadingViewToggle destinations and all four Mushaf mode combinations.

- [ ] **Step 5: Update registry ownership**

Update Sheet with `adaptive-settings`, `body`, and return-focus behaviors. Update SettingsShell with grouped responsive states/proofs. Register `SettingsGroup` as a configure-owned product component with heading/content slots and its settings-route proof. Add a `ReadingViewToggle` product entry with its real path, `ReaderChrome` consumer, Verse/Mushaf destination states, Tooltip/IconButton dependencies, story, test, and read ownership.

- [ ] **Step 6: Capture committed visual references**

Use the in-app browser against the implemented app, seed the Verse Settings mobile-light state, and save the actual rendered component capture as `docs/ui-references/configure/settings-shell/default.mobile.light.png`. Capture the topbar reading-view action at mobile-light as `docs/ui-references/read/reading-view-toggle/default.mobile.light.png`.

Create paired notes with every heading required by `docs/ui-references/README.md`; record grouped hierarchy, strong contrast, token expectations, adaptive behavior, and forbidden duplicate toggles/transparent overlays. These are current-state intent notes, not progress logs.

- [ ] **Step 7: Run and time configure proof plus registry/story gates**

```bash
time pnpm exec playwright test tests/e2e/configure/react-golden.spec.ts --project=chromium --reporter=line
pnpm run check
pnpm run build:storybook
pnpm run test:storybook
```

Expected: responsive/a11y journeys, registry/reference checks, and Storybook gates pass without warnings.

- [ ] **Step 8: Commit Settings proof artifacts**

```bash
git add tests/e2e/configure/react-golden.spec.ts tests/e2e/fixtures/react-a11y.ts tests/e2e/fixtures/react-golden-routes.ts src/components/settings/settings.stories.tsx src/components/reader/reader.stories.tsx src/components/ui/ui.stories.tsx src/design-system/registry/component-registry.json docs/ui-references/configure/settings-shell docs/ui-references/read/reading-view-toggle
git commit -m "test: prove responsive reader Settings"
```

---

### Task 10: Update Current-State Docs And Run Release Verification

**Files:**
- Modify: `docs/context/architecture.md`
- Modify: `docs/context/surfaces/read.md`
- Modify: `docs/context/surfaces/configure.md`
- Modify: `docs/context/style-map.md`
- Modify: `docs/context/data-model.md`
- Modify: `docs/context/implemented.md`
- Regenerate through `pnpm run docs`: `docs/context/module-graph.md`
- Regenerate through `pnpm run docs`: `docs/context/feature-map.md`
- Regenerate through `pnpm run docs`: `docs/context/events.md`

**Interfaces:**
- No new runtime interface. This task reconciles docs/proof ownership and verifies the release-sensitive change.

- [ ] **Step 1: Update current-state architecture and surface dossiers**

Document:

- explicit App replace-route ownership for passive continuous Mushaf synchronization;
- ReaderInteractionContext overlay suspension;
- the Single/Scroll x Fit page/Fit width matrix;
- real-touch physical direction, settle behavior, boundaries, top reset, retained five-page window, and protected intent;
- one topbar reading-view action only on readers;
- active-mode-only grouped Settings on the owned adaptive Sheet;
- controlled return focus and direct `#/assets` expansion.

Remove current-state prose that says Settings contains a reader-mode toggle, Appearance is a fixed footer, or Mushaf uses viewport-covering page zones.

- [ ] **Step 2: Update data and style ownership**

Add `mushafFitWidth` beside `mushafViewMode` in `data-model.md`. Add ReadingViewToggle and the adaptive Settings/Sheet proof surfaces to `style-map.md`, naming the two committed reference pairs. Update `implemented.md` so Configure names active-mode controls and adaptive grouped Settings.

- [ ] **Step 3: Regenerate context fences and run focused tests**

```bash
pnpm run docs
pnpm run test:react -- tests/unit/react-read/mushaf-gesture.test.ts tests/unit/react-read/mushaf-page-window.test.tsx tests/unit/react-read/reader-wave3.test.tsx tests/unit/react-shell/settings-route.test.tsx tests/unit/react-shell/about-route.test.tsx tests/unit/react-components/ui-components.test.tsx
pnpm exec playwright test tests/e2e/read/mushaf-responsive.spec.ts tests/e2e/read/react-golden.spec.ts tests/e2e/configure/react-golden.spec.ts --project=chromium --reporter=line
```

Expected: generated fences reflect the changed source/tests; focused unit and browser lanes pass.

- [ ] **Step 4: Run static, docs, and full release gates**

```bash
pnpm run check
pnpm run docs:check
git diff --check
pnpm run validate
```

Expected: typecheck/lint/design/registry/reference gates, full unit suite, production build, preview/offline/visual Playwright, Storybook, and docs checks all pass without warnings.

- [ ] **Step 5: Perform final browser inspection**

Using the in-app browser, inspect:

- Single Fit page and Fit width on phone portrait, short landscape, tablet, and desktop;
- Scroll Fit page and Fit width with sustained vertical movement;
- right/left fast and cancelled swipes, boundaries, resize, reduced motion, and overlay interruption;
- Verse and Mushaf Settings on phone portrait, short landscape, tablet landscape, and desktop;
- light, sepia, dark, and night appearance;
- focus trap/restore, 44px targets, no duplicate view toggle, and complete asset disclosure reachability.

For any defect, add or update the smallest durable owning test in the same fix; do not rely on the manual observation alone.

- [ ] **Step 6: Request code review and resolve findings**

Use `superpowers:requesting-code-review` against the approved design and this plan. Apply `superpowers:receiving-code-review` to every actionable finding, rerun the smallest owning test after each fix, then rerun `pnpm run check` and the affected E2E spec.

- [ ] **Step 7: Verify final diff and commit docs/final fixes**

```bash
git status --short
git diff --stat
git diff --check
git add docs/context/architecture.md docs/context/surfaces/read.md docs/context/surfaces/configure.md docs/context/style-map.md docs/context/data-model.md docs/context/implemented.md docs/context/module-graph.md docs/context/feature-map.md docs/context/events.md
git commit -m "docs: document native Mushaf and Settings behavior"
```

If code-review fixes changed source/tests after their task commits, stage those exact paths in a separate `fix:` commit before the docs commit. Do not push, merge, or open a PR unless the user asks.

## Final Acceptance Map

| Approved requirement | Owning tasks |
| --- | --- |
| Single + Fit width full-page reachability | 2, 4, 5 |
| Native horizontal swipe and correct preview direction | 1, 2, 4, 5 |
| Seamless retained continuous Scroll mode | 3, 4, 5 |
| Boundaries, cancellation, rapid input, reduced motion | 1, 2, 4, 5 |
| Single-page top reset with resize/orientation offset preservation | 4, 5 |
| Neighbor loading/error retention and retry | 3, 4, 5 |
| Accessible non-overlay page actions and keyboard stage scrolling | 4, 5 |
| Compact-landscape Fit-width default and session opt-out | 4, 5 |
| Protected Wird intent and replace-style history | 3, 5 |
| One clearer topbar reading-view action | 6, 9 |
| No Settings reader-mode toggle | 7, 8, 9 |
| Active-mode-only grouped Settings | 7, 8, 9 |
| Adaptive modal behavior and focus restoration | 7, 9 |
| Tokenized spacing/color/contrast/touch targets | 4, 8, 9 |
| Registry, stories, references, docs, full validation | 9, 10 |

## Execution Options

1. **Subagent-Driven (recommended):** use a fresh implementation worker per task with specification and code-quality review after each task.
2. **Inline Execution:** use `superpowers:executing-plans` in this session, executing Tasks 1-3, 4-6, and 7-10 as review checkpoints.
