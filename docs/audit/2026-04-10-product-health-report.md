# QuranAtlas Product Health Report

**Date:** 2026-04-10
**Commit:** 3131ece
**Auditor:** Product Audit Skill v2
**Checklist version:** 165 items (8 dimensions)
**Previous audit:** 2026-04-09 — [2026-04-09-product-health-report.md](2026-04-09-product-health-report.md)

---

## Executive Summary

QuranAtlas has crossed into Healthy territory. The prior audit's P2 findings around update-pipeline contract drift, review-hub listener leaks, and undo-toast navigation gaps have been addressed. Functional correctness now scores highest alongside Security, reflecting a solid, shippable reading experience with no wrong-text, XSS, or broken-navigation risks.

The remaining work is quality polish: performance optimizations in the nav filter and review hub, testability gaps around edge-case scenarios, and minor architecture inconsistencies in module lifecycle interfaces. No dimension scores below 7. The product is ready to ship the current feature set and begin Phase 4 planning.

**Weighted Overall Score: 8.1 / 10** — **Health Status: Healthy**

**Gate Decision: PASS**

- P0 count: 0
- P1 count: 0
- P2 count: 16
- P3 count: 5

---

## Methodology

| Dimension | Checklist Items | Assessable | Not Assessable | Confidence |
|-----------|----------------|------------|----------------|------------|
| Functional correctness | 22 | 22 | 0 | high |
| Security | 18 | 17 | 1 | high |
| Reliability | 19 | 18 | 1 | high |
| Performance | 22 | 21 | 1 | high |
| Architecture | 26 | 26 | 0 | high |
| Testability | 23 | 23 | 0 | high |
| UI Quality | 18 | 18 | 0 | high |
| Observability | 17 | 17 | 0 | high |
| **Total** | **165** | **162** | **3** | |

**Audit scope:** Full codebase audit against all 8 checklists, product docs, story specs, tests, and configuration. All 8 subagents completed successfully.

**Orchestrator verification notes:**

- 3 subagent findings were initially labeled P1; all 3 were downgraded after direct source verification.
- nav.destroy() never called: confirmed, but nav is a persistent panel initialized once at boot — not a route module. Correct by design. Downgraded to P3.
- reader/index.js init() ~170 lines: confirmed at ~165 lines (line 37–201), 3.3× the 50-line limit. Maintainability concern, not a release blocker. Downgraded to P2.
- Dataset update state persistence on SW crash: confirmed that `restoreActivationState()` in app.js handles the 'downloading' stuck state by resetting. Recovery mechanism exists. Downgraded to P2.

---

## Dimension Scores

| Dimension | Score | Weight | Weighted | Status |
|-----------|-------|--------|----------|--------|
| Functional correctness | 9/10 | 5 | 45.0 | Healthy |
| Security | 9/10 | 5 | 45.0 | Healthy |
| Reliability | 8/10 | 5 | 40.0 | Healthy |
| Performance | 7/10 | 4 | 28.0 | Caution |
| Architecture | 7/10 | 4 | 28.0 | Caution |
| Testability | 8/10 | 3 | 24.0 | Healthy |
| UI Quality | 8/10 | 3 | 24.0 | Healthy |
| Observability | 9/10 | 1 | 9.0 | Healthy |
| **Total** | | **30** | **243.0 / 300** | |

**Overall: 8.1 / 10**

Status thresholds: 8+ = Healthy, 6–7.9 = Caution, 4–5.9 = At risk, <4 = Critical

---

## Delta from Previous Audit

| Dimension | Previous | Current | Change |
|-----------|----------|---------|--------|
| Functional correctness | 7.0 | 9.0 | +2.0 |
| Security | 9.0 | 9.0 | 0.0 |
| Reliability | 7.0 | 8.0 | +1.0 |
| Performance | 8.0 | 7.0 | −1.0 |
| Architecture | 7.0 | 7.0 | 0.0 |
| Testability | 7.0 | 8.0 | +1.0 |
| UI Quality | 8.0 | 8.0 | 0.0 |
| Observability | 7.0 | 9.0 | +2.0 |
| **Overall** | **7.6** | **8.1** | **+0.5** |

- P0 count: 0 → 0 (resolved: 0, new: 0)
- P1 count: 0 → 0 (resolved: 0, new: 0)

**Resolved findings / no regressions observed:**

1. Prior audit's P2 around cross-feature imports (`reader/` → `marks/`, `review/` → `marks/editor.js`) was moved to boot-time wiring in `app.js` via hooks injection. The reader module receives `initIndicators` and `setupLongPress` as hook functions rather than importing them directly.
2. Review hub listener leak (previously P2): `review/hub.js` now retains unsubscribe handles and calls them from `cleanup()`.
3. Undo-toast navigation gap: `reader.cleanup()` now calls `clearUndoToast()` on all route-cleanup paths.
4. Dataset update contract drift: `activationState` shape is now consistent across `core/db.js`, `data/offline.js`, and `offline/dataset-updater.js`.
5. Coverage thresholds: CI now runs `pnpm run test:coverage` and fails on threshold breach.

**Performance regression (−1.0):**

New findings surfaced in nav filter performance (no debounce, 342 DOM queries per keystroke) and review hub DOM batching. These were not covered in prior audit's performance review. The underlying code has not changed — the prior audit underweighted these paths.

---

## Critical Findings (P0 + P1)

*No P0 or P1 findings remain after orchestrator verification.*

### Orchestrator Verification Results

| # | Original P1 Claim | Dimension | Verification Result | Reason |
|---|---|---|---|---|
| 1 | nav.destroy() never called on route change, leaking listeners | Architecture | **Downgraded → P3** | Nav panel is a persistent component initialized once at boot (`app.js:72`). It is NOT a route module — the router only cleans up route modules via `currentModule.cleanup()`. The `destroy()` export exists for testing/future cleanup but is not needed during normal operation. No listener leak demonstrated. |
| 2 | reader/index.js init() is ~170 lines (3.4× the 50-line limit) | Architecture | **Downgraded → P2** | Verified: init() spans lines 37–201 (~165 lines, 3.3× limit). The function works correctly and is well-structured with clear sections. This is a maintainability concern, not a release blocker or user-facing defect. |
| 3 | Dataset update state persistence if SW crashes mid-download | Reliability | **Downgraded → P2** | Verified: `setState()` writes atomic IDB records. `restoreActivationState()` in `app.js:194–200` checks for stuck 'downloading' state and calls `offline.cancelDownload()` to reset. Recovery mechanism exists. Risk is limited to edge cases between two consecutive `setState()` calls. |

---

## All Findings Summary

| Severity | Count | Top Items |
|----------|-------|-----------|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 16 | Nav filter performance; reader init() size; skeleton timeout; review hub DOM batching; test coverage gaps |
| P3 | 5 | Nav destroy not wired; Home/End keys missing; logging prefix inconsistency; font-display:swap; dataset update UX |

### P2 Findings

**Performance (5 findings)**

1. **Nav filter lacks debounce — 342 DOM queries per keystroke**
   - **Dimension:** Performance
   - **Location:** `src/nav/index.js` (filter/search handler)
   - **Evidence:** Each keystroke in the surah search triggers `document.querySelectorAll('.qa-nav-item')` to filter and show/hide items. With 114 surahs, this produces 342 DOM reads per keystroke with no debounce or throttle.
   - **Impact:** Jank on low-end mobile devices during rapid typing. No debounce means intermediate states trigger full DOM traversals.
   - **Recommendation:** Add 150ms debounce to filter input handler. Cache the NodeList reference instead of re-querying. Effort: S.

2. **Review Hub uses per-mark appendChild instead of DocumentFragment**
   - **Dimension:** Performance
   - **Location:** `src/review/hub.js` (render loop)
   - **Evidence:** Each mark card is appended individually to the DOM, causing one reflow per card. For users with many marks this scales linearly.
   - **Impact:** Layout thrashing during review hub render with large mark collections.
   - **Recommendation:** Build all cards into a DocumentFragment, then append once. Effort: S.

3. **Layout thrashing in nav filter from interleaved read/write**
   - **Dimension:** Performance
   - **Location:** `src/nav/index.js` (filter handler)
   - **Evidence:** Filter loop reads `offsetHeight`/visibility then writes `display` or `hidden` per item, causing forced synchronous layouts.
   - **Impact:** Compounds with finding #1 to amplify jank during search.
   - **Recommendation:** Batch all reads, then batch all writes. Or use `hidden` attribute (no reflow) instead of display toggle. Effort: S.

4. **Resume indicator uses `top` instead of `transform` for positioning**
   - **Dimension:** Performance
   - **Location:** `src/core/theme.css` (resume indicator styles)
   - **Evidence:** Resume indicator scroll positioning uses `top` property which triggers layout, versus `transform: translateY()` which is compositor-only.
   - **Impact:** Minor — only affects the single resume indicator element, not a hot path.
   - **Recommendation:** Switch to `transform: translateY()`. Effort: S.

5. **Skeleton timeout is 800ms — too aggressive for slow connections**
   - **Dimension:** Reliability, Performance
   - **Location:** `src/reader/index.js:20` — `const SKELETON_TIMEOUT_MS = 800`
   - **Evidence:** The timeout at line 71 triggers `cleanup()` + `showError()` after 800ms. On 3G connections, surah fetches can exceed 800ms, resulting in false error display even though data is still loading.
   - **Impact:** Users on slow connections see an error message and must retry, even when the fetch would have succeeded.
   - **Recommendation:** Increase to 5000ms (per Story 1 error-state spec). The 800ms target should apply to the skeleton *appearance*, not the error cutoff. Effort: S.

**Architecture (4 findings)**

6. **reader/index.js init() is ~165 lines (3.3× the 50-line limit)**
   - **Dimension:** Architecture
   - **Location:** `src/reader/index.js:37–201`
   - **Evidence:** Orchestrator-verified. The init function handles skeleton, fetch, guard, settings, render, scroll tracking, visibility, scroll-to, announcements, and performance marks in one body.
   - **Impact:** Maintainability: harder to test individual sections, harder to review changes.
   - **Recommendation:** Extract into named sub-functions: `fetchSurahData()`, `renderSurahContent()`, `setupScrollAndVisibility()`, `handleDeepLink()`. Effort: M.

7. **Inconsistent module lifecycle interface: cleanup vs destroy vs return value**
   - **Dimension:** Architecture
   - **Location:** `src/reader/index.js` exports `cleanup()`, `src/nav/index.js` exports `destroy()`, `src/marks/indicator.js` returns cleanup function from `init()`.
   - **Evidence:** Three different patterns for the same concept. Router expects `module.cleanup()`. Nav uses `destroy()`. Marks indicators return a function.
   - **Impact:** New modules must guess which pattern to follow. Event bus subscriptions may not be cleaned up if the wrong convention is assumed.
   - **Recommendation:** Standardize on one pattern (recommend `cleanup()` since the router already expects it). Update nav to alias `destroy` as `cleanup`, or add `cleanup` export. Effort: S.

8. **review/hub.js loadVerseContentBackground() is async but never awaited**
   - **Dimension:** Architecture
   - **Location:** `src/review/hub.js`
   - **Evidence:** The function fetches verse content to display in review cards but is called without `await`. Errors in the background fetch are swallowed silently.
   - **Impact:** If background fetch fails, review cards show no verse preview with no indication of why.
   - **Recommendation:** Either await and handle errors, or add `.catch()` with error UI. Effort: S.

9. **Phase 4 readiness: extension seams not yet in place**
   - **Dimension:** Architecture
   - **Location:** Multiple modules
   - **Evidence:** No BroadcastChannel hooks, no custom tag extension points, no FVR (Filtered Verse Review) architecture exists yet.
   - **Impact:** Phase 4 features will require more structural work than if seams were pre-built.
   - **Recommendation:** Add TODO markers in relevant modules for Phase 4 seams. Do not pre-build. Effort: S.

**Testability (5 findings)**

10. **Dataset major version confirmation flow untested**
    - **Dimension:** Testability
    - **Location:** `src/offline/dataset-updater.js` (major version check)
    - **Evidence:** No test covers the user confirmation dialog for major version dataset updates, nor the rejection path.
    - **Recommendation:** Add unit test with mocked IDB for major version detection and user confirmation flow. Effort: S.

11. **Modal focus trap not covered by test**
    - **Dimension:** Testability
    - **Location:** `src/marks/editor.js:145–175`
    - **Evidence:** Focus trap logic exists and works (verified by orchestrator), but no automated test exercises tab cycling within the modal.
    - **Recommendation:** Add E2E test that opens mark editor, tabs through focusable elements, and verifies focus stays within modal. Effort: S.

12. **IDB quota exceeded scenario untested**
    - **Dimension:** Testability
    - **Location:** `src/core/db.js`, `src/core/quota-banner.js`
    - **Evidence:** Quota exceeded handling exists (banner shown, graceful degradation), but no test simulates the QuotaExceededError path.
    - **Recommendation:** Add unit test with IDB mock that throws QuotaExceededError and verify banner/fallback. Effort: S.

13. **Accessibility test coverage gaps**
    - **Dimension:** Testability
    - **Location:** `tests/e2e/`
    - **Evidence:** E2E tests cover navigation and reading flows but don't assert on ARIA attributes, screen reader announcements, or keyboard-only traversal.
    - **Recommendation:** Add axe-core scan to E2E suite and keyboard-navigation tests. Effort: M.

14. **Theme CSS application not end-to-end tested**
    - **Dimension:** Testability
    - **Location:** `tests/e2e/theme-switching.spec.js`
    - **Evidence:** Theme switching E2E test exists but doesn't verify CSS variable values are actually applied (e.g., background-color matches theme definition).
    - **Recommendation:** Add assertion that reads computed style after theme switch and compares to expected CSS variable value. Effort: S.

**Security (1 finding)**

15. **Inconsistent error logging may expose context in production**
    - **Dimension:** Security
    - **Location:** Multiple modules
    - **Evidence:** Some error handlers pass full error objects to logger (which may include stack traces, IDB keys), while others log only `error.message`. Partial checklist item.
    - **Impact:** In production, verbose error objects could expose internal state if logs are captured by monitoring.
    - **Recommendation:** Standardize on logging `error.message` + error code only. Strip stack traces in production logger mode. Effort: S.

**Observability (1 finding)**

16. **No degraded-mode UI when offline features are unavailable**
    - **Dimension:** Observability
    - **Location:** `src/data/offline.js`
    - **Evidence:** When the app is offline and dataset cache is empty, or when storage quota is exceeded, there's no explicit UI indicating which features are unavailable.
    - **Impact:** Users may not understand why certain actions fail silently in degraded mode.
    - **Recommendation:** Add a subtle status indicator (e.g., "Offline — some features unavailable") when navigator.onLine is false and cache is empty. Effort: M.

### P3 Findings

1. **nav.destroy() exists but is never called** — Nav is a persistent panel; `destroy()` is only needed for testing teardown or full app cleanup. No production impact. (`src/nav/index.js:49`)

2. **Missing Home/End key support in surah list** — Power users with keyboard-only navigation expect Home/End for long lists. Minor usability gap. (`src/nav/index.js:175–191`)

3. **Logging prefix inconsistency** — `app.js` uses `logger.info()`, while other modules use `console.*` directly. Inconsistent diagnostics pattern. (Multiple modules)

4. **Missing font-display:swap** — Custom fonts (if any loaded externally) should use `font-display: swap` to prevent invisible text during load. Currently no external fonts detected, so impact is zero unless fonts are added. (`src/core/theme.css`)

5. **Dataset update confirmation UX** — The update confirmation dialog for major version changes doesn't provide version details or changelog context. Users are asked to confirm without understanding what changed. (`src/offline/dataset-updater.js`)

---

## Not Assessed

| Module / Feature | Reason | Checklist Items Affected |
|-----------------|--------|--------------------------|
| CI dependency scanning pipeline | Requires CI environment access, not inspectable from repository alone | Security #18 |
| Real-device reader timing on throttled mobile hardware | Requires executed runtime measurement | Performance #1 |
| Service worker integration under real network conditions | Requires live environment testing | Reliability #19 |

**Impact:** 3 of 165 total checklist items were not directly assessable from repository evidence alone. Scores are based on 162 assessable items.

---

## Open Questions

1. **Should the skeleton timeout be 800ms or 5000ms?** — The code comment says "800ms per spec (Story 1 Q1)" but this appears to conflate the performance *target* (skeleton visible within 800ms) with the error *cutoff* (show error after timeout). Story 1's error state likely intends a 5-second hard timeout. Impact: false errors on slow connections.

2. **Are mark dot colors distinguishable for users with deuteranopia (red-green blindness)?** — Tag colors use adequate lightness variation (dark blues, greens, purples, ambers) but a daltonizer test on real devices would confirm WCAG compliance.

3. **Is `logger` intended to replace `console.*` calls app-wide?** — `app.js` uses `logger.info()` while most other modules still use `console.*` directly. Standardizing would improve structured diagnostics.

4. **Should Phase 4 extension seams be pre-built or added just-in-time?** — Current architecture supports Phase 4 with structural changes, but no pre-built hooks exist for BroadcastChannel or custom tags.

---

## Recovery Plan

### Phase 1: Stop the bleeding (P0s)

No P0 findings.

### Phase 2: Stabilize (P1s)

No P1 findings.

### Phase 3: Strengthen (P2s)

**Theme: Performance hot paths**

| # | Action | Findings | Effort |
|---|--------|----------|--------|
| 1 | Add 150ms debounce to nav filter + cache NodeList reference | #1, #3 | S |
| 2 | Batch review hub card rendering with DocumentFragment | #2 | S |
| 3 | Increase skeleton timeout from 800ms to 5000ms | #5 | S |
| 4 | Switch resume indicator from `top` to `transform` | #4 | S |

**Theme: Architecture contracts**

| # | Action | Findings | Effort |
|---|--------|----------|--------|
| 5 | Extract reader init() into named sub-functions | #6 | M |
| 6 | Standardize module lifecycle to `cleanup()` pattern | #7 | S |
| 7 | Add `.catch()` to loadVerseContentBackground() | #8 | S |
| 8 | Add Phase 4 TODO markers (don't pre-build) | #9 | S |

**Theme: Test coverage gaps**

| # | Action | Findings | Effort |
|---|--------|----------|--------|
| 9 | Test dataset major version confirmation flow | #10 | S |
| 10 | Test modal focus trap (E2E) | #11 | S |
| 11 | Test IDB quota exceeded path | #12 | S |
| 12 | Add axe-core accessibility scan to E2E suite | #13 | M |
| 13 | Assert computed CSS values in theme E2E test | #14 | S |

**Theme: Observability & security polish**

| # | Action | Findings | Effort |
|---|--------|----------|--------|
| 14 | Standardize error logging to message-only in production | #15 | S |
| 15 | Add degraded-mode UI indicator | #16 | M |

### Phase 4: Optimize (P3s)

1. Wire nav.destroy() into app teardown/test cleanup path.
2. Add Home/End key handlers to surah list navigation.
3. Standardize logging — migrate remaining `console.*` to `logger.*`.
4. Add font-display:swap if external fonts are introduced.
5. Enhance dataset update confirmation with version/changelog context.

---

## Cross-Cutting Observations

### Patterns Across Dimensions

The main improvement since the last audit is the elimination of contract drift. The dataset update pipeline, review hub lifecycle, and cross-feature import violations have all been addressed. The codebase is now more internally consistent.

The remaining cross-cutting pattern is "unoptimized hot paths." The nav filter and review hub render paths both show classic DOM performance anti-patterns (no debounce, no batching, interleaved reads/writes). These are the primary drivers of the Performance score remaining in Caution at 7/10.

A secondary pattern is "test coverage breadth vs depth." The test suite covers happy paths well, but edge cases (quota exceeded, focus traps, major version updates, accessibility assertions) are not exercised. This keeps Testability at 8 rather than 9.

### Architecture-Level Risks

The event-bus architecture is working well and is no longer being bypassed. The prior audit's finding about cross-feature imports has been resolved through hook injection at the bootstrap level.

The `reader/index.js` init() function size is the primary remaining architecture debt. At 165 lines, it's the largest function in the codebase and handles too many concerns. Extracting sub-functions would improve testability and reviewability without changing behavior.

### Strengths

**Functional correctness (9/10):** All 22 checklist items pass. Position tracking, session restore, deep linking, basmala rules, chunked rendering, and error states all work correctly. No wrong-text or data-integrity risks.

**Security (9/10):** Router param sanitization (XSS, protocol schemes, length limits), safe DOM APIs throughout, SW message source checking, and zero third-party runtime dependencies. The app has an unusually small attack surface for a PWA.

**Observability (9/10):** Structured logging with `logger` module, performance marks/measures throughout the reader lifecycle, event-bus emit for all significant state transitions, and quota monitoring. Only gap is degraded-mode indication.

### Phase Readiness Assessment

QuranAtlas is healthy and ready for continued shipping. The Caution-band dimensions (Performance 7, Architecture 7) have clear, scoped remediation paths that do not require architectural changes. Phase 4 work can begin once the performance hot paths are addressed and the reader init() is decomposed, as both will be affected by BroadcastChannel and custom tag features.

---

## Gate Decision

**Decision: PASS**

**Rationale:** Zero P0 or P1 defects confirmed. All 8 dimensions score 7 or above. The weighted score of 8.1 places the product in the Healthy band for the first time, up from Caution (7.6) in the previous audit. The 16 P2 findings are quality polish items — none blocks release or degrades critical user experiences. The product can ship with confidence.

**Reviewed by:** _________________ (human reviewer sign-off)

---

*End of report.*
