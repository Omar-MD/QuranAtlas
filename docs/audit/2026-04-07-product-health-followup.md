# QuranAtlas Product Health Report — Follow-Up Audit

**Date:** 2026-04-07 (Follow-up)
**Previous Audit:** 2026-04-07-product-health-report.md
**Commit:** f12c379
**Auditor:** Product Audit Skill — Follow-Up Mode

---

## Executive Summary

This follow-up audit verifies the resolution status of **6 P1 issues** identified in the previous full audit (2026-04-07). The results show **mixed progress**: 3 P1 issues have been resolved, while 3 remain open. Additionally, **new findings** have emerged that require attention.

### P1 Issue Resolution Summary

| Issue | Dimension | Status | Evidence |
|-------|-----------|--------|----------|
| **Basmala Rendering Bug** | Functional correctness | ✅ **RESOLVED** | `src/reader/index.js:391-402` now correctly renders basmala for Surah 1 as verse 1, only skipping Surah 9 |
| **Console logging user data** | Security | ✅ **RESOLVED** | `src/marks/store.js` and `src/review/state.js` no longer contain console.log statements logging sensitive data |
| **Missing safety/sync.js** | Reliability | ✅ **RESOLVED** | `src/safety/sync.js` created (87 lines) with non-dismissible reload banner per Story 6 spec |
| **sw.js handleApplyUpdate stub** | Functional correctness | ❌ **STILL OPEN** | Still throws "Phase 3 feature" error at `src/sw.js:113-117` |
| **Stubbed Marks/Review modules** | Functional correctness | ❌ **STILL OPEN** | All 4 modules remain unimplemented stubs with only console.log placeholders |
| **No CI pipeline** | Testability | ❌ **STILL OPEN** | No `.github/workflows/` directory exists |

**Resolution Rate: 3/6 P1 issues resolved (50%)**

---

## Dimension Score Delta

| Dimension | Previous | Current | Change | Status |
|-----------|----------|---------|--------|--------|
| Functional correctness | 6.0 | **4.0** | -2.0 | ⚠️ **REGRESSION** |
| Security | 8.5 | **8.0** | -0.5 | ✅ **Maintained** |
| Reliability | 6.0 | **8.0** | +2.0 | ✅ **IMPROVED** |
| Testability | 6.5 | **6.0** | -0.5 | ⚠️ **Declined** |

### Score Change Analysis

- **Functional correctness (-2.0)**: While basmala bug is fixed, deeper inspection revealed more Phase 2/3 stubs than previously catalogued, plus new P1 findings (router test failure, settings unimplemented)
- **Security (-0.5)**: P1 console logging resolved, but minor URL logging and parameter sanitization gaps identified
- **Reliability (+2.0)**: Major improvement — safety/sync.js fully implemented with non-dismissible versionchange banner per spec
- **Testability (-0.5)**: E2E coverage improved (+5 test files), but CI still missing, plus new lint errors and security vulnerabilities that would fail CI

---

## Detailed Verification Results

### ✅ RESOLVED: Basmala Rendering Bug for Surah 1

**Location:** `src/reader/index.js:391-402`

**Previous State:**
```javascript
function renderBasmala(surahNum) {
  // Early return for surah 1 and surah 9
  if (surahNum === 1 || surahNum === 9) return
```

**Current State:**
```javascript
function renderBasmala(container, surahNum) {
  // Surah 1 includes basmala as verse 1 from the dataset
  // Surah 9 (At-Tawbah) does not have basmala
  if (surahNum === 9) { return }
  // ... renders basmala for all surahs except 9
}
```

**Verification:** Code now correctly only skips basmala for Surah 9 (At-Tawbah) and renders it for Surah 1 (Al-Fatiha) and all other surahs. Comment at line 387 confirms dataset handles Surah 1 basmala as verse 1.

---

### ✅ RESOLVED: Sensitive User Data in Console Logs

**Location:** `src/marks/store.js`, `src/review/state.js`

**Previous State:**
```javascript
console.log('Mark save:', verseKey, tags)
console.log('Mark delete:', verseKey)
```

**Current State:**
Both files reduced to implementation stubs with NO console.log statements. User marks data (verseKey, tags) is no longer logged.

**Verification:** Confirmed both modules contain only stub functions with comments indicating Phase 2 implementation pending. No user data logging present.

---

### ✅ RESOLVED: Missing safety/sync.js — No Version Change Reload Banner

**Location:** `src/safety/sync.js` (new file, 87 lines)

**Implementation Details:**
- Listens for `Events.DB_VERSION_CHANGE` from `core/events.js`
- Renders truly **non-dismissible** reload banner with:
  - Backdrop blocking `#app-shell` via `pointer-events: none`
  - "Update Required" title
  - Message explaining another tab updated the app
  - Single "Reload Now" button — **no close/dismiss affordance**
- Works even after DB connection is closed (no IDB reads required)
- Integrated into `core/app.js` initialization

**Verification:** Module exists and implements all Story 6 (Q4) requirements. Prevents data corruption from schema upgrades by forcing reload.

---

### ❌ STILL OPEN: sw.js handleApplyUpdate is Stub

**Location:** `src/sw.js:113-117`

**Current State:**
```javascript
async function handleApplyUpdate(_event) {
  throw new Error('APPLY_DATASET_UPDATE not implemented - Phase 3 feature')
}
```

**Impact:** If called in production, would report failure without applying dataset updates, causing version mismatch between app and cached data.

**Status:** Explicitly deferred to Phase 3. No partial implementation exists.

---

### ❌ STILL OPEN: Stubbed Marks and Review Modules

**Locations:**
- `src/marks/store.js` — Empty save/del stubs
- `src/marks/editor.js` — Only `console.log('Mark editor init')`
- `src/review/hub.js` — Only `console.log('Review hub init')`
- `src/review/state.js` — Empty save/load stubs returning null

**Impact:** Users cannot create, edit, or review verse marks — a core Phase 2 value proposition. All four modules are completely non-functional.

**Status:** Phase 2 implementation pending. No work has begun on these features since previous audit.

---

### ❌ STILL OPEN: No CI Pipeline — Tests Run Manually Only

**Location:** `.github/workflows/` (directory does not exist)

**Impact:** 
- Code can be merged without passing tests
- Lint errors accumulate (2 new ESLint errors found in reader/index.js)
- Security vulnerabilities go undetected (3 high-severity CVEs in vite, serialize-javascript)
- Bundle size regressions not caught

**New Blockers for CI:**
1. **ESLint errors** (2) in `src/reader/index.js:61,73` — missing curly braces
2. **Security vulnerabilities** (3 high) — vite@8.0.3 (2 CVEs), serialize-javascript RCE

**Recommendation:** Fix lint errors and update dependencies BEFORE creating CI, then enable CI to prevent recurrence.

---

## New Findings Summary

### Critical New Findings (P1)

| Finding | Location | Description |
|---------|----------|-------------|
| Settings page unimplemented | `src/settings/index.js:6-9` | Phase 3 feature completely missing — console.log placeholder only |
| Router test failure | `tests/unit/core/router.test.js:21` | 1/131 tests failing — module init may not be called correctly with params |
| Settings modules missing | `src/settings/` | `theme.js` and `clear-data.js` do not exist per Story 9 spec |
| ESLint errors blocking CI | `src/reader/index.js:61,73` | Missing curly braces — would cause CI lint step to fail |
| Security vulnerabilities | `package.json` | 3 high-severity CVEs in vite and serialize-javascript |

### Warning New Findings (P2)

| Finding | Location | Description |
|---------|----------|-------------|
| Position save race condition | `reader/index.js` + `scroll-tracker.js` | visibilitychange save may use stale position if debounce hasn't fired |
| No QuotaExceededError handling | `core/db.js:138-148` | Storage full errors not surfaced to users |
| Missing visibilitychange re-read | `nav/`, `review/`, `settings/`, `about/` | Story 6 spec requires ALL modules re-read on visibilitychange — only reader/ implements |
| E2E coverage incomplete | `tests/e2e/` | 5 tests added (good!) but missing: PWA install, marks flow, offline mode, cross-tab sync |
| Console error regression missing | `tests/setup.js` | No mechanism to fail tests on unexpected console.error |
| Mock fidelity issues persist | `tests/setup.js` | Cache always returns undefined, SW controller always null — prevents cache-hit path testing |
| URL parameter sanitization gap | `src/core/router.js:110-129` | No explicit XSS payload rejection after URL decoding |
| Navigation fuzzy matching | `src/safety/input-validator.js` | Uses `includes()` instead of strict matching per Story 3 spec |

---

## Cross-Cutting Observations

### What's Working Well ✅

1. **Reliability infrastructure** — safety/sync.js implementation shows the team can deliver complex safety features correctly when prioritized
2. **Basmala fix** — Quick response to Quranic text presentation issue shows attention to core functionality
3. **Security hygiene** — Removed user data logging promptly, maintains strong XSS prevention and CSP
4. **E2E test creation** — +5 new Playwright tests show investment in end-to-end coverage
5. **Test maintenance** — 130/131 unit tests passing (99.2%) — existing tests remain stable

### Patterns of Concern ⚠️

1. **Phase 2/3 implementation gap persists** — The single biggest factor affecting scores is unimplemented stubs. Marks, review hub, settings, and dataset updates are all Phase 2-3 features with no progress since previous audit.

2. **CI debt accumulating** — Not only is CI still missing, but new lint errors and security vulnerabilities have been introduced that would block CI if it existed. The gap is widening, not closing.

3. **Test infrastructure gaps** — Mock fidelity issues (cache always undefined, SW controller always null) flagged in previous audit remain unfixed. Console error regression mechanism still missing.

4. **Story spec compliance gaps** — Several findings reveal code that doesn't match story specifications (strict matching in nav, session restore surface routing, basmala translation toggle enforcement).

---

## Recovery Plan — Follow-Up Actions

### Phase 1: Stop the Bleeding (P0/P1)

1. **[Router test failure]** — Debug and fix failing router test
   - Effort: S (1-2 hours)
   - Verify `handleRoute` properly awaits module loader and calls init() with params

2. **[Fix ESLint errors]** — Add curly braces to reader/index.js lines 61, 73
   - Effort: S (15 minutes)
   - Run `pnpm lint --fix` to auto-fix

3. **[Update vulnerable dependencies]** — Fix 3 high-severity CVEs
   - Effort: S (30 minutes)
   - Update vite to >=8.0.5
   - Update serialize-javascript transitive dependency

4. **[Create CI pipeline]** — Unblock automated verification
   - Effort: S (2-4 hours)
   - Create `.github/workflows/ci.yml` with lint, test, audit, build, check-chunks
   - Enable branch protection requiring CI pass

### Phase 2: Stabilize (Remaining P1s)

5. **[Implement sw.js handleApplyUpdate]** — Fix Phase 3 stub
   - Effort: M (1 day)
   - Implement actual cache invalidation and re-download logic
   - Or remove until Phase 3 if not immediately needed

6. **[Implement Phase 2 Marks Modules]** — Core value proposition
   - Effort: L (3-5 days)
   - `marks/store.js` — IDB CRUD for marks with events
   - `marks/editor.js` — Modal UI, long-press detection, tag selection, undo toast
   - `marks/indicator.js` — Colored dots on marked verses
   - `review/hub.js` — All Marks view with pagination, filtering
   - `review/state.js` — Persistence for filters/sort

7. **[Implement Settings Modules]** — Phase 3 features
   - Effort: M (1-2 days)
   - `settings/theme.js` — Theme load/set with CSS application
   - `settings/clear-data.js` — DELETE confirmation flow, cache + IDB deletion

### Phase 3: Strengthen (P2s)

8. **Fix position save race condition** — Force-flush debounced position on visibilitychange
9. **Add QuotaExceededError handling** — User feedback for storage full
10. **Add visibilitychange re-read to all modules** — nav, review, settings, about
11. **Improve mock fidelity** — Support cache hits and configurable SW controller
12. **Add console error regression mechanism** — Fail tests on unexpected console.error
13. **Complete E2E coverage** — PWA install, marks flow, offline mode, cross-tab sync

---

## Gate Decision Update

**Previous Decision:** CONDITIONAL (2026-04-07)

**Current Decision:** **CONDITIONAL** — Maintained, with updated conditions

### Conditions Met ✅
- [x] Fix basmala rendering bug for Surah 1
- [x] Remove user data from console logs
- [x] Create safety/sync.js with versionchange reload banner

### Conditions Still Open ❌
- [ ] Fix sw.js handleApplyUpdate() or remove until implemented
- [ ] Implement marks/store.js with full IDB CRUD
- [ ] Implement marks/editor.js with modal UI
- [ ] Implement marks/indicator.js with verse indicators
- [ ] Implement review/hub.js with All Marks view
- [ ] Implement review/state.js with pagination

### NEW Blocking Issues 🆕
- [ ] Fix ESLint errors blocking CI
- [ ] Update security-vulnerable dependencies
- [ ] Create CI pipeline

### Phase Readiness Update

| Phase | Status | Notes |
|-------|--------|-------|
| **Phase 1** (Online Reading) | ✅ **READY** | Basmala fixed, core reading solid, 99.2% test pass rate |
| **Phase 2** (Marks & Review) | ❌ **NOT READY** | All 4 modules still stubs — zero progress since previous audit |
| **Phase 3** (Settings & Updates) | ❌ **NOT READY** | Settings stubs, dataset updater stub, safety/sync.js ✅ |
| **Phase 4** (Advanced) | ⏸️ **NOT STARTED** | BroadcastChannel, custom tags, FVR, bulk delete deferred |

---

## Recommendations

### Immediate (This Week)
1. **Fix the 3 CI blockers** — lint errors, security CVEs, then create CI pipeline
2. **Debug router test failure** — May indicate real navigation bug
3. **Update dependencies** — Security vulnerabilities are accumulating

### Short-Term (Next 2 Weeks)
4. **Begin Phase 2 implementation** — Prioritize marks/store.js and marks/editor.js
5. **Add visibilitychange re-read** — Add to nav, review, settings, about modules
6. **Improve test mocks** — Enable cache-hit and SW controller testing

### Medium-Term (Next Month)
7. **Complete Phase 2 features** — All marks and review hub modules
8. **Complete E2E coverage** — PWA install, marks flow, offline mode
9. **Implement sw.js handleApplyUpdate** — Or remove if Phase 3 is far out

---

## Methodology Notes

This follow-up audit re-evaluated the 4 dimensions with P1 findings from the previous full audit:
- **Functional correctness** — 3 P1 issues (1 resolved, 2 open)
- **Security** — 1 P1 issue (1 resolved)
- **Reliability** — 1 P1 issue (1 resolved)
- **Testability** — 1 P1 issue (0 resolved)

Dimensions not re-audited (Performance, Architecture, Observability, UI Quality) are assumed to maintain their previous scores unless new cross-dimensional findings emerged.

**Verification Method:** Each P1 issue was verified by reading the actual file:line referenced in the previous audit report. New findings were discovered through re-application of dimension-specific checklists.

---

*End of follow-up audit report.*
