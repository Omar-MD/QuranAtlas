# Testing Overhaul Plan

**Date:** 2026-04-10
**Source:** [2026-04-10-product-health-report.md](../audit/2026-04-10-product-health-report.md)
**Companion:** [2026-04-10-audit-recovery.md](2026-04-10-audit-recovery.md)

---

## Scope

Restructures the test suite from broad unit coverage to targeted boundary unit tests + comprehensive E2E. Removes coverage tooling. Adds 21 new E2E journeys.

This plan is **separate** from the audit recovery plan and should be executed after code changes in the recovery plan are complete (Batches 1–5).

---

## Phase 1: Test Pruning

### Unit Tests to Keep (5 files)

These guard security and data integrity boundaries that E2E cannot reach:

| File | Rationale |
|------|-----------|
| `tests/unit/safety/input-validator.test.js` | XSS rejection, surah/verse parsing edge cases — security boundary |
| `tests/unit/safety/sync.test.js` | BroadcastChannel mock, IDB versionchange — cross-tab safety |
| `tests/unit/offline/dataset-updater.test.js` | SHA-256 verification, update state machine — data integrity |
| `tests/unit/core/router.test.js` | Param sanitization, route matching — guards all route inputs |
| `tests/unit/core/db.test.js` | IDB schema validation, store operations — data layer boundary |

### Unit Tests to Delete (all others)

Delete every file under `tests/unit/` NOT in the keep list above. This includes:

- `tests/unit/console-guard.test.js`
- `tests/unit/sw-handlers.test.js`
- `tests/unit/sw.test.js`
- `tests/unit/about/` (entire directory)
- `tests/unit/core/` — all EXCEPT `router.test.js` and `db.test.js`
- `tests/unit/data/` (entire directory)
- `tests/unit/marks/` (entire directory)
- `tests/unit/nav/` (entire directory)
- `tests/unit/offline/` — all EXCEPT `dataset-updater.test.js`
- `tests/unit/perf/` (entire directory)
- `tests/unit/reader/` (entire directory)
- `tests/unit/review/` (entire directory)
- `tests/unit/safety/` — all EXCEPT `input-validator.test.js` and `sync.test.js`
- `tests/unit/settings/` (entire directory)

### `tests/setup.js`

Strip mocks and test helpers that only served deleted tests. Keep IDB mock and any setup needed by the 5 surviving test files. If no setup is needed, delete the file.

### Configuration

**`vitest.config.js`:**
- Remove `coverage` configuration block entirely
- Remove `@vitest/coverage-v8` from any plugins or references

**`package.json`:**
- `pnpm remove @vitest/coverage-v8`
- Remove `"test:coverage"` script
- Keep `"test"` and `"test:run"` scripts (they run vitest)
- Keep `"test:e2e"` script

### Verification
- `pnpm test:run` passes with only the 5 surviving unit test files
- `pnpm test:e2e` still passes with existing E2E specs
- No references to deleted test files in CI config or scripts

---

## Phase 2: E2E Journey Expansion

### Current Journeys (14 journeys across 9 specs)

These exist today and must continue passing:

| Spec File | Journey |
|-----------|---------|
| `launch-navigation.spec.js` | Launch → default surah renders |
| `launch-navigation.spec.js` | Launch → navigate to another surah |
| `navigation-panel.spec.js` | Open nav → search → filter results |
| `navigation-panel.spec.js` | Keyboard nav (ArrowUp/Down) in nav list |
| `position-tracking.spec.js` | Scroll → close → reopen → resume position |
| `reader-experience.spec.js` | Arabic text renders |
| `reader-experience.spec.js` | Translation toggle → English text appears |
| `theme-switching.spec.js` | Toggle theme → reload → persists |
| `translation-persistence.spec.js` | Translation pref persists across navigation |
| `verse-marks.spec.js` | Long-press → mark created → indicator visible |
| `verse-marks.spec.js` | Undo mark after creation |
| `verse-marks.spec.js` | View marks in review hub |
| `sw-integration.spec.js` | SW registers and caches |
| `performance-budgets.spec.js` | FCP/LCP/bundle budgets |

### New Journeys (21 gaps)

**Tier 1 — Must Have (13 journeys):**

| # | Journey | Spec File (new or extend) |
|---|---------|---------------------------|
| 1 | Navigate → search by number → select → correct surah loads | extend `navigation-panel.spec.js` |
| 2 | Navigate → search by Arabic name → select → correct surah loads | extend `navigation-panel.spec.js` |
| 3 | Home/End keys in nav list jump to first/last | extend `navigation-panel.spec.js` |
| 4 | Deep link `#/s/2/255` → correct surah + verse scrolled to | new `deep-links.spec.js` |
| 5 | Deep link `#/s/999/1` → invalid surah error | extend `deep-links.spec.js` |
| 6 | Deep link `#/s/2/99999` → invalid verse notice | extend `deep-links.spec.js` |
| 7 | Mark verse → navigate away → return → indicator persists | extend `verse-marks.spec.js` |
| 8 | Mark multiple verses → review hub shows all grouped by surah | extend `verse-marks.spec.js` |
| 9 | Review hub → sort/filter controls work | new `review-hub.spec.js` |
| 10 | Settings → clear data → marks deleted, position reset | new `settings.spec.js` |
| 11 | Skeleton timeout → error message when network fails | extend `reader-experience.spec.js` |
| 12 | Route to `/settings` → settings page renders | new `settings.spec.js` |
| 13 | Route to `/about` → about page renders with version info | new `about.spec.js` |

**Tier 2 — Should Have (8 journeys):**

| # | Journey | Spec File |
|---|---------|-----------|
| 14 | Mobile viewport (375px) → nav panel overlays correctly | extend `navigation-panel.spec.js` |
| 15 | Tablet viewport (768px) → layout renders correctly | new `responsive.spec.js` |
| 16 | Focus trap in nav overlay — Tab cycles within panel | extend `navigation-panel.spec.js` |
| 17 | Surah 1 (Al-Fatiha) → no basmala rendered | extend `reader-experience.spec.js` |
| 18 | Surah 9 (At-Tawbah) → no basmala rendered | extend `reader-experience.spec.js` |
| 19 | Mark verse → tag with "Memorized" → review hub filter by tag | extend `verse-marks.spec.js` |
| 20 | Cross-tab sync: mark in tab A → tab B reflects change | new `cross-tab-sync.spec.js` |
| 21 | PWA install prompt (mock) → install button appears | extend `about.spec.js` |

### Spec Organization

```
tests/e2e/
├── about.spec.js              (new)
├── cross-tab-sync.spec.js     (new)
├── deep-links.spec.js         (new)
├── launch-navigation.spec.js  (existing)
├── navigation-panel.spec.js   (existing, extended)
├── performance-budgets.spec.js(existing)
├── position-tracking.spec.js  (existing)
├── reader-experience.spec.js  (existing, extended)
├── responsive.spec.js         (new)
├── review-hub.spec.js         (new)
├── settings.spec.js           (new)
├── sw-integration.spec.js     (existing)
├── theme-switching.spec.js    (existing)
├── translation-persistence.spec.js (existing)
└── verse-marks.spec.js        (existing, extended)
```

### Implementation Notes

- All E2E tests run against `pnpm build && pnpm preview` (production build)
- Use Playwright `test.describe` for grouping related journeys within a spec file
- Viewport tests use `page.setViewportSize()` for responsive scenarios
- Cross-tab tests use `browser.newContext()` for isolated tabs
- Network failure tests use `page.route('**/dataset/**', route => route.abort())` for offline simulation

### Verification
- `pnpm test:e2e` runs all specs (existing + new) in <60s
- No flaky tests — each journey is deterministic
- CI pipeline runs E2E on PR and blocks merge on failure

---

## Execution Order

```
Phase 1 (pruning) ← do first, clean up dead tests
Phase 2 Tier 1   ← write 13 must-have journeys
Phase 2 Tier 2   ← write 8 should-have journeys
```

### Agent Model Recommendation

| Phase | Model | Rationale |
|-------|-------|-----------|
| Phase 1 (pruning) | **Sonnet** | Mechanical deletion + config edits. Low reasoning. |
| Phase 2 Tier 1 | **Opus** | Writing correct E2E tests requires understanding the app's DOM structure, routing, and async behavior. Must read actual rendered HTML to write correct selectors. |
| Phase 2 Tier 2 | **Opus** | Cross-tab sync, responsive viewports, and focus trap testing require nuanced Playwright patterns. |
