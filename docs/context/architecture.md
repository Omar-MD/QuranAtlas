# Architecture

One-page orientation for anyone (or any agent) walking into this codebase cold. Covers the stack, the boot flow, the three cross-cutting primitives (router, event bus, IDB), and the patterns every surface follows.

## Stack

- **Svelte 5 (runes) + TypeScript + Vite** — the app root is `src/App.svelte` mounted from `src/app.ts` into `#app`. Reactivity is built on Svelte 5 runes (`$state`, `$derived`, `$effect`); no stores. TS config is `strict: true`. `svelte-check` runs in CI. No JSX.
- **Runes as the state primitive** — application state lives in `src/state/*.svelte.ts` modules (see `module-graph.md#state/`). Components read the rune object directly and render reactively; feature modules write to it. State modules have zero imports and zero side effects — pure in-memory containers.
- **Hybrid CSS** — theme tokens and top-level shell rules stay in `src/core/theme.css` (data-theme variables, ambient chrome, sheets). Surface-specific styles are co-located in each `<style>` block inside `.svelte` files and get Svelte-scoped class hashes. Class grammar is still `qa-<surface>-<part>` (e.g. `qa-review-card-chip`, `qa-sheet-backdrop`). Themes swap CSS variables on `<html data-theme="…">`.
- **IndexedDB for all persistence** — DB name `quran-atlas`, version 1, 5 stores (see `data-model.md`). Every IDB access routes through `src/core/db.ts`. Store record shapes are declared as TS `interface`s re-exported via `StoreRecords` so the `put()` validator and callers share the same compile-time contract.
- **Mitt for cross-module communication** — tiny pub/sub (`src/core/events.ts`). Event names centralised in `src/core/constants.ts::Events`. Payload typedefs live beside the enum. Events that were snapshots of rune state (`READER_SURAH_LOADED`, `READER_POSITION_CHANGED`, `SETTINGS_TRANSLATION_CHANGED`) were dissolved into rune reads in Phase 6 — see `events.md` "Dissolved into rune reads."
- **Service worker for offline** — `src/sw.js` + Workbox; the Quran corpus is cached in `CACHE_DATASET` and surahs load from cache first. The SW and `src/offline/` helpers stay vanilla JS by design.
- **Testing** — Vitest + jsdom + `fake-indexeddb/auto` for units; Playwright for the 185-journey E2E contract. DOM-coupled unit tests that previously hand-rolled `document.createElement` fixtures for vanilla renderers were removed during the Svelte migration — the Playwright suite is now the enforcement layer for UI behavior.

## Boot flow (`src/app.ts` → `src/App.svelte` → `src/app-bootstrap.ts`)

Vite's entry is `src/app.ts`, which imports `App.svelte` and calls `mount(App, { target: #app })`. Every subsequent step lives inside `App.svelte` and the bootstrap helper it calls.

1. `App.svelte` mounts. Its `onMount` registers an `onRouteChange` handler that receives the resolved Svelte route component and mounts it imperatively into `#main-content` (re-using Svelte's `mount()`/`unmount()` APIs so route params + hook props are passed as component props).
2. Persistent overlays are declared in `App.svelte`'s markup once (`UndoToast`, `QuotaBanner`, `Editor`, `Panel`, `ClearDataConfirm`, `CommandSheet`, `MoreSheet`) and stay mounted for the lifetime of the session. Each exposes an imperative `open*` / `close*` API through a bridge module (`settings/panel-bridge.ts`, `marks/editor-bridge.ts`, etc.).
3. `initBootstrap()` from `src/app-bootstrap.ts` runs after the route handler is in place. It:
   - Drains any partial `bootCleanups` from a previous call.
   - `openDB()` — opens/creates the IDB (`onupgradeneeded` creates stores + indexes).
   - `initTheme()` + `initFontSize()` — apply persisted theme/font *before* router dispatch so there's no flash.
   - Registers route handlers (see below), then calls `router.init()` to dispatch the current hash.
   - Initializes reader keyboard actions (`initReaderActions`).
   - Wires global subscribers: `NAVIGATION_NAVIGATE` → router.
   - Initializes safety sync, registers the service worker (production only), captures the PWA install prompt, and restores activation state.
4. `App.svelte` keeps two cross-cutting `$effect`s:
   - Watches `reader.currentSurahNum`; when it changes, calls `refreshForSurah()` to re-decorate indicators and updates `settings.recentSurahs` (writes the store directly — recent-surahs is the single feature that owns that key).

On any boot failure the `catch` block renders a minimal error card with a Retry button that re-calls `initBootstrap()`. Svelte-ported routes are dispatched via `mount()` in `App.svelte`; the remaining vanilla route modules still export `async init(params, hooks)` and are invoked by the router.

## Router (`src/core/router.ts`)

- Pure hash routing; patterns use `:param` placeholders (`#/s/:surah/:ayah`, `#/t/:tag`).
- `register(pattern, loader, hooks)` stores a dynamic import loader. The module is fetched lazily on first match.
- Each route module exports `async init(params, hooks) → cleanup?`. The returned function (if any) is invoked by the router before the next route mounts.
- **Param sanitization** — `sanitizeParams()` rejects any value containing HTML tags, `javascript:` / `data:` / `vbscript:` schemes, inline event handlers, `://`, or values >100 chars. Rejected routes hit `ROUTER_ROUTE_ERROR` and show the not-found card.
- After a successful mount, the router writes `settings.lastSurface` so reload lands back on the same surface.

### Route table

| Pattern | Module | Purpose |
|---|---|---|
| `#/s/:surah` | `reader/Reader.svelte` | Surah reader |
| `#/s/:surah/:ayah` | `reader/Reader.svelte` | Surah reader jumping to verse |
| `#/review` | `review/Hub.svelte` | All-marks hub |
| `#/t/:tag` | `review/Hub.svelte` | Filtered-verse-review (FVR) |
| `#/surahs` | `surahs/SurahList.svelte` | Surah directory |
| `#/about` | `about/About.svelte` | About page |
| `#/onboarding` | `onboarding/Onboarding.svelte` | First-run flow |
| `#/settings` | *(inline stub)* | Opens settings sheet over last surface |

Every route above is a Svelte 5 component loaded lazily via dynamic import.

### Launch restore

Empty hash triggers `ROUTER_LAUNCH_RESTORE`. The handler in `app-bootstrap.ts` walks a cascade:

1. Onboarding not complete → `#/onboarding`
2. `settings.lastSurface` set (and not `#/onboarding`) → navigate there
3. Most recent `positions` record → `#/s/:surah/:verse`
4. Otherwise → `#/s/1`

## Event bus (`src/core/events.ts`)

- `emit(type, payload)` / `on(type, cb)` — `on` returns an unsubscribe fn. Both are typed via the `EventPayloads` map in `core/constants.ts`, so passing the wrong payload shape fails `svelte-check`.
- **Dev-time enum guard**: `emit()` throws in `import.meta.env.DEV` when called with an event name missing from `Events`. This stops typos and blocks accidental resurrection of events dissolved in Phase 6.
- **Handler isolation**: each handler runs inside a try/catch so one broken subscriber can't break a later one. No re-throw.
- Wildcard listeners via `'*'` are supported (used nowhere at present).
- `clear(type?)` purges one type or all. Tests rely on per-test `vi.resetModules()` rather than `clear()` because the emitter is module-scoped.

The full event catalog — who emits, who listens, payload shapes, dead events, and dissolved events — lives in `events.md`.

## IndexedDB layer (`src/core/db.ts`)

- Five stores: `settings`, `positions`, `marks`, `activationState`, `datasetMeta`. See `data-model.md` for keys, indexes, and record shapes.
- `put()` validates required fields per-store via an inline `schemas` table before writing; missing fields throw synchronously. The per-store record shapes are TS `interface`s exported as `StoreRecords` — `put<K>(store: K, record: StoreRecords[K])` enforces the contract at compile time.
- Quota errors emit `DB_QUOTA_EXCEEDED` for the banner module to catch.
- `onversionchange` closes the connection and emits `DB_VERSION_CHANGE` so `safety/sync.ts` can show the reload banner.
- A `visibilitychange` listener (attached once) emits `DB_VISIBILITY_VISIBLE` so reader / hub / indicators can re-sync state when the tab comes back.

## Cross-cutting patterns

- **Cleanup-returning initializers** — every `init()` (plus `initBootstrap`) that subscribes to events or touches the DOM returns a cleanup fn. The caller (router, `App.svelte` `onMount`) owns invocation. Svelte components use `onMount` + returned cleanup or `$effect` with a return value; vanilla helpers use an explicit cleanups array.
- **Bottom sheets over modals** — `.qa-sheet-backdrop` + `.qa-sheet.qa-sheet--bottom` is the standard overlay shape (settings, more, mark editor, command sheet). Each opener emits `SHEET_OPENED` / `SHEET_CLOSED` with `{ name }`.
- **Persistent-overlay mount pattern** — Svelte components that are not route components but need to be open-able imperatively (`UndoToast`, `QuotaBanner`, `Editor`, `Panel`, `ClearDataConfirm`, `CommandSheet`, `MoreSheet`) are mounted unconditionally in `App.svelte`. They expose an imperative API via a bridge module (`core/ui-bridge.ts`, `settings/panel-bridge.ts`, `marks/editor-bridge.ts`, `nav/command-sheet-bridge.ts`, `nav/more-sheet-bridge.ts`) that non-component callers import. The bridge module holds a module-level reference set during the component's `onMount`. This pattern avoids circular imports and keeps the imperative open/close API stable across surfaces.
- **Long-press = mark editor only** — no contextual menu, no multi-action sheet. `marks/long-press.ts::setupLongPress` (plus its `use:longPress` Svelte action counterpart) is wired once per reader mount.
- **Multi-tab coherence** — `safety/sync.ts` BroadcastChannels mark writes across tabs; receivers listen for `SYNC_UPDATE_RECEIVED` and re-read affected verse keys.
- **Ambient chrome** — dock and pill auto-fade on reader routes, persist elsewhere. Hidden entirely on `#/onboarding`.
- **Tests mirror beforeEach pattern** — `fake-indexeddb/auto`, fresh shell DOM, clear `marks` store where state carry-over would flake. `vi.resetModules()` only where needed (not in hub tests — they deliberately depend on state carry-over).
- **Responsive breakpoints** — three tiers: mobile (<768px), tablet (768–1179px), desktop (≥1180px). Canonical values live in `:root` as `--qa-bp-tablet` / `--qa-bp-desktop` and are duplicated as literals in `@media` queries (CSS cannot read custom properties inside media conditions). Typography uses a two-track system: stepped chrome tokens (`--qa-text-size-ui`, `--qa-text-size-meta`) redefined per breakpoint, and fluid reading tokens (`--qa-text-size-arabic`, `--qa-text-size-translation`) defined once via `clamp()`. User font-size slider multiplies the resulting value via `--qa-font-size-base`, unchanged. Reader on desktop switches to a 2-column Arabic|translation grid using CSS subgrid; when translation is toggled off, `#main-content:has(.qa-hide-translation)` collapses the grid to a single centered column. Chrome surfaces (ambient dock, bottom sheets, command sheet, onboarding) all adapt at the same two breakpoints: dock grows from 38×38 to 42×42 at tablet and becomes a labeled pill at desktop; bottom sheets become a centered modal at tablet (width ~480px) and the mark editor widens to 640px with a 2-column body grid at desktop; command sheet caps at 640px on desktop; onboarding adds a `max-height: 500px` landscape guard that drops the 72vh min-height when the viewport is short.

## Where NOT to look for logic

- No third-party state library. State lives in `src/state/<surface>.svelte.ts` modules using Svelte 5 `$state` runes (flat objects for simple state, classes for complex state). State modules have zero imports and zero side effects — they are pure in-memory data containers. Cross-surface signalling still goes through the mitt event bus. DOM handles and event-listener refs remain in the feature module that owns them.
- No CSS-in-JS. Theme tokens and shell rules live in `src/core/theme.css`; surface-specific styles live in `<style>` blocks inside their owning `.svelte` files.
- No routing library. `src/core/router.ts` is a small hash router that does everything.
