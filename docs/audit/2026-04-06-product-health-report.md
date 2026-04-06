# QuranAtlas Product Health Report

**Date:** 2026-04-06
**Commit:** d30acfb
**Auditor:** Product Audit Skill v2
**Checklist version:** 136 items (v2)
**Previous audit:** None — first audit

---

## Executive Summary

QuranAtlas demonstrates solid fundamentals for a Phase 1 PWA: clean module boundaries, correct Arabic text rendering via safe textContent usage, functioning chunked reader with position tracking, and a well-structured event bus architecture. The core reading experience works. However, significant reliability gaps threaten user trust: the IDB connection breaks unrecoverably after cross-tab database upgrades, the service worker's unconditional skipWaiting() can interrupt active reading, and reading position is not saved when the app is backgrounded. Testing infrastructure exists but lacks CI enforcement, E2E coverage, and performance regression guards. Observability is minimal — errors are logged to console only, with no structured diagnostics.

**Weighted Overall Score: 6.1 / 10** — Caution

**Gate Decision: CONDITIONAL**

Conditions: Fix the 2 P1 findings (IDB connection recovery and SW lifecycle) before any user-facing release.

- P0 count: 0
- P1 count: 2
- P2 count: 14
- P3 count: 3

---

## Methodology

| Dimension | Checklist Items | Assessable | Not Assessable | Confidence |
|-----------|----------------|------------|----------------|------------|
| Functional correctness | 22 | 13 | 9 | high |
| Security | 18 | 13 | 5 | high |
| Reliability | 19 | 13 | 6 | high |
| Performance | 22 | 15 | 7 | high |
| Architecture | 18 | 16 | 2 | high |
| Testability | 20 | 14 | 6 | high |
| Observability | 17 | 12 | 5 | high |
| **Total** | **136** | **96** | **40** | |

**Audit scope:** Full codebase audit against v2 checklists. All 7 dimensions completed successfully. 40 of 136 checklist items were not assessable due to Phase 2/3 modules existing only as stubs (marks, review, settings, about, dataset-updater, safety/sync). Scores are based on reduced denominators for each dimension.

---

## Dimension Scores

| Dimension | Score | Weight | Weighted | Status |
|-----------|-------|--------|----------|--------|
| Functional correctness | 6/10 | 5 | 30 | Caution |
| Security | 7/10 | 5 | 35 | Caution |
| Reliability | 5/10 | 5 | 25 | At risk |
| Performance | 7/10 | 4 | 28 | Caution |
| Architecture | 7/10 | 4 | 28 | Caution |
| Testability | 5/10 | 3 | 15 | At risk |
| Observability | 4/10 | 1 | 4 | At risk |
| **Total** | | **27** | **165 / 270** | |

**Overall: 6.1 / 10**

Status thresholds: 8+ = Healthy, 6-7.9 = Caution, 4-5.9 = At risk, <4 = Critical

---

## Delta from Previous Audit

First audit — no delta available.

---

## Critical Findings (P0 + P1)

### [P1] IDB connection not recoverable after versionchange

- **Dimension:** Reliability (cross-dimensional: also relevant to Architecture)
- **Location:** `src/core/db.js:60-62`
- **Code excerpt:**
  ```js
  dbRef.onversionchange = () => {
    dbRef.close()
    emit('db:version-change', {})
  }
  ```
- **Evidence:** When another tab triggers a database version change, the versionchange handler closes `dbRef` and emits an event. However, `dbPromise` (line 12) is NOT set to null. Since `openDB()` (line 19-21) returns the cached `dbPromise` if it exists, all subsequent `getDb()` calls return the now-closed `IDBDatabase` object. Any IDB operation after this point throws `InvalidStateError`, breaking all data access — position saves, settings reads, marks operations.
- **Impact:** If a user has two tabs open and one triggers a DB upgrade (e.g., after an app update), the other tab's IDB layer silently breaks. All reads and writes fail until full page reload.
- **Recommendation:** Set `dbPromise = null` and `dbRef = null` in the versionchange handler so the next `getDb()` call opens a fresh connection.
- **Effort:** S
- **Orchestrator verified:** Yes — confirmed at db.js:60-62. The handler closes dbRef but dbPromise on line 12 retains the resolved promise. openDB() on line 19-21 returns the stale dbPromise. getDb() on line 82-84 calls openDB() which returns the closed connection.

### [P1] Service worker skipWaiting() called unconditionally during install

- **Dimension:** Reliability (cross-dimensional: also flagged by Security for lifecycle concerns)
- **Location:** `src/sw.js:18-20`
- **Code excerpt:**
  ```js
  self.addEventListener('install', (_event) => {
    self.skipWaiting()
  })
  ```
- **Evidence:** The service worker calls `self.skipWaiting()` unconditionally in the install event, meaning a new SW version activates immediately upon installation. This can disrupt active reading sessions — the new SW takes control and may invalidate cached resources or change caching strategy while a user is mid-read. The `vite.config.js:10` sets `registerType: 'prompt'`, indicating the intent was user-prompted updates, but the SW itself bypasses this by calling skipWaiting immediately.
- **Impact:** A service worker update deployed while a user is reading could cause fetch failures for surah data if the new SW has different cache names or strategies. The user would see an error state mid-read with no explanation.
- **Recommendation:** Remove `self.skipWaiting()` from the install handler. Instead, listen for a `SKIP_WAITING` message from the main thread (which already has a case in the message handler at sw.js:46) and only call skipWaiting when the user explicitly accepts the update.
- **Effort:** S
- **Orchestrator verified:** Yes — confirmed at sw.js:18-20. skipWaiting() is unconditional. The message handler at sw.js:45-46 already has a SKIP_WAITING case that calls self.skipWaiting(), confirming the intent was message-driven activation. The install-time call contradicts this design.

---

## All Findings Summary

| Severity | Count | Top Items |
|----------|-------|-----------|
| P0 | 0 | None |
| P1 | 2 | IDB connection not recoverable after versionchange; SW skipWaiting unconditional |
| P2 | 14 | No lastSurface tracking; no IDB write validation; no input length limits; no visibilitychange position save; deleteDB force-resolves on blocked; no retry with backoff; skeleton timeout doesn't cleanup; O(n) scroll append; getMostRecentPosition getAll(); translation toggle full re-render; no resource preloading; event names as string literals; no CI pipeline; cache mock fidelity |
| P3 | 3 | router.test.js setTimeout timing; deprecated router re-export; reader.js single responsibility |

---

## Not Assessed

| Module / Feature | Reason | Checklist Items Affected |
|-----------------|--------|------------------------|
| `marks/store.js`, `marks/editor.js`, `marks/indicator.js` | Phase 2 stubs (console.log only) | Functional #5, #16, #17; Security #12; Testability #12 |
| `review/hub.js`, `review/state.js` | Phase 2 stubs | Functional #14; Performance #13 |
| `settings/index.js`, `settings/theme.js`, `settings/clear-data.js` | Phase 3 stubs or not created | Functional #9 (partial), #15; Security #11; Reliability #14 |
| `about/index.js`, `about/versions.js`, `about/storage.js`, `about/pwa-install.js`, `about/attribution.js` | Phase 3 — not created | Observability #16; Reliability #15 (partial) |
| `data/dataset-updater.js` | Phase 3 — not created | Functional #19; Reliability #13; Performance #15; Observability #9 |
| `safety/sync.js` | Phase 4 BroadcastChannel — not created | Reliability #9 (partial); Observability #8 (partial) |

**Impact:** 40 of 136 total checklist items were not assessable. Scores for all dimensions are based on reduced denominators. Functional correctness scored against 13 of 22 items; Reliability against 13 of 19; Performance against 15 of 22.

---

## Open Questions

1. **Does surah 1 dataset include basmala as verse 1 in the ar[] array?** — reader/index.js skips renderBasmala for surah 1, implying the basmala text is already in the verse data. Could not verify without the actual `/dataset/surah/001.json` file. Impact if not: verse 1 of Al-Fatiha renders without basmala, which would be a P0 correctness issue (wrong verse text).

2. **Does the manual SW registration in app.js:110 conflict with vite-plugin-pwa's injectRegister: false?** — The plugin is configured to NOT auto-register (`injectRegister: false`), and app.js manually registers `/sw.js` in production. This seems intentional but could cause version mismatches if the plugin's generated SW path differs from `/sw.js`. Impact if conflicting: double registration or serving stale SW.

3. **Does the 5s skeleton timeout race with slow network fetches?** — The timeout starts before getSurah() and clearTimeout runs after both getSurah and Promise.all complete. On very slow 3G, if getSurah takes 3s + Promise.all takes 3s = 6s total, the timeout fires at 5s showing an error even though data is loading. Impact: false error state on slow networks.

---

## Recovery Plan

### Phase 1: Stop the bleeding (P0s)

No P0 findings.

### Phase 2: Stabilize (P1s)

1. **IDB connection not recoverable after versionchange** (`src/core/db.js:60-62`) — Effort: S
   - Why: Cross-tab DB upgrade silently breaks all IDB operations in the other tab
   - How: Add `dbPromise = null; dbRef = null;` inside the versionchange handler, before or after the emit call

2. **SW skipWaiting unconditional** (`src/sw.js:18-20`) — Effort: S
   - Why: New SW versions can disrupt active reading sessions
   - How: Remove `self.skipWaiting()` from the install handler. The SKIP_WAITING message case (sw.js:45-46) already exists for user-prompted activation

### Phase 3: Strengthen (P2s)

**Data Integrity & Reliability**
- No lastSurface tracking — implement in router.js on route change, read in app.js handleLaunchRestore
- No IDB write validation — add schema validation wrapper for each store in db.js
- deleteDB force-resolves on blocked after 1s — implement proper blocked handling with user feedback
- No visibilitychange position save — add handler in reader or scroll-tracker to save on document.hidden
- No retry with backoff — add bounded retry for dataset fetches in offline.js
- Skeleton timeout doesn't call cleanup() — add cleanup() call in timeout callback

**Security**
- No input length limits — add maxlength to search input, truncate in parseNavigationInput

**Performance**
- O(n) scroll append DOM query — track verse count instead of querySelectorAll
- getMostRecentPosition getAll() + reduce — use IDB cursor with direction 'prev' on a savedAt index
- Translation toggle triggers full re-render — use CSS class toggle (qa-hide-translation already exists)
- No resource preloading — add `<link rel="preload">` for critical CSS and core JS

**Architecture**
- Event names as string literals — define as constants in events.js or constants.js

**Testing**
- No CI pipeline — set up GitHub Actions with test, lint, build steps
- Cache API mock fidelity — return cached responses when appropriate

### Phase 4: Optimize (P3s)

- Replace setTimeout(10ms) in router tests with vi.waitFor() or flush promises
- Remove deprecated getMostRecentPosition re-export from router.js
- Consider splitting reader/index.js into smaller submodules for rendering, skeleton, error state

---

## Cross-Cutting Observations

### Patterns Across Dimensions

1. **Phase 2/3 stub modules are pervasive** — marks/store.js, marks/editor.js, review/hub.js, settings/index.js, about/index.js are all console.log stubs. This is correct for the phased approach but means 40 of 136 checklist items (29%) cannot be assessed. The true health picture will only emerge after Phase 2 implementation.

2. **Error handling is inconsistent** — app.js and router.js properly catch and emit errors. But reader/index.js:274 and :424 silently swallow errors. db.js versionchange handler has a defect. The pattern exists but is not uniformly applied.

3. **IDB layer lacks defensive depth** — db.js provides basic CRUD but no schema validation, no QuotaExceededError handling, no connection recovery. As the primary data layer for an offline-first app, this is the highest-risk module for data integrity issues in Phase 2.

### Architecture-Level Risks

1. **reader/index.js concentration** — At 431 lines, this module handles rendering, scroll tracking setup, position save, translation toggle, skeleton/error UI, resume indicator, and basmala logic. Phase 2 will add marks integration (long-press, indicators), making this a monolith risk.

2. **No dependency enforcement tooling** — Module boundaries are correct by convention but no ESLint import rules or madge checks enforce them. As the team grows or Phase 2 begins, accidental cross-imports are likely.

### Strengths

1. **XSS prevention is thorough** — textContent used consistently for all dynamic content (reader/index.js:167, 180; nav/index.js:139-158). No innerHTML with untrusted data. Strong CSP in index.html.

2. **Event bus architecture is clean** — core/events.js provides a simple, effective pub/sub. All cross-module communication flows through emit/on. No direct function calls between feature modules.

3. **Chunked rendering with DocumentFragment** — reader/index.js:156-191 correctly batches 50 verses into a DocumentFragment for single DOM insertion. Combined with content-visibility: auto (theme.css:363), this handles Al-Baqarah's 286 verses well.

4. **Service worker caching is resumable** — sw.js:66-70 handleCacheDataset checks cache before fetching each URL, enabling interrupted downloads to resume from where they stopped.

5. **Input validation is well-structured** — safety/input-validator.js provides comprehensive parsing for numeric (2, 2:255) and name-based (Al-Baqarah, Baqarah 255) navigation inputs with proper verse count validation.

### Phase Readiness Assessment

**Phase 1 status:** Substantially complete. Core reading experience works: surah rendering, basmala rules, chunked rendering, position tracking, navigation search, offline download. Two P1 issues (IDB recovery, SW lifecycle) should be fixed before declaring Phase 1 done.

**Ready for Phase 2?** Conditionally. The 2 P1s must be fixed first. Additionally, the IDB layer (db.js) needs schema validation before marks/store.js is implemented — without it, Phase 2 marking operations could write malformed data. reader/index.js should be decomposed before adding marks integration to avoid a monolith.

---

## Incomplete Dimensions

All 7 dimensions completed successfully. No incomplete dimensions.

---

## Gate Decision

**Decision: CONDITIONAL**

**Rationale:** No P0 findings exist. The 2 P1 findings (IDB connection recovery and SW skipWaiting) are both small fixes (Effort: S each) that address real defects in existing code. The overall score of 6.1 places the codebase in the Caution band — functional but with reliability gaps. Phase 1 features work on the happy path but cross-tab scenarios and SW updates create failure modes.

**Conditions for PASS:**
- [ ] Fix IDB versionchange handler to invalidate dbPromise (db.js:60-62)
- [ ] Remove unconditional self.skipWaiting() from SW install handler (sw.js:18-20)

**Reviewed by:** _________________ (human reviewer sign-off)

---

*End of report.*
