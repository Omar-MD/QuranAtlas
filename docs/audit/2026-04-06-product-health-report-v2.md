# QuranAtlas Product Health Report

**Date:** 2026-04-06
**Commit:** 55be343
**Auditor:** Product Audit Skill v2
**Checklist version:** 136 items (v2)
**Previous audit:** 2026-04-06 at commit d30acfb (`docs/audit/2026-04-06-product-health-report.md`)

---

## Executive Summary

QuranAtlas has solid security fundamentals (textContent everywhere, restrictive CSP, centralized IDB), clean module boundaries, and well-engineered chunked rendering. However, a critical initialization race condition prevents the app from routing on first page load — `router.init()` dispatches routes before any routes are registered. The translation toggle throws a ReferenceError on every click due to an out-of-scope variable. The hamburger navigation button is destroyed on every surah render. A visibilitychange listener leaks on each navigation, saving the wrong verse position. These regressions appear to have been introduced after the previous audit's fixes. Two P1 findings from the previous audit (IDB connection recovery and SW skipWaiting) are now resolved.

**Weighted Overall Score: 5.7 / 10** — At Risk

**Gate Decision: CONDITIONAL**

Conditions: Fix the 1 P0 and 6 P1 findings before any user-facing release.

- P0 count: 1
- P1 count: 6
- P2 count: 17
- P3 count: 10

---

## Methodology

| Dimension | Checklist Items | Assessable | Not Assessable | Confidence |
|-----------|----------------|------------|----------------|------------|
| Functional correctness | 22 | 13 | 9 | high |
| Security | 18 | 16 | 2 | high |
| Reliability | 19 | 14 | 5 | high |
| Performance | 22 | 19 | 3 | high |
| Architecture | 18 | 18 | 0 | high |
| Testability | 20 | 20 | 0 | high |
| Observability | 17 | 11 | 6 | high |
| **Total** | **136** | **111** | **25** | |

**Audit scope:** Full codebase audit against v2 checklists at commit 55be343. All 7 dimensions completed successfully. 25 of 136 checklist items were not assessable due to Phase 2/3 stub modules (marks, review, settings, about, dataset-updater, safety/sync). Scores are based on reduced denominators for each dimension.

---

## Dimension Scores

| Dimension | Score | Weight | Weighted | Status |
|-----------|-------|--------|----------|--------|
| Functional correctness | 4/10 | 5 | 20 | At risk |
| Security | 7/10 | 5 | 35 | Caution |
| Reliability | 5/10 | 5 | 25 | At risk |
| Performance | 7/10 | 4 | 28 | Caution |
| Architecture | 7/10 | 4 | 28 | Caution |
| Testability | 5/10 | 3 | 15 | At risk |
| Observability | 4/10 | 1 | 4 | At risk |
| **Total** | | **27** | **155 / 270** | |

**Overall: 5.7 / 10**

Status thresholds: 8+ = Healthy, 6-7.9 = Caution, 4-5.9 = At risk, <4 = Critical

---

## Delta from Previous Audit

| Dimension | Previous | Current | Change |
|-----------|----------|---------|--------|
| Functional correctness | 6 | 4 | -2 |
| Security | 7 | 7 | 0 |
| Reliability | 5 | 5 | 0 |
| Performance | 7 | 7 | 0 |
| Architecture | 7 | 7 | 0 |
| Testability | 5 | 5 | 0 |
| Observability | 4 | 4 | 0 |
| **Overall** | **6.1** | **5.7** | **-0.4** |

- P0 count: 0 → 1 (new: 1)
- P1 count: 2 → 6 (resolved: 2, new: 6)

**Resolved findings from previous audit:**
1. **[P1] IDB connection not recoverable after versionchange** — `src/core/db.js:62-66` now correctly nulls both `dbPromise` and `dbRef` in the versionchange handler before emitting the event.
2. **[P1] SW skipWaiting() called unconditionally during install** — `src/sw.js:18-21` install handler no longer calls `self.skipWaiting()`. Activation is now deferred to explicit `SKIP_WAITING` message (sw.js:47).

**New findings:** 1 P0 (initialization race), 6 P1s (translation toggle, hamburger destroyed, visibilitychange leak, navigation race, blank init page, offline download stuck).

---

## Critical Findings (P0 + P1)

### [P0] Initialization race condition — routes registered after initial dispatch

- **Dimension:** Functional correctness (cross-dimensional: also impacts Reliability for session restore)
- **Location:** `src/core/app.js:26` + `src/core/router.js:44-48`
- **Code excerpt:**
  ```js
  // app.js:26 — router.init() called here
  // router.js:47 — handleRoute(location.hash) called immediately
  // app.js:36-45 — routes registered AFTER init()
  ```
- **Evidence:** `router.init()` calls `handleRoute(location.hash)` at router.js:47 immediately. At this point, the `routes` Map is empty — route registrations don't happen until app.js:36-45. For any URL hash (e.g., `#/s/2`), `matchRoute()` returns null and the route is silently dropped. For empty hash, `ROUTER_LAUNCH_RESTORE` is emitted at router.js:58 before the listener is registered at app.js:33. Both code paths result in a non-functional initial load.
- **Impact:** App fails to route on first page load. Deep links, session restore, and default navigation all fail. User sees an empty main-content area with only the nav panel functional.
- **Recommendation:** Move `router.init()` to after all route registrations and the `ROUTER_LAUNCH_RESTORE` listener setup. Alternatively, defer the initial `handleRoute()` call until routes are registered.
- **Effort:** S
- **Orchestrator verified:** Yes — read app.js lines 17-46 and router.js lines 44-48. `router.init()` at app.js:26 triggers `handleRoute(location.hash)` before any `router.register()` calls at lines 36-45. The `ROUTER_LAUNCH_RESTORE` listener at line 33 is also registered after `init()`.

### [P1] Translation toggle throws ReferenceError on every click

- **Dimension:** Functional correctness
- **Location:** `src/reader/index.js:446-454`
- **Code excerpt:**
  ```js
  // renderTopBar() click handler references 'mainContent' —
  // but mainContent is local to init(), not in renderTopBar scope
  // Also: !translationVisible uses closure-captured param, never updates
  ```
- **Evidence:** `renderTopBar(topBar, translationVisible, _surahNum)` is a separate function from `init()`. The click handler at line 454 references `mainContent`, which is a local variable declared inside `init()` at line 37 — not in scope of `renderTopBar()`. In ES modules (strict mode), this throws a `ReferenceError` on every click. Additionally, line 447 uses the closure-captured `translationVisible` parameter (a primitive boolean) which never updates after the first click.
- **Impact:** Translation toggle is completely non-functional. Users cannot hide/show English translation.
- **Recommendation:** Pass `mainContent` as a parameter to `renderTopBar()`. Use module-level `currentTranslationVisible` in the click handler instead of the closure-captured parameter.
- **Effort:** S
- **Orchestrator verified:** Yes — read reader/index.js:434-460. `mainContent` is declared at line 37 inside `init()`, not accessible from `renderTopBar()`.
- **Orchestrator note:** Downgraded from P0 (as reported by functional subagent) to P1. This is a broken feature, not data loss/wrong verse text/XSS/broken navigation.

### [P1] Hamburger navigation toggle destroyed on every surah load

- **Dimension:** Functional correctness (cross-dimensional: also flagged by Architecture)
- **Location:** `src/reader/index.js:439`
- **Code excerpt:**
  ```js
  // renderTopBar clears entire top-bar:
  // topBar content set to empty string, destroying nav hamburger
  ```
- **Evidence:** `renderTopBar()` clears the entire `#top-bar` element at line 439. The hamburger toggle button inserted by `nav/index.js` into `#top-bar` is destroyed. After the first surah renders, the navigation hamburger button disappears and the nav panel becomes inaccessible.
- **Impact:** Users lose access to surah navigation after the first surah loads. The only way to navigate is via the URL bar or deep links.
- **Recommendation:** Instead of clearing the entire top bar, only replace the reader-specific controls. Use a dedicated container within `#top-bar` for reader controls.
- **Effort:** S
- **Orchestrator verified:** Yes — read reader/index.js:439 and confirmed nav/index.js inserts the hamburger toggle into `#top-bar`.

### [P1] Visibilitychange listener leak and incorrect position save

- **Dimension:** Functional correctness (cross-dimensional: also flagged by Reliability, Performance, Architecture)
- **Location:** `src/reader/index.js:97-110`
- **Code excerpt:**
  ```js
  // Anonymous visibilitychange listener added every init() call
  // Never removed in cleanup()
  // Saves renderedCount (chunk count) instead of actual viewed verse
  ```
- **Evidence:** This anonymous `visibilitychange` listener is added on every `init()` call at line 97 but never removed. The `cleanup()` function (lines 142-158) removes the event bus subscription and scroll listener, but does NOT remove this document-level listener. Each surah navigation adds another listener. Additionally, line 103 saves `verse: renderedCount` which is the count of rendered verses, not the actual viewed verse.
- **Impact:** (1) Memory leak: listeners accumulate with stale closures. (2) Wrong position data: session restore jumps to wrong verse. (3) Multiple stale listeners fire on background, potentially writing incorrect surah positions to IDB.
- **Recommendation:** Store the handler reference and remove it in `cleanup()`. Save the actual tracked scroll position from `onPositionChange` callback instead of `renderedCount`.
- **Effort:** S
- **Orchestrator verified:** Yes — read reader/index.js:97-110 and cleanup() at 142-158. The anonymous listener is not tracked or removed.

### [P1] No navigation guard for rapid surah switching

- **Dimension:** Functional correctness
- **Location:** `src/reader/index.js:32-55`
- **Code excerpt:**
  ```js
  // After await getSurah(surahNum) at line 55,
  // no check that currentSurahNum still matches surahNum
  ```
- **Evidence:** When `init()` is called for surah 2, it sets `currentSurahNum = 2` at line 35 and awaits `getSurah(2)` at line 55. If the user navigates to surah 3 before that fetch completes, a second `init()` call sets `currentSurahNum = 3`. When `getSurah(2)` resolves, the first `init()` continues rendering surah 2 with no stale check.
- **Impact:** Fast navigation between surahs produces race conditions where old surahs render over new ones.
- **Recommendation:** After each `await` in `init()`, check `if (currentSurahNum !== surahNum) return` to bail out if navigation has moved on.
- **Effort:** S
- **Orchestrator verified:** Yes — read reader/index.js:32-55. No stale-check exists after the `await getSurah(surahNum)` at line 55.

### [P1] Blank page on init failure — no recovery UI

- **Dimension:** Reliability
- **Location:** `src/core/app.js:71-74`
- **Code excerpt:**
  ```js
  // catch block emits APP_INIT_ERROR but no module subscribes
  // User sees blank page with no retry option
  ```
- **Evidence:** The catch block emits `APP_INIT_ERROR` and logs to console, but no module subscribes to this event. A grep for `APP_INIT_ERROR` shows it is only defined and emitted — never consumed. The user sees a blank page.
- **Impact:** If IDB is unavailable, dataset fetch fails, or any init step throws, the user sees a blank white page with no way to recover.
- **Recommendation:** Add a listener (or inline DOM write in the catch block) that renders an error message with a retry button into `#main-content`.
- **Effort:** S
- **Orchestrator verified:** Yes — read app.js:71-74. Grep confirms no module listens for `APP_INIT_ERROR`.

### [P1] Offline download state stuck at 'downloading' when SW controller is null

- **Dimension:** Reliability
- **Location:** `src/data/offline.js:45,95-100`
- **Code excerpt:**
  ```js
  // setActivationState('downloading') at line 45
  // if (navigator.serviceWorker.controller) at line 98
  // — no else branch when controller is null
  ```
- **Evidence:** `startDownload()` sets `activationState` to `'downloading'` at line 45, then checks `navigator.serviceWorker.controller` at line 98. On first page load before the SW claims the page, `controller` is null. No message is sent, no error is emitted, and the state remains stuck at `'downloading'` with no timeout and no recovery path.
- **Impact:** The download UI shows a permanent "downloading" state. The user cannot retry because `startDownload()` guards against re-entry when state is `'downloading'`.
- **Recommendation:** When `controller` is null, reset `activationState` to `'none'` and emit `OFFLINE_DOWNLOAD_ERROR`. Add a download timeout.
- **Effort:** S
- **Orchestrator verified:** Yes — read offline.js:39-101. State is set to 'downloading' at line 45. The `if (controller)` check at line 98 has no else branch.

---

## All Findings Summary

| Severity | Count | Top Items |
|----------|-------|-----------|
| P0 | 1 | Initialization race condition (routes registered after dispatch) |
| P1 | 6 | Translation toggle broken; hamburger destroyed; visibilitychange leak; navigation race; blank init page; offline download stuck |
| P2 | 17 | No CI pipeline; zero E2E tests; zero SW tests; CSP unsafe-inline; no error boundary UI; no QuotaExceededError handling; missing validateTagParam; no in-memory dataset cache; string literal events; stub console.log data leak; manual SW registration; IDB no onclose; no reload banner; invalid surah blank screen; incomplete marks schema; no post-download verification; no performance tests |
| P3 | 10 | Deprecated router re-export; stub cleanup() missing; post-chunk DOM re-query; body transition not GPU-composited; cache mock fidelity; mock consolidation; session restore no logging; structured error context; SW registration failure console-only; unmatched route no signal |

---

## Not Assessed

| Module / Feature | Reason | Checklist Items Affected |
|-----------------|--------|------------------------|
| `marks/store.js`, `marks/editor.js`, `marks/indicator.js` | Phase 2 stubs (console.log only) | Functional #5, #16, #17; Security #12; Performance #12; Observability #10 |
| `review/hub.js`, `review/state.js` | Phase 2 stubs | Functional #14; Performance #13 |
| `settings/index.js`, `settings/theme.js`, `settings/clear-data.js` | Phase 3 stubs or not created | Functional #15; Security #11; Reliability #14; Performance #16; Observability #11 |
| `about/index.js`, `about/versions.js`, `about/storage.js`, `about/pwa-install.js` | Phase 3 — not created | Observability #2, #16 |
| `data/dataset-updater.js` | Phase 3 — not created | Functional #19; Reliability #6, #13; Performance #15; Observability #9 |
| `safety/sync.js` | Phase 3 — not created | Reliability #9 (partial); Observability #8 (partial) |

**Impact:** 25 of 136 total checklist items were not assessable. Scores for affected dimensions are based on reduced denominators.

---

## Open Questions

1. **Does the initialization race manifest as a completely blank page in production?** — The code at app.js:26 calls router.init() before routes are registered. In theory, the initial route is always dropped. However, if the hashchange listener catches a subsequent browser-triggered event, the app might self-recover. Needs browser testing to confirm severity.

2. **Does the production build output the SW at '/sw.js' to match the manual registration path?** — vite-plugin-pwa with `injectManifest` mode and `injectRegister: false` — output path depends on plugin configuration. Cannot verify without running a production build.

3. **Does the 5s skeleton timeout race with slow network fetches?** — The timeout starts before getSurah() and clearTimeout runs after both getSurah and Promise.all complete. On very slow 3G, total fetch time could exceed 5s, triggering a false error state.

4. **What are the actual coverage numbers for `pnpm test:coverage`?** — Thresholds are set at 80/70/75 (lines/branches/functions) but without running coverage, it's unknown whether existing tests meet these.

5. **Is a custom Arabic font bundled or expected to be system-installed?** — No `@font-face` declarations exist, yet CSS references 'KFGQPC Uthman Taha Naskh'. If a web font is planned, font loading performance must be addressed.

---

## Recovery Plan

### Phase 1: Stop the bleeding (P0s)

1. **Initialization race condition** (`src/core/app.js:26`) — Effort: S
   - Why: App fails to route on first page load — deep links, session restore, and default navigation all broken
   - How: Move `router.init()` to after all `router.register()` calls and the `ROUTER_LAUNCH_RESTORE` listener setup (after line 45)

### Phase 2: Stabilize (P1s)

1. **Translation toggle broken** (`src/reader/index.js:446-454`) — Effort: S
   - Why: Users cannot toggle English translation — ReferenceError on every click
   - How: Pass `mainContent` as parameter to `renderTopBar()`. Use `currentTranslationVisible` (module-level) in click handler instead of closure-captured parameter

2. **Hamburger toggle destroyed** (`src/reader/index.js:439`) — Effort: S
   - Why: Navigation becomes inaccessible after first surah load
   - How: Replace top-bar clearing with targeted replacement of reader-specific controls only. Use a dedicated container slot for reader controls

3. **Visibilitychange listener leak** (`src/reader/index.js:97-110`) — Effort: S
   - Why: Memory leak + wrong position saves corrupt session restore
   - How: Store handler reference, remove in `cleanup()`. Save actual scroll position from `onPositionChange` instead of `renderedCount`

4. **Navigation race condition** (`src/reader/index.js:32-55`) — Effort: S
   - Why: Fast surah switching renders stale content
   - How: Add `if (currentSurahNum !== surahNum) return` after each `await` in `init()`

5. **Blank page on init failure** (`src/core/app.js:71-74`) — Effort: S
   - Why: App init failure shows blank page with no recovery path
   - How: Render error message with retry button in the catch block

6. **Offline download stuck** (`src/data/offline.js:45,98`) — Effort: S
   - Why: Download state stuck permanently when SW controller is null
   - How: Add else branch to reset state to 'none' and emit error when controller is null. Add download timeout

### Phase 3: Strengthen (P2s)

**Security**
- Remove `'unsafe-inline'` from style-src CSP directive (`index.html:6`)
- Implement `validateTagParam()` in `safety/input-validator.js` before Phase 2 ships
- Replace stub `console.log` calls in `marks/store.js`, `review/state.js` with no-ops
- Use vite-plugin-pwa's virtual module instead of manual SW registration (`app.js:115`)

**Reliability**
- Add `dbRef.onclose` handler in `core/db.js` to invalidate stale references
- Handle `QuotaExceededError` in all IDB write paths
- Fix `deleteDB` `onblocked` to not auto-resolve (`core/db.js:103`)
- Render error state for invalid surah numbers instead of blank screen (`reader/index.js:28-29`)

**Architecture**
- Replace string literal event names in `nav/index.js:317,322` with `Events` constants
- Add error boundary UI in `router.js` catch block
- Add no-op `cleanup()` exports to all stub route handler modules

**Testing**
- Create GitHub Actions CI pipeline (lint, test, coverage, build, check-chunks)
- Add Playwright to devDependencies and create E2E tests for Phase 1 journeys
- Add SW unit tests for all 4 message handlers
- Add performance regression tests for 6 targets
- Un-skip the visibilitychange test (`reader.test.js:177`)

**Performance**
- Add in-memory Map cache to `dataset.js` for previously fetched surahs
- Add post-download dataset verification in `offline.js`

### Phase 4: Optimize (P3s)

- Remove deprecated `getMostRecentPosition` re-export from `router.js`
- Add no-op `cleanup()` to stub modules (review/hub.js, settings/index.js, about/index.js)
- Return elements from `renderVerseChunk()` to avoid post-chunk DOM re-query
- Remove `background-color`/`color` transition from body (non-GPU-composited)
- Enhance global Cache API mock fidelity in `tests/setup.js`
- Extract shared mocks to `tests/fixtures/`
- Add session restore path diagnostic logging in `app.js`
- Add structured error context (module, operation) to catch blocks
- Emit event on SW registration failure
- Emit diagnostic event for unmatched routes

---

## Cross-Cutting Observations

### Patterns Across Dimensions

1. **Visibilitychange listener leak is systemic** — Flagged by 4 of 7 dimensions (Functional, Reliability, Performance, Architecture). The same root cause (anonymous `document.addEventListener` in `init()` without removal in `cleanup()`) produces memory leaks, wrong position saves, stale closures, and potential data corruption. This is the single highest-impact cross-cutting issue.

2. **reader/index.js is a concentration risk** — At 461 lines, this module handles rendering, scroll tracking, position save, translation toggle, skeleton/error UI, resume indicator, basmala logic, and top-bar management. 5 of 7 P1 findings originate from this single file. Phase 2 will add marks integration, increasing the monolith risk.

3. **Phase 2/3 stubs still represent 18% of checklist items** — 25 of 136 items are not assessable. The true health picture will only emerge after Phase 2 implementation.

### Architecture-Level Risks

1. **No error recovery at any layer** — `APP_INIT_ERROR` is emitted but unheard. `ROUTER_ROUTE_ERROR` is emitted but unheard. Invalid surahs silently return blank. The app has no user-visible error recovery path at any level.

2. **No dependency enforcement tooling** — Module boundaries are correct by convention but no ESLint import rules or `madge` checks enforce them.

### Strengths

1. **XSS prevention is thorough** — `textContent` used consistently for all dynamic content across reader, nav, marks stubs. No dangerous DOM insertion with untrusted data. Strong CSP.

2. **Previous P1s were properly fixed** — Both P1 findings from the previous audit (IDB versionchange and SW skipWaiting) are resolved with correct implementations.

3. **Event bus architecture is clean** — `core/events.js` provides effective pub/sub. All cross-module communication flows through emit/on with namespaced constants.

4. **Chunked rendering with DocumentFragment** — reader/index.js correctly batches 50 verses into a DocumentFragment for single DOM insertion. Combined with `content-visibility: auto`, this handles long surahs well.

5. **SW caching is resumable** — sw.js `handleCacheDataset` checks cache before fetching each URL, enabling interrupted downloads to resume.

6. **Bounded retry with backoff** — SW uses `fetchWithRetry` with 3 attempts and increasing delays (1s, 2s, 5s). No infinite retry loops.

### Phase Readiness Assessment

**Phase 1 status:** Blocked by P0 and multiple P1s. The initialization race prevents the app from loading. The translation toggle, hamburger destruction, and visibilitychange leak break core functionality.

**Ready for Phase 2?** No. All P0 and P1 findings must be resolved first. Additionally:
- reader/index.js should be decomposed before adding marks integration
- `validateTagParam()` must be implemented before the `#/t/:tag` route handles real input
- CI pipeline should be in place before Phase 2 code is merged

---

## Rejected Findings

1. **Functional subagent P0: Translation toggle** — Downgraded to P1. The broken toggle is a broken feature, not data loss, wrong verse text, XSS, or broken navigation. Per P0 hard requirements, this does not qualify.

2. **Security subagent P1: Missing validateTagParam** — Downgraded to P2. The `#/t/:tag` route's consumer (review/hub.js) is a stub that only logs to console. There is no current attack vector — the unsanitized param reaches a no-op function. This becomes P1 when Phase 2 ships.

3. **Testability subagent P1: No CI pipeline** — Downgraded to P2. Per the Absence Test, missing CI is an absence, not a defect. It does not directly enable data loss, XSS, wrong text, or broken navigation in existing code.

4. **Reliability subagent P1: deleteDB onblocked auto-resolves** — Downgraded to P2. The consumer (`settings/clear-data.js`) does not exist yet. The code exists but the risky path is not exercisable in the current codebase.

---

## Gate Decision

**Decision: CONDITIONAL**

**Rationale:** One P0 finding (initialization race) prevents the app from routing on first page load. Six P1 findings break core functionality: translation toggle, navigation hamburger, position tracking, fast navigation, error recovery, and offline download. All are Effort: S (point fixes in 1-3 files). The overall score of 5.7 places the codebase in the At Risk band — a regression from the previous audit's 6.1 (Caution). The previous audit's two P1 findings were properly fixed, but new regressions were introduced.

**Conditions for PASS:**
- [ ] Fix initialization race: move `router.init()` after route registrations (`app.js:26`)
- [ ] Fix translation toggle: pass `mainContent` to `renderTopBar()`, use module-level state (`reader/index.js:434-460`)
- [ ] Fix hamburger destruction: don't clear entire top-bar (`reader/index.js:439`)
- [ ] Fix visibilitychange listener leak: store reference, remove in cleanup, save correct verse (`reader/index.js:97-110`)
- [ ] Fix navigation race: add stale checks after awaits (`reader/index.js:32-55`)
- [ ] Fix blank init page: add error recovery UI (`app.js:71-74`)
- [ ] Fix offline download stuck: handle null controller (`offline.js:45,98`)

**Reviewed by:** _________________ (human reviewer sign-off)

---

*End of report.*
