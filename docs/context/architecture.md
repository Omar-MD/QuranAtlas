# Architecture

One-page orientation for anyone (or any agent) walking into this codebase cold. Covers the stack, the boot flow, the three cross-cutting primitives (router, event bus, IDB), and the patterns every surface follows.

## Stack

- **Svelte 5 (runes) + TypeScript + Vite** — the app root is `src/App.svelte` mounted from `src/app.ts` into `#app`. Reactivity is built on Svelte 5 runes (`$state`, `$derived`, `$effect`); no stores. TS config is `strict: true`. `svelte-check` runs in CI. No JSX.
- **Runes as the state primitive** — application state lives in `src/<surface>/state*.svelte.ts` modules colocated with their owning surface dir (see `module-graph.md`). Components read the rune object directly and render reactively; feature modules write to it. State modules have zero imports and zero side effects — pure in-memory containers.
- **CSS design system** — all CSS lives in `src/styles/`. The entry `styles/index.css` declares an `@layer` cascade (`reset, tokens, base, animations, utilities, surfaces, overrides`) and imports every layer file. Tokens are two-tier: primitive (`tokens/primitives.css`, prefixed `--c-`, `--s-`, `--r-`, `--ff-`, `--fs-`, `--lh-`, `--ls-`, `--fw-`, `--sh-`, `--dur-`, `--ease-`, `--zp-`, `--bp-`, `--tp-`, `--fp-`, `--blur-`) → semantic (`tokens/semantic.css`, prefixed `--qa-*`). Theme strategy: `:root` = light default, `html[data-theme="sepia"|"dark"]` override only what differs. Class grammar is `qa-<surface>-<part>` (e.g. `qa-review-card-chip`). Motion tokens composite into `--qa-transition-{fast,base,slow}` values (`"<dur> <ease>"`) so surfaces write `transition: color var(--qa-transition-base);`.
  - **Token-only discipline.** Surface CSS references semantic `--qa-*` tokens for every design decision. No hardcoded hex, no literal `border-radius: 12px`, no raw `0.2s ease`. Primitives never consumed outside `semantic.css` (enforced by stylelint). All per-surface CSS lives in `styles/surfaces/*.css`; `.svelte` files never contain `<style>` blocks (enforced by `scripts/check-no-svelte-style.mjs`).
  - **Lint gates.** `scripts/check-theme-parity.mjs` fails if a theme override declares a token missing from `:root`. `scripts/check-token-usage.mjs` fails on any unresolved `var(--qa-*)` reference. `scripts/check-at-layer.mjs` fails if any CSS file outside `reset.css`/`base.css`/`index.css` has rules outside a declared `@layer`. `scripts/check-no-svelte-style.mjs` fails if any `.svelte` file contains a `<style>` block. All four run via `pnpm check:styles` inside `validate`. `stylelint` handles selector grammar + custom-property prefixes via `.stylelintrc.json`.
- **IndexedDB for all persistence** — DB name `quran-atlas`, version 6, 8 stores (see `data-model.md`). Every IDB access routes through `src/core/db.ts`. Store record shapes are declared as TS `interface`s re-exported via `StoreRecords` so the `put()` validator and callers share the same compile-time contract.
- **Mitt for cross-module communication** — tiny pub/sub (`src/core/events.ts`). Event names centralised in `src/core/constants.ts::Events`. Payload typedefs live beside the enum.
- **Service worker for offline** — `src/sw.js` + Workbox; the Quran corpus is cached in `CACHE_DATASET` and surahs load from cache first. The SW and `src/offline/` helpers stay vanilla JS by design.
- **Testing** — Vitest + jsdom + `fake-indexeddb/auto` for units; Playwright journey specs (A–I) for E2E. Default to unit tests; use e2e only for browser-only proof. See `tests/unit/AGENTS.md` and `tests/e2e/AGENTS.md`.

## Boot flow (`src/app.ts` → `src/App.svelte` → `src/app-bootstrap.ts`)

Vite's entry is `src/app.ts`, which imports `App.svelte` and calls `mount(App, { target: #app })`. Every subsequent step lives inside `App.svelte` and the bootstrap helper it calls.

1. `App.svelte` mounts. Its `onMount` registers an `onRouteChange` handler that receives the resolved Svelte route component and mounts it imperatively into `#main-content` (re-using Svelte's `mount()`/`unmount()` APIs so route params + hook props are passed as component props).
2. Persistent overlays are declared in `App.svelte`'s markup once (`UndoToast`, `QuotaBanner`, `Editor`, `Panel`, `ClearDataConfirm`, `CommandSheet`, `MoreSheet`) and stay mounted for the lifetime of the session. Each exposes an imperative `open*` / `close*` API through a bridge module (`settings/panel-bridge.ts`, `marks/editor-bridge.ts`, etc.).
3. `initBootstrap()` from `src/app-bootstrap.ts` runs after the route handler is in place. It:
   - Drains any partial `bootCleanups` from a previous call.
   - `openDB()` — opens/creates the IDB (`onupgradeneeded` creates stores + indexes).
   - `initSafetySync()` — must run immediately after `openDB()` so the `DB_VERSION_CHANGE` listener is registered before any versionchange can fire (from another tab or E2E suppress hatch). If this runs later, a `suppressNextVersionChange()` call can leak its flag into a later real versionchange and silently suppress the reload banner.
   - `initTheme()` + `initFontSize()` — apply persisted theme/font *before* router dispatch so there's no flash.
   - `initRiwayah()` — reads `settings['riwayah']` (sole writer `settings/riwayah.ts`, default `'qaloon'`) and sets `data-riwayah` on `<html>` so font-family + line-height CSS rules fire before the reader mounts. Runs after `initFontSize()` and before `initReadingTypography()` — typography needs to know the active Riwayah to clamp its line-height floor correctly.
   - Registers route handlers (see below), then calls `router.init()` to dispatch the current hash.
   - Initializes reader keyboard actions (`initReaderActions`).
   - Wires global subscribers: `NAVIGATION_NAVIGATE` → router.
   - Registers the service worker (production only), captures the PWA install prompt, and restores activation state.
4. `App.svelte` keeps two cross-cutting `$effect`s:
   - Watches `reader.currentSurahNum`; when it changes, calls `refreshForSurah()` to re-decorate indicators and updates `settings.recentSurahs` (writes the store directly — recent-surahs is the single feature that owns that key).

On any boot failure the `catch` block renders a minimal error card with a Retry button that re-calls `initBootstrap()`. Svelte-ported routes are dispatched via `mount()` in `App.svelte`; the remaining vanilla route modules still export `async init(params, hooks)` and are invoked by the router.

## Router (`src/core/router.ts`)

- Pure hash routing; patterns use `:param` placeholders (`#/s/:surah/:ayah`, `#/t/:tag`).
- `register(pattern, loader, hooks)` stores a dynamic import loader. The module is fetched lazily on first match.
- Each route module exports `async init(params, hooks) → cleanup?`. The returned function (if any) is invoked by the router before the next route mounts.
- **Param sanitization** — `sanitizeParams()` rejects any value containing HTML tags, `javascript:` / `data:` / `vbscript:` schemes, inline event handlers, `://`, or values >100 chars. Rejected routes hit `ROUTER_ROUTE_ERROR` and show the not-found card.
- After a successful mount, the router writes `settings.lastSurface` so reload lands back on the same surface. Writes are skipped for `#/onboarding` because launch-restore explicitly rejects it as a target — persisting it would be wasted I/O and an in-flight write racing with a test fixture's seeded `lastSurface` would surface as flaky launch-restore.

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
- **Dev-time enum guard**: `emit()` throws in `import.meta.env.DEV` when called with an event name missing from `Events`. This stops typos.
- **Handler isolation**: each handler runs inside a try/catch so one broken subscriber can't break a later one. No re-throw.
- Wildcard listeners via `'*'` are supported (used nowhere at present).
- `clear(type?)` purges one type or all. Tests rely on per-test `vi.resetModules()` rather than `clear()` because the emitter is module-scoped.

The full event catalog — who emits, who listens, payload shapes, dead events, and dissolved events — lives in `events.md`.

## IndexedDB layer (`src/core/db.ts`)

- Eight stores: `settings`, `meta`, `marks`, `activationState`, `datasetMeta`, `edges`, `bookmarks`, `audioPosition`. See `data-model.md` for keys, indexes, and record shapes.
- `put()` validates required fields per-store via an inline `schemas` table before writing; missing fields throw synchronously. The per-store record shapes are TS `interface`s exported as `StoreRecords` — `put<K>(store: K, record: StoreRecords[K])` enforces the contract at compile time.
- Quota errors emit `DB_QUOTA_EXCEEDED` for the banner module to catch.
- `onversionchange` closes the connection and emits `DB_VERSION_CHANGE` so `safety/sync.ts` can show the reload banner.
- A `visibilitychange` listener (attached once) emits `DB_VISIBILITY_VISIBLE` so reader / hub / indicators can re-sync state when the tab comes back.

## Canonicalization pipeline

Tag labels across all 12 layers go through `core/normalize.ts::canonicalize()`
before being indexed for filter/query. The pipeline is deterministic:

  raw → trim+collapse → NFKC → strip diacritics/tatweel/zero-width →
  fold Arabic letter variants → lowercase ASCII → strip apostrophes →
  hyphens→spaces → alias-resolve via data/aliases.json → canonical

Raw labels are preserved on the mark record for display; canonical keys
are denormalized onto `_canon.<layer>` array paths for index hits.

The alias map (`src/data/aliases.json`) ships ~30 seed groups covering proper
nouns and transliteration drift. `excludeFromAliasing` protects Quranic
rank/quality distinctions (muminin/muslimin/muttaqin etc.) from collapsing
into the same canonical form.

## Cross-cutting patterns

- **Cleanup-returning initializers** — every `init()` (plus `initBootstrap`) that subscribes to events or touches the DOM returns a cleanup fn. The caller (router, `App.svelte` `onMount`) owns invocation. Svelte components use `onMount` + returned cleanup or `$effect` with a return value; vanilla helpers use an explicit cleanups array.
- **Bottom sheets over modals** — `.qa-sheet-backdrop` + `.qa-sheet.qa-sheet--bottom` is the standard overlay shape (settings, more, mark editor, command sheet). Each opener emits `SHEET_OPENED` / `SHEET_CLOSED` with `{ name }`.
- **Persistent-overlay mount pattern** — Svelte components that are not route components but need to be open-able imperatively (`UndoToast`, `QuotaBanner`, `Editor`, `Panel`, `ClearDataConfirm`, `CommandSheet`, `MoreSheet`) are mounted unconditionally in `App.svelte`. They expose an imperative API via a bridge module (`core/ui-bridge.ts`, `settings/panel-bridge.ts`, `marks/editor-bridge.ts`, `nav/command-sheet-bridge.ts`, `nav/more-sheet-bridge.ts`) that non-component callers import. The bridge module holds a module-level reference set during the component's `onMount`. This pattern avoids circular imports and keeps the imperative open/close API stable across surfaces.
- **Double-tap = fast-tag panel only** (touch); right-click on desktop. No contextual menu, no multi-action sheet. `marks/long-press.ts::setupTapGestures` is wired once per reader mount via `app-bootstrap.ts::setupLongPress`. The standalone `longPress` Svelte action remains exported for any future surface that wants the press gesture but is unused today; the file name is kept for git-history continuity.
- **Dataset path and active corpus** — the reader corpus lives at `public/dataset/riwayat/{name}/{NNN}.json` (KFGQPC: hafs / warsh / qaloon). `src/data/dataset.ts::getSurah(n)` reads `settings['riwayah']` (sole writer `settings/riwayah.ts`, default `'qaloon'`) to resolve the URL. Per-surah files are emitted at build time by `scripts/build-dataset.mjs` from three monolithic riwayat sources plus one `.raw.json` per shipped translation; the script regenerates `surahs.json`, `juz.json`, `manifest.json`, and `provenance.json`. Run via `pnpm build:dataset`; chained automatically by `pnpm build`.
- **Translation pipeline** — translation packs ship at `public/dataset/translations/{id}/{NNN}.json`. Source files live at `data/raw/{id}.raw.json` (outside `public/`, build-only input, never shipped — Vite copies `public/` verbatim, so keeping the raw monolith in `public/` bloats every install) and are produced by per-translation fetch scripts (`scripts/fetch-translation-saheeh.mjs`) and committed so the build stays offline. `dataset.ts::loadTranslationForSurah(id, surahNo)` returns the per-surah pack (verses + footnote map + intro paragraphs); `Reader.svelte` joins it onto rendered verses by `verseKey` and passes the surah-wide footnote map into each `Verse.svelte`. Inline `[N]` markers in translation strings are tokenised by `reader/translation-tokens.ts` and rendered as buttons; clicking one expands an inline panel below the verse with the corresponding footnote text. Schema + invariants live in `data-model.md` §Translation packs.
- **Multi-tab coherence** — `safety/sync.ts` BroadcastChannels mark writes and Riwayah switches across tabs; receivers re-read and emit `SYNC_UPDATE_RECEIVED` / `SETTINGS_RIWAYAH_CHANGED` locally.
- **Ambient chrome** — dock and pill auto-fade on reader routes, persist elsewhere. Hidden entirely on `#/onboarding`.
- **Viewport zoom lock** — `index.html` viewport meta sets `maximum-scale=1.0, minimum-scale=1.0, user-scalable=no` so navigation never lands on a zoomed-in surface. iOS Safari ignores `user-scalable=no` but honors `maximum-scale=1`; `src/app.ts` adds belt-and-suspenders listeners for `gesturestart`/`gesturechange` (iOS pinch) and `wheel` with `ctrlKey` (macOS Safari pinch + ctrl-scroll zoom). `base.css` sets `touch-action: manipulation` on `body` (kills double-tap zoom; pan/swipe gestures still work via per-surface overrides) and `-webkit-text-size-adjust: 100%` on `html` (iOS no longer auto-resizes text on rotation). Landscape notch handling via `padding-left/right: env(safe-area-inset-left/right)` on `#app-shell` and `.qa-sheet--settings-fs`.
- **Touch feedback** — `src/core/haptics.ts` wraps the Vibration API with semantic helpers (`tap`, `select`, `toggle`, `warn`); `src/app.ts` registers a single delegated `pointerdown` listener (`capture: true`, `passive: true`) that fires the right helper based on the closest interactive ancestor's role (`switch` → `toggle`, `radio` → `select`, otherwise `tap`). Mouse pointers, disabled controls, and elements marked `data-no-haptic` are skipped. Haptics no-op when `navigator.vibrate` is missing (iOS) or `prefers-reduced-motion` is set. Visual press feedback lives in `base.css` — `-webkit-tap-highlight-color: transparent` globally + a touch-only (`@media (hover: none) and (pointer: coarse)`) `:active { transform: scale(0.96); }` on buttons, role=button/switch/radio/tab, anchors, and `summary`. Range inputs and form controls are excluded so the slider thumb is not double-scaled.
- **Tests mirror beforeEach pattern** — `fake-indexeddb/auto`, fresh shell DOM, clear `marks` store where state carry-over would flake. `vi.resetModules()` only where needed (not in hub tests — they deliberately depend on state carry-over).
- **Responsive breakpoints** — three tiers: mobile (<768px), tablet (768–1179px), desktop (≥1180px). Canonical values live in `:root` as `--qa-bp-tablet` / `--qa-bp-desktop` and are duplicated as literals in `@media` queries (CSS cannot read custom properties inside media conditions). Typography uses a two-track system: stepped chrome tokens (`--qa-text-size-ui`, `--qa-text-size-meta`) redefined per breakpoint, and fluid reading tokens (`--qa-text-size-arabic`, `--qa-text-size-translation`) defined once via `clamp()`. User font-size slider multiplies the resulting value via `--qa-font-size-base`, unchanged. Reader on desktop switches to a 2-column Arabic|translation grid using CSS subgrid; when translation is toggled off, `#main-content:has(.qa-hide-translation)` collapses the grid to a single centered column. Chrome surfaces (ambient dock, bottom sheets, command sheet, onboarding) all adapt at the same two breakpoints: dock grows from 38×38 to 42×42 at tablet and becomes a labeled pill at desktop; bottom sheets become a centered modal at tablet (width ~480px) and the mark editor widens to 640px with a 2-column body grid at desktop; command sheet caps at 640px on desktop; onboarding adds a `max-height: 500px` landscape guard that drops the 72vh min-height when the viewport is short.

## Where NOT to look for logic

- No third-party state library. State lives in `src/<surface>/state.svelte.ts` modules (or `state-<name>.svelte.ts` for surfaces with multiple rune slices) using Svelte 5 `$state` runes (flat objects for simple state, classes for complex state). State modules have zero imports and zero side effects — they are pure in-memory data containers. Cross-surface signalling still goes through the mitt event bus. DOM handles and event-listener refs remain in the feature module that owns them.
- No CSS-in-JS. All CSS lives under `src/styles/` (entry `index.css`); every surface's CSS sits in `styles/surfaces/<surface>.css`. `.svelte` files carry no `<style>` blocks (enforced by `scripts/check-no-svelte-style.mjs`).
- No routing library. `src/core/router.ts` is a small hash router that does everything.

## Deploy topology

Three Git branches map to three Cloudflare Pages deployments on a single project (`quranatlas`):

- `main` → production → `quranatlas.org` / `www.quranatlas.org`
- `staging` → preview → `staging.quranatlas.org`
- `dev` → preview → `dev.quranatlas.org`

Flow: merge (or direct push to `dev`) triggers `.github/workflows/ci.yml`; on green CI, `.github/workflows/deploy.yml` fires via `workflow_run` and runs `wrangler pages deploy dist --branch=<branch>`. The `dist/` artifact uploaded by CI's `build` job is the exact bundle that ships — deploy never rebuilds. Cloudflare's build container is never invoked; custom domains are bound per branch in the CF dashboard. See `docs/tech-stack.md` §CI/CD for the full job matrix.
