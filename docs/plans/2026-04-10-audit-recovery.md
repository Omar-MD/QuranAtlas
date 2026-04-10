# Audit Recovery + Skill Update + Docs Cleanup

**Date:** 2026-04-10
**Source:** [2026-04-10-product-health-report.md](../audit/2026-04-10-product-health-report.md)
**Commit:** 3131ece

---

## Scope

Resolves audit findings P2 #1–#3, #5–#7, #15 and P3 #1–#3. Updates the product-audit skill to 6 dimensions. Rewrites product docs to remove phase model.

**Excluded from this plan:**
- All testability findings (P2 #10–#14) — separate plan: [testing-overhaul.md](testing-overhaul.md)
- P2 #4 (resume indicator CSS) — false finding, verified no `top` positioning exists
- P2 #8 (loadVerseContentBackground .catch) — already has `.catch()` at all call sites
- P2 #9 (Phase 4 TODO markers) — enhancement, not a defect
- P2 #16 (degraded-mode UI) — enhancement, not a defect
- P3 #4 (font-display:swap) — no external fonts in use
- P3 #5 (dataset update UX) — enhancement, not a defect

---

## Batch 1: Nav Filter Performance + Keyboard

**Files:** `src/nav/index.js`
**Findings:** P2 #1, P2 #3, P3 #2

### Changes

1. **Add inline debounce function** at module top:
   ```js
   function debounce(fn, ms) {
     let id
     return (...args) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms) }
   }
   ```

2. **Cache item references at render time.** After rendering the surah list, build a cached array:
   ```js
   let cachedItems = [] // [{ el, surahNum, name, arabic }]
   ```
   Populate after `renderNavPanel()` creates the `<li>` elements — extract `data-surah`, `.qa-nav-item-name` text, and `.qa-nav-item-arabic` text once. Store alongside the DOM element reference.

3. **Wrap `filterSurahList` calls with 150ms debounce:**
   ```js
   const debouncedFilter = debounce(filterSurahList, 150)
   searchInput.addEventListener('input', () => {
     debouncedFilter(searchInput.value)
     searchInput.removeAttribute('aria-invalid')
   })
   ```

4. **Rewrite `filterSurahList()`** to iterate `cachedItems` instead of `document.querySelectorAll`. No DOM reads inside the loop — only `setAttribute('hidden', '')` / `removeAttribute('hidden')` writes:
   ```js
   function filterSurahList(query) {
     const q = query.toLowerCase().trim()
     let shown = 0
     for (const { el, surahNum, name, arabic } of cachedItems) {
       if (!q || surahNum.startsWith(q) || name.includes(q) || arabic.includes(q)) {
         el.removeAttribute('hidden')
         shown++
       } else {
         el.setAttribute('hidden', '')
       }
     }
     announce(`${shown} surahs found`)
   }
   ```

5. **Add Home/End key handlers** in the existing keydown listener alongside ArrowUp/ArrowDown:
   ```js
   if (e.key === 'Home') {
     e.preventDefault()
     const items = cachedItems.filter(i => !i.el.hasAttribute('hidden'))
     if (items.length) items[0].el.focus()
   }
   if (e.key === 'End') {
     e.preventDefault()
     const items = cachedItems.filter(i => !i.el.hasAttribute('hidden'))
     if (items.length) items[items.length - 1].el.focus()
   }
   ```

### Verification
- Search "Al" → filters instantly, no jank on low-end throttle
- Home/End keys jump to first/last visible item
- Existing E2E `navigation-panel.spec.js` still passes

---

## Batch 2: Reader Decomposition + Skeleton Timeout

**Files:** `src/reader/index.js`
**Findings:** P2 #5, P2 #6

### Changes

1. **Change `SKELETON_TIMEOUT_MS`** from `800` to `5000` (line 20). The 800ms target is the performance *goal* for skeleton appearance, not the error cutoff.

2. **Decompose `init()` into 4 sub-functions** with destructured parameter objects. `init()` becomes an orchestrator (~40 lines) that calls:

   **`fetchSurahData({ surahNum, mainContent })`** — returns `{ surah, surahs, surahMeta, translationVisible, savedPosition }` or throws. Handles skeleton display, timeout, guards for navigation during fetch, performance marks.

   **`renderSurahContent({ mainContent, topBar, surah, surahMeta, translationVisible, savedPosition, targetVerse })`** — clears content, renders header, basmala, resume indicator, verse chunks, end marker, top bar controls. Returns void.

   **`setupPositionTracking({ mainContent, surahNum, shouldSavePosition, surah, savedPosition, targetVerse, invalidVerseError })`** — sets up scroll tracking, visibilitychange handler, position re-read on tab visible, scroll-to position/deep-link. Returns array of cleanup functions.

   **`finalize({ surahNum, surahMeta, surah, initIndicators, setupLongPress, mainContent })`** — emits READER_SURAH_LOADED, sets up indicators and long press, performance marks, announcer. Returns cleanup functions for indicators/long press.

3. **`init()` returns a cleanup function** (lifecycle migration — see Batch 4). All module-scoped `let` variables that today require manual nulling in `cleanup()` are collected as unsub handles:
   ```js
   export async function init(params, hooks) {
     // ... validation, early exits ...
     const data = await fetchSurahData({ surahNum, mainContent })
     renderSurahContent({ mainContent, topBar, ...data, targetVerse })
     const trackingCleanups = setupPositionTracking({ mainContent, surahNum, shouldSavePosition, ...data, targetVerse, invalidVerseError })
     const finalCleanups = finalize({ surahNum, surahMeta: data.surahMeta, surah: data.surah, initIndicators, setupLongPress, mainContent })

     return () => {
       clearUndoToast()
       clearUndoRecord()
       trackingCleanups.forEach(fn => fn())
       finalCleanups.forEach(fn => fn())
     }
   }
   ```

4. **Remove the separate `cleanup()` export and `export { cleanup }`** — no longer needed since init returns the cleanup function.

### Verification
- Load surah on throttled 3G — skeleton shows, no false error before 5s
- Navigate between surahs — no listener leaks
- Position saves and restores correctly
- Existing E2E `reader-experience.spec.js`, `position-tracking.spec.js` pass

---

## Batch 3: Review Hub DOM Batching

**Files:** `src/review/hub.js`
**Findings:** P2 #2

### Changes

1. **`renderGrouped()`** — build all headers and cards into a DocumentFragment, then append once:
   ```js
   async function renderGrouped(container, marks) {
     const groups = new Map()
     for (const mark of marks) {
       const surahNum = parseInt(mark.verseKey.split(':')[0], 10)
       if (!groups.has(surahNum)) groups.set(surahNum, [])
       groups.get(surahNum).push(mark)
     }
     const fragment = document.createDocumentFragment()
     const sortedKeys = [...groups.keys()].sort((a, b) => a - b)
     for (const surahNum of sortedKeys) {
       const header = document.createElement('div')
       header.className = 'qa-review-surah-header'
       header.setAttribute('data-surah-group', String(surahNum))
       const meta = surahs.find(s => s.n === surahNum)
       header.textContent = meta ? `${meta.name} (${meta.n})` : `Surah ${surahNum}`
       fragment.appendChild(header)
       for (const mark of groups.get(surahNum)) {
         fragment.appendChild(renderMarkCard(mark, null))
       }
     }
     container.appendChild(fragment)
   }
   ```

2. **`renderFlat()`** — same pattern:
   ```js
   async function renderFlat(container, marks) {
     const fragment = document.createDocumentFragment()
     for (const mark of marks) {
       fragment.appendChild(renderMarkCard(mark, null))
     }
     container.appendChild(fragment)
   }
   ```

### Verification
- Review hub with 50+ marks renders without visible jank
- Grouped and flat views both render correctly
- Existing verse-marks E2E still passes

---

## Batch 4: Lifecycle Migration

**Files:** `src/core/router.js`, `src/core/app.js`, `src/review/hub.js`, `src/settings/index.js`, `src/about/index.js`, `src/nav/index.js`, `src/core/quota-banner.js`, `src/safety/sync.js`
**Findings:** P2 #7, P3 #1

### Design

**Contract:** Every `init()` function returns a cleanup function (or `undefined` for nothing to clean up). The caller stores it and calls it when the module's lifetime ends.

### Changes

**`src/core/router.js`:**
- Replace `let currentModule = null` with `let currentCleanup = null`
- In `handleRoute()`: replace `if (currentModule && currentModule.cleanup) { currentModule.cleanup() }` with `if (currentCleanup) { currentCleanup(); currentCleanup = null }`
- Store return value: `currentCleanup = await module.init(sanitizedParams, hooks) ?? null`
- Remove the `currentModule = module` assignment
- `router.init()` returns a cleanup function that removes `hashchange`/`popstate` listeners and calls `currentCleanup`

**`src/review/hub.js`:**
- `init()` returns a cleanup function instead of exporting separate `cleanup()`
- Move unsub handles and state clearing into the returned function
- Remove `export function cleanup()` — the returned function replaces it

**`src/settings/index.js`:**
- `init()` returns `() => { ++_initSeq }` (invalidates in-flight init)
- Remove `export function cleanup()` if it exists, or add the return

**`src/about/index.js`:**
- `init()` returns `() => { ++_initSeq }` (invalidates in-flight init)
- Remove separate `cleanup()` export

**`src/nav/index.js`:**
- `init()` returns a cleanup function containing the body of current `destroy()`
- Remove `export function destroy()` — the returned function replaces it

**`src/core/quota-banner.js`:**
- `init()` currently subscribes to events but returns nothing
- Capture the `on()` return values and return a cleanup function:
  ```js
  export function init() {
    const unsub1 = on(Events.DB_QUOTA_EXCEEDED, ...)
    const unsub2 = on(Events.STORAGE_QUOTA_WARNING, ...)
    return () => { unsub1(); unsub2(); removeBanner() }
  }
  ```

**`src/safety/sync.js`:**
- Already returns `unsubVersionChange` but doesn't clean up the BroadcastChannel
- Return a proper cleanup that calls `destroy()` internally:
  ```js
  export function init() {
    // ... setup channel + listener ...
    return () => { destroy() }
  }
  ```
- Keep `destroy()` as a private function (no longer exported)
- Keep `broadcastMarkChange()` and `onMarkChange()` exports unchanged

**`src/core/app.js`:**
- Add `const bootCleanups = []` at module scope
- At top of `init()`: drain previous cleanups for safe re-init:
  ```js
  for (const fn of bootCleanups) fn()
  bootCleanups.length = 0
  ```
- Collect all cleanup returns:
  ```js
  bootCleanups.push(router.init())
  bootCleanups.push(await initNav())
  bootCleanups.push(initSafetySync())
  bootCleanups.push(initQuotaBanner())
  ```
- Remove manual `unsubLaunchRestore`, `unsubNavNavigate`, `unsubSafetySync` variables — these are now inside the returned cleanup functions
- Wire `unsubLaunchRestore` and `unsubNavNavigate` into the router's or app's cleanup (these are app-level event subscriptions, push into `bootCleanups`)

### Verification
- App initializes correctly
- Navigate between routes — no duplicate listeners
- Call `init()` twice (error recovery path) — no leaks
- All E2E tests still pass

---

## Batch 5: Logger Simplification + Events Cleanup

**Files:** `src/core/logger.js`, `src/core/events.js`, `package.json`, all `src/` files using `console.*`
**Findings:** P2 #15, P3 #3

### Changes

**`src/core/logger.js`** — replace entire file with:
```js
const noop = () => {}
const dev = import.meta.env.DEV

export const logger = {
  debug: dev ? console.debug.bind(console, '[QA]') : noop,
  info:  dev ? console.info.bind(console, '[QA]') : noop,
  warn:  dev ? console.warn.bind(console, '[QA]') : noop,
  error: dev ? console.error.bind(console, '[QA]') : noop,
}
```

**`src/core/events.js`:**
- Remove `actionTrail` array and `TRAIL_SIZE` constant
- Remove `getActionTrail()` export
- Remove correlation ID injection from `emit()` — strip the `_cid` block
- Remove action trail recording from `emit()`
- Remove `actionTrail.length = 0` from `clear()`
- Simplified `emit()`:
  ```js
  export function emit(type, payload) {
    const handlers = emitter.all.get(type)
    if (handlers) {
      for (const h of handlers.slice()) {
        try { h(payload) } catch { /* isolate */ }
      }
    }
    const wildcards = emitter.all.get('*')
    if (wildcards) {
      for (const h of wildcards.slice()) {
        try { h(type, payload) } catch { /* isolate */ }
      }
    }
  }
  ```

**`package.json`:**
- `pnpm remove loglevel`

**`console.*` → `logger.*` migration:**
- Find all `console.log`, `console.info`, `console.warn`, `console.error` in `src/` files (excluding `src/sw.js`, `src/sw-handlers.js`, `src/offline/` since those run in SW context)
- Replace with `logger.debug`, `logger.info`, `logger.warn`, `logger.error` respectively
- Add `import { logger } from '../core/logger.js'` where missing

### Verification
- Dev mode: console shows `[QA]` prefixed output
- Prod build: zero console output (verify with `pnpm build && grep -r "console\." dist/`)
- No runtime errors from removed logger features

---

## Batch 6: Product-Audit Skill Update

**Files:** All files under `.claude/skills/product-audit/`

### Structural Changes

1. **Delete** `checklists/observability.md`
2. **Delete** `checklists/testability.md`

### `checklists/functional-correctness.md`

Add 3 items at the end:

- **23. Critical user journeys have passing E2E tests** — All documented journeys in product-info.md have corresponding Playwright E2E specs that pass on the current commit.
- **24. E2E tests run in CI and block merge on failure** — CI pipeline runs E2E suite against production build. PRs cannot merge with failing E2E tests.
- **25. Critical path edge cases exercised in E2E** — Error states (network failure, invalid route, invalid deep link), offline recovery, and empty-state scenarios are covered by E2E tests.

### `checklists/ui-quality.md`

Add 2 items at the end:

- **19. Accessibility flows validated in E2E** — Focus traps, keyboard navigation (Tab/Enter/Escape/Arrow), aria-expanded toggling, and screen reader announcements are tested in E2E.
- **20. Responsive viewport coverage in E2E** — E2E tests exercise critical views at mobile (375px), tablet (768px), and desktop (1280px) widths.

### `checklists/architecture.md`

Add 1 item at the end:

- **27. No test-only code in production source** — No `if (process.env.NODE_ENV === 'test')`, `window.__test_hook__`, or conditional test branches exist in `src/`. All test infrastructure lives in `tests/`.

### `references/scoring-model.md`

Update dimension table and weights:

| Dimension | Weight |
|-----------|--------|
| Functional correctness | 5 |
| Security | 5 |
| UI Quality | 5 |
| Architecture | 4 |
| Reliability | 4 |
| Performance | 3 |
| **Total** | **26** |

Formula: `weighted_score = sum(dimension_score × weight) / 26`

Health bands unchanged: 8–10 Healthy, 6–7.9 Caution, 4–5.9 At risk, 0–3.9 Critical.

Add to severity definitions:
- **Finding types** (mandatory on every finding):
  - `defect` — Code does something wrong
  - `degradation` — Code works but quality is measurably poor
  - `absence` — Something doesn't exist that a current spec requires
  - `enhancement` — New capability not required by any current spec
- **Enhancement rule:** Enhancements are reported separately and excluded from scoring, dimension scores, and gate decisions.

### `references/subagent-prompt-template.md`

- Update dimension-to-slug mapping table: remove Observability and Testability rows
- Add to subagent instructions:
  - **Self-verification requirement:** "Before including ANY finding, you MUST read the actual file:line you are citing. If you cannot verify the issue exists in the current code, do not report it. Describing code without reading it is a critical failure."
  - **Stale finding detection:** "Verify that the issue has not already been fixed. Check for existing .catch(), try/catch, validation, or other mitigations before reporting."
  - **Finding type requirement:** "Every finding MUST include a `type` field: `defect`, `degradation`, `absence`, or `enhancement`. Findings typed as `enhancement` are excluded from scoring."
  - **Scope creep rule:** "Your job is to flag incorrect or poor work, not to suggest new features. If a recommendation would introduce new functionality not required by any current spec or story, type it as `enhancement`."

### `references/report-template.md`

- Add "Enhancement Suggestions" section after "All Findings Summary" — clearly separated, with note: "The following are improvement suggestions that do not affect dimension scores or the gate decision."
- Update dimension count references from 8 to 6

### `SKILL.md`

- Change "8 parallel specialist subagents" → "6 parallel specialist subagents" throughout
- Update dimension-to-slug mapping table: remove Observability and Testability
- Update Step 1: spawn 6, not 8
- Update Step 2: failure threshold — "3+ incomplete" → "2+ incomplete" (proportionally equivalent)
- Update Step 3 (Cross-Analyze):
  - Add: "Verify finding types. Any recommendation that introduces new functionality not in the current spec must be typed as `enhancement` and excluded from scoring."
- Update Step 4 (Orchestrator Verification):
  - Change: "verify every P0 and P1 finding" → "verify every P0 and P1 finding. Spot-check at least 30% of P2 and P3 findings by reading the cited file:line. If >30% of spot-checked findings are false, re-verify ALL findings for that dimension."
- Add a "Decision Log" section documenting:
  - Observability removed: runtime observability deprioritized; dev-mode logging via noop logger suffices; no remote monitoring planned
  - Testability merged into Functional Correctness (E2E journeys) and UI Quality (a11y/viewport): testing strategy is critical E2E journeys only, not line/function coverage
  - Weights rebalanced: UI Quality elevated to 5 (reading UX is core value), Reliability 4 (data persistence is trust), Performance 3 (reading app, not real-time)

### Verification
- Read each updated file end-to-end to verify internal consistency
- Confirm all cross-references between SKILL.md, scoring-model, template, and checklists are consistent

---

## Batch 7: Documentation Cleanup

**Files:** `docs/product-info.md`, `docs/tech-stack.md`, `docs/specs/story-1-online-reading.md` through `story-9-settings-about.md`

### `docs/product-info.md`

1. **Remove "Roadmap" section** with Phase 1–4 text
2. **Add "Implemented Stories" section** listing Stories 1–9 with one-line summaries:
   - Story 1: Online reading — Arabic + English, surah rendering, skeleton/error states
   - Story 2: Continuous reader — chunked rendering, session restore, scroll tracking
   - Story 3: Navigation — surah list, search/filter, keyboard nav, mobile overlay
   - Story 4: Verse marks — long-press, tag assignment, indicators, undo
   - Story 5: Review hub — All Marks view, grouping, filtering, sort, pagination
   - Story 6: Cross-tab safety — BroadcastChannel sync, IDB versionchange banner
   - Story 7: Deep links — verse-level URLs, invalid verse handling
   - Story 8: Dataset updates — version check, download, staging, SHA-256 verify, apply
   - Story 9: Settings & About — theme switcher, clear data, versions, attribution, PWA install
3. **Add "Future Stories" section:**
   - Custom tag creation
   - Filtered Verse Review (FVR)
   - BroadcastChannel cross-tab sync enhancements
   - Bulk mark operations
4. **"What's NOT Included"** — remove parenthetical "(deferred to future phase)" from custom tag creation. Split into "Not Planned" (audio, transliteration, analytics, etc.) and "Future Stories" (reference the section above). Move custom tag creation out of "not included" since it is planned.
5. **Add "Critical User Journeys" section** — canonical list of 9 currently-tested journeys:
   1. Launch → default surah → read
   2. Navigate → search surah → select → read
   3. Read → scroll → close → reopen → resume position
   4. Read → Arabic + English text renders correctly
   5. Long-press verse → tag → indicator → review hub
   6. Toggle translation → navigate → persists
   7. Switch theme → reload → persists
   8. Deep link `#/s/2/255` → correct verse
   9. SW registration → cache → offline ready

### `docs/tech-stack.md`

1. **Tooling table:**
   - Remove `loglevel` row
   - Remove `@vitest/coverage-v8` row
   - Update Logger row to: `Custom` | `—` | `Dev-only console wrapper, zero-cost in production`
2. **"Why These Choices"** — remove any loglevel justification paragraphs
3. **Routing table:** remove "Phase" column
4. **"Testing Strategy"** section — complete rewrite:
   ```
   ## Testing Strategy

   ### Boundary Unit Tests (Vitest)
   5 unit test files guard security and data integrity boundaries that E2E cannot reach:
   - `safety/input-validator.test.js` — XSS rejection, surah/verse parsing boundaries
   - `safety/sync.test.js` — cross-tab sync, IDB versionchange
   - `offline/dataset-updater.test.js` — SHA-256 verification, update state machine
   - `core/router.test.js` — param sanitization, route matching
   - `core/db.test.js` — IDB schema validation, store operations

   ### E2E Tests (Playwright)
   9 specs cover critical user journeys against the production build.
   See product-info.md "Critical User Journeys" for the canonical list.

   ### Static Checks
   - ESLint + strict mode
   - `pnpm audit` (dependency security)
   - `scripts/check-chunks.js` (max 150KB gzip per chunk)
   ```
5. **"Phases" section** at bottom — remove entirely
6. **Add "Module Lifecycle Contract" section:**
   ```
   ## Module Lifecycle Contract

   Every `init()` function returns a cleanup function. The caller stores it and calls it when the module's lifetime ends.

   - **Route modules** (`reader`, `review/hub`, `settings`, `about`): Router calls cleanup on route change
   - **Boot services** (`nav`, `safety/sync`, `quota-banner`): `app.js` collects cleanups in `bootCleanups[]`, drains on re-init
   - **Router itself**: Returns cleanup from `init()`, collected by `app.js`

   This replaces the previous mixed pattern of `cleanup()` exports, `destroy()` exports, and return values.
   ```
7. **Performance targets** — keep as-is

### Story Specs (all 9 files)

For each `docs/specs/story-*.md`:
- Remove "Phase N" references (e.g., "Phase 1 story" → remove or replace with "Core story")
- Remove "depends on Phase N" / "prerequisite: Phase N complete" language
- Remove "future phase" hedging — if a feature is described, it's implemented
- Keep all acceptance criteria, design decisions, and Q&A sections intact — these are the implementation record

### Verification
- Read each updated doc to confirm no stale phase references remain
- Cross-reference product-info.md journey list with E2E spec files
- Confirm tech-stack.md testing section matches actual file structure

---

## Execution Order

Batches have dependencies:

```
Batch 5 (logger/events) ← no deps, do first (changes imports across codebase)
Batch 1 (nav filter)    ← no deps on other batches
Batch 3 (review hub)    ← no deps on other batches
Batch 2 (reader)        ← needs lifecycle pattern decided (Batch 4 design)
Batch 4 (lifecycle)     ← needs Batch 2 reader done, touches all route modules
Batch 6 (skill update)  ← do after code changes finalized
Batch 7 (docs)          ← do last (references final state of code + skill)
```

**Recommended order:** 5 → 1 → 3 → 2 → 4 → 6 → 7

---

## Agent Model Recommendation

| Batch | Recommended Model | Rationale |
|-------|------------------|-----------|
| 5 (logger/events) | **Sonnet** | Mechanical replacement — delete/rewrite 2 files, find-and-replace console.* across src/. Low reasoning complexity. |
| 1 (nav filter) | **Sonnet** | Scoped to single file, clear mechanical changes, well-defined patterns. |
| 3 (review hub) | **Sonnet** | DocumentFragment wrapping is mechanical — single file, 2 functions. |
| 2 (reader decomposition) | **Opus** | Requires understanding data flow between 4 new functions, getting destructured param boundaries right, and preserving complex guard/timeout/scroll behavior. High reasoning. |
| 4 (lifecycle migration) | **Opus** | Touches 8 files with interdependencies. Router contract change cascades to all route modules + app.js wiring. Must reason about cleanup ordering, re-init safety, and boot-time vs route-time distinctions. Highest complexity batch. |
| 6 (skill update) | **Opus** | Nuanced wording of audit rules, finding type definitions, and verification requirements. Needs to be precise — ambiguous skill instructions produce bad audits. |
| 7 (docs cleanup) | **Sonnet** | Text editing across 12 files. Mechanical removal of phase language, restructuring sections. Low reasoning, high volume. |
