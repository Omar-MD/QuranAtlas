# Testability — Core Checklist

**Weight: 3** | **Version: 3** | **Items: 23**

## Must-Check Items

> **Not-assessable rule:** If a module referenced by a checklist item does not exist in the codebase, mark the item as `not-assessable` with evidence: "Module not yet implemented (Phase N)". Not-assessable items are excluded from the score denominator.

1. **Test pyramid completeness** — Unit tests for all modules, integration tests for cross-module flows, E2E tests for critical user journeys.
   - Check: `tests/unit/` coverage, `tests/e2e/` existence
   - Verify: E2E tests cover: open → select surah → read → scroll → close → reopen → resume

2. **Coverage thresholds by phase** — Phase 1 modules (`core/`, `data/`, `reader/`, `nav/`) have full coverage thresholds. Phase 2 modules (`marks/`, `review/`) have coverage enforced once Story 4-5 are complete. Phase 3 modules (`settings/`, `about/`) have coverage enforced once Story 9 is complete.
   - Check: `vitest.config.js` coverage thresholds — appropriate per-module thresholds, not blanket exclusions
   - Verify: No stub `console.log` placeholders inflate coverage. Implemented modules have real tests, not placeholder passes

3. **Mock fidelity — IndexedDB** — `fake-indexeddb` accurately mirrors real IDB behavior including error paths, version changes, and blocked events.
   - Check: `tests/setup.js` IDB mock configuration
   - Verify: Mock handles `versionchange`, `close`, `blocked` events

4. **Mock fidelity — Cache API** — `caches.open()` mock returns cached responses when appropriate, not always `undefined`.
   - Check: `tests/setup.js` cache mock
   - Verify: Cache fallback paths in `dataset.js` are testable

5. **Mock fidelity — Service Worker** — `navigator.serviceWorker.controller` mock allows testing both happy path (controller present) and error path (controller null).
   - Check: `tests/setup.js` SW mock
   - Verify: Offline download path testable with mock controller

6. **Critical path coverage** — visibilitychange flow, marking flow, offline download, position save/restore, theme change, session restore surface routing, deep link precedence, dataset update state machine, and clear data flow all have dedicated tests.
   - Check: Test files for each critical path
   - Verify: Edge cases tested (rapid events, network failure, storage full, blocked IDB deletion, empty datasetMeta on activate)

7. **Test isolation** — Tests don't share state between test files. Each test starts with clean IDB, clean DOM, clean event bus.
   - Check: `beforeEach` / `afterEach` in test files
   - Verify: Running tests in different order produces same results

8. **Mock consolidation** — Shared mock setup extracted to fixtures. No duplicated mock configuration across test files.
   - Check: `tests/unit/reader/reader.test.js` vs `reader-story2.test.js` mock duplication
   - Verify: Single source of truth for common mocks

9. **Edge case coverage** — Invalid route params, empty surah data, network timeout, IDB full, SW not activated all have test cases.
   - Check: Test files for edge cases
   - Verify: Not just happy path testing

10. **Test maintainability** — Tests are readable, use descriptive names, and fail with clear messages. No flaky tests from timing dependencies.
    - Check: Test file organization, assertion clarity
    - Verify: No `setTimeout`-based tests that could flake. No `requestAnimationFrame`-dependent assertions. `IntersectionObserver` mocks (Story 2 scroll tracking) are deterministic, not timing-based

11. **E2E critical journey coverage** — Playwright E2E tests cover all critical user journeys: (1) First-time user flow, (2) Session restore across reload, (3) Navigation search → surah select, (4) Verse mark → tag → indicator → review hub, (5) Offline download → offline read, (6) Deep link verse navigation `#/s/2/255`, (7) Theme persist across reload, (8) Cross-tab visibilitychange re-read.
    - Check: `tests/e2e/` — test files for each journey
    - Verify: Each journey tests the complete flow end-to-end, not just isolated steps

12. **Accessibility test coverage** — Modal focus trap, keyboard navigation (Tab/Enter/Escape), `aria-expanded`, `aria-invalid`, `aria-live` announcements, and screen reader labels are tested (Story 4 US17, Story 3 US14-15).
    - Check: Test files for a11y — mark editor modal keyboard/screen reader tests, nav panel keyboard tests
    - Verify: Focus trap tested (Tab cycles within modal). Escape closes modal/nav. `aria-expanded` toggles correctly on nav open/close

13. **Performance regression tests** — Automated checks for all product-info.md performance targets: first verse render ≤ 800ms, Al-Baqarah 50-verse chunk ≤ 500ms, search filter ≤ 50ms, mark persist < 200ms, visibilitychange re-read ≤ 300ms, dataset update check ≤ 200ms.
    - Check: Performance test suite exists (Vitest benchmarks or Playwright timing assertions)
    - Verify: Tests fail on regression. Targets match product-info.md exactly

14. **Service worker test coverage** — All SW message handlers (`CACHE_DATASET`, `SKIP_WAITING`, `PURGE_DATASET_CACHE`, `APPLY_DATASET_UPDATE`) have tests verifying correct cache operations and postMessage responses.
    - Check: Test files for `src/sw.js` message handlers
    - Verify: Tests cover happy path (cache populated, progress messages sent) and error path (network failure, partial cache). `APPLY_DATASET_UPDATE` tested with `pending-confirmation` state

15. **Deterministic test execution** — Tests produce the same result regardless of execution order, system time, or locale. No test depends on another test's side effects.
    - Check: Run test suite with `--shuffle` flag (or reverse order) — all tests still pass
    - Verify: No test reads state written by a previous test. No test depends on real clock (`Date.now()` is mocked where needed). No locale-dependent string comparisons

16. **No test-only code in production** — No debug flags, test hooks, conditional test paths, or mock stubs exist in production source. All test infrastructure lives in `tests/` or `vitest.config.js`.
    - Check: Source files for `if (process.env.NODE_ENV === 'test')`, `if (__TEST__)`, or similar test-only branches
    - Verify: No `window.__test_hook__` or `globalThis.__mock__` in production code. Feature detection (e.g., `if (typeof IntersectionObserver !== 'undefined')`) is acceptable — test-only branches are not

17. **Boundary value test strategy** — Tests systematically cover boundary values for all numeric inputs: surah 1 and 114, verse 1 and max verse, 0 marks and 500+ marks, page 1 and last page of pagination, empty string and max-length string.
    - Check: Test files for boundary values — are first/last/empty/max cases explicitly tested?
    - Verify: `parseNavigationInput("1")`, `parseNavigationInput("114")`, `parseNavigationInput("0")`, `parseNavigationInput("115")` all have test cases. Mark store tested with 0, 1, and 500+ marks

18. **Regression test discipline** — Every bug fix includes a test that reproduces the bug before the fix and passes after. Bug-fix commits reference the test that guards against regression.
    - Check: Git history — bug-fix commits include test additions or modifications
    - Verify: No bug is fixed by code change alone without a corresponding test. Test names reference the bug or behavior being guarded

19. **CI pipeline integration** — All tests (unit, integration, E2E), linting (`eslint`), audit (`pnpm audit`), and bundle size checks (`scripts/check-chunks.js`) run in CI before merge. No PR merges with failing checks.
    - Check: CI configuration (GitHub Actions, etc.) — test, lint, audit, build steps all present
    - Verify: CI blocks merge on failure. Coverage thresholds are enforced in CI, not just locally. E2E tests run against the production build (`pnpm build` + serve), not the dev server

20. **Test documentation** — Test files have clear top-level `describe` blocks that map to user stories or module interfaces. A developer unfamiliar with the codebase can understand what each test file validates from its describe/it structure alone.
    - Check: Test file naming matches module naming (`marks/store.test.js` tests `marks/store.js`). Top-level `describe` names are meaningful
    - Verify: No `describe('misc')` or `it('works')` patterns. Test names describe the scenario and expected outcome: `it('rejects verse 300 for Al-Baqarah (286 verses)')`

### Vanilla JS Testing Discipline

21. **Empty, loading, and error state testing** — Every view has tests for all three visual states: empty (no data), loading (fetching/skeleton), and error (fetch failed or invalid input). Tests verify the correct UI is shown for each state, not just the happy-path rendered output.
    - Check: Test files for `reader/`, `nav/`, `review/hub.js`, `marks/editor.js` — are empty, loading, and error states explicitly tested?
    - Verify: Reader with failed `getSurah()` shows error UI. Review hub with 0 marks shows empty state message. Nav with failed dataset fetch shows error. All three states are distinct and have dedicated test cases

22. **Console error regression** — Tests assert that no unexpected `console.error` or `console.warn` calls occur during normal (happy-path) flows. A test setup utility captures console output and fails the test if errors appear outside of explicitly expected error-path tests.
    - Check: `tests/setup.js` or test utilities — `console.error` spy/capture mechanism
    - Verify: An unhandled promise rejection or unexpected error in a happy-path test causes the test to fail. Known error-path tests explicitly expect the console output (e.g., `expect(console.error).toHaveBeenCalledWith(...)`) and suppress the failure for those cases only

23. **Responsive viewport testing** — E2E tests or integration tests verify the app at mobile (375px), tablet (768px), and desktop (1280px) viewport widths. Playwright (or equivalent) viewport tests exist for critical views: reader text wrapping, nav panel overlay behavior, and touch target sizing.
    - Check: `tests/e2e/` — viewport configuration, mobile-width test scenarios
    - Verify: At minimum, E2E tests run at a phone-width viewport (375px). Reader verse layout, nav panel overlay/backdrop behavior, and interactive element sizing are verified at mobile width. No critical UI breaks at any of the three standard widths
