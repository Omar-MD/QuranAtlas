# Svelte 5 + TypeScript big-bang migration

**Date:** 2026-04-19
**Status:** Approved. Ready for implementation plan.
**Follows:** The architecture pre-work shipped in 27 commits between 2026-04-17 and 2026-04-19 — Playwright journey hardening, typed event bus, IDB shape validation, `src/state/<surface>.js` extraction, and the reader split. That work was the foundation; this spec consumes it.

---

## Motivation

QuranAtlas today is vanilla JS + native DOM. The codebase is healthy — clear directory boundaries, a one-page `architecture.md`, 437 unit tests, a 185-test Playwright journey suite, and a typed event bus. The pre-work refactors made surfaces independently testable and decoupled state from feature modules.

Three motivations drive the migration:

1. **Developer experience.** Components, type-checking, hot-reload-aware reactivity, less manual DOM plumbing.
2. **Reactivity correctness.** Manual subscribe/cleanup discipline (`bootCleanups`, per-feature cleanup arrays, mitt unsub stashing) is brittle. Want the framework to own this.
3. **Future feature velocity.** Anticipated features (richer annotations, side panels, multi-pane reading) are painful in vanilla and trivial in Svelte.

These three jointly point at **Svelte 5 with runes** (not legacy stores) and **TypeScript strict from day one**, because all three motivations want the framework to do as much typed-reactive heavy lifting as possible.

---

## End state

- Svelte 5 (runes-based reactivity) replaces hand-written DOM construction in every user-facing surface.
- TypeScript with `"strict": true`. The event bus, IDB writes, and state modules become end-to-end type-safe.
- Service worker (`src/sw.js`, `src/sw-handlers.js`, `src/offline/*`) stays vanilla JS — lives outside the client bundle and gains nothing from a framework. Files keep their `.js` extensions; no TS port.
- Hash router (`src/core/router.js`, ~170 lines) ports to TS but stays a plain module (not a Svelte primitive). Well-tested by the journey suite, no DOM dependencies, swapping it for `svelte-spa-router` would add a dependency to do less.
- All 185 Playwright journeys stay green throughout the migration. Three consecutive green runs at `--retries=0` is the gate for cutover, matching the standard from the pre-work.

---

## Architectural decisions

### State primitive: mixed flat-runes + classes

Per Q2 of brainstorming. The 8 `src/state/<surface>.js` modules aren't homogeneous. Three have real transition logic worth encapsulating; five are reactive dictionaries. Forcing one shape on all 8 would be either ceremonial or loose.

- **Flat `$state` modules** (5): `settings`, `sync`, `ambient-chrome`, `command-sheet`, `surahs`. Just `export const x = $state({...})`. Direct field reads/writes from components.
- **Class-based runes** (3): `reader`, `review`, `mark-editor`. Fields use `$state`, methods own transitions, derived getters expose computed values. Encapsulates invariants (e.g. mark-editor: selecting a tag clears search; clearing all selected tags disables save).

### Event bus: hybrid (mitt for events, runes for state)

Per Q3. The current 17 wired events split by nature:

**Stays on mitt** (genuinely event-shaped — external signals, one-shots, commands):

| Event | Why it stays |
|---|---|
| `DB_VERSION_CHANGE` | External signal from IDB onversionchange |
| `DB_VISIBILITY_VISIBLE` | Tab visibility transition |
| `DB_QUOTA_EXCEEDED` | One-shot failure signal from `put()` catch path |
| `ROUTER_LAUNCH_RESTORE` | One-shot boot signal |
| `ROUTER_ROUTE_CHANGE` | Drives App.svelte `<svelte:component>` switch |
| `NAVIGATION_NAVIGATE` | Command from command-sheet/surahs to router |
| `MARKS_SAVED` / `MARKS_DELETED` / `MARKS_UNDO` | One-shot notifications; indicator decoration is imperative DOM |
| `READER_VERSE_RENDERED` | Per-render fire-and-forget; consumed by `marks/indicator.ts` |
| `AMBIENT_SURFACE` | Command from many surfaces ("show chrome now"); receivers reset their fade timers |
| `SYNC_UPDATE_RECEIVED` | Cross-tab broadcast; receivers re-read affected verseKeys |
| `STORAGE_QUOTA_WARNING` | One-shot threshold signal |

**Dissolves into rune reads:**

| Event | Replacement |
|---|---|
| `READER_SURAH_LOADED` | `$effect(() => { if (reader.surah) trackRecent(reader.surah) })` in App.svelte. Pill reads `reader.surah` directly |
| `READER_POSITION_CHANGED` | Pill renders `{reader.surah}:{reader.currentVerse}` reactively |
| `SETTINGS_TRANSLATION_CHANGED` | Reader subscribes to `settings.translationVisible` via `$effect`, re-renders |

Net: 14 events stay; 3 are removed from `Events`. The dev-time guard (`emit()` throws on unknown event names in dev) keeps the registry honest. Dead-emitter events from `events.md` keep their constants — deletion is a separate cleanup, not in this migration's scope.

### CSS: hybrid (tokens stay global, surface styles co-locate)

Per Q4. Today's `src/core/theme.css` is one ~3000-line file with the `qa-<surface>-<part>` grammar. The hybrid split:

- **Stays in `theme.css`:** design tokens, themes, breakpoint constants, reset, and cross-cutting primitives — `.qa-sheet*`, `.qa-card`, ambient layouts, the reader column grid (because it uses `:has()` selectors that cross component boundaries).
- **Moves to component `<style>` blocks:** surface-specific selectors — `qa-review-card-chip`, `qa-mark-editor-*`, `qa-onboarding-*`, etc. Scoped automatically by Svelte.

End state: ~30-40% of `theme.css` survives as the design system; the rest dissolves into components. Theme tokens (`--qa-text-size-arabic`, `--qa-bp-tablet`, `--qa-font-size-base`, etc.) and `<html data-theme>` swapping are unchanged — components read tokens; tokens never live in components.

### Test contract: E2E is the spec; unit tests are selective

Per Q5. The migration will invalidate a large fraction of unit tests — anything asserting on `init()`-built DOM or module-scoped mitt subscription state. The position:

- **E2E (185 Playwright tests) is the contract.** Stays green throughout.
- **State module tests port nearly 1:1** — today's `state/*.test.js` already test pure data containers; the rune version tests `settings.theme = 'x'` directly.
- **DOM-coupled unit tests are deleted** in favor of journey coverage covering the same behavior. No replacement written.
- **New component tests are sparing** — only where logic is non-trivial and not journey-covered. Candidates: command-sheet keyboard navigation, mark-editor tag transitions, font-size slider migration. Use `@testing-library/svelte`.

### TypeScript strictness: strict from day one

`"strict": true` in `tsconfig.json` from the foundation commit. Reasoning: the migration touches every file once, so the strictness ratchet costs the same effort up-front as deferred. Loose-then-strict means re-touching every file later. The 40 `@typedef` blocks shipped in Unit #4 and the IDB `_shapes` table from Unit #5 already encode the precise types — converting to TS is mostly mechanical.

### Routing: keep the existing 170-line hash router

`core/router.js` is well-understood, validated by 185 E2E tests, and has no DOM dependencies. App.svelte subscribes to `ROUTER_ROUTE_CHANGE` and renders the matching component via `<svelte:component this={currentRoute.component}/>`. Route handlers register the component import (lazy) instead of a vanilla `init()` function.

---

## File layout (post-migration)

```
src/
  app.ts                     # was core/app.js — boot composition; mounts <App/>
  App.svelte                 # root; routes via existing hash router → <svelte:component/>
  core/
    db.ts                    # ports core/db.js with full @typedef → TS types
    events.ts                # mitt bus, typed via Events const + payload map
    router.ts                # ports core/router.js, no behavior change
    constants.ts, logger.ts
    ui.svelte                # undo toast (reactive lifetime)
    quota-banner.svelte
    tag-colors.ts
    theme.css                # tokens, themes, breakpoints, cross-cutting
  state/                     # .svelte.ts modules
    reader.svelte.ts         # class ReaderState
    review.svelte.ts         # class ReviewState
    mark-editor.svelte.ts    # class MarkEditorState
    settings.svelte.ts       # flat $state
    sync.svelte.ts           # flat $state
    ambient-chrome.svelte.ts # flat $state
    command-sheet.svelte.ts  # flat $state
    surahs.svelte.ts         # flat $state
  reader/
    Reader.svelte            # route component
    Verse.svelte             # extracted from render.js
    SurahHeader.svelte
    EdgeIndicator.svelte
    chunked-append.ts        # logic-only
    position.ts              # logic-only, sole writer for `positions` (Rule 5)
    verse-scroll.ts, scroll-tracker.ts
  review/Hub.svelte, ReviewCard.svelte, state.ts
  marks/
    Editor.svelte, TagChip.svelte
    store.ts                 # sole writer for `marks` (Rule 5)
    indicator.ts             # logic-only, decorates DOM via reactive refs
    tags.ts
    long-press.ts            # gesture handler, returns action for use:longPress
  nav/
    AmbientDock.svelte, AmbientPill.svelte
    CommandSheet.svelte, MoreSheet.svelte
  settings/
    Panel.svelte, ClearDataConfirm.svelte
    theme.ts, font-size.ts, clear-data.ts
  about/About.svelte, pwa-install.ts
  onboarding/Onboarding.svelte, screens.ts (data only)
  surahs/SurahList.svelte
  data/dataset.ts, offline.ts, surah-meanings.ts
  safety/sync.ts, input-validator.ts
  a11y/announcer.ts
  sw.js, sw-handlers.js, offline/  # untouched, vanilla JS
```

### Cross-cutting invariants preserved

- **CLAUDE.md Rule 4** (long-press = mark editor only) — enforced by `marks/long-press.ts` exposing exactly one Svelte action; no contextual menu primitive exists in the codebase.
- **CLAUDE.md Rule 5** (sole writer per IDB store) — `marks/store.ts`, `reader/position.ts`, `review/state.ts` retain their writer status. Components import these modules; never call `db.put('marks', …)` directly.
- **Bus + IDB validation** — `_shapes` typedefs become TS types verbatim; runtime validators in `core/db.ts` keep their behavior.
- **Boot flow** (`core/app.ts::init()`) — same sequence: drain cleanups, openDB, theme/font init, register routes, init router, register chrome. Chrome init returns Svelte component mount handles instead of cleanup fns. Structure identical; leaves change.

---

## Component model

Three principles applied throughout:

1. **One Svelte component per surface; sub-components only when DOM repeats or has independent state.** A surface that's a single rendered tree (settings panel, more sheet, command sheet, about) becomes one `.svelte` file. Surfaces with repeated rows (review hub cards, surah list rows, mark editor tag chips, reader verses) factor the row out — that's where Svelte's keyed `{#each}` pays for itself.

2. **Hooks-via-props pattern preserved exactly.** The reader currently receives `{ initIndicators, setupLongPress, openEditor }` via the router's `hooks` argument so `reader/` doesn't import `marks/`. Same shape in Svelte: `<Reader {initIndicators} {setupLongPress} {openEditor}/>`. App.svelte composes the hooks at mount time; the dependency direction in `module-graph.md` is unchanged.

3. **Imperative DOM operations use Svelte actions, not refs + lifecycle hacks.**
   - `use:longPress` (from `marks/long-press.ts`) — wraps the existing gesture
   - `use:edgeIndicator` — replaces the imperative left/right edge-cue elements
   - `use:scrollIntoViewWithAlignment` — wraps the 3-rAF reflow logic from `verse-scroll.ts`
   - `use:announceTo` — replaces direct `announce(message)` calls where the message is reactive
   - `use:autofocus`, `use:clickOutside` — small primitives reused across sheets

Actions keep imperative DOM code in one place per gesture/decoration with proper cleanup baked into the action contract. They bridge to existing logic-only modules (`verse-scroll.ts`, `position.ts`, `chunked-append.ts`) — those keep being called from action setup, not from component bodies.

### What stays as plain `.ts` (no `.svelte`)

All `core/` primitives except `ui.svelte` (undo toast wants reactive lifetime) and `quota-banner.svelte`. All logic-only files: `position.ts`, `verse-scroll.ts`, `chunked-append.ts`, `scroll-tracker.ts`, `marks/store.ts`, `marks/indicator.ts`, `review/state.ts`, all `safety/*`, `data/*`, `a11y/*`. All 8 `state/*.svelte.ts` rune containers (no markup).

The vanilla code already separates DOM construction (`render.js`) from logic (`position.js`, `chunked-append.js`, `verse-scroll.js`) after Unit #2. Svelte components inherit only the DOM-construction half; the logic half stays as importable modules. Surfaces stay small; bus/state code stays testable without mounting components.

### Approximate component count

- ~12 route/surface components (Reader, Hub, MarkEditor, CommandSheet, MoreSheet, SettingsPanel, About, Onboarding, SurahList, AmbientDock, AmbientPill, App)
- ~8 sub-components (Verse, SurahHeader, EdgeIndicator, ReviewCard, TagChip, OnboardingScreen, SurahRow, MarkChip)
- ~6 actions (longPress, edgeIndicator, scrollIntoView, announceTo, autofocus, clickOutside)

---

## State model

### Flat-rune pattern (settings, sync, ambient-chrome, command-sheet, surahs)

Today's vanilla shape (`{ get, set }` shallow merge, zero imports) collapses to a typed `$state` object. Components import and read directly:

```ts
// state/settings.svelte.ts
type SettingsState = {
  theme: 'light' | 'sepia' | 'dark' | 'auto' | null
  fontSize: number | null
  translationVisible: boolean
  translationId: TranslationId | null
}

export const settings = $state<SettingsState>({
  theme: null,
  fontSize: null,
  translationVisible: true,
  translationId: null,
})
```

Reads: `settings.translationVisible`. Writes: direct assignment `settings.theme = 'dark'`. The `set(patch)` callers become field assignments; spread-merge semantics aren't load-bearing today (no caller depends on partial-update atomicity).

### Class pattern (reader, review, mark-editor)

These three have interacting fields, derived values, and sequencing. Classes encapsulate that:

```ts
// state/reader.svelte.ts
export class ReaderState {
  surah = $state<number | null>(null)
  currentVerse = $state<number | null>(null)
  loadedRange = $state<{ start: number; end: number } | null>(null)
  isLoading = $state(false)

  get currentVerseKey() {
    return this.surah && this.currentVerse ? `${this.surah}:${this.currentVerse}` : null
  }

  setPosition(surah: number, verse: number) {
    this.surah = surah
    this.currentVerse = verse
  }

  reset() {
    this.surah = null
    this.currentVerse = null
    this.loadedRange = null
  }
}

export const reader = new ReaderState()
```

`mark-editor`: `selectedTags`, `searchQuery`, `note`, `isExisting`, `isDirty` interact and need invariants enforced (selecting a tag clears search; clearing all selected tags disables save). Methods on the class own those transitions.

`review`: `view`, `groupBy`, `activeTag`, `surahFilter`, `sortBy` with per-mode invariants (FVR view ignores groupBy; switching groupBy clears bucket-specific selections).

### Persistence boundary (sole-writer rule preserved)

State modules remain **pure in-memory containers** — zero IDB access (matches today). Persistence stays in:

- `reader/position.ts` — sole writer for `positions[s<n>]`. Subscribes to `reader.currentVerse` via `$effect` (in `Reader.svelte`'s onMount or App.svelte).
- `review/state.ts` — sole writer for `positions['review']`. Subscribes to `review` rune similarly.
- `marks/store.ts` — sole writer for `marks`. Called imperatively from `MarkEditor.svelte` save handler.
- `settings/theme.ts`, `settings/font-size.ts`, etc. — write `settings` IDB store on user action; mirror to the `settings` rune for read paths.

The pattern: **rune is the read path, dedicated module is the write path.** Same separation as today, with reactive reads.

### Cross-tab sync

`safety/sync.ts` listens for BroadcastChannel messages, then reaches into the relevant rune to invalidate state. `SYNC_UPDATE_RECEIVED` event still fires for components that need to refresh derived UI state.

---

## Event flow

### Typed bus (`core/events.ts`)

```ts
export type EventPayloads = {
  DB_VERSION_CHANGE: {}
  DB_VISIBILITY_VISIBLE: {}
  DB_QUOTA_EXCEEDED: { storeName: string; message: string }
  ROUTER_LAUNCH_RESTORE: {}
  ROUTER_ROUTE_CHANGE: { hash: string }
  NAVIGATION_NAVIGATE: { surah: number; verse?: number }
  MARKS_SAVED: { verseKey: string; tags: string[] }
  // ... full map mirroring Events constant
}

export function emit<K extends keyof EventPayloads>(
  type: K,
  payload: EventPayloads[K]
): void

export function on<K extends keyof EventPayloads>(
  type: K,
  handler: (payload: EventPayloads[K]) => void
): () => void
```

The 40 `@typedef` blocks from Unit #4 become the `EventPayloads` map. `emit('UNKNOWN_EVENT', …)` becomes a TS compile error in addition to the runtime dev guard. Wrong-payload-shape calls are also caught at compile time.

### Subscription pattern in components

```svelte
<script lang="ts">
  import { on } from '../core/events'
  import { reader } from '../state/reader.svelte'

  // event subscription — bus events get $effect for cleanup
  $effect(() => {
    const unsub = on('SYNC_UPDATE_RECEIVED', ({ verseKeys }) => { /* … */ })
    return unsub
  })

  // rune state — just reactive reads, no subscription needed
</script>

<div>{reader.surah}:{reader.currentVerse}</div>
```

`$effect` returns a cleanup that runs on unmount or rerun — replaces manual `bootCleanups` for component-scoped subscriptions. Cross-cutting subscribers in App.svelte still push to `bootCleanups` for sw / offline / global wiring.

---

## Migration cutover plan (Approach 1)

Single long-lived branch, merges to `main` exactly once. Five phases:

### Phase 1 — Foundation (1 commit, ~half day)

- Add `svelte@5`, `@sveltejs/vite-plugin-svelte`, `svelte-check`, `typescript@5`, `@tsconfig/svelte`.
- Add `tsconfig.json` extending `@tsconfig/svelte`, `"strict": true`.
- Add `vite.config.js` Svelte plugin entry.
- Add `App.svelte` mounted into `#app` from a new `src/app.ts`. Initial App.svelte body: `<svelte:component this={currentRoute.component}/>` driven by the existing hash router. Vanilla surfaces remain mounted via thin adapters that wrap `init(params, hooks)` in an `onMount`.
- Add `package.json` scripts: `check` (`svelte-check`), `build:check` (svelte-check + lint + test:run + build).
- All existing tests still green; all 185 E2E still green; vanilla code unchanged.

### Phase 2 — Vertical slice: about (1-2 commits, ~1 day)

Picked because: smallest surface, low coupling, exercises the pattern stack end-to-end (state read, IDB read via `marks/store.ts`, theme tokens, scoped styles, action usage for `use:announceTo`).

- Port `about/index.js` → `About.svelte`, `pwa-install.js` → `pwa-install.ts`.
- Convert `marks/store.js` → `marks/store.ts` (called by About for stat-grid counts).
- Convert `a11y/announcer.js` → `a11y/announcer.ts` (used by About).
- Co-locate `qa-about-*` styles into `About.svelte`.
- Update About's journey spec if any selectors changed (likely none — Svelte's scoped styles add a hash but the original class names remain).
- Establishes the canonical patterns reviewers will compare every later port against.

### Phase 3 — Parallel surface ports (5-7 commits, ~3-4 days, parallelized)

Dispatch parallel subagents using `superpowers:dispatching-parallel-agents`. Each agent owns one surface end-to-end:

- Reader (largest unit; agent gets the reader/ subtree + `reader.svelte.ts` rune)
- Review hub + FVR
- Mark editor
- Settings panel + clear-data
- Surah list
- Onboarding
- Nav chrome (ambient dock, pill, command sheet, more sheet — bundled because they share state and journey-overlap)

Agent contract per surface:
1. Port the surface's vanilla files to Svelte/TS.
2. Port the surface's state module to `.svelte.ts` (already isolated by Unit #3).
3. Co-locate surface-specific CSS into component `<style>` blocks (per the hybrid CSS plan).
4. Port any surface-local logic-only modules to `.ts`.
5. Verify the surface's journey specs from `user-journeys.md` stay green at all three viewports (375×667, 768×1024, 1440×900). Per the "journey coverage as a deliverable" memory, journey green is the agent's verification gate.
6. Port the surface's state module unit tests; delete DOM-coupled tests; write new component tests only where logic is non-trivial.

Surfaces are independent thanks to Unit #3 (state extraction) and the hooks-via-props pattern in `reader/`. Order doesn't matter; agents can run concurrently.

### Phase 4 — Bus split integration (1-2 commits, ~1 day)

Single integration pass after all surfaces are ported:
- Delete `READER_SURAH_LOADED`, `READER_POSITION_CHANGED`, `SETTINGS_TRANSLATION_CHANGED` from `Events`.
- Replace the corresponding `on(...)` subscriptions in components with rune `$effect` reads.
- Replace the corresponding `emit(...)` calls in `Reader.svelte` / `SettingsPanel.svelte` with rune writes.
- Update `events.md`.
- Re-run full Playwright suite at all three viewports, three consecutive green at `--retries=0`.

### Phase 5 — Cutover (1 commit)

- Remove the vanilla mount adapters from App.svelte (no longer needed — all surfaces are now Svelte).
- Update `architecture.md`, `module-graph.md`, `feature-map.md`, `events.md` to reflect end state.
- Update `user-journeys.md` if any surface-level user-visible behavior changed (it shouldn't — but per CLAUDE.md Rule 1, this is the place to update if so).
- Final gate: 437 (or revised count) unit tests pass, full E2E suite green 3× consecutively at all three viewports, lint clean, `svelte-check` clean, `check-chunks` within budget, lighthouse within 5% of pre-migration baseline.
- Squash-merge to `main`.

### Risks and mitigations

| Risk | Mitigation |
|---|---|
| Long-lived branch drifts from `main` | Migration assumes `main` stays quiet during cutover; coordinate with any concurrent feature work. Branch lifetime target: 1-2 weeks max. |
| A surface's port breaks a non-obvious cross-cutting behavior | Journey suite catches journey-level regressions; the hybrid CSS plan and preserved Rule 4/5 invariants catch the structural ones. Per-surface agent verification before merge to the migration branch. |
| Svelte 5 runes API has rough edges in production builds | Foundation phase includes a production build smoke test (Lighthouse run) so we catch this before committing to parallelism. |
| Subagent ports diverge on patterns | The about vertical slice (Phase 2) is the canonical pattern reference. Each agent gets a pointer to the slice in its prompt. |
| Tests get deleted that turn out to encode load-bearing invariants | Audit deleted tests during code review; if a test asserted on something the journey suite doesn't cover, write a new component test or extend the journey. |

---

## Out of scope (explicitly)

- Service worker rewrite. `src/sw.js`, `src/sw-handlers.js`, `src/offline/*` stay vanilla JS. They live outside the client bundle and gain nothing from a framework.
- Router replacement. `core/router.js` ports to TS as-is.
- Dead-emitter cleanup (the events from `events.md`'s "emitter-only" table). Separate concern; the dev guard already documents the dead state.
- IDB schema changes. Stores, keys, indexes, and `_shapes` are unchanged.
- Visual design changes. The migration is structural; no layouts, themes, or breakpoints change.
- New features. Anything in the "future feature velocity" motivation is post-migration work.
