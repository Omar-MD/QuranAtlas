# Architecture

One-page orientation for anyone (or any agent) walking into this codebase cold. Covers the stack, the boot flow, the three cross-cutting primitives (router, event bus, IDB), and the patterns every surface follows.

## Stack

- **Vanilla JS + Vite** — no framework, no JSX. Everything is native DOM APIs with `document.createElement` and event listeners. Vite handles dev server + production bundle.
- **Single CSS file** — `src/core/theme.css` holds every rule. Class grammar is `qa-<surface>-<part>` (e.g. `qa-review-card-chip`, `qa-sheet-backdrop`). Themes swap CSS variables on `<html data-theme="…">`.
- **IndexedDB for all persistence** — DB name `quran-atlas`, version 1, 5 stores (see `data-model.md`). Every IDB access routes through `src/core/db.js`.
- **Mitt for cross-module communication** — tiny pub/sub (`src/core/events.js`). Event names centralised in `src/core/constants.js::Events`.
- **Service worker for offline** — `src/sw.js` + Workbox; the Quran corpus is cached in `CACHE_DATASET` and surahs load from cache first.
- **Testing** — Vitest + jsdom + `fake-indexeddb/auto`. 35 test files, ~361 tests at time of writing.

## Boot flow (`src/core/app.js`)

`src/core/app.js` auto-invokes `init()` on module load. In order:

1. Drain any previous `bootCleanups` (safe re-init).
2. `openDB()` — opens/creates the IDB (`onupgradeneeded` creates stores + indexes).
3. `initTheme()` + `initFontSize()` — apply persisted theme/font *before* first route renders so there's no flash.
4. Expose `window.__qaOpenMoreSheet = openMoreSheet` so the ambient dock can open the More sheet without a circular import.
5. Register route handlers (see below), then `router.init()` which dispatches the current hash.
6. Initialize chrome: settings panel, command sheet, ambient dock, ambient pill. Each returns a cleanup fn pushed onto `bootCleanups`.
7. Wire global subscribers: `NAVIGATION_NAVIGATE` → router, `READER_SURAH_LOADED` → recent-surahs tracker.
8. Register service worker (production only), initialize offline/PWA install listeners, restore activation state.

On any boot failure the `catch` block renders a minimal error card with a Retry button that re-calls `init()`.

## Router (`src/core/router.js`)

- Pure hash routing; patterns use `:param` placeholders (`#/s/:surah/:ayah`, `#/t/:tag`).
- `register(pattern, loader, hooks)` stores a dynamic import loader. The module is fetched lazily on first match.
- Each route module exports `async init(params, hooks) → cleanup?`. The returned function (if any) is invoked by the router before the next route mounts.
- **Param sanitization** — `sanitizeParams()` rejects any value containing HTML tags, `javascript:` / `data:` / `vbscript:` schemes, inline event handlers, `://`, or values >100 chars. Rejected routes hit `ROUTER_ROUTE_ERROR` and show the not-found card.
- After a successful mount, the router writes `settings.lastSurface` so reload lands back on the same surface.

### Route table

| Pattern | Module | Purpose |
|---|---|---|
| `#/s/:surah` | `reader/index.js` | Surah reader |
| `#/s/:surah/:ayah` | `reader/index.js` | Surah reader jumping to verse |
| `#/review` | `review/hub.js` | All-marks hub |
| `#/t/:tag` | `review/hub.js` | Filtered-verse-review (FVR) |
| `#/surahs` | `surahs/list.js` | Surah directory |
| `#/about` | `about/index.js` | About page |
| `#/onboarding` | `onboarding/index.js` | First-run flow |
| `#/settings` | *(inline stub)* | Opens settings sheet over last surface |

### Launch restore

Empty hash triggers `ROUTER_LAUNCH_RESTORE`. The handler in `app.js` walks a cascade:

1. Onboarding not complete → `#/onboarding`
2. `settings.lastSurface` set (and not `#/onboarding`) → navigate there
3. Most recent `positions` record → `#/s/:surah/:verse`
4. Otherwise → `#/s/1`

## Event bus (`src/core/events.js`)

- `emit(type, payload)` / `on(type, cb)` — `on` returns an unsubscribe fn.
- **Handler isolation**: each handler runs inside a try/catch so one broken subscriber can't break a later one. No re-throw.
- Wildcard listeners via `'*'` are supported (used nowhere at present).
- `clear(type?)` purges one type or all. Tests rely on per-test `vi.resetModules()` rather than `clear()` because the emitter is module-scoped.

The full event catalog — who emits, who listens, payload shapes, and dead events — lives in `events.md`.

## IndexedDB layer (`src/core/db.js`)

- Five stores: `settings`, `positions`, `marks`, `activationState`, `datasetMeta`. See `data-model.md` for keys, indexes, and record shapes.
- `put()` validates required fields per-store via an inline `schemas` table before writing; missing fields throw synchronously.
- Quota errors emit `DB_QUOTA_EXCEEDED` for the banner module to catch.
- `onversionchange` closes the connection and emits `DB_VERSION_CHANGE` so `safety/sync.js` can show the reload banner.
- A `visibilitychange` listener (attached once) emits `DB_VISIBILITY_VISIBLE` so reader / hub / indicators can re-sync state when the tab comes back.

## Cross-cutting patterns

- **Cleanup-returning initializers** — every `init()` that subscribes to events or touches the DOM returns a cleanup fn. The caller (router, app bootstrap) owns invocation. No lifecycle framework; discipline is manual.
- **Bottom sheets over modals** — `.qa-sheet-backdrop` + `.qa-sheet.qa-sheet--bottom` is the standard overlay shape (settings, more, mark editor, command sheet). Each opener emits `SHEET_OPENED` / `SHEET_CLOSED` with `{ name }`.
- **Long-press = mark editor only** — no contextual menu, no multi-action sheet. `marks/editor.js::setupLongPress` is wired once per reader mount.
- **Multi-tab coherence** — `safety/sync.js` BroadcastChannels mark writes across tabs; receivers listen for `SYNC_UPDATE_RECEIVED` and re-read affected verse keys.
- **Ambient chrome** — dock and pill auto-fade on reader routes, persist elsewhere. Hidden entirely on `#/onboarding`.
- **Tests mirror beforeEach pattern** — `fake-indexeddb/auto`, fresh shell DOM, clear `marks` store where state carry-over would flake. `vi.resetModules()` only where needed (not in hub tests — they deliberately depend on state carry-over).
- **Responsive breakpoints** — three tiers: mobile (<768px), tablet (768–1179px), desktop (≥1180px). Canonical values live in `:root` as `--qa-bp-tablet` / `--qa-bp-desktop` and are duplicated as literals in `@media` queries (CSS cannot read custom properties inside media conditions). Typography uses a two-track system: stepped chrome tokens (`--qa-text-size-ui`, `--qa-text-size-meta`) redefined per breakpoint, and fluid reading tokens (`--qa-text-size-arabic`, `--qa-text-size-translation`) defined once via `clamp()`. User font-size slider multiplies the resulting value via `--qa-font-size-base`, unchanged. Reader on desktop switches to a 2-column Arabic|translation grid using CSS subgrid; when translation is toggled off, `#main-content:has(.qa-hide-translation)` collapses the grid to a single centered column.

## Where NOT to look for logic

- No framework runtime, no reactive state library, no selectors. State lives in module-scoped variables inside each feature file, persisted to IDB. If you're asking "where's the store?" — the answer is "each surface owns its own state."
- No CSS-in-JS. All styles are in `src/core/theme.css`.
- No routing library. `src/core/router.js` is ~170 lines and does everything.
