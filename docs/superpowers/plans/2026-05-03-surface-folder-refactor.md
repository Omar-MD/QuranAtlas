# Surface Folder Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename and reorganize source and test folders so the repo structure directly matches the smallest documented QuranAtlas surface clusters.

**Architecture:** The refactor makes dossier names the canonical top-level app folders: `read`, `mark`, `review`, `navigate`, `listen`, `configure`, `onboard`, and `infra`. Cross-cutting support remains outside surfaces in `core`, `data`, `styles`, and `a11y`; future data lanes stay under `data` until they become user-visible surfaces.

**Tech Stack:** Svelte 5, TypeScript, Vite, vite-plugin-pwa injectManifest, Vitest, Playwright, repo docs generation via `pnpm run docs`.

---

## Current Constraints

- Preserve behavior. This is a structure refactor, not a feature change.
- Keep existing user changes. At plan time, `AGENTS.md`, `public/dataset/manifest.json`, and `public/dataset/provenance.json` are already modified; do not revert or stage them unless the user explicitly includes them.
- Use `git mv` for tracked file moves so history is retained.
- Do not create durable one-off migration scripts. Use shell commands or temporary `.scratch/` notes only.
- Generated docs blocks are owned by `pnpm run docs`; update dossier frontmatter/manual prose first, then regenerate.
- After source and tests are moved, `pnpm validate` is the final gate because this touches imports, build, generated docs, and cross-surface tests.

## Target Source Layout

```text
src/
  App.svelte
  app.ts
  app-bootstrap.ts
  a11y/
  core/
  data/
  styles/

  read/
  mark/
    tag/
  review/
  navigate/
    bookmarks/
    surahs/
  listen/
  configure/
    about/
  onboard/
  infra/
    offline/
    safety/
    service-worker/
      sw.js
      sw-handlers.js
    sw/
      route-defs.ts
      strategies.ts
```

## Target Unit Test Layout

```text
tests/unit/
  core/
  data/
  styles/
  scripts/
  perf/

  read/
  mark/
    tag/
  review/
  navigate/
    bookmarks/
    surahs/
  listen/
  configure/
    about/
  onboard/
  infra/
    offline/
    safety/
    sw/
    service-worker/
```

## Target E2E Layout

```text
tests/e2e/
  AGENTS.md
  global-setup.ts
  fixtures/
  .auth/

  onboard/
    first-run.spec.js
    session-restore.spec.js
  read/
    chrome.spec.js
    cross-surah.spec.js
    text-sources.spec.js
    virtualiser.spec.js
    performance.spec.js
  mark/
    tag-sheet.spec.js
  review/
    hub.spec.js
    fvr.spec.js
  navigate/
    command-sheet.spec.js
    surahs.spec.js
    drawer.spec.js
  configure/
    settings.spec.js
    typography.spec.js
    night-mode.spec.js
    about.spec.js
  infra/
    offline.spec.js
    cross-tab.spec.js
    service-worker.spec.js
```

No `listen/audio.spec.js` is created in this refactor because no current audio e2e file exists. The listen dossier should point to `tests/e2e/listen/*.spec.js` as the future location.

## Rename Map

### Source

| Current | Target |
| --- | --- |
| src/reader/** | `src/read/**` |
| src/marks/** | `src/mark/**` |
| src/tag/** | `src/mark/tag/**` |
| src/review/** | `src/review/**` |
| src/nav/** | `src/navigate/**` |
| src/bookmarks/** | `src/navigate/bookmarks/**` |
| src/surahs/** | `src/navigate/surahs/**` |
| src/audio/** | `src/listen/**` |
| src/settings/** | `src/configure/**` |
| src/about/** | `src/configure/about/**` |
| src/onboarding/** | `src/onboard/**` |
| src/offline/** | `src/infra/offline/**` |
| src/safety/** | `src/infra/safety/**` |
| src/core/sw/** | `src/infra/sw/**` |
| src/sw.js | `src/infra/service-worker/sw.js` |
| src/sw-handlers.js | `src/infra/service-worker/sw-handlers.js` |

### E2E

| Current | Target |
| --- | --- |
| tests/e2e/journey-a-onboarding.spec.js | `tests/e2e/onboard/first-run.spec.js`, `tests/e2e/onboard/session-restore.spec.js` |
| tests/e2e/journey-b-reader.spec.js | `tests/e2e/read/chrome.spec.js`, `tests/e2e/read/cross-surah.spec.js`, `tests/e2e/read/text-sources.spec.js`, `tests/e2e/read/virtualiser.spec.js` |
| tests/e2e/performance-budgets.spec.js | `tests/e2e/read/performance.spec.js` |
| tests/e2e/journey-c-marking.spec.js | `tests/e2e/mark/tag-sheet.spec.js` |
| tests/e2e/journey-d-settings.spec.js | `tests/e2e/configure/settings.spec.js`, `tests/e2e/configure/typography.spec.js`, `tests/e2e/configure/night-mode.spec.js` |
| tests/e2e/journey-g-about.spec.js | `tests/e2e/configure/about.spec.js` |
| tests/e2e/journey-e-review.spec.js | `tests/e2e/review/hub.spec.js`, `tests/e2e/review/fvr.spec.js` |
| tests/e2e/journey-f-navigation.spec.js | `tests/e2e/navigate/command-sheet.spec.js`, `tests/e2e/navigate/surahs.spec.js`, `tests/e2e/navigate/drawer.spec.js` |
| tests/e2e/journey-h-offline.spec.js | `tests/e2e/infra/offline.spec.js` |
| tests/e2e/journey-i-cross-tab.spec.js | `tests/e2e/infra/cross-tab.spec.js` |
| tests/e2e/sw-integration.spec.js | `tests/e2e/infra/service-worker.spec.js` |

---

### Task 1: Baseline Snapshot

**Files:**
- Read: `git status --short`
- Read: `package.json`
- Read: `docs/context/surfaces/*.md`

- [ ] **Step 1: Confirm worktree state**

Run:

```bash
git status --short
```

Expected: existing user changes may include `AGENTS.md`, `public/dataset/manifest.json`, `public/dataset/provenance.json`, and `docs/superpowers/**`. Do not revert them.

- [ ] **Step 2: Confirm verification commands exist**

Run:

```bash
node -e "const p=require('./package.json'); console.log(Object.keys(p.scripts).sort().join('\n'))"
```

Expected: output includes `check`, `docs`, `docs:check`, `test`, `test:e2e`, and `validate`.

- [ ] **Step 3: Capture current e2e inventory**

Run:

```bash
find tests/e2e -maxdepth 2 -type f -name '*.spec.js' | sort
```

Expected: current journey files are still present before Task 7.

---

### Task 2: Move Source Folders

**Files:**
- Move source folders listed in the Source rename map.

- [ ] **Step 1: Create infra container**

Run:

```bash
mkdir -p src/infra
```

Expected: `src/infra` exists.

- [ ] **Step 2: Rename surface folders with `git mv`**

Run:

```bash
git mv src/reader src/read
git mv src/marks src/mark
git mv src/tag src/mark/tag
git mv src/nav src/navigate
git mv src/bookmarks src/navigate/bookmarks
git mv src/surahs src/navigate/surahs
git mv src/audio src/listen
git mv src/settings src/configure
git mv src/about src/configure/about
git mv src/onboarding src/onboard
git mv src/offline src/infra/offline
git mv src/safety src/infra/safety
git mv src/core/sw src/infra/sw
mkdir -p src/infra/service-worker
git mv src/sw.js src/infra/service-worker/sw.js
git mv src/sw-handlers.js src/infra/service-worker/sw-handlers.js
```

Expected: the old top-level surface folders no longer exist except `src/review`; new dossier-named folders exist.

- [ ] **Step 3: Confirm source folder shape**

Run:

```bash
find src -maxdepth 2 -type d | sort
```

Expected includes `src/read`, `src/mark`, `src/mark/tag`, `src/navigate`, `src/navigate/bookmarks`, `src/navigate/surahs`, `src/listen`, `src/configure`, `src/configure/about`, `src/onboard`, `src/infra`, `src/infra/offline`, `src/infra/safety`, `src/infra/service-worker`, and `src/infra/sw`.

---

### Task 3: Update Source Imports and Runtime Config

**Files:**
- Modify: all moved `src/**/*.{ts,js,svelte}`
- Modify: `vite.config.js`
- Modify: `eslint.config.js`
- Modify: `tsconfig.json`
- Modify: `scripts/check-no-feature-state.js`

- [ ] **Step 1: Run a coarse stale path scan**

Run:

```bash
rg -n "src/(reader|marks|tag|nav|bookmarks|surahs|audio|settings|about|onboarding|offline|safety|sw\\.js|sw-handlers|core/sw)|\\.\\./(reader|marks|tag|nav|bookmarks|surahs|audio|settings|about|onboarding|offline|safety|core/sw)" src vite.config.js eslint.config.js tsconfig.json scripts/check-no-feature-state.js
```

Expected: many hits before path updates.

- [ ] **Step 2: Apply top-level import renames outside nested moved folders**

Run:

```bash
perl -pi -e "s#(['\"])\\.\\./reader/#\$1../read/#g; s#(['\"])\\.\\./marks/#\$1../mark/#g; s#(['\"])\\.\\./nav/#\$1../navigate/#g; s#(['\"])\\.\\./audio/#\$1../listen/#g; s#(['\"])\\.\\./settings/#\$1../configure/#g; s#(['\"])\\.\\./onboarding/#\$1../onboard/#g; s#(['\"])\\.\\./safety/#\$1../infra/safety/#g; s#(['\"])\\.\\./offline/#\$1../infra/offline/#g; s#(['\"])\\.\\./core/sw/#\$1../infra/sw/#g" $(find src -type f \( -name '*.ts' -o -name '*.js' -o -name '*.svelte' \))
```

Expected: direct imports from peer top-level folders use new names.

- [ ] **Step 3: Fix imports inside `src/mark/tag`**

Run:

```bash
perl -pi -e "s#(['\"])\\.\\./mark/#\$1../#g; s#(['\"])\\.\\./tag/#\$1./#g; s#(['\"])\\.\\./core/#\$1../../core/#g; s#(['\"])\\.\\./data/#\$1../../data/#g" $(find src/mark/tag -type f \( -name '*.ts' -o -name '*.js' -o -name '*.svelte' \))
```

Then inspect:

```bash
rg -n "\\.\\./(mark|tag|core|data)" src/mark/tag
```

Expected: no stale `../mark`, `../tag`, `../core`, or `../data` imports remain in `src/mark/tag`.

- [ ] **Step 4: Fix imports inside `src/navigate` nested folders**

Run:

```bash
perl -pi -e "s#(['\"])\\.\\./bookmarks/#\$1./bookmarks/#g; s#(['\"])\\.\\./surahs/#\$1./surahs/#g; s#(['\"])\\.\\./navigate/#\$1./#g" $(find src/navigate -maxdepth 1 -type f \( -name '*.ts' -o -name '*.js' -o -name '*.svelte' \))
perl -pi -e "s#(['\"])\\.\\./core/#\$1../../core/#g; s#(['\"])\\.\\./data/#\$1../../data/#g; s#(['\"])\\.\\./configure/#\$1../../configure/#g; s#(['\"])\\.\\./mark/#\$1../../mark/#g; s#(['\"])\\.\\./read/#\$1../../read/#g; s#(['\"])\\.\\./infra/#\$1../../infra/#g; s#(['\"])\\.\\./bookmarks/#\$1./#g; s#(['\"])\\.\\./surahs/#\$1../surahs/#g" $(find src/navigate/bookmarks -type f \( -name '*.ts' -o -name '*.js' -o -name '*.svelte' \))
perl -pi -e "s#(['\"])\\.\\./core/#\$1../../core/#g; s#(['\"])\\.\\./data/#\$1../../data/#g; s#(['\"])\\.\\./configure/#\$1../../configure/#g; s#(['\"])\\.\\./mark/#\$1../../mark/#g; s#(['\"])\\.\\./read/#\$1../../read/#g; s#(['\"])\\.\\./bookmarks/#\$1../bookmarks/#g; s#(['\"])\\.\\./surahs/#\$1./#g" $(find src/navigate/surahs -type f \( -name '*.ts' -o -name '*.js' -o -name '*.svelte' \))
```

Expected: nested navigation folders import shared roots with `../../` and sibling folders with `../` or `./`.

- [ ] **Step 5: Fix imports inside `src/configure/about`**

Run:

```bash
perl -pi -e "s#(['\"])\\.\\./configure/#\$1../#g; s#(['\"])\\.\\./mark/#\$1../../mark/#g; s#(['\"])\\.\\./core/#\$1../../core/#g; s#(['\"])\\.\\./a11y/#\$1../../a11y/#g" $(find src/configure/about -type f \( -name '*.ts' -o -name '*.js' -o -name '*.svelte' \))
```

Expected: about files import configure siblings with `../` and app roots with `../../`.

- [ ] **Step 6: Fix imports inside infra folders**

Run:

```bash
perl -pi -e "s#(['\"])\\.\\./core/#\$1../../core/#g; s#(['\"])\\.\\./data/#\$1../../data/#g; s#(['\"])\\.\\./configure/#\$1../../configure/#g; s#(['\"])\\.\\./infra/#\$1../#g; s#(['\"])\\.\\./infra/sw/#\$1../sw/#g" $(find src/infra/offline src/infra/safety -type f \( -name '*.ts' -o -name '*.js' -o -name '*.svelte' \))
perl -pi -e "s#(['\"])\\.\\./constants#\$1../../core/constants#g" src/infra/sw/route-defs.ts
perl -pi -e "s#(['\"])\\./core/constants#\$1../../core/constants#g; s#(['\"])\\./core/sw/#\$1../sw/#g; s#(['\"])\\./offline/#\$1../offline/#g" src/infra/service-worker/sw.js
```

Expected: service worker entry imports `../../core/constants.js`, `../sw/strategies`, `../sw/route-defs`, and `../offline/*`.

- [ ] **Step 7: Update `vite.config.js`**

Change the PWA block to:

```js
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src/infra/service-worker',
  filename: 'sw.js',
  registerType: 'prompt',
  injectRegister: false,
```

Change manual chunk names to surface names:

```js
manualChunks(id) {
  if (id.includes('src/mark/')) { return 'mark' }
  if (id.includes('src/configure/about/About.svelte') || id.includes('src/configure/about/pwa-install')) { return 'configure-about' }
}
```

Update nearby comments so they reference `src/infra/service-worker/sw.js`, `src/infra/service-worker/sw-handlers.js`, and `src/listen` or `src/read` only when accurate.

- [ ] **Step 8: Update lint/type exclusions**

In `eslint.config.js`, replace ignores with:

```js
ignores: [
  'dist/**',
  'node_modules/**',
  'src/infra/service-worker/**',
  'src/infra/offline/**',
]
```

In `tsconfig.json`, replace `exclude` with:

```json
"exclude": ["src/infra/service-worker/**", "src/infra/offline/**", "node_modules"]
```

- [ ] **Step 9: Update top-level mutable-state guard**

In `scripts/check-no-feature-state.js`, update allow-list paths:

```js
const ALLOW_LIST = new Set([
  'src/navigate/reader-actions.js',
  'src/navigate/shortcuts-sheet.js',
])
const SKIP_DIRS = new Set(['state', 'core', 'offline', 'service-worker'])
const SKIP_FILES = new Set(['sw.js', 'sw-handlers.js'])
```

Remove allow-list entries for TypeScript files and files that do not exist after the move, such as `src/configure/about/pwa-install.ts`, `src/infra/safety/sync.ts`, `src/a11y/announcer.ts`, and the older navigate-layer command helpers that no longer exist as standalone files. The script scans only `.js` files, so TypeScript paths in this allow-list are stale configuration rather than active exceptions.

- [ ] **Step 10: Stale source path scan**

Run:

```bash
rg -n "src/(reader|marks|tag|nav|bookmarks|surahs|audio|settings|about|onboarding|offline|safety|sw\\.js|sw-handlers|core/sw)|\\.\\./(reader|marks|tag|nav|bookmarks|surahs|audio|settings|about|onboarding|offline|safety|core/sw)" src vite.config.js eslint.config.js tsconfig.json scripts/check-no-feature-state.js
```

Expected: no stale hits except explanatory text that has already been intentionally updated or removed.

- [ ] **Step 11: Run type/lint gate before tests**

Run:

```bash
pnpm run check
```

Expected: passes. If it fails on unresolved imports, fix the exact import paths and rerun this command.

---

### Task 4: Move Unit Tests and Update Test Imports

**Files:**
- Move: `tests/unit/**`
- Modify: imports inside moved unit tests

- [ ] **Step 1: Move unit-test folders**

Run:

```bash
git mv tests/unit/reader tests/unit/read
git mv tests/unit/audio tests/unit/listen
git mv tests/unit/marks tests/unit/mark
git mv tests/unit/tag tests/unit/mark/tag
git mv tests/unit/nav tests/unit/navigate
git mv tests/unit/bookmarks tests/unit/navigate/bookmarks
git mv tests/unit/surahs tests/unit/navigate/surahs
git mv tests/unit/settings tests/unit/configure
git mv tests/unit/about tests/unit/configure/about
git mv tests/unit/onboarding tests/unit/onboard
mkdir -p tests/unit/infra
git mv tests/unit/offline tests/unit/infra/offline
git mv tests/unit/safety tests/unit/infra/safety
git mv tests/unit/sw tests/unit/infra/sw
mkdir -p tests/unit/infra/service-worker
git mv tests/unit/sw.test.js tests/unit/infra/service-worker/sw.test.js
git mv tests/unit/sw-handlers.test.js tests/unit/infra/service-worker/sw-handlers.test.js
```

Expected: old surface test folders no longer exist; target unit layout exists.

- [ ] **Step 2: Rewrite `src` imports in unit tests**

Run:

```bash
perl -pi -e "s#../../src/reader/#../../src/read/#g; s#../../src/marks/#../../src/mark/#g; s#../../src/tag/#../../src/mark/tag/#g; s#../../src/nav/#../../src/navigate/#g; s#../../src/bookmarks/#../../src/navigate/bookmarks/#g; s#../../src/surahs/#../../src/navigate/surahs/#g; s#../../src/audio/#../../src/listen/#g; s#../../src/settings/#../../src/configure/#g; s#../../src/about/#../../src/configure/about/#g; s#../../src/onboarding/#../../src/onboard/#g; s#../../src/offline/#../../src/infra/offline/#g; s#../../src/safety/#../../src/infra/safety/#g; s#../../src/core/sw/#../../src/infra/sw/#g; s#../../src/sw\\.js#../../src/infra/service-worker/sw.js#g; s#../../src/sw-handlers\\.js#../../src/infra/service-worker/sw-handlers.js#g" $(find tests/unit -type f \( -name '*.ts' -o -name '*.js' \))
perl -pi -e "s#../../../src/reader/#../../../src/read/#g; s#../../../src/marks/#../../../src/mark/#g; s#../../../src/tag/#../../../src/mark/tag/#g; s#../../../src/nav/#../../../src/navigate/#g; s#../../../src/bookmarks/#../../../src/navigate/bookmarks/#g; s#../../../src/surahs/#../../../src/navigate/surahs/#g; s#../../../src/audio/#../../../src/listen/#g; s#../../../src/settings/#../../../src/configure/#g; s#../../../src/about/#../../../src/configure/about/#g; s#../../../src/onboarding/#../../../src/onboard/#g; s#../../../src/offline/#../../../src/infra/offline/#g; s#../../../src/safety/#../../../src/infra/safety/#g; s#../../../src/core/sw/#../../../src/infra/sw/#g; s#../../../src/sw\\.js#../../../src/infra/service-worker/sw.js#g; s#../../../src/sw-handlers\\.js#../../../src/infra/service-worker/sw-handlers.js#g" $(find tests/unit -type f \( -name '*.ts' -o -name '*.js' \))
```

Expected: imports point to new `src` locations.

- [ ] **Step 3: Fix relative import depth in newly nested test folders**

Run:

```bash
rg -n "from ['\"]\\.\\./\\.\\./src|import\\(['\"]\\.\\./\\.\\./src" tests/unit/mark/tag tests/unit/navigate/bookmarks tests/unit/navigate/surahs tests/unit/configure/about tests/unit/infra
```

Expected: hits in nested folders need one more `../`. Update those imports so:

```text
tests/unit/mark/tag/*             -> ../../../src/mark/tag/*
tests/unit/navigate/bookmarks/*   -> ../../../src/navigate/bookmarks/*
tests/unit/navigate/surahs/*      -> ../../../src/navigate/surahs/*
tests/unit/configure/about/*      -> ../../../src/configure/about/*
tests/unit/infra/offline/*        -> ../../../src/infra/offline/*
tests/unit/infra/safety/*         -> ../../../src/infra/safety/*
tests/unit/infra/sw/*             -> ../../../src/infra/sw/*
tests/unit/infra/service-worker/* -> ../../../src/infra/service-worker/*
```

- [ ] **Step 4: Run unit tests**

Run:

```bash
pnpm run test
```

Expected: passes. If a test fails because a mock path still points to an old source path, update the mock path and rerun.

---

### Task 5: Split and Rename E2E Tests

**Files:**
- Move/split: `tests/e2e/*.spec.js`
- Keep: `tests/e2e/fixtures/**`
- Keep: `tests/e2e/global-setup.ts`

- [ ] **Step 1: Create e2e surface folders**

Run:

```bash
mkdir -p tests/e2e/onboard tests/e2e/read tests/e2e/mark tests/e2e/review tests/e2e/navigate tests/e2e/configure tests/e2e/infra
```

Expected: target folders exist.

- [ ] **Step 2: Split onboarding tests**

Create `tests/e2e/onboard/first-run.spec.js` from `journey-a-onboarding.spec.js` with:

```text
A1: first-run onboarding -> Al-Fatihah (happy path)
A1: alt path - Skip from screen 2 lands on #/s/1
A1: alt path - Skip from screen 3 lands on #/s/1
A1: alt path - Browse all surahs from screen 4 opens drawer (mobile) or surah list (desktop) @mobile
A1: a11y - no serious/critical axe violations on screen 1 @a11y
A1: a11y - no serious/critical axe violations on screen 2 (Theme) @a11y
A1: keyboard-only walk through onboarding @keyboard
A1: onboarding screen 3 - Choose Riwayah, Qaloon default
A1 desktop: onboarding wordmark and container scale up
A4 desktop: shortcuts screen renders 2-col
```

Create `tests/e2e/onboard/session-restore.spec.js` with:

```text
A2: reload stays on the last surface
A2: reload restores reader surface (e.g. #/s/2)
A2: a11y - no serious/critical axe violations on reader after onboarding @a11y
```

Preserve helper functions used by both files by duplicating small helpers or moving shared helpers into the `tests/e2e/fixtures/` folder only if the same helper is needed by both files.

- [ ] **Step 3: Split reader tests**

Create `tests/e2e/read/chrome.spec.js` with:

```text
B1: primary-nav chrome is visible on reader surface @mobile
B1: mobile margin header is a single row, <= 60 px tall (post-redesign) @mobile
B1: primary nav visible under @reduced-motion @mobile
B1: primary-nav is keyboard-focusable @keyboard @mobile
B2: scroll behavior matches viewport (rail always / header auto-hide) @mobile
B3: tap verse number shows edge indicators on both sides
B3: verse meaning and theme stay collapsed until the verse is opened
B4: non-reader routes keep primary nav visible @mobile
B6: auto theme swatch follows OS color-scheme change
B7: warm-resume (visibilitychange hidden->visible) preserves scroll position
B: a11y - no serious/critical axe violations on reader surface @a11y
```

Create `tests/e2e/read/cross-surah.spec.js` with:

```text
B-Cross1: end-of-surah Continue link swaps to next surah
B-Cross2: top-of-surah Continue link swaps to previous surah
B-Cross3: forward wrap - Surah 114 Continue link -> Surah 1
B-Cross4: backward wrap - Surah 1 Continue link -> Surah 114
B-Cross-arrow: continue link is a single-line arrow + italic title (~22px tall)
B-Cross5: settings.currentPosition is overwritten on swap
```

Create `tests/e2e/read/text-sources.spec.js` with:

```text
B-Riwayah1: reader defaults to Qaloon - data-riwayah + Maghrebi orthography
B-Riwayah2: switching Riwayah to Hafs updates html[data-riwayah] and reloads text
B-Translation: shipped translation renders; footnote disclosure works when markers are present
```

Create `tests/e2e/read/virtualiser.spec.js` with:

```text
B-Virt1: virtualiser caps live verses at <=60 (memory ceiling) @mobile
B-Virt2: deep-link to mid-surah verse materialises target chunk
B-Virt3: reload restores scroll position through virtualiser
```

Move `performance-budgets.spec.js` to `tests/e2e/read/performance.spec.js`.

- [ ] **Step 4: Split mark tests**

Create `tests/e2e/mark/tag-sheet.spec.js` with:

```text
C1: double-tap verse opens TagSheet (via fullscreen button) with correct structure
C1: right-click also opens TagSheet (no native context menu)
C1: a11y - no serious/critical axe violations on open TagSheet @a11y
C4: select tag, type note, Save -> mark written to IDB -> gold edge on verse
C5: delete mark -> undo toast appears -> tap Undo restores mark
C5: undo toast auto-dismisses after ~5s without undo @reduced-motion
C7: select threads + audience tags, save, reopen, assert draft restored
C1 desktop: TagSheet is a right-side panel, full-height
C1 desktop: four group sections visible
```

- [ ] **Step 5: Split review tests**

Create `tests/e2e/review/hub.spec.js` with:

```text
E1: hub renders layer segment, group-by segment, sort dropdown, surah filter, and mark cards
E1: a11y - no serious/critical axe violations on review hub @a11y
E2: surah grouping - mark for 1:1 and 2:255 both visible after switching to Surah tab
E5: tap value + surah filter -> intersection narrows card count to 1
E1 desktop: review hub renders 220px left rail + layer selector in rail
E1 desktop: clicking a layer row in the rail switches active layer
E2 desktop: multi-tagged mark renders exactly once
E2 desktop: card list is single-column
E2b desktop: multi-value OR filter + chip bar + clear all
```

Create `tests/e2e/review/fvr.spec.js` with:

```text
E3: tap a tag chip on a mark card -> navigates to #/threads/<tag> -> FVR renders correctly
E3: a11y - no serious/critical axe violations on FVR view @a11y
E4: tap back to Marks -> navigates back to #/review
E6: navigate to #/threads/mercy directly -> FVR renders correct layer label + value
E6: lastSurface persists #/threads/<tag> for session restore
E3 desktop: FVR via #/threads/:value -> layout is centered at 1000px max-width
```

- [ ] **Step 6: Split navigation tests**

Create `tests/e2e/navigate/command-sheet.spec.js` with:

```text
F1: command sheet type 2:255 -> verse preview card appears -> Enter navigates to #/s/2/255
F1: a11y - no serious/critical axe violations on open command sheet with verse preview @a11y
F2: verse preview -> ArrowDown to Mark this verse -> Enter opens fast-tag panel
F3: type mer -> Tags group shows mercy with count badge -> Enter -> #/threads/mercy FVR
```

Create `tests/e2e/navigate/surahs.spec.js` with:

```text
F4: Search entry -> #/surahs renders 114 rows; search 67 -> eyebrow + Al-Mulk row
F4: a11y - no serious/critical axe violations on surah list @a11y
F5: after visiting #/s/67, surah list shows continue-reading card at top; tap navigates
F5: continue-reading card is hidden when search query is active
F4 desktop: surah list renders as 2-col grid
```

Create `tests/e2e/navigate/drawer.spec.js` with:

```text
F-mobile-1: hamburger opens drawer with Read tab + Surahs sub-tab default and current-surah highlighted @mobile
F-mobile-2: tapping layer row in Study tab routes to #/review?layer=<name> @mobile
F-mobile-3: wordmark in drawer routes to #/about @mobile
F-mobile-4: typing #/surahs on mobile redirects + opens drawer @mobile
F-mobile-5: center label tap toggles surah-header visibility (no nav, no drawer) @mobile
```

- [ ] **Step 7: Split configure tests**

Create `tests/e2e/configure/settings.spec.js` with:

```text
D1: a11y - no serious/critical axe violations on open Settings sheet @a11y
D3-bg theme variants: html bg + theme-color meta match --qa-surface-app
D4: Clear data -> type DELETE -> confirm -> page reloads -> onboarding restarts
D7: double-tap gear cycles theme; settings sheet stays closed @mobile
D7: single tap on gear opens settings (does not cycle theme) @mobile
```

Create `tests/e2e/configure/typography.spec.js` with:

```text
D1 desktop: typography preview scales when font-size slider moves
D5: reading-flow xl drives a higher line-height on .qa-verse-arabic than xs
D5: reading-flow xs sets word-spacing to 0 on .qa-verse-arabic
D5: reading-flow xl narrows #main-content max-width
```

Create `tests/e2e/configure/night-mode.spec.js` with:

```text
D6: settings switch toggles data-night-mode + overlay opacity
D6: pressing n on reader toggles night mode @keyboard
```

Create `tests/e2e/configure/about.spec.js` from all `journey-g-about.spec.js` tests.

- [ ] **Step 8: Move infra e2e tests**

Run:

```bash
git mv tests/e2e/journey-h-offline.spec.js tests/e2e/infra/offline.spec.js
git mv tests/e2e/journey-i-cross-tab.spec.js tests/e2e/infra/cross-tab.spec.js
git mv tests/e2e/sw-integration.spec.js tests/e2e/infra/service-worker.spec.js
```

Expected: infra browser-only tests sit under `tests/e2e/infra`.

- [ ] **Step 9: Remove old journey files after split**

Run:

```bash
find tests/e2e -maxdepth 1 -type f -name 'journey-*.spec.js' -print
```

Expected: no output. If any journey file remains, its tests must be assigned to one of the target surface spec files before deletion.

- [ ] **Step 10: Update e2e comments and source path references**

Run:

```bash
rg -n "journey-[a-z]-|src/(reader|marks|tag|nav|bookmarks|surahs|audio|settings|about|onboarding|offline|safety|sw\\.js|sw-handlers|core/sw)" tests/e2e
```

Expected: no stale source paths or old journey filename references remain. Update comments only to current paths.

- [ ] **Step 11: Run representative e2e slices**

Run:

```bash
pnpm exec playwright test tests/e2e/read/chrome.spec.js tests/e2e/mark/tag-sheet.spec.js tests/e2e/navigate/command-sheet.spec.js tests/e2e/configure/settings.spec.js --reporter=line
```

Expected: passes under the default dev-server projects.

- [ ] **Step 12: Run offline e2e slices**

Run:

```bash
PLAYWRIGHT_INCLUDE_OFFLINE=1 pnpm exec playwright test tests/e2e/infra/offline.spec.js tests/e2e/infra/service-worker.spec.js --project="Offline (Preview)" --reporter=line
```

Expected: passes against preview build.

---

### Task 6: Update Dossiers and Context Docs

**Files:**
- Modify: `docs/context/surfaces/read.md`
- Modify: `docs/context/surfaces/mark.md`
- Modify: `docs/context/surfaces/review.md`
- Modify: `docs/context/surfaces/navigate.md`
- Modify: `docs/context/surfaces/listen.md`
- Modify: `docs/context/surfaces/configure.md`
- Modify: `docs/context/surfaces/onboard.md`
- Modify: `docs/context/surfaces/infra.md`
- Modify: `docs/workflow/cluster-by-surface.md`
- Modify: `docs/context/repo-structure.md`
- Modify: `docs/context/architecture.md`
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Update dossier frontmatter `src_paths`**

Use this exact mapping:

```yaml
read:
  - 'src/read/**'
mark:
  - 'src/mark/**'
review:
  - 'src/review/**'
navigate:
  - 'src/navigate/**'
listen:
  - 'src/listen/**'
configure:
  - 'src/configure/**'
onboard:
  - 'src/onboard/**'
infra:
  - 'src/infra/**'
```

- [ ] **Step 2: Update dossier frontmatter `test_paths`**

Use this exact mapping:

```yaml
read:
  unit:
    - 'tests/unit/read/**'
    - 'tests/unit/styles/font-tokens.test.js'
  e2e:
    - 'tests/e2e/read/*.spec.js'
mark:
  unit:
    - 'tests/unit/mark/**'
  e2e:
    - 'tests/e2e/mark/*.spec.js'
review:
  unit:
    - 'tests/unit/review/**'
  e2e:
    - 'tests/e2e/review/*.spec.js'
navigate:
  unit:
    - 'tests/unit/navigate/**'
  e2e:
    - 'tests/e2e/navigate/*.spec.js'
listen:
  unit:
    - 'tests/unit/listen/**'
  e2e:
    - 'tests/e2e/listen/*.spec.js'
configure:
  unit:
    - 'tests/unit/configure/**'
  e2e:
    - 'tests/e2e/configure/*.spec.js'
onboard:
  unit:
    - 'tests/unit/onboard/**'
  e2e:
    - 'tests/e2e/onboard/*.spec.js'
infra:
  unit:
    - 'tests/unit/infra/**'
  e2e:
    - 'tests/e2e/infra/*.spec.js'
```

- [ ] **Step 3: Update manual doc prose**

Update current-state prose in:

```text
docs/workflow/cluster-by-surface.md
docs/context/repo-structure.md
docs/context/architecture.md
docs/tech-stack.md
```

Required prose changes:

- Replace the old journey-letter test table with surface-directory test ownership.
- Replace "one journey spec per surface" language with "one surface e2e folder; split files by sub-flow only when the surface file becomes broad."
- Replace `src/<surface>/` examples that use old names with the new dossier names.
- Keep `core`, `data`, `styles`, and `a11y` documented as support roots, not surfaces.
- State that service worker source lives under `src/infra/service-worker/` while the emitted runtime URL remains `/sw.js`.
- Update the route table modules: `read/Reader.svelte`, `review/Hub.svelte`, `navigate/surahs/SurahList.svelte`, `configure/about/About.svelte`, `onboard/Onboarding.svelte`.

- [ ] **Step 4: Regenerate context inventories**

Run:

```bash
pnpm run docs
```

Expected: generated sections in `docs/context/events.md`, `docs/context/feature-map.md`, `docs/context/module-graph.md`, and dossier inventory blocks update to new paths.

- [ ] **Step 5: Check docs**

Run:

```bash
pnpm run docs:check
```

Expected: passes.

---

### Task 7: Update Remaining Repo References

**Files:**
- Modify: `docs/context/source-data-flow.md`
- Modify: `docs/context/data-model.md`
- Modify: `docs/context/csp-allowlist.md` only if it mentions source path rather than emitted `/sw.js`
- Modify: `docs/context/roadmap.md`
- Modify: `public/_headers` only if comments mention `sw-handlers.js`
- Modify: any tests or docs found by the stale scan

- [ ] **Step 1: Run full stale reference scan**

Run:

```bash
rg -n "src/(reader|marks|tag|nav|bookmarks|surahs|audio|settings|about|onboarding|offline|safety|sw\\.js|sw-handlers|core/sw)|tests/e2e/journey-[a-z]-|journey-[a-z]-" . --glob '!node_modules/**' --glob '!dist/**' --glob '!test-output/**' --glob '!pnpm-lock.yaml'
```

Expected: only old references in historical `.scratch/refactor/**` notes may remain. Update all source, test, and docs references outside `.scratch/`.

- [ ] **Step 2: Update route and service worker source comments**

Specific required replacements:

```text
src/sw.js                         -> src/infra/service-worker/sw.js
src/sw-handlers.js                -> src/infra/service-worker/sw-handlers.js
src/core/sw/route-defs.ts         -> src/infra/sw/route-defs.ts
src/core/sw/strategies.ts         -> src/infra/sw/strategies.ts
src/data/knowledge-dataset.ts     -> keep unchanged
src/data/dataset.ts               -> keep unchanged
```

- [ ] **Step 3: Re-run stale reference scan**

Run:

```bash
rg -n "src/(reader|marks|tag|nav|bookmarks|surahs|audio|settings|about|onboarding|offline|safety|sw\\.js|sw-handlers|core/sw)|tests/e2e/journey-[a-z]-|journey-[a-z]-" . --glob '!node_modules/**' --glob '!dist/**' --glob '!test-output/**' --glob '!pnpm-lock.yaml' --glob '!.scratch/**'
```

Expected: no output.

---

### Task 8: Final Verification

**Files:**
- Verify whole repo.

- [ ] **Step 1: Run source checks**

Run:

```bash
pnpm run check
```

Expected: passes with no warnings treated as acceptable noise.

- [ ] **Step 2: Run unit tests**

Run:

```bash
pnpm run test
```

Expected: passes.

- [ ] **Step 3: Run build**

Run:

```bash
pnpm run build
```

Expected: passes and emits service worker from `src/infra/service-worker/sw.js` to `dist/sw.js`.

- [ ] **Step 4: Run docs check**

Run:

```bash
pnpm run docs:check
```

Expected: passes.

- [ ] **Step 5: Run full validation**

Run:

```bash
pnpm validate
```

Expected: passes.

- [ ] **Step 6: Run targeted e2e batch**

Run:

```bash
pnpm exec playwright test tests/e2e/onboard tests/e2e/read tests/e2e/mark tests/e2e/review tests/e2e/navigate tests/e2e/configure --reporter=line
```

Expected: passes under dev-server projects.

- [ ] **Step 7: Run offline e2e batch**

Run:

```bash
PLAYWRIGHT_INCLUDE_OFFLINE=1 pnpm exec playwright test tests/e2e/infra --project="Offline (Preview)" --reporter=line
```

Expected: passes under preview server.

---

### Task 9: Commit Structure

**Files:**
- Stage only files touched by this refactor.

- [ ] **Step 1: Inspect status**

Run:

```bash
git status --short
```

Expected: moved source files, moved tests, updated config, updated docs, and generated docs are shown. Pre-existing unrelated user changes remain visible and must not be staged unless they are part of this refactor.

- [ ] **Step 2: Commit source/config moves**

Run:

```bash
git add src tests/unit vite.config.js eslint.config.js tsconfig.json scripts/check-no-feature-state.js
git commit -m "refactor: align source folders with surface dossiers"
```

Expected: commit succeeds.

- [ ] **Step 3: Commit e2e split**

Run:

```bash
git add tests/e2e
git commit -m "test: split e2e specs by surface"
```

Expected: commit succeeds.

- [ ] **Step 4: Commit docs**

Run:

```bash
git add docs/context docs/workflow docs/tech-stack.md public/_headers
git commit -m "docs: document surface-aligned repo layout"
```

Expected: commit succeeds. If `public/_headers` did not change, omit it from `git add`.

---

## Self-Review Checklist

- [ ] Every documented surface has a matching top-level `src` folder named after the dossier surface, except `review` which already matched.
- [ ] `src/core` has no `sw` subfolder after the move.
- [ ] `src/infra/service-worker/sw.js` still emits to runtime `/sw.js`.
- [ ] No e2e file remains directly under `tests/e2e` except `AGENTS.md`, `global-setup.ts`, fixture directories, and auth state directories.
- [ ] No `journey-*.spec.js` file remains.
- [ ] No source, test, or docs reference outside `.scratch` points to old folder names.
- [ ] Generated docs were updated by `pnpm run docs`, not hand-edited inside generated fence blocks.
- [ ] Final `pnpm validate` and targeted Playwright batches passed before claiming completion.
