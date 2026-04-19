# Svelte 5 + TypeScript Big-Bang Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the QuranAtlas vanilla JS PWA to Svelte 5 (runes) + TypeScript (strict) on a single long-lived branch, preserving all 185 Playwright journey tests as the contract throughout.

**Architecture:** Five sequential phases (foundation → core/TS → state runes → vertical slice → parallel surface ports → bus split → cutover). Phases 5's seven surface ports run in parallel (independent state, independent journeys). Service worker stays vanilla JS; hash router ports to TS but stays a plain module.

**Tech Stack:** Svelte 5 runes, TypeScript 5 (strict), `@sveltejs/vite-plugin-svelte`, `svelte-check`, `@testing-library/svelte`, existing Vite 8 + Vitest + Playwright + IndexedDB stack.

**Spec:** `docs/superpowers/specs/2026-04-19-svelte-typescript-migration-design.md`

**Execution constraints:**
- Branch off `main` to `migration/svelte-typescript`. All work lives here until Phase 7.
- After every task: `pnpm run lint`, `pnpm run check` (svelte-check), `pnpm run test:run`, and the journey specs touched by the task. All green before commit.
- After Phases 4, 5, 6, 7: full `pnpm run test:e2e` at three viewports (375×667, 768×1024, 1440×900). Three consecutive green at `--retries=0` required after Phase 7.
- The `about` vertical slice (Phase 4) is the canonical reference. Every parallel surface port (Phase 5) compares against it.

---

## File structure overview

The migration converts the existing tree:

```
src/
  app.ts                     # was core/app.js
  App.svelte                 # NEW
  core/{db,events,router,constants,logger,tag-colors}.ts
  core/{ui,quota-banner}.svelte
  core/theme.css             # tokens + cross-cutting only after Phase 5
  state/{reader,review,mark-editor,settings,sync,ambient-chrome,command-sheet,surahs}.svelte.ts
  reader/{Reader,Verse,SurahHeader,EdgeIndicator}.svelte
  reader/{chunked-append,position,verse-scroll,scroll-tracker,render-helpers}.ts
  review/{Hub,ReviewCard}.svelte + state.ts
  marks/{Editor,TagChip}.svelte + {store,indicator,tags,long-press}.ts
  nav/{AmbientDock,AmbientPill,CommandSheet,MoreSheet}.svelte
  settings/{Panel,ClearDataConfirm}.svelte + {theme,font-size,clear-data}.ts
  about/About.svelte + pwa-install.ts
  onboarding/Onboarding.svelte + screens.ts
  surahs/SurahList.svelte
  data/{dataset,offline,surah-meanings}.ts
  safety/{sync,input-validator}.ts
  a11y/announcer.ts
  sw.js, sw-handlers.js, offline/  # UNTOUCHED (vanilla JS)
```

---

## Shared snippets

**Branch setup:**
```bash
git checkout -b migration/svelte-typescript
```

**Per-task verification:**
```bash
pnpm run lint && pnpm run check && pnpm run test:run
# plus journey spec(s) for the surface touched, e.g.:
pnpm run test:e2e tests/e2e/journey-g-about.spec.js
```

**Three-viewport journey check (after Phases 4, 5, 6, 7):**
```bash
pnpm run test:e2e --retries=0
# repeat 3× on Phase 7
```

**Commit pattern:** one task = one commit. Use the conventional `<type>(<scope>): <summary>` style already in the repo.

---

## Phase 1 — Foundation

### Task 1: Install Svelte + TS toolchain, add `App.svelte` shell with vanilla bridge

**Files:**
- Create: `tsconfig.json`, `svelte.config.js`, `src/App.svelte`, `src/app.ts`, `src/vanilla-bridge.ts`
- Modify: `vite.config.js`, `package.json`, `index.html`, `eslint.config.js`
- Delete: `src/core/app.js` (replaced by `src/app.ts` + `App.svelte`)

**Cluster rationale:** Foundation is a single atomic landing — Svelte+TS+svelte-check installed, App.svelte mounted, all existing vanilla surfaces still rendered through a thin bridge. Tests + e2e all stay green; nothing user-visible changed.

- [ ] **Step 1.1 — Create branch.**
  ```bash
  git checkout -b migration/svelte-typescript
  ```

- [ ] **Step 1.2 — Install dev deps.**
  ```bash
  pnpm add -D svelte @sveltejs/vite-plugin-svelte svelte-check typescript @tsconfig/svelte @testing-library/svelte @testing-library/jest-dom
  ```

- [ ] **Step 1.3 — Add `tsconfig.json`.**
  ```json
  {
    "extends": "@tsconfig/svelte/tsconfig.json",
    "compilerOptions": {
      "target": "ES2020",
      "module": "ESNext",
      "moduleResolution": "Bundler",
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "allowJs": true,
      "checkJs": false,
      "isolatedModules": true,
      "verbatimModuleSyntax": true,
      "types": ["svelte", "vite/client"]
    },
    "include": ["src/**/*.ts", "src/**/*.svelte", "src/**/*.svelte.ts"],
    "exclude": ["src/sw.js", "src/sw-handlers.js", "src/offline/**"]
  }
  ```

- [ ] **Step 1.4 — Add `svelte.config.js`.**
  ```js
  import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
  export default { preprocess: vitePreprocess() }
  ```

- [ ] **Step 1.5 — Modify `vite.config.js`** to add the Svelte plugin (insert at top of `plugins:` array):
  ```js
  import { svelte } from '@sveltejs/vite-plugin-svelte'
  // ... in plugins:
  svelte(),
  ```
  Also update `build.rollupOptions.output.manualChunks` rules to point at the new component file paths (e.g. `src/reader/Reader.svelte` instead of `src/reader/index.js`). For Phase 1 only, keep the existing chunk paths — they'll be updated incrementally as each surface ports.

- [ ] **Step 1.6 — Update `package.json` scripts.**
  ```json
  "scripts": {
    ...
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "validate": "pnpm run lint && pnpm run check && pnpm run test:run && pnpm run build && pnpm run check-chunks"
  }
  ```

- [ ] **Step 1.7 — Modify `index.html`** to load `src/app.ts` (was `src/core/app.js`):
  ```html
  <script type="module" src="/src/app.ts"></script>
  ```

- [ ] **Step 1.8 — Create `src/vanilla-bridge.ts`** — adapter that mounts a vanilla `init(params, hooks) → cleanup` module into a Svelte component lifecycle:
  ```ts
  import { onMount } from 'svelte'

  export type VanillaInit = (params: Record<string, string>, hooks: Record<string, unknown>) => Promise<(() => void) | void> | (() => void) | void

  export function mountVanilla(init: VanillaInit, params: Record<string, string>, hooks: Record<string, unknown>) {
    let cleanup: (() => void) | void
    onMount(() => {
      Promise.resolve(init(params, hooks)).then(c => { cleanup = c })
      return () => { if (typeof cleanup === 'function') cleanup() }
    })
  }
  ```

- [ ] **Step 1.9 — Create `src/App.svelte`.** For Phase 1 it just exposes `<div id="main-content"></div>` plus mount slots for the existing chrome (ambient dock, pill, etc.). Surfaces continue to render into `#main-content` via their existing vanilla `init()` calls — App.svelte is just hosting the DOM shell that vanilla code already expects.
  ```svelte
  <script lang="ts">
    import { onMount } from 'svelte'
    import { initBootstrap } from './app-bootstrap'
    let cleanups: Array<() => void> = []
    onMount(() => { initBootstrap().then(c => { cleanups = c }) })
    return () => cleanups.forEach(c => c())
  </script>

  <div id="main-content"></div>
  ```

- [ ] **Step 1.10 — Create `src/app.ts`** — replaces `src/core/app.js`. Same boot logic (drain bootCleanups, openDB, initTheme, initFontSize, register routes, init router, init chrome) but exports an `initBootstrap()` that returns the cleanup array. App.svelte calls it from onMount. Move the existing `init()` body from `src/core/app.js` verbatim, wrap as `export async function initBootstrap()`, and replace the auto-invocation at the bottom with mounting App.svelte:
  ```ts
  import { mount } from 'svelte'
  import App from './App.svelte'

  export async function initBootstrap() { /* existing init() body */ }

  mount(App, { target: document.body })
  ```

- [ ] **Step 1.11 — Delete `src/core/app.js`.**
  ```bash
  rm src/core/app.js
  ```

- [ ] **Step 1.12 — Update `eslint.config.js`** to recognize `.ts` and `.svelte` files. Add `eslint-plugin-svelte` to devDeps if not present, plus `typescript-eslint`:
  ```bash
  pnpm add -D eslint-plugin-svelte typescript-eslint @typescript-eslint/parser
  ```
  Update flat config to include svelte + ts plugins.

- [ ] **Step 1.13 — Update `tests/setup.js`** — no changes needed; vitest auto-handles `.ts` files via the vite plugin. But add `@testing-library/jest-dom` matchers:
  ```js
  import '@testing-library/jest-dom/vitest'
  ```

- [ ] **Step 1.14 — Verify everything still works.**
  ```bash
  pnpm run lint
  pnpm run check        # svelte-check on the empty App.svelte
  pnpm run test:run     # all 437 unit tests still pass
  pnpm run build        # production build succeeds
  pnpm run dev          # dev server boots; manual smoke check at http://localhost:5173/
  pnpm run test:e2e     # all 185 journeys still pass (vanilla code unchanged)
  ```

- [ ] **Step 1.15 — Commit.**
  ```bash
  git add -A
  git commit -m "chore(migration): install Svelte 5 + TS, mount App.svelte shell over vanilla code"
  ```

---

## Phase 2 — Core layer to TypeScript

### Task 2: Port `src/core/`, `src/data/`, `src/safety/`, `src/a11y/` to TypeScript

**Files (modify, rename `.js` → `.ts`):**
- `src/core/{db,events,router,constants,logger,tag-colors}.js` → `.ts`
- `src/core/ui.js` → split into `src/core/ui.svelte` (undo toast) + `src/core/ui.ts` (any non-DOM helpers if present)
- `src/core/quota-banner.js` → `src/core/quota-banner.svelte`
- `src/data/{dataset,offline,surah-meanings}.js` → `.ts`
- `src/safety/{sync,input-validator}.js` → `.ts`
- `src/a11y/announcer.js` → `.ts`

**Cluster rationale:** All non-feature leaves go to TS in one pass. Surfaces in Phase 5 work against typed APIs from day one. No behavior changes — pure type annotations + `.js` → `.ts`. Tests stay green.

- [ ] **Step 2.1 — Port `src/core/constants.ts`.** The existing `Events` constant + 40 `@typedef` JSDoc payloads become a TS const + `EventPayloads` type map.
  ```ts
  export const Events = {
    DB_VERSION_CHANGE: 'db:version-change',
    DB_VISIBILITY_VISIBLE: 'db:visibility-visible',
    // ... all 40+ entries
  } as const

  export type EventName = typeof Events[keyof typeof Events]

  export type EventPayloads = {
    'db:version-change': {}
    'db:visibility-visible': {}
    'db:quota-exceeded': { storeName: string; message: string }
    'router:launch-restore': {}
    'router:route-change': { hash: string }
    'navigation:navigate': { surah: number; verse?: number }
    'marks:saved': { verseKey: string; tags: string[] }
    'marks:deleted': { verseKey: string }
    'marks:undo': { verseKey: string }
    'reader:surah-loaded': { surah: number }
    'reader:position-changed': { surah: number; verse: number }
    'reader:verse-rendered': { verseKey: string; element: HTMLElement }
    'settings:translation-changed': { visible: boolean }
    'sync:update-received': { verseKeys: string[] }
    'ambient:surface': { reason?: string }
    'storage:quota-warning': {}
    // ... full map; mirror every existing @typedef block
  }
  ```

- [ ] **Step 2.2 — Port `src/core/events.ts`.** Typed `emit` / `on` using `EventPayloads`:
  ```ts
  import mitt from 'mitt'
  import type { EventPayloads } from './constants'

  const emitter = mitt<EventPayloads>()
  const knownEvents = new Set(Object.values(Events))

  export function emit<K extends keyof EventPayloads>(type: K, payload: EventPayloads[K]): void {
    if (import.meta.env.DEV && !knownEvents.has(type)) {
      throw new Error(`Unknown event: ${String(type)}`)
    }
    try { emitter.emit(type, payload) } catch (err) { console.error(err) }
  }

  export function on<K extends keyof EventPayloads>(type: K, handler: (p: EventPayloads[K]) => void): () => void {
    const wrapped = (p: EventPayloads[K]) => { try { handler(p) } catch (err) { console.error(err) } }
    emitter.on(type, wrapped as any)
    return () => emitter.off(type, wrapped as any)
  }

  export function clear(type?: keyof EventPayloads) { type ? emitter.off(type) : emitter.all.clear() }
  ```

- [ ] **Step 2.3 — Port `src/core/db.ts`.** Convert the existing `_shapes` / `_optionalTypes` tables to TS types. Preserve `validateWrite` runtime behavior verbatim. Add typed `get<S extends StoreName>(store: S, key: string): Promise<StoreRecords[S] | undefined>` and `put<S extends StoreName>(store: S, value: StoreRecords[S]): Promise<void>`:
  ```ts
  export type StoreRecords = {
    settings: { key: string; value: unknown }
    positions: { id: string; surah: number; verse: number; savedAt: number; [k: string]: unknown }
    marks: { verseKey: string; tags?: string[]; note?: string; createdAt?: number; updatedAt?: number }
    activationState: { id: string; status: string; [k: string]: unknown }
    datasetMeta: { id: string; version?: string }
  }
  export type StoreName = keyof StoreRecords
  ```

- [ ] **Step 2.4 — Port `src/core/router.ts`.** No behavior change. Add types for `RouteHandler`, `RouteHooks`, `RoutePattern`. Keep the existing param sanitization, hash dispatch, lastSurface write logic verbatim.

- [ ] **Step 2.5 — Port `src/core/{logger,tag-colors}.ts`.** Mechanical.

- [ ] **Step 2.6 — Convert `src/core/ui.js` → `src/core/ui.svelte`** (the undo-toast component). Implementation:
  ```svelte
  <script lang="ts">
    import { on, emit } from './events'
    import { Events } from './constants'
    let visible = $state(false)
    let message = $state('')
    let actionLabel = $state('Undo')
    let onAction: (() => void) | null = $state(null)
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    export function showUndoToast(opts: { message: string; onUndo: () => void; verseKey?: string }) {
      // port existing showUndoToast logic, drive via state above
    }
  </script>

  {#if visible}
    <div class="qa-undo-toast" role="status">
      {message}
      <button on:click={() => { onAction?.(); if (verseKey) emit(Events.MARKS_UNDO, { verseKey }); visible = false }}>{actionLabel}</button>
    </div>
  {/if}
  ```
  Mount `<UndoToast/>` from `App.svelte`. Replace the existing `import { showUndoToast } from './core/ui'` callers with a `core/ui-bridge.ts` that holds a module-level reference to the component instance's exported method. (This pattern reused for `quota-banner.svelte` in 2.7.)

- [ ] **Step 2.7 — Convert `src/core/quota-banner.js` → `src/core/quota-banner.svelte`.** Same pattern as 2.6 — component subscribes to `DB_QUOTA_EXCEEDED` and `STORAGE_QUOTA_WARNING` in `$effect`, renders dismissible banner. Mount from `App.svelte`.

- [ ] **Step 2.8 — Port `src/data/{dataset,offline,surah-meanings}.ts`.** Add types for surah payloads, dataset manifest, activation state. Behavior unchanged.

- [ ] **Step 2.9 — Port `src/safety/{sync,input-validator}.ts`.** Mechanical.

- [ ] **Step 2.10 — Port `src/a11y/announcer.ts`.** Trivial.

- [ ] **Step 2.11 — Update all `import` paths in remaining vanilla `.js` files** to drop `.js` extensions where the target was renamed (TS ignores extensions; vite resolves both). Run a grep for `from './events'`, `from '../core/db'`, etc. Vite handles the resolution; explicit `.js` extensions can stay or be dropped — pick one and apply consistently.

- [ ] **Step 2.12 — Verify and commit.**
  ```bash
  pnpm run lint && pnpm run check && pnpm run test:run && pnpm run build && pnpm run test:e2e
  git add -A
  git commit -m "refactor(migration): port core/, data/, safety/, a11y/ to TypeScript"
  ```

---

## Phase 3 — State modules → runes

### Task 3: Port all 8 `src/state/*.js` to `.svelte.ts`

**Files (modify, rename):**
- `src/state/{settings,sync,ambient-chrome,command-sheet,surahs}.js` → `.svelte.ts` (flat rune pattern)
- `src/state/{reader,review,mark-editor}.js` → `.svelte.ts` (class rune pattern)
- `tests/unit/state/*.test.js` — port assertions to rune semantics

**Cluster rationale:** State runes are the foundation Phase 5 surfaces will consume. Doing all 8 in one task avoids merge conflicts when parallel surfaces reach for them. Tests already exist; they port nearly 1:1 since today's modules are already pure data containers.

- [ ] **Step 3.1 — Port `src/state/settings.svelte.ts`** (flat rune):
  ```ts
  export type TranslationId = 'saheeh' | 'pickthall' | 'yusuf' | 'khattab'
  export type Theme = 'light' | 'sepia' | 'dark' | 'auto'

  type SettingsState = {
    theme: Theme | null
    fontSize: number | null
    translationVisible: boolean
    translationId: TranslationId | null
    onboardingComplete: boolean | null
    lastSurface: string | null
  }

  export const settings = $state<SettingsState>({
    theme: null, fontSize: null, translationVisible: true,
    translationId: null, onboardingComplete: null, lastSurface: null,
  })
  ```

- [ ] **Step 3.2 — Port `src/state/{sync,ambient-chrome,command-sheet,surahs}.svelte.ts`** following the same flat pattern. Reference the existing `.js` files for field shapes; convert to typed `$state` objects.

- [ ] **Step 3.3 — Port `src/state/reader.svelte.ts`** (class rune):
  ```ts
  export class ReaderState {
    surah = $state<number | null>(null)
    currentVerse = $state<number | null>(null)
    loadedRange = $state<{ start: number; end: number } | null>(null)
    isLoading = $state(false)
    cleanups = $state<Array<() => void>>([])

    get currentVerseKey(): string | null {
      return this.surah && this.currentVerse ? `${this.surah}:${this.currentVerse}` : null
    }
    setPosition(surah: number, verse: number) { this.surah = surah; this.currentVerse = verse }
    reset() { this.surah = null; this.currentVerse = null; this.loadedRange = null; this.isLoading = false }
  }
  export const reader = new ReaderState()
  ```

- [ ] **Step 3.4 — Port `src/state/mark-editor.svelte.ts`** (class rune). Ports the existing fields (`verseKey`, `selectedTags`, `searchQuery`, `note`, `isExisting`, `isDirty`, `confirmingDelete`, `recentlyDeletedMark`) plus invariant methods (`selectTag`, `unselectTag`, `clearSearch`, `setNote`, `enterDeleteConfirm`, `cancelDelete`).

- [ ] **Step 3.5 — Port `src/state/review.svelte.ts`** (class rune). Fields: `view`, `groupBy`, `activeTag`, `surahFilter`, `sortBy`, plus the FVR vs all-marks invariants.

- [ ] **Step 3.6 — Port state unit tests.** For each `tests/unit/state/<name>.test.js`:
  - Replace `state.get().theme` with `state.theme` (flat) or `state.surah` (class).
  - Replace `state.set({ theme: 'x' })` with `state.theme = 'x'` (flat) or `state.setPosition(...)` (class methods).
  - Add `// @vitest-environment jsdom` or import `'svelte'` runtime mock if vitest can't resolve runes. (Vitest works with `@sveltejs/vite-plugin-svelte` automatically — no extra config.)
  - Rename `.test.js` → `.test.ts`.

- [ ] **Step 3.7 — Update every existing `.js` consumer** (`reader/index.js`, `review/hub.js`, `marks/editor.js`, etc.) of the old `state/*.js` API. Since the consumers are still vanilla and the old `get()/set()` pattern is gone, add tiny adapter shims at the top of each consumer file (will be removed when the consumer ports in Phase 5):
  ```js
  // Temporary bridge while consumer is still vanilla
  import { settings } from '../state/settings.svelte'
  const settingsState = { get: () => settings, set: (p) => Object.assign(settings, p) }
  ```
  Replace existing `state.get()` / `state.set(...)` calls with `settingsState.get()` / `settingsState.set(...)`. Keeps vanilla consumers working until they port.

- [ ] **Step 3.8 — Update `scripts/check-no-feature-state.js`** if it reads filenames — `.svelte.ts` should be in the allow-list for state modules.

- [ ] **Step 3.9 — Verify and commit.**
  ```bash
  pnpm run lint && pnpm run check && pnpm run test:run && pnpm run test:e2e
  git add -A
  git commit -m "refactor(migration): port state/ to Svelte 5 runes (.svelte.ts)"
  ```

---

## Phase 4 — Vertical slice (About)

### Task 4: Port About surface end-to-end as canonical reference

**Files:**
- Create: `src/about/About.svelte`, `src/about/pwa-install.ts`
- Modify: `src/marks/store.ts` (rename from `.js`, port to TS — About depends on it)
- Modify: `src/App.svelte` (route `#/about` to `<About/>`), `src/app.ts` (route handler)
- Delete: `src/about/index.js`, `src/about/pwa-install.js`
- Modify: `tests/unit/about/*.test.js` — delete DOM-coupled tests; keep stat-grid logic test if pure
- Verify: `tests/e2e/journey-g-about.spec.js` passes at all three viewports

**Cluster rationale:** About is the smallest surface that exercises the full stack: marks/store IDB read, theme tokens, scoped styles, action usage (`use:announceTo`), state read (`marks/store.getAll()`). It establishes the canonical patterns reviewers will compare every later port against. Don't proceed to Phase 5 until this is reviewed and approved.

- [ ] **Step 4.1 — Port `src/marks/store.ts`** (rename from `.js`, add TS types). Keep the sole-writer invariant: this is the only writer for the `marks` IDB store. Existing `save`, `del`, `getAll`, `getByVerseKey`, `getByTag`, plus `MARKS_SAVED` / `MARKS_DELETED` emit + broadcast logic — all preserved verbatim, just typed:
  ```ts
  export type Mark = StoreRecords['marks'] & { verseKey: string; tags: string[]; note: string; createdAt: number; updatedAt: number }
  export async function save(mark: Mark): Promise<void> { /* existing body */ }
  export async function del(verseKey: string): Promise<void> { /* existing body */ }
  export async function getAll(): Promise<Mark[]> { /* existing body */ }
  // ...
  ```

- [ ] **Step 4.2 — Create `src/about/pwa-install.ts`** — port from `pwa-install.js`. Mechanical.

- [ ] **Step 4.3 — Create `src/about/About.svelte`.** Port the existing DOM construction in `about/index.js::init()` to template syntax. Co-locate the `qa-about-*` styles from `theme.css` into a `<style>` block:
  ```svelte
  <script lang="ts">
    import { onMount } from 'svelte'
    import { getAll } from '../marks/store'
    import { announce } from '../a11y/announcer'
    import { getInstallPrompt, promptInstall } from './pwa-install'

    let stats = $state({ marks: 0, tags: 0, surahs: 0, percent: 0 })
    let installPromptAvailable = $state(false)

    onMount(async () => {
      const marks = await getAll()
      const uniqueTags = new Set(marks.flatMap(m => m.tags ?? []))
      const uniqueSurahs = new Set(marks.map(m => Number(m.verseKey.split(':')[0])))
      stats = {
        marks: marks.length,
        tags: uniqueTags.size,
        surahs: uniqueSurahs.size,
        percent: Math.round((marks.length / 6236) * 100),
      }
      installPromptAvailable = !!getInstallPrompt()
    })
  </script>

  <main class="qa-about" aria-label="About QuranAtlas">
    <h1 class="qa-about-wordmark">QuranAtlas</h1>
    <!-- mission, blessing, stat grid, attribution, install button, version -->
    <section class="qa-about-stats">
      <div><span>{stats.marks}</span><label>Marks</label></div>
      <div><span>{stats.tags}</span><label>Tags</label></div>
      <div><span>{stats.surahs}</span><label>Surahs</label></div>
      <div><span>{stats.percent}%</span><label>of Qur'an</label></div>
    </section>
    {#if installPromptAvailable}
      <button on:click={() => promptInstall()}>Install App</button>
    {/if}
  </main>

  <style>
    .qa-about { /* moved from theme.css :: .qa-about block */ }
    .qa-about-wordmark { /* ... */ }
    .qa-about-stats { /* ... */ }
    /* etc — all `qa-about-*` selectors from theme.css */
  </style>
  ```

- [ ] **Step 4.4 — Remove `qa-about-*` selectors from `src/core/theme.css`.** Cut every selector that starts with `.qa-about-` and paste into the `<style>` block in `About.svelte`. Theme tokens (`--qa-*`) stay in `theme.css` and are read by the component.

- [ ] **Step 4.5 — Update `src/app.ts` route registration** — `#/about` now lazy-loads the Svelte component:
  ```ts
  router.register('#/about', async () => (await import('./about/About.svelte')).default)
  ```
  And update App.svelte to render the matching component:
  ```svelte
  <script lang="ts">
    import { router } from './core/router'
    let CurrentRoute = $state<any>(null)
    let routeParams = $state<Record<string, string>>({})
    $effect(() => {
      router.onRouteChange((Component, params) => {
        CurrentRoute = Component
        routeParams = params
      })
    })
  </script>
  {#if CurrentRoute}
    <svelte:component this={CurrentRoute} {...routeParams} />
  {/if}
  ```
  (Leaves all other routes still using vanilla bridge until they port.)

- [ ] **Step 4.6 — Delete `src/about/index.js` and `src/about/pwa-install.js`.**

- [ ] **Step 4.7 — Delete DOM-coupled About unit tests.** Keep any pure-logic test (e.g. stat computation if extracted). Replace deleted coverage with reliance on `journey-g-about.spec.js`.

- [ ] **Step 4.8 — Verify About journey at three viewports.**
  ```bash
  pnpm run dev  # in another terminal
  pnpm run test:e2e tests/e2e/journey-g-about.spec.js --project=chromium-mobile
  pnpm run test:e2e tests/e2e/journey-g-about.spec.js --project=chromium-tablet
  pnpm run test:e2e tests/e2e/journey-g-about.spec.js --project=chromium-desktop
  ```
  All green. Visual smoke check: open `#/about` in browser, confirm wordmark, stat grid, theme switching all render correctly.

- [ ] **Step 4.9 — Full validation gate.**
  ```bash
  pnpm run lint && pnpm run check && pnpm run test:run && pnpm run build && pnpm run check-chunks && pnpm run test:e2e
  ```

- [ ] **Step 4.10 — Commit and request user review** before Phase 5 dispatches parallel agents.
  ```bash
  git add -A
  git commit -m "feat(migration): port About surface to Svelte (vertical slice)"
  ```

  **STOP for user review.** This is the canonical pattern; subsequent surfaces follow it. User reviews Files Changed before we dispatch parallel work.

---

## Phase 5 — Parallel surface ports

### Coordinator setup (run before dispatching)

Tasks 5–11 are independent and run in parallel via `superpowers:dispatching-parallel-agents`. Coordinator:
- Confirms Phase 4 review approved.
- Dispatches 7 subagents, each with a copy of this plan + a pointer to the About commit as canonical reference.
- After all 7 return: integrates, runs full validation, commits the integrated state.

Each surface task is self-contained (subagent reads it cold). Common contract for every surface task:

1. Port surface `.js` files → `.svelte` + `.ts` (components for DOM, .ts for logic).
2. Co-locate surface-specific CSS into component `<style>` blocks; remove the same selectors from `theme.css`.
3. Update route registration in `src/app.ts` to lazy-load the component.
4. Delete DOM-coupled unit tests; port logic tests where pure; write new component tests sparingly (only where logic is non-journey-covered).
5. Verify the surface's journey specs pass at three viewports.
6. Commit with conventional message.

### Task 5: Port Reader

**Files:**
- Create: `src/reader/Reader.svelte`, `src/reader/Verse.svelte`, `src/reader/SurahHeader.svelte`, `src/reader/EdgeIndicator.svelte`
- Modify (rename `.js` → `.ts`): `src/reader/{chunked-append,position,verse-scroll,scroll-tracker,edge-indicators,render}.js`
- Delete: `src/reader/index.js` (replaced by `Reader.svelte`)
- Verify: `tests/e2e/journey-b-reader.spec.js`, `tests/e2e/journey-c-marking.spec.js` (long-press + indicator interaction)

- [ ] **Step 5.1 — Port logic-only modules to TS.** `chunked-append.ts`, `position.ts`, `verse-scroll.ts`, `scroll-tracker.ts`, `edge-indicators.ts`. The existing module split (Unit #2) keeps these clean — port mechanically. **Preserve `position.ts` as the sole writer for the `positions` IDB store (CLAUDE.md Rule 5).**

- [ ] **Step 5.2 — Convert `render.js` → `render-helpers.ts`** for any remaining pure helpers (e.g. `renderVerseChunk` becomes a function returning a verse data array consumed by `<Verse/>` `{#each}`; the imperative DOM construction dies).

- [ ] **Step 5.3 — Create `src/reader/Verse.svelte`.** Single verse row: number circle, Arabic, translation, edge indicator slot. Long-press uses `use:longPress` action.
  ```svelte
  <script lang="ts">
    import { longPress } from '../marks/long-press'
    export let verseKey: string
    export let arabic: string
    export let translation: string
    export let openEditor: (key: string) => void
  </script>
  <article class="qa-verse" data-verse-key={verseKey} use:longPress={() => openEditor(verseKey)}>
    <span class="qa-verse-number">{verseKey.split(':')[1]}</span>
    <p class="qa-verse-ar" dir="rtl">{arabic}</p>
    <p class="qa-verse-en">{translation}</p>
  </article>
  <style>/* qa-verse-* styles from theme.css */</style>
  ```

- [ ] **Step 5.4 — Create `src/reader/SurahHeader.svelte`** and `src/reader/EdgeIndicator.svelte` similarly (split from `render.js`).

- [ ] **Step 5.5 — Create `src/reader/Reader.svelte`** — route component. Ports `reader/index.js::init` body. Owns: surah load, chunked-append loop wiring, position tracking lifecycle, edge-indicator action setup, hooks-via-props (`initIndicators`, `setupLongPress`, `openEditor` come in as props):
  ```svelte
  <script lang="ts">
    import { onMount } from 'svelte'
    import Verse from './Verse.svelte'
    import SurahHeader from './SurahHeader.svelte'
    import { reader } from '../state/reader.svelte'
    import { settings } from '../state/settings.svelte'
    import { getSurah } from '../data/dataset'
    import { setupChunkedAppend } from './chunked-append'
    import { setupPositionTracking, savePosition } from './position'

    export let surah: number
    export let verse: number | undefined = undefined
    export let initIndicators: (container: HTMLElement) => () => void
    export let setupLongPress: (container: HTMLElement) => () => void
    export let openEditor: (verseKey: string) => void

    let verses = $state<Array<{ key: string; ar: string; en: string }>>([])
    let container: HTMLElement
    let cleanups: Array<() => void> = []

    onMount(async () => {
      reader.setPosition(surah, verse ?? 1)
      const data = await getSurah(surah)
      verses = data.verses.slice(0, 50).map(v => ({ key: `${surah}:${v.n}`, ar: v.ar, en: v.en }))
      cleanups.push(setupChunkedAppend(container, () => verses, (more) => verses = [...verses, ...more]))
      cleanups.push(setupPositionTracking(container, surah))
      cleanups.push(initIndicators(container))
      cleanups.push(setupLongPress(container))
    })
    return () => cleanups.forEach(c => c())
  </script>

  <main bind:this={container} class="qa-reader">
    <SurahHeader {surah}/>
    {#each verses as v (v.key)}
      <Verse verseKey={v.key} arabic={v.ar} translation={v.en} {openEditor} />
    {/each}
  </main>
  <style>/* all qa-reader-*, qa-verse-list-* styles from theme.css */</style>
  ```

- [ ] **Step 5.6 — Update `src/app.ts` route registration** for `#/s/:surah` and `#/s/:surah/:ayah` to lazy-load `Reader.svelte` with hooks composed from `marks/`:
  ```ts
  router.register('#/s/:surah', async () => ({
    Component: (await import('./reader/Reader.svelte')).default,
    hooks: {
      initIndicators: (await import('./marks/indicator')).initIndicators,
      setupLongPress: (await import('./marks/editor')).setupLongPress,
      openEditor: (await import('./marks/editor')).openEditor,
    },
  }))
  ```

- [ ] **Step 5.7 — Delete `src/reader/index.js`** and any other `.js` files now superseded.

- [ ] **Step 5.8 — Cut all `qa-reader-*`, `qa-verse-*`, `qa-surah-header-*`, `qa-edge-indicator-*` selectors from `theme.css`** into the respective component `<style>` blocks. Reader column-grid `:has()` selector stays in `theme.css` because it crosses component boundaries (`#main-content:has(.qa-hide-translation)`).

- [ ] **Step 5.9 — Delete DOM-coupled reader unit tests** in `tests/unit/reader/`. Keep pure logic tests (chunked-append size calc, position computation, scroll-tracker observe). Port any kept tests to `.test.ts`.

- [ ] **Step 5.10 — Verify reader journeys at three viewports.**
  ```bash
  pnpm run test:e2e tests/e2e/journey-b-reader.spec.js
  pnpm run test:e2e tests/e2e/journey-c-marking.spec.js
  pnpm run test:e2e tests/e2e/desktop-layouts.spec.js  # reader column grid
  ```

- [ ] **Step 5.11 — Verify and commit.**
  ```bash
  pnpm run lint && pnpm run check && pnpm run test:run
  git add -A
  git commit -m "feat(migration): port Reader surface to Svelte"
  ```

### Task 6: Port Review hub + FVR

**Files:**
- Create: `src/review/Hub.svelte`, `src/review/ReviewCard.svelte`
- Modify (rename): `src/review/state.js` → `state.ts` (sole writer for `positions['review']`)
- Delete: `src/review/hub.js`
- Verify: `tests/e2e/journey-e-review.spec.js`

- [ ] **Step 6.1 — Port `src/review/state.ts`.** Preserve sole-writer status for `positions['review']`. Add types for `ReviewState` record.

- [ ] **Step 6.2 — Create `src/review/ReviewCard.svelte`** — single mark card: ref eyebrow, jump link, verse content, optional note, chip row. Tap card → `openEditor(verseKey)`.

- [ ] **Step 6.3 — Create `src/review/Hub.svelte`.** Branches on `params.tag` for FVR vs all-marks (matches existing `hub.js` shape). Reads `review` rune for groupBy/sort/filter; subscribes to `SYNC_UPDATE_RECEIVED` and `DB_VISIBILITY_VISIBLE` via `$effect`.

- [ ] **Step 6.4 — Update route registration** in `app.ts` for `#/review` and `#/t/:tag` to lazy-load `Hub.svelte`.

- [ ] **Step 6.5 — Delete `src/review/hub.js`** and DOM-coupled review unit tests. Cut `qa-review-*` selectors from `theme.css` into Hub.svelte / ReviewCard.svelte.

- [ ] **Step 6.6 — Verify review journey at three viewports.**
  ```bash
  pnpm run test:e2e tests/e2e/journey-e-review.spec.js
  ```

- [ ] **Step 6.7 — Commit.**
  ```bash
  git add -A && git commit -m "feat(migration): port Review hub + FVR to Svelte"
  ```

### Task 7: Port Mark editor

**Files:**
- Create: `src/marks/Editor.svelte`, `src/marks/TagChip.svelte`, `src/marks/long-press.ts` (action), `src/marks/indicator.ts`
- Modify: `src/marks/{tags,store}.ts` (already done in Phase 4 for store)
- Delete: `src/marks/editor.js`, `src/marks/indicator.js`
- Verify: `tests/e2e/journey-c-marking.spec.js`

- [ ] **Step 7.1 — Create `src/marks/long-press.ts`** as a Svelte action. Preserves CLAUDE.md Rule 4 (long-press = mark editor only):
  ```ts
  export function longPress(node: HTMLElement, onPress: (verseKey: string) => void) {
    let timer: ReturnType<typeof setTimeout> | null = null
    const start = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest('[data-verse-key]') as HTMLElement | null
      if (!target) return
      timer = setTimeout(() => onPress(target.dataset.verseKey!), 500)
    }
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null } }
    node.addEventListener('pointerdown', start)
    node.addEventListener('pointerup', cancel)
    node.addEventListener('pointerleave', cancel)
    node.addEventListener('contextmenu', (e) => { e.preventDefault(); start(e as PointerEvent) })
    return { destroy() { node.removeEventListener('pointerdown', start); /* etc */ } }
  }
  // Compatibility export for vanilla bridge (until App.svelte composes hooks):
  export function setupLongPress(container: HTMLElement) { /* legacy wrapper */ }
  ```

- [ ] **Step 7.2 — Create `src/marks/TagChip.svelte`** — single chip with × button, color from `tag-colors`.

- [ ] **Step 7.3 — Create `src/marks/Editor.svelte`** — the mark editor sheet. Reads `markEditor` rune (from Phase 3), calls `markEditor.selectTag(...)` etc. on user actions. Save handler calls `marks/store.ts::save`.

- [ ] **Step 7.4 — Port `src/marks/indicator.ts`** — DOM decoration logic. Subscribes to `MARKS_SAVED`, `MARKS_DELETED`, `MARKS_UNDO`, `READER_VERSE_RENDERED`, `SYNC_UPDATE_RECEIVED`, `DB_VISIBILITY_VISIBLE`. Exports `initIndicators(container)` for App.svelte to compose into reader hooks.

- [ ] **Step 7.5 — `openEditor` exported from Editor.svelte.** Use the same `core/ui-bridge.ts` pattern from Step 2.6 — the editor component registers itself with a module-level imperative API:
  ```ts
  // src/marks/editor-bridge.ts
  let _open: (verseKey: string) => void
  export function registerEditor(open: typeof _open) { _open = open }
  export function openEditor(verseKey: string) { _open?.(verseKey) }
  ```
  `Editor.svelte` calls `registerEditor(openHandler)` in onMount.

- [ ] **Step 7.6 — Mount `<Editor/>` in App.svelte** alongside `<UndoToast/>` and `<QuotaBanner/>`.

- [ ] **Step 7.7 — Delete `src/marks/editor.js` and `src/marks/indicator.js`.** Cut `qa-mark-editor-*`, `qa-tag-chip-*` selectors into the components.

- [ ] **Step 7.8 — Delete DOM-coupled mark-editor tests.** Add a new `tests/unit/marks/editor.test.ts` that covers tag-selection invariants via the rune (no DOM mount needed).

- [ ] **Step 7.9 — Verify marking journey at three viewports.**
  ```bash
  pnpm run test:e2e tests/e2e/journey-c-marking.spec.js
  ```

- [ ] **Step 7.10 — Commit.**
  ```bash
  git add -A && git commit -m "feat(migration): port Mark editor + indicator + long-press to Svelte"
  ```

### Task 8: Port Settings panel + Clear data

**Files:**
- Create: `src/settings/Panel.svelte`, `src/settings/ClearDataConfirm.svelte`
- Modify (rename): `src/settings/{theme,font-size,clear-data}.js` → `.ts`
- Delete: `src/settings/panel.js`
- Verify: `tests/e2e/journey-d-settings.spec.js`, `tests/e2e/theme-switching.spec.js`

- [ ] **Step 8.1 — Port `src/settings/{theme,font-size,clear-data}.ts`.** Preserve `prefers-color-scheme` listener in theme.ts; preserve the suppressNextVersionChange call in clear-data.ts. Each writes the `settings` IDB store and mirrors to the `settings` rune.

- [ ] **Step 8.2 — Create `src/settings/Panel.svelte`** — bottom sheet UI: theme swatches, font slider with live preview, translation toggle + nested picker, clear-data link. Reads `settings` rune for current values; user actions call into theme.ts/font-size.ts which update both IDB and rune.

- [ ] **Step 8.3 — Create `src/settings/ClearDataConfirm.svelte`** — confirmation modal shown by clear-data.ts.

- [ ] **Step 8.4 — `openSettingsSheet()` bridge** — same pattern as Editor (Step 7.5):
  ```ts
  // src/settings/panel-bridge.ts
  let _open: () => void
  export function registerPanel(open: typeof _open) { _open = open }
  export function openSettingsSheet() { _open?.() }
  ```

- [ ] **Step 8.5 — Mount `<Panel/>` and `<ClearDataConfirm/>` in App.svelte.**

- [ ] **Step 8.6 — Update route stub for `#/settings`** in app.ts to call `openSettingsSheet()` and replace hash back, exactly as today.

- [ ] **Step 8.7 — Delete `src/settings/panel.js`.** Cut `qa-settings-*`, `qa-font-preview-*`, `qa-theme-swatch-*`, `qa-clear-data-*` selectors into the components.

- [ ] **Step 8.8 — Delete DOM-coupled settings tests; port pure logic tests.**

- [ ] **Step 8.9 — Verify settings journey at three viewports.**
  ```bash
  pnpm run test:e2e tests/e2e/journey-d-settings.spec.js
  pnpm run test:e2e tests/e2e/theme-switching.spec.js
  ```

- [ ] **Step 8.10 — Commit.**
  ```bash
  git add -A && git commit -m "feat(migration): port Settings panel + ClearData to Svelte"
  ```

### Task 9: Port Surah list

**Files:**
- Create: `src/surahs/SurahList.svelte`, `src/surahs/SurahRow.svelte`
- Delete: `src/surahs/list.js`
- Verify: `tests/e2e/journey-f-navigation.spec.js`

- [ ] **Step 9.1 — Create `src/surahs/SurahRow.svelte`** — single row.

- [ ] **Step 9.2 — Create `src/surahs/SurahList.svelte`** — directory with search, Bookmarked + Recent filters, continue-reading card. Reads `surahs` rune for filter state; `marks/store.ts::getAll()` for bookmarked filter.

- [ ] **Step 9.3 — Update route registration for `#/surahs`.**

- [ ] **Step 9.4 — Delete `src/surahs/list.js` and DOM-coupled tests.** Cut `qa-surah-list-*`, `qa-surah-row-*`, `qa-continue-reading-*` selectors.

- [ ] **Step 9.5 — Verify surah-list journey.**
  ```bash
  pnpm run test:e2e tests/e2e/journey-f-navigation.spec.js
  ```

- [ ] **Step 9.6 — Commit.**
  ```bash
  git add -A && git commit -m "feat(migration): port Surah list to Svelte"
  ```

### Task 10: Port Onboarding

**Files:**
- Create: `src/onboarding/Onboarding.svelte`, `src/onboarding/OnboardingScreen.svelte`
- Modify: `src/onboarding/screens.js` → `screens.ts` (data only)
- Delete: `src/onboarding/index.js`
- Verify: `tests/e2e/journey-a-onboarding.spec.js`

- [ ] **Step 10.1 — Port `screens.ts`** (pure data — screen content array).

- [ ] **Step 10.2 — Create `src/onboarding/OnboardingScreen.svelte`** — single screen shell.

- [ ] **Step 10.3 — Create `src/onboarding/Onboarding.svelte`** — 5-screen flow with progress dots, Skip button (from screen 2), theme picker on screen 2, translation picker on screen 3, shortcuts on screen 4, tags intro on screen 5. Writes `settings.onboardingComplete` on completion.

- [ ] **Step 10.4 — Update route registration for `#/onboarding`** plus `isComplete()` / `markComplete()` helpers exported from `Onboarding.svelte` module script.

- [ ] **Step 10.5 — Delete `src/onboarding/index.js`.** Cut `qa-onboarding-*` selectors.

- [ ] **Step 10.6 — Verify onboarding journey at three viewports** (especially the landscape phone short-viewport guard from journey A4).
  ```bash
  pnpm run test:e2e tests/e2e/journey-a-onboarding.spec.js
  ```

- [ ] **Step 10.7 — Commit.**
  ```bash
  git add -A && git commit -m "feat(migration): port Onboarding to Svelte"
  ```

### Task 11: Port Nav chrome (dock, pill, command sheet, more sheet)

**Files:**
- Create: `src/nav/AmbientDock.svelte`, `src/nav/AmbientPill.svelte`, `src/nav/CommandSheet.svelte`, `src/nav/MoreSheet.svelte`
- Delete: `src/nav/{ambient-dock,ambient-pill,command-sheet,more-sheet}.js`
- Verify: `tests/e2e/journey-b-reader.spec.js` (B1, B2, B4 ambient cases), `tests/e2e/journey-f-navigation.spec.js` (F1-F6 command sheet)

**Cluster rationale:** All four nav surfaces share state (`ambient-chrome` rune, `command-sheet` rune) and journey-overlap (chrome appears across most journeys). Bundling avoids cross-component races during integration.

- [ ] **Step 11.1 — Create `src/nav/AmbientDock.svelte`** — 4-glyph floating pill. Reads `ambientChrome` rune for visibility; subscribes to `AMBIENT_SURFACE` and `ROUTER_ROUTE_CHANGE` via `$effect` for fade timer. Hidden on `#/onboarding`.

- [ ] **Step 11.2 — Create `src/nav/AmbientPill.svelte`** — top floating pill. Reads `reader.surah`, `reader.currentVerse` directly (no event subscription needed — this is one of the bus-split candidates from Phase 6).

- [ ] **Step 11.3 — Create `src/nav/CommandSheet.svelte`** — ⌘K overlay. Reads `commandSheet` rune for query/results state; emits `NAVIGATION_NAVIGATE` for verse/surah selection.

- [ ] **Step 11.4 — Create `src/nav/MoreSheet.svelte`** — first-level parent sheet from dock's ⋯ button.

- [ ] **Step 11.5 — Mount all four in App.svelte** (alongside Editor, UndoToast, QuotaBanner). Replace `window.__qaOpenMoreSheet` with a proper bridge:
  ```ts
  // src/nav/more-sheet-bridge.ts
  let _open: () => void
  export function registerMoreSheet(open: typeof _open) { _open = open }
  export function openMoreSheet() { _open?.() }
  ```

- [ ] **Step 11.6 — Update `src/app.ts`** — remove `window.__qaOpenMoreSheet` global; chrome init becomes mount calls (or just removal — components now mount themselves from App.svelte).

- [ ] **Step 11.7 — Delete the four `.js` files.** Cut `qa-ambient-*`, `qa-command-sheet-*`, `qa-more-sheet-*` selectors into components.

- [ ] **Step 11.8 — Verify chrome journeys.**
  ```bash
  pnpm run test:e2e tests/e2e/journey-b-reader.spec.js tests/e2e/journey-f-navigation.spec.js
  ```

- [ ] **Step 11.9 — Commit.**
  ```bash
  git add -A && git commit -m "feat(migration): port nav chrome (dock, pill, command sheet, more sheet) to Svelte"
  ```

### Phase 5 integration checkpoint

After Tasks 5–11 commit (whether via subagent dispatch or sequential), the coordinator runs full validation:

```bash
pnpm run lint && pnpm run check && pnpm run test:run && pnpm run build && pnpm run check-chunks
pnpm run test:e2e --retries=0  # all 185 journeys at default viewport
pnpm run test:e2e --retries=0  # second pass
```

Two consecutive green at this checkpoint. If a task's commit broke a journey, fix forward in a small commit on the migration branch — do NOT roll back.

---

## Phase 6 — Bus split integration

### Task 12: Replace state-shaped events with rune reads

**Files:**
- Modify: `src/core/constants.ts` (remove 3 event entries), `src/core/events.ts` (no change), `src/reader/Reader.svelte`, `src/nav/AmbientPill.svelte`, `src/marks/indicator.ts`, `src/settings/Panel.svelte`, `src/app.ts` (recent-surahs tracker)
- Update: `docs/context/events.md`

**Cluster rationale:** Per the spec, three events dissolve into rune reads. Doing the deletion in one task prevents half-migrated state. After this, `events.md` and `constants.ts` reflect the final wire diagram.

- [ ] **Step 12.1 — Delete `READER_SURAH_LOADED` event.** In `Reader.svelte`, remove `emit(Events.READER_SURAH_LOADED, { surah })`. The pill, indicator, and recent-surahs tracker now read `reader.surah` via `$effect`:
  ```svelte
  <!-- in AmbientPill.svelte -->
  <span>{reader.surah}:{reader.currentVerse}</span>

  <!-- in app.ts (recent-surahs tracker) -->
  $effect(() => {
    if (reader.surah) trackRecentSurah(reader.surah)
  })
  ```
  In `marks/indicator.ts`, replace `on(Events.READER_SURAH_LOADED, ...)` with a `$effect` in App.svelte that calls `indicator.refreshForSurah(reader.surah)` when `reader.surah` changes.

- [ ] **Step 12.2 — Delete `READER_POSITION_CHANGED` event.** Pill already reads `reader.currentVerse` from 12.1. Remove the `emit` from position.ts.

- [ ] **Step 12.3 — Delete `SETTINGS_TRANSLATION_CHANGED` event.** In `Reader.svelte`, replace the existing event subscription with:
  ```svelte
  $effect(() => {
    settings.translationVisible // reactive read
    refreshTranslationVisibility(container)
  })
  ```
  Remove the `emit` from `settings/panel.ts`.

- [ ] **Step 12.4 — Remove the three entries from `Events` constant** in `src/core/constants.ts`. Remove their `EventPayloads` entries. The dev-time `emit()` guard now rejects any leftover callers (caught at `pnpm run check` + at runtime).

- [ ] **Step 12.5 — Update `docs/context/events.md`** to reflect the deletion.

- [ ] **Step 12.6 — Full validation gate.**
  ```bash
  pnpm run lint && pnpm run check && pnpm run test:run && pnpm run build && pnpm run check-chunks
  pnpm run test:e2e --retries=0  # full suite, 1st pass
  pnpm run test:e2e --retries=0  # 2nd pass
  pnpm run test:e2e --retries=0  # 3rd pass
  ```
  Three consecutive green.

- [ ] **Step 12.7 — Commit.**
  ```bash
  git add -A
  git commit -m "refactor(migration): dissolve state-shaped events into rune reads"
  ```

---

## Phase 7 — Cutover

### Task 13: Remove vanilla bridge, update docs, merge to main

**Files:**
- Modify: `src/App.svelte` (remove `mountVanilla` usages), `src/vanilla-bridge.ts` (delete if no callers)
- Update: `docs/context/architecture.md`, `module-graph.md`, `feature-map.md`, `events.md`, `data-model.md`, `user-journeys.md` (only if any user-visible behavior changed; should not)
- Final merge to `main`

- [ ] **Step 13.1 — Audit `src/vanilla-bridge.ts` callers.** If no callers remain (all surfaces ported), delete the file:
  ```bash
  grep -r 'mountVanilla\|vanilla-bridge' src/ tests/
  rm src/vanilla-bridge.ts
  ```

- [ ] **Step 13.2 — Update `docs/context/architecture.md`** — replace "Vanilla JS + Vite" stack line with "Svelte 5 + TypeScript + Vite", note tsconfig strict, note runes-as-state-primitive, update boot-flow section to reflect App.svelte mount.

- [ ] **Step 13.3 — Update `docs/context/module-graph.md`** — same per-directory inventory, but note `.svelte`/`.ts` extensions and add `state/*.svelte.ts` rune containers' new role (read by components, written by feature modules).

- [ ] **Step 13.4 — Update `docs/context/feature-map.md`** — replace each "Entry: `src/<x>/index.js::init(...)`" line with the equivalent Svelte component path.

- [ ] **Step 13.5 — Update `docs/context/events.md`** if not already up to date from Phase 6.

- [ ] **Step 13.6 — Update `docs/context/data-model.md`** — `_shapes` typedefs are now TS types; document the cross-reference.

- [ ] **Step 13.7 — Audit `docs/context/user-journeys.md`** — compare each journey to Playwright spec output. Per CLAUDE.md Rule 1, any user-visible behavior change requires a journey update (none expected for this structural migration, but verify).

- [ ] **Step 13.8 — Final gate (THE cutover criterion).**
  ```bash
  pnpm run lint           # clean
  pnpm run check          # svelte-check clean
  pnpm run test:run       # all unit tests pass
  pnpm run build          # production build succeeds
  pnpm run check-chunks   # within budget
  pnpm run test:e2e --retries=0  # 1st green
  pnpm run test:e2e --retries=0  # 2nd green
  pnpm run test:e2e --retries=0  # 3rd green
  pnpm run lighthouse     # within 5% of pre-migration baseline
  ```

- [ ] **Step 13.9 — Commit and merge.**
  ```bash
  git add -A
  git commit -m "feat(migration): remove vanilla bridge, update context docs (cutover)"
  git checkout main
  git merge --squash migration/svelte-typescript
  git commit -m "feat: migrate to Svelte 5 + TypeScript

  Big-bang migration of QuranAtlas from vanilla JS to Svelte 5 (runes) +
  TypeScript (strict). All 185 Playwright journeys preserved as the contract.

  See docs/superpowers/specs/2026-04-19-svelte-typescript-migration-design.md
  for the design and docs/superpowers/plans/2026-04-19-svelte-typescript-migration.md
  for the executed plan."
  ```
  (Confirm with user before merging to main per CLAUDE.md / repo workflow.)

- [ ] **Step 13.10 — Delete the migration branch.**
  ```bash
  git branch -D migration/svelte-typescript
  ```

- [ ] **Step 13.11 — Delete this plan file** per the "Plan lifecycle" memory (completed plans deleted, not archived; lasting record is in code + git + `docs/context/`).
  ```bash
  rm docs/superpowers/plans/2026-04-19-svelte-typescript-migration.md
  git add -A && git commit -m "chore: delete completed migration plan"
  ```

---

## Self-review

Spec coverage check:

- ✅ Foundation phase + tooling (Task 1) → Phase 1 of spec
- ✅ Core/data/safety/a11y → TS (Task 2) → spec doesn't enumerate, but required by everything below
- ✅ State runes — flat + class (Task 3) → spec "State primitive" decision
- ✅ Vertical slice — About (Task 4) → spec Phase 2
- ✅ Parallel surface ports — 7 surfaces (Tasks 5-11) → spec Phase 3
- ✅ Bus split (Task 12) → spec Phase 4 + spec "Event bus" decision
- ✅ Cutover + docs (Task 13) → spec Phase 5
- ✅ Service worker untouched → Tasks 1, 2 explicitly skip `src/sw.js`, `src/sw-handlers.js`, `src/offline/*`
- ✅ Hash router stays as plain TS module → Task 2.4 ports without behavior change
- ✅ Strict TS from day one → Task 1.3 `tsconfig.json` `"strict": true`
- ✅ Hybrid CSS — tokens stay, surface styles co-locate → every surface task cuts `qa-<surface>-*` selectors
- ✅ E2E as contract — DOM-coupled unit tests deleted → every surface task explicitly deletes
- ✅ Sole-writer Rule 5 preserved → Tasks 4.1 (marks/store), 5.1 (reader/position), 6.1 (review/state) flagged
- ✅ Long-press Rule 4 preserved → Task 7.1 single action, no contextual menu primitive

Plan-level checks:
- No "TBD" / "TODO" / "implement later" placeholders.
- Each task's verification step has the exact `pnpm` command to run.
- Each task ends with a commit step with conventional message.
- Phase 5 task contract is repeated in the coordinator section so subagents reading any single task get the contract verbatim.
- Type names and method names used across tasks (`StoreRecords`, `ReaderState`, `setPosition`, `EventPayloads`, `mountVanilla`) are all defined in the task that introduces them.
