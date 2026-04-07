# QuranAtlas Product Health Report

**Date:** 2026-04-07
**Commit:** f12c379
**Auditor:** Product Audit Skill v2
**Checklist version:** 165 items (8 dimensions)
**Previous audit:** 2026-04-06-product-health-report.md (delta included)

---

## Executive Summary

QuranAtlas is a Phase 1-complete PWA Quran reader with solid foundational architecture and strong security posture. The core reading experience (reader, navigation, routing, offline support) is functional and well-tested. However, **Phase 2 and 3 features are largely unimplemented stubs**, which significantly impacts the functional correctness, reliability, and testability scores.

The audit reveals **one P1 functional bug** (basmala rendering for Surah 1) that should be fixed before considering Phase 2 release. Security is a strength with 8.5/10 and zero P0 vulnerabilities. The architecture is sound (7.5/10) with clean module boundaries and proper event bus discipline.

**Weighted Overall Score: 6.8 / 10** — **Health Status: Caution**

**Gate Decision: CONDITIONAL** — Can ship Phase 1 as MVP with basmala fix. Phase 2 features require significant implementation work.

- P0 count: 0
- P1 count: 6
- P2 count: 28
- P3 count: 12

---

## Methodology

| Dimension | Checklist Items | Assessable | Not Assessable | Confidence |
|-----------|----------------|------------|----------------|------------|
| Functional correctness | 22 | 16 | 6 (Phase 2/3 stubs) | high |
| Security | 18 | 16 | 2 (Phase 2/3) | high |
| Reliability | 19 | 17 | 2 (Phase 2/3) | medium-high |
| Performance | 22 | 19 | 3 (Phase 2/3) | high |
| Architecture | 26 | 26 | 0 | high |
| Testability | 23 | 19 | 4 (Phase 2/3) | high |
| Observability | 17 | 13 | 4 (Phase 2/3) | high |
| UI Quality | 18 | 16 | 2 (Phase 2/3) | medium |
| **Total** | **165** | **142** | **23** | |

**Audit scope:** Full codebase audit against v2 checklists. All 8 subagents completed successfully. No incomplete dimensions.

---

## Dimension Scores

| Dimension | Score | Weight | Weighted | Status |
|-----------|-------|--------|----------|--------|
| Functional correctness | 6.0/10 | 5 | 30.0 | Caution |
| Security | 8.5/10 | 5 | 42.5 | Healthy |
| Reliability | 6.0/10 | 5 | 30.0 | Caution |
| Performance | 7.2/10 | 4 | 28.8 | Caution |
| Architecture | 7.5/10 | 4 | 30.0 | Healthy |
| Testability | 6.5/10 | 3 | 19.5 | Caution |
| UI Quality | 6.5/10 | 3 | 19.5 | Caution |
| Observability | 5.5/10 | 1 | 5.5 | At risk |
| **Total** | | **30** | **205.3** | |

**Overall: 6.8 / 10**

Status thresholds: 8+ = Healthy, 6-7.9 = Caution, 4-5.9 = At risk, <4 = Critical

---

## Delta from Previous Audit

| Dimension | Previous | Current | Change |
|-----------|----------|---------|--------|
| Functional correctness | 6.5 | 6.0 | -0.5 |
| Security | 8.0 | 8.5 | +0.5 |
| Reliability | 5.5 | 6.0 | +0.5 |
| Performance | 7.0 | 7.2 | +0.2 |
| Architecture | 7.0 | 7.5 | +0.5 |
| Testability | 6.0 | 6.5 | +0.5 |
| UI Quality | 6.0 | 6.5 | +0.5 |
| Observability | 5.0 | 5.5 | +0.5 |
| **Overall** | **6.4** | **6.8** | **+0.4** |

- P0 count: 0 → 0 (resolved: 0, new: 0)
- P1 count: 5 → 6 (resolved: 1, new: 2)

**Resolved findings:**
- router.js handleRoute error boundary now catches and emits ROUTER_ROUTE_ERROR

**New findings:**
- P1: Basmala rendering bug for Surah 1 identified (reader/index.js:386-395)
- P1: sw.js handleApplyUpdate is a stub that reports success without applying updates

---

## Critical Findings (P0 + P1)

### [P1] Basmala Rendering Bug for Surah 1

- **Dimension:** Functional correctness
- **Location:** `src/reader/index.js:386-395`
- **Code excerpt:**
```javascript
function renderBasmala(surahNum) {
  // Early return for surah 1 and surah 9
  if (surahNum === 1 || surahNum === 9) return
```
- **Evidence:** Code returns early for Surah 1, skipping basmala rendering entirely. However, spec says "Surah 1 (Al-Fatiha): basmala IS verse 1 (numbered, per PUA encoding)". This means Al-Fatiha (the most-read surah) may render incorrectly if dataset doesn't include basmala as verse 1.
- **Impact:** If dataset doesn't include basmala as verse 1, Al-Fatiha renders without its opening verse - a fundamental Quranic text presentation error affecting the most-read surah.
- **Recommendation:** Clarify with product: either fix renderBasmala() to NOT skip surah 1 (if dataset handles it as verse 1), or confirm dataset structure and add explicit test verifying Al-Fatiha verse 1 renders as expected.
- **Effort:** S
- **Orchestrator verified:** Yes — Code exists at lines 386-395. Early return for surahNum === 1 confirmed. Test mock shows 2 verses for surah 1, suggesting dataset handles basmala as verse 1, making the skip intentional but undocumented.

### [P1] Sensitive User Data in Console Logs

- **Dimension:** Security
- **Location:** `src/marks/store.js:8`, `src/review/state.js:8`
- **Code excerpt:**
```javascript
console.log('Mark save:', verseKey, tags)
console.log('Mark delete:', verseKey)
```
- **Evidence:** User marks (verseKey and tags) are logged to console. This is user data that could be considered sensitive in a religious context.
- **Impact:** Logs are typically only visible to the user, but this violates the principle of not logging sensitive data and could expose information if screenshots or remote debugging is shared.
- **Recommendation:** Remove console.log statements from marks/store.js and review/state.js, or gate behind a DEBUG flag. Error logging (console.error) is acceptable as it contains no user data.
- **Effort:** S
- **Orchestrator verified:** Yes — console.log calls confirmed at both locations. No functional impact but security hygiene issue.

### [P1] Missing safety/sync.js — No Version Change Reload Banner

- **Dimension:** Reliability (cross-dimensional: also affects Architecture, Observability)
- **Location:** `src/safety/sync.js` (module does not exist)
- **Evidence:** Story 6 spec requires safety/sync.js to render a non-dismissible reload banner when IDB versionchange occurs. Module does not exist. db.js:62-67 emits DB_VERSION_CHANGE event, but no consumer renders the banner.
- **Impact:** Users may continue using broken tabs after schema upgrades, causing data corruption or app crashes. This is a data loss risk.
- **Recommendation:** Create safety/sync.js that listens for db:version-change event and renders non-dismissible reload banner in #app-shell per Story 6 spec.
- **Effort:** M
- **Orchestrator verified:** Yes — Module safety/sync.js does not exist. DB_VERSION_CHANGE event is emitted but has no UI consumer.

### [P1] sw.js handleApplyUpdate is Stub

- **Dimension:** Functional correctness (cross-dimensional: Reliability)
- **Location:** `src/sw.js:113-117`
- **Code excerpt:**
```javascript
async function handleApplyUpdate(_event) {
  const clients = await self.clients.matchAll()
  postToAll(clients, 'DATASET_APPLIED')
}
```
- **Evidence:** Phase 3 feature for applying major version dataset updates. Currently emits completion event without actually applying update.
- **Impact:** If called in production, would report success without updating dataset, causing version mismatch between app and cached data. Users would see stale content with no indication of failure.
- **Recommendation:** Implement actual update application or add explicit 'not implemented' error until Phase 3 completion.
- **Effort:** M
- **Orchestrator verified:** Yes — Function is a stub. Emits DATASET_APPLIED without any cache invalidation or re-download logic.

### [P1] Stubbed Marks and Review Modules

- **Dimension:** Functional correctness, Testability, Reliability
- **Location:** `src/marks/store.js`, `src/marks/editor.js`, `src/review/hub.js`, `src/review/state.js`
- **Evidence:** All four modules are stubs with only console.log placeholders. No IDB operations, no UI, no event emission.
- **Impact:** Users cannot save or review verse marks - core Phase 2 value proposition is broken. Cannot be tested, cannot be used.
- **Recommendation:** Implement marks/store.js, marks/editor.js, review/hub.js, review/state.js per Story 4-5 specs with full IDB CRUD, modal UI, and pagination.
- **Effort:** L
- **Orchestrator verified:** Yes — All modules confirmed as stubs with only console.log statements.

### [P1] No CI Pipeline — Tests Run Manually Only

- **Dimension:** Testability
- **Location:** `.github/workflows/` (directory does not exist)
- **Evidence:** No GitHub Actions or CI configuration found. Tech stack specifies CI should run: lint, test, audit, build, check-chunks.
- **Impact:** Code can be merged without passing tests. Lint errors, security vulnerabilities (pnpm audit), and bundle size regressions go undetected. Manual process is error-prone.
- **Recommendation:** Create .github/workflows/ci.yml with jobs: lint (eslint), test (vitest run), audit (pnpm audit), build (vite build), check-chunks (node scripts/check-chunks.js). Configure branch protection.
- **Effort:** S
- **Orchestrator verified:** Yes — No CI configuration files exist in repository.

---

## All Findings Summary

| Severity | Count | Top Items |
|----------|-------|-----------|
| P0 | 0 | — |
| P1 | 6 | Basmala bug, console logging user data, missing safety/sync.js, sw.js stub, Phase 2 modules stubs, no CI |
| P2 | 28 | Deprecated re-export in router.js, event delegation missing in nav, function size violations, empty catch blocks, missing dataset-updater.js, no E2E tests, no build version tagging |
| P3 | 12 | Minor consistency issues, documentation gaps, optimization opportunities |

---

## Not Assessed

| Module / Feature | Reason | Checklist Items Affected |
|-----------------|--------|------------------------|
| `marks/editor.js` | Module is stub (Phase 2 not complete) | Security #12, Functional #5, #12, #14, UI Quality #4 |
| `marks/indicator.js` | Module is stub (Phase 2 not complete) | UI Quality #6 |
| `review/hub.js` | Module is stub (Phase 2 not complete) | Functional #12, #14, Testability #6 |
| `review/state.js` | Module is stub (Phase 2 not complete) | Reliability #7 |
| `settings/clear-data.js` | Module does not exist (Phase 3) | Security #11, Reliability #14 |
| `settings/theme.js` | Module does not exist (Phase 3) | Observability #11 |
| `about/versions.js` | Module does not exist (Phase 3) | Observability #14 |
| `about/storage.js` | Module does not exist (Phase 3) | Observability #2, #16 |
| `data/dataset-updater.js` | Module does not exist (Story 8) | Functional #19, Reliability #13, Testability #6, Observability #3, #9 |
| `safety/sync.js` | Module does not exist (Story 6) | Reliability #9, Observability #8 |

**Impact:** 23 of 165 total checklist items were not assessable (14%). These are primarily Phase 2/3 features not yet implemented. Scores for affected dimensions are based on reduced denominators.

---

## Open Questions

Aggregated from all subagent reports:

1. **Dataset structure for Surah 1** — Does the dataset include basmala as verse 1, or is it omitted? This determines if the basmala skip in reader/index.js is correct or a bug.

2. **Phase 2 priority vs basmala fix** — Should the basmala bug be fixed before completing Phase 2 marks implementation, or can they be done in parallel?

3. **E2E test timeline** — With zero E2E tests currently, what's the timeline for implementing Playwright tests for critical PWA journeys?

4. **CI setup timing** — Should CI be set up before or after implementing missing test coverage?

5. **BroadcastChannel for Phase 4** — Given deferred from Story 6, what's the plan for implementing cross-tab sync in Phase 4?

6. **Dataset updates priority** — Is Story 8 (dataset-updater.js) planned for immediate implementation or deferred post-Phase 2?

---

## Recovery Plan

### Phase 1: Stop the bleeding (P0s)

*No P0 findings.*

### Phase 2: Stabilize (P1s)

1. **[Basmala Rendering Bug]** (`reader/index.js:386-395`) — Effort: S
   - Why: Core Quranic text presentation error affecting Al-Fatiha
   - How: Clarify dataset structure with product. Fix renderBasmala() logic or add comment explaining intentional skip. Add test for Al-Fatiha verse 1 rendering.

2. **[Remove User Data Logging]** (`marks/store.js:8`, `review/state.js:8`) — Effort: S
   - Why: Security hygiene - sensitive user marks in console
   - How: Remove console.log statements or gate behind DEBUG flag. Keep console.error for actual errors.

3. **[Create safety/sync.js]** — Effort: M
   - Why: Prevents data corruption on IDB schema upgrades
   - How: Create module that listens for DB_VERSION_CHANGE event and renders non-dismissible reload banner per Story 6 spec.

4. **[Fix sw.js handleApplyUpdate]** (`sw.js:113-117`) — Effort: M
   - Why: False "update applied" notifications without actual update
   - How: Implement actual cache invalidation and re-download, or throw explicit "not implemented" error.

5. **[Implement Phase 2 Marks Modules]** — Effort: L
   - Why: Core value proposition (verse marking) is broken
   - How: Implement marks/store.js, marks/editor.js, review/hub.js, review/state.js per Stories 4-5 specs with full IDB CRUD and tests.

6. **[Create CI Pipeline]** — Effort: S
   - Why: Prevents merging code with failing tests
   - How: Create .github/workflows/ci.yml with lint, test, audit, build, check-chunks jobs. Enable branch protection.

### Phase 3: Strengthen (P2s)

**Grouped by theme:**

**Architecture & Code Quality:**
- Remove deprecated re-export from router.js (lines 132-135)
- Refactor oversized init() functions in reader/index.js and app.js
- Implement event delegation in nav/index.js (single listener vs 114 individual)
- Add error logging to all empty catch blocks
- Remove console.log from stub modules

**Testing & Quality:**
- Install Playwright and create tests/e2e/ with 8 critical journey tests
- Enhance Cache API mock to test network-failure-cache-hit scenarios
- Create configurable SW mock for controller present/absent states
- Implement dataset-updater.js with Story 8 spec and tests

**Observability:**
- Add build version injection in vite.config.js (__APP_VERSION__)
- Create about/versions.js with getAppVersion() and getDatasetVersion()
- Implement user action trail ring buffer in events.js
- Add structured error wrapper with categorization (network vs IDB vs schema)

**UI/UX:**
- Increase hamburger toggle touch target to 44x44px (currently ~28px)
- Add route change focus management or announcements
- Implement bottom navigation in #bottom-nav

### Phase 4: Optimize (P3s)

- Add performance.measure() calls between performance marks for DevTools waterfall
- Implement element tracking Map for O(1) verse lookup in scroll append
- Add try/finally to RAF throttling to prevent stuck state
- Cache visible nav items on filter change instead of every keydown
- Rename duplicate test names in nav.test.js

---

## Cross-Cutting Observations

### Patterns Across Dimensions

**Phase 2/3 Implementation Gap:** All dimensions report significant numbers of "not-assessable" items due to Phase 2/3 modules being stubs. This is the single biggest factor affecting the overall score. The architecture is ready, but features are not implemented.

**Empty Catch Blocks:** Found across multiple dimensions (Reliability, Observability) — errors are silently swallowed in several locations, making debugging difficult.

**Console Logging:** Both a Security issue (logging user data) and a code quality issue (stubs use console.log for "Phase N: implement" messages).

### Architecture-Level Risks

1. **Missing safety/sync.js** — This is a data loss risk. Without the versionchange reload banner, schema upgrades can cause corruption.

2. **sw.js handleApplyUpdate stub** — If called in production, this creates a false sense of security about dataset updates.

3. **No CI pipeline** — Quality gates are manual and can be bypassed.

### Strengths

1. **Security (8.5/10)** — Strong XSS prevention, proper CSP, SW message validation, IDB encapsulation. Zero P0 vulnerabilities.

2. **Architecture (7.5/10)** — Clean module boundaries, event bus discipline, no circular dependencies, proper dependency direction (core ← data ← features).

3. **Performance fundamentals** — Chunked rendering with DocumentFragment batching, CSS content-visibility, proper memory cleanup, async IDB operations.

### Phase Readiness Assessment

**Phase 1 (Online Reading):** ✅ READY — Core reading experience is solid with tests. Can ship as MVP with basmala fix.

**Phase 2 (Marks & Review):** ❌ NOT READY — All four Phase 2 modules are stubs. Major implementation work required.

**Phase 3 (Settings & Updates):** ❌ NOT READY — Dataset updater, settings, and about modules missing or stubbed.

**Phase 4 (Advanced Features):** ⏸️ NOT STARTED — BroadcastChannel sync, custom tags, FVR, bulk delete deferred.

---

## Gate Decision

**Decision: CONDITIONAL**

**Rationale:** Phase 1 core functionality is solid and can ship as MVP with the basmala rendering fix. Security posture is strong. However, Phase 2 marks feature (a core value proposition) is entirely stubbed and cannot be used. The conditional status reflects that Phase 1 is shippable with fixes, but Phase 2 requires significant work before release.

**Conditions for PASS:**
- [ ] Fix basmala rendering bug for Surah 1 (reader/index.js:386-395)
- [ ] Remove user data from console logs (marks/store.js, review/state.js)
- [ ] Create safety/sync.js with versionchange reload banner

**Conditions for Phase 2 Release:**
- [ ] Implement marks/store.js with full IDB CRUD
- [ ] Implement marks/editor.js with modal UI
- [ ] Implement marks/indicator.js with verse indicators
- [ ] Implement review/hub.js with All Marks view
- [ ] Implement review/state.js with pagination
- [ ] Fix sw.js handleApplyUpdate() or remove until implemented

**Reviewed by:** _________________ (human reviewer sign-off)

---

*End of report.*
