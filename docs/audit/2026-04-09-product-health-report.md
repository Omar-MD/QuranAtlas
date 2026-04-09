# QuranAtlas Product Health Report

**Date:** 2026-04-09
**Commit:** 37b794d
**Auditor:** Product Audit Skill v2
**Checklist version:** 165 items (8 dimensions; mixed v2/v3 checklists)
**Previous audit:** 2026-04-08 — [2026-04-08-product-health-report-v2.md](2026-04-08-product-health-report-v2.md)

---

## Executive Summary

QuranAtlas remains a solid, shippable vanilla JS PWA with strong reader performance, mature accessibility work, and a conservative security posture. The current risks are no longer wrong-text, XSS, or broken-navigation failures; they are contract drift and guardrail gaps around the dataset update pipeline, a small number of feature-boundary leaks, and incomplete automated release protection around service-worker behavior, performance budgets, and coverage enforcement. The product is healthy enough to continue shipping Phase 3 work, but the update path and architecture contracts need tightening before Phase 4 expansion.

**Weighted Overall Score: 7.6 / 10** — **Health Status: Caution**

**Gate Decision: PASS**

- P0 count: 0
- P1 count: 0
- P2 count: 7
- P3 count: 3

---

## Methodology

| Dimension | Checklist Items | Assessable | Not Assessable | Confidence |
|-----------|----------------|------------|----------------|------------|
| Functional correctness | 22 | 22 | 0 | high |
| Security | 18 | 18 | 0 | high |
| Reliability | 19 | 17 | 2 | high |
| Performance | 22 | 21 | 1 | high |
| Architecture | 26 | 25 | 1 | high |
| Testability | 23 | 23 | 0 | high |
| UI Quality | 18 | 16 | 2 | high |
| Observability | 17 | 17 | 0 | high |
| **Total** | **165** | **159** | **6** | |

**Audit scope:** Full codebase audit against the current 8 checklists, product docs, story specs, tests, and configuration. All 8 subagents completed successfully.

**Orchestrator verification notes:**

- 3 subagent findings were initially labeled `P1`; all 3 were downgraded to `P2` under the Absence Test or weight-severity coherence.
- 1 non-critical architecture claim was rejected after direct source read: `src/review/hub.js` does export `cleanup()`; the real issue is unsubscribed event listeners created inside `init()`.
- No dimensions were incomplete.

---

## Dimension Scores

| Dimension | Score | Weight | Weighted | Status |
|-----------|-------|--------|----------|--------|
| Functional correctness | 7/10 | 5 | 35.0 | Caution |
| Security | 9/10 | 5 | 45.0 | Healthy |
| Reliability | 7/10 | 5 | 35.0 | Caution |
| Performance | 8/10 | 4 | 32.0 | Healthy |
| Architecture | 7/10 | 4 | 28.0 | Caution |
| Testability | 7/10 | 3 | 21.0 | Caution |
| UI Quality | 8/10 | 3 | 24.0 | Healthy |
| Observability | 7/10 | 1 | 7.0 | Caution |
| **Total** | | **30** | **227.0 / 300** | |

**Overall: 7.6 / 10**

Status thresholds: 8+ = Healthy, 6-7.9 = Caution, 4-5.9 = At risk, <4 = Critical

---

## Delta from Previous Audit

| Dimension | Previous | Current | Change |
|-----------|----------|---------|--------|
| Functional correctness | 7.0 | 7.0 | 0.0 |
| Security | 8.0 | 9.0 | +1.0 |
| Reliability | 6.0 | 7.0 | +1.0 |
| Performance | 6.0 | 8.0 | +2.0 |
| Architecture | 9.0 | 7.0 | -2.0 |
| Testability | 7.0 | 7.0 | 0.0 |
| UI Quality | 7.0 | 8.0 | +1.0 |
| Observability | 5.0 | 7.0 | +2.0 |
| **Overall** | **7.1** | **7.6** | **+0.5** |

- P0 count: 0 → 0 (resolved: 0, new: 0)
- P1 count: 0 → 0 (resolved: 0, new: 0)

**Resolved findings / no regressions observed:**

1. Prior audit improvements around quota warnings, quota banners, session-restore logging, action trail capture, responsive breakpoints, touch targets, and theme-aware tag colors remain in place.
2. No previously-resolved P0/P1 issue regressed.
3. Earlier performance fixes around chunked rendering, non-blocking theme apply, and mark-indicator caching remain intact.

**New or newly-detected findings:**

1. `reader/` and `review/` now clearly violate the documented no-sibling-import rule via direct imports from `marks/`.
2. `review/hub.js` leaks event subscriptions across navigation because `init()` registers listeners that `cleanup()` never unsubscribes.
3. The Story 8 update path still diverges from its documented contract in state shape and event propagation.
4. CI runs `vitest run` but does not enforce the configured coverage thresholds.
5. Undo-toast dismissal still depends on `navigation:navigate` rather than all route-change paths.

---

## Critical Findings (P0 + P1)

*No P0 or P1 findings remain after orchestrator verification.*

### Orchestrator Verification Results

| # | Original P1 Claim | Dimension | Verification Result | Reason |
|---|---|---|---|---|
| 1 | Dedicated `src/sw.js` handler tests are missing | Testability | **Downgraded → P2** | Verified absence of service-worker handler tests. This is a guardrail gap, not a demonstrated broken feature. |
| 2 | Automated performance regression tests are missing | Testability | **Downgraded → P2** | Verified absence of explicit timing assertions or benchmarks. This is an absence, not a live user-facing defect. |
| 3 | Dataset update transitions are missing from the core event bus | Observability | **Downgraded → P2** | Verified spec/implementation drift between Story 8 and the shipped client/SW event path. No current data loss, wrong text, or broken navigation was proven. |

**Rejected findings:**

- `Architecture`: `src/review/hub.js` “missing cleanup export” was rejected. The file does export `cleanup()`; the confirmed defect is that `init()` registers listeners at `src/review/hub.js:58` and `src/review/hub.js:66` without retaining the unsubscribe functions.

---

## All Findings Summary

| Severity | Count | Top Items |
|----------|-------|-----------|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 7 | Architecture boundary leaks; review-hub listener cleanup leak; dataset update contract drift; undo-toast navigation gap; missing SW handler tests; missing performance budget tests; coverage thresholds not enforced in CI |
| P3 | 3 | Console-output regression capture absent; tablet-width E2E coverage gap; theme-change event payload parity |

### P2 Findings

1. **Cross-feature imports bypass the documented module communication rules**
   - **Dimension:** Architecture
   - **Location:** `src/reader/index.js:13`, `src/reader/index.js:14`, `src/review/hub.js:12`, `docs/tech-stack.md:116-117`
   - **Evidence:** `reader/index.js` imports `../marks/indicator.js` and `../marks/editor.js`, and `review/hub.js` imports `../marks/editor.js`, while `docs/tech-stack.md` states that only `safety/` and `a11y/` may be imported directly by any feature module and that the sole sibling-import exception is `review/` → `marks/store.js`.
   - **Impact:** The architectural contract is no longer enforceable by inspection. Further Phase 4 work will accumulate additional coupling unless these exceptions are either formalized or removed.
   - **Recommendation:** Move indicator/editor hookup behind explicit event-bus or central bootstrap wiring, or update the documented contract and enforce it with tooling.

2. **Review hub registers long-lived event listeners that cleanup does not unsubscribe**
   - **Dimension:** Architecture, Reliability
   - **Location:** `src/review/hub.js:58`, `src/review/hub.js:66`, `src/review/hub.js:159`, `src/core/events.js:21-25`
   - **Evidence:** `review/hub.js` calls `on(Events.SYNC_UPDATE_RECEIVED, ...)` and `on(Events.DB_VISIBILITY_VISIBLE, ...)` inside `init()`, but `cleanup()` only clears UI state and never calls the unsubscribe functions that `on()` returns.
   - **Impact:** Every revisit to `#/review` adds more listeners, causing duplicate reloads and avoidable IDB churn over long sessions.
   - **Recommendation:** Store unsubscribe handles in module scope and call them from `cleanup()`.

3. **Dataset update state and lifecycle contract drift across modules**
   - **Dimension:** Reliability, Observability, Architecture
   - **Location:** `src/offline/dataset-updater.js:76`, `src/data/offline.js:29`, `src/core/db.js:174`, `src/offline/manifest-fetcher.js:12`, `docs/specs/story-8-dataset-updates.md:72-78`
   - **Evidence:** `dataset-updater.js` writes `activationState` records with `status: 'cached'` plus a separate `state` field, while `data/offline.js` reads only `record?.status` and `core/db.js` validates `activationState` as `['id', 'status']`. Story 8 also requires update lifecycle events on `src/core/events.js`, while the implementation only postMessages clients from the service-worker side.
   - **Impact:** The update subsystem no longer has a single canonical contract. That makes it harder to reason about interrupted downloads, user-facing update state, and future Story 9 / Phase 4 UI work.
   - **Recommendation:** Pick one `activationState` shape, align all readers/writers to it, add a client-side bridge from SW messages to `Events.DATASET_*`, and add a timeout to `fetchManifest()`.

4. **Undo toast is not cleared on all navigation paths**
   - **Dimension:** Functional correctness
   - **Location:** `src/marks/editor.js:239-245`, `src/reader/index.js:191-213`, `src/core/ui.js:67`
   - **Evidence:** `setupLongPress()` clears the undo toast only on `Events.NAVIGATION_NAVIGATE`, while `reader.cleanup()` does not call `clearUndoToast()`.
   - **Impact:** Direct hash navigation and browser back/forward can leave a stale undo opportunity visible after the user has left the surface that created it.
   - **Recommendation:** Clear the undo toast in `reader.cleanup()` and any other route cleanup paths, not only on nav-panel events.

5. **`src/sw.js` critical handlers lack dedicated automated tests**
   - **Dimension:** Testability
   - **Location:** `src/sw.js:1-171`, `tests/setup.js:22-28`
   - **Evidence:** The repository contains client-side service-worker mocks in `tests/setup.js`, but no dedicated test file covers `activate`, `CACHE_DATASET`, `APPLY_DATASET_UPDATE`, or `PURGE_DATASET_CACHE` behavior in `src/sw.js`.
   - **Impact:** Cache cleanup, corpus-download resilience, and update-apply flows can regress without a direct test signal.
   - **Recommendation:** Add service-worker-context tests for activate/message handlers and cache operations.

6. **Product performance budgets are not regression-tested**
   - **Dimension:** Testability, Performance
   - **Location:** `vitest.config.js:5-21`, `playwright.config.js:20-26`
   - **Evidence:** The configured tests cover unit and E2E flows, but there is no dedicated performance suite and no explicit timing assertions for the documented budgets.
   - **Impact:** Regressions against the reader’s mobile performance targets can ship silently until a user feels them.
   - **Recommendation:** Add automated timing assertions or benchmarks for first-verse render, chunk append, mark persistence, visibility re-read, and update-check latency.

7. **Coverage thresholds exist locally but are not enforced in CI**
   - **Dimension:** Testability
   - **Location:** `vitest.config.js:17-21`, `package.json:12`, `.github/workflows/ci.yml:56`
   - **Evidence:** `vitest.config.js` defines coverage thresholds, `package.json` exposes `test:coverage`, but CI runs `pnpm run test:run`, not `pnpm run test:coverage`.
   - **Impact:** Coverage can drift downward without any failing CI signal, even though the repository appears to have a coverage policy.
   - **Recommendation:** Add a CI job that runs coverage and fails on threshold breach, or remove the thresholds if they are intentionally advisory only.

### P3 Findings

1. **Console error/warn regression capture is absent in shared test setup**
   - **Location:** `tests/setup.js:1-28`
   - **Recommendation:** Add shared `console.error` / `console.warn` spies and fail happy-path tests that emit unexpected console noise.

2. **Tablet-width E2E coverage is missing from the Playwright matrix**
   - **Location:** `playwright.config.js:20-26`
   - **Recommendation:** Add an explicit 768px tablet project so the breakpoint between mobile overlay nav and larger layouts is exercised.

3. **Theme-change event payload does not match the Story 9 contract**
   - **Location:** `src/settings/theme.js:57`, `docs/specs/story-9-settings-about.md:112-116`
   - **Recommendation:** Emit `{ from, to }` instead of only `{ theme }` for better diagnostics and contract parity.

---

## Not Assessed

| Module / Feature | Reason | Checklist Items Affected |
|-----------------|--------|--------------------------|
| Real-device reader timing on throttled/mobile hardware | Requires executed runtime measurement, not repository-only review | Performance #1, #13, #14 |
| Responsive behavior on actual device/browser matrices | Requires executed viewport/device runs rather than static code inspection | UI Quality #12, #13 |
| Future-phase extension seams beyond currently implemented flows | Not all Phase 4 behaviors exist yet to validate end-to-end | Architecture #10 |

**Impact:** 6 of 165 total checklist items were not directly assessable from repository evidence alone. Scores are based on 159 assessable items.

---

## Open Questions

1. **Should Story 8 be updated to match the shipped staging-cache / SHA-256 implementation, or should the code be simplified back to the documented “no staging cache / no per-file SHA” flow?** — Context: the code in `src/offline/` is materially more complex than the simplified Story 8 spec. — Impact if true: ongoing spec/code drift will keep surfacing as reliability and observability debt.
2. **Should manifest-fetch/update-check failures remain silent by product decision, or surface a user-visible retry path?** — Context: Story 8 explicitly allows silent skip, but the current implementation already has more update machinery than the simplified spec. — Impact if true: users may remain on stale datasets without any signal.
3. **Is `logger` intended to replace direct `console.*` calls app-wide, or remain limited to launch diagnostics?** — Context: `app.js` uses `logger.info`, while most other modules still write directly to `console`. — Impact if true: inconsistent diagnostics will continue to limit structured debugging.
4. **Is coverage enforcement in CI intentionally advisory only?** — Context: thresholds are configured, but CI does not run the coverage command. — Impact if true: the testability score should tolerate that drift; if not, it is an easy process fix.

---

## Recovery Plan

### Phase 1: Stop the bleeding (P0s)

No P0 findings.

### Phase 2: Stabilize (P1s)

No P1 findings.

### Phase 3: Strengthen (P2s)

**Theme: Architecture contract**

1. Remove or formalize the direct `reader/` → `marks/` and `review/` → `marks/editor.js` imports.
2. Retain unsubscribe handles for `review/hub.js` listeners and release them in `cleanup()`.

**Theme: Dataset update pipeline**

3. Align `activationState` shape across `src/core/db.js`, `src/data/offline.js`, and `src/offline/dataset-updater.js`.
4. Bridge Story 8 update transitions onto the client event bus or update the spec to match the shipped SW/client split.
5. Add a timeout and explicit failure behavior to `src/offline/manifest-fetcher.js`.

**Theme: Reader UX polish**

6. Clear undo toasts from all route-cleanup paths, not only `navigation:navigate`.

**Theme: Release guardrails**

7. Add dedicated `src/sw.js` handler tests.
8. Add automated performance budget assertions for the documented reader/update targets.
9. Enforce coverage thresholds in CI with `pnpm run test:coverage` or equivalent.

### Phase 4: Optimize (P3s)

1. Add shared console-noise regression capture to `tests/setup.js`.
2. Add a tablet viewport project to Playwright.
3. Make `settings:theme-changed` payloads match the `{ from, to }` Story 9 contract.

---

## Cross-Cutting Observations

### Patterns Across Dimensions

The main hot spot is the dataset update subsystem. Story 8’s documented contract, the SW implementation, the IDB schema expectations, and the client event model are no longer fully aligned. That one subsystem now drives findings in Reliability, Observability, Architecture, and Testability.

The second recurring pattern is “documented rule without enforcement.” The codebase documents strong architecture and testing rules, but direct feature imports and CI coverage enforcement gaps show that those rules are not yet mechanically enforced.

### Architecture-Level Risks

The event-bus architecture is still the right backbone for this app, but it is being bypassed in a few strategically important places: feature imports in `reader/` and `review/`, and update-state communication split across SW postMessages with no client-side re-emission into `core/events.js`.

The `activationState` store is also doing too much with no single canonical shape. As long as one subsystem treats it as `{ status }` and another treats it as `{ status, state, progress, version }`, future update and recovery behavior will stay fragile.

### Strengths

Security remains the strongest dimension: corpus rendering uses safe DOM APIs, router params are sanitized, service-worker messages are source-checked, and the app ships without third-party runtime script dependencies.

Reader performance architecture is also strong. Chunked rendering, `content-visibility`, a reverse-cursor lookup for recent positions, and lazy route loading all survive close inspection.

UI quality has held onto the prior audit’s gains. Semantic structure, focus visibility, touch targets, and theme completeness remain in good shape and did not regress.

### Phase Readiness Assessment

QuranAtlas is ready for continued Phase 3 stabilization work and cautious Phase 4 planning. It is **not** blocked from shipping the current feature set. Before Phase 4 implementation begins in earnest, the codebase should close the update-pipeline contract drift and enforce its own architecture/test guardrails so new cross-tab and custom-tag features do not land on top of ambiguous state behavior.

---

## Gate Decision

**Decision: PASS**

**Rationale:** No P0 or P1 defects were confirmed in the current codebase, and the highest-risk issues are P2 process/contract problems rather than release blockers. QuranAtlas can ship the current feature set with confidence, but Phase 4 should not proceed without tightening the update pipeline and enforcing the documented module/testing rules.

**Reviewed by:** _________________ (human reviewer sign-off)

---

*End of report.*