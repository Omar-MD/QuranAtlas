# E2E Journey Audit Catalog

**Generated:** 2026-04-17  
**Suite run:** `pnpm exec playwright test --grep "Journey" --project=chromium --project="Mobile Chrome" --reporter=json`  
**Results:** 43 expected · 107 unexpected · 2 skipped  
**Branch:** `e2e-journey-audit` (worktree)

---

## How to read this

Each entry has:
- **Test ID** — journey spec file + test title
- **Observed** — what actually happens
- **Suspected cause** — diagnosis
- **Severity** — P0 critical / P1 high / P2 medium / T test-only fix

Entries marked **T (test fix)** are selector/fixture bugs in the specs — fix them first because they cascade into many false failures.

---

## T: Test Fixture Bugs (fix these first)

### T-1 · `[aria-label="More"]` strict-mode violation in `chrome.js`

**Tests blocked:** B5, B6, D1–D4, G1 (12 test instances)

**Observed:**
```
strict mode violation: locator('[aria-label="More"]') resolved to 2 elements:
  1) <a data-tab="more" aria-label="More">  (dock nav link)
  2) <div role="dialog" aria-label="More">  (the More sheet itself)
```

**Suspected cause:** `openMoreSheet` in `tests/e2e/fixtures/chrome.js` waits for
`page.locator('[aria-label="More"]')`. After the dock button is clicked, both the
nav link AND the newly-opened dialog share the same `aria-label`. Playwright's
strict mode rejects multi-match.

**Fix:** Replace the `expect` with a role-specific wait:
```js
await expect(page.getByRole('dialog', { name: 'More' })).toBeVisible()
```
or `page.locator('[role="dialog"][aria-label="More"]')`.

---

### T-2 · Long-press simulation doesn't open mark editor

**Tests blocked:** C1 (long-press), C2, C3, C4, C5, C6 (cascading) — 12 test instances

**Observed:** `.qa-sheet--mark` never becomes visible after the simulated long-press.
Right-click (`contextmenu`) also times out.

**Suspected cause:** Playwright's `locator.tap({ duration: 600 })` dispatches Touch
events; the gesture detector in `src/marks/gesture.js` (or equivalent) likely uses
`pointerdown` + a timer. The two event streams may not interoperate. The test needs
to dispatch `pointerdown` directly, wait, then `pointerup`, so the gesture timer
fires. Alternatively use `page.mouse.move() + page.mouse.down() + waitForTimeout(600)
+ page.mouse.up()`.

**Fix:** Rewrite the `longPress()` helper in `journey-c-marking.spec.js` to use the
Pointer Events API sequence.

---

### T-3 · Cross-tab verse locator not found

**Tests:** I1, I2 (both projects)

**Observed:**
```
expect(locator).toBeVisible() failed
Locator: locator('.qa-verse[data-verse-key="1:5"]')
element(s) not found
```

**Suspected cause:** The reader does set `data-verse-key="1:5"` on verse blocks
(confirmed: `src/reader/index.js:318`). The cross-tab tests open a second context via
`browser.newContext()` and navigate to `/#/s/1`. The verse at position 1:5 should be
visible immediately. Failure suggests the reader hasn't finished rendering before the
assertion runs. The cross-tab fixture likely needs a `waitForReader()` call after
navigation.

**Fix:** Add `await waitForReader(pageB)` (or equivalent) in the I1/I2 test setup
before asserting verse visibility.

---

### T-4 · Offline test needs a production build

**Test:** H1 (both projects)

**Observed:**
```
page.reload: net::ERR_INTERNET_DISCONNECTED
```

**Suspected cause:** Offline caching relies on the service worker registered at
`/sw.js`. In development mode (Vite dev server, default), the SW is not built or
registered. `context.setOffline(true)` + `page.reload()` therefore gets a network
error instead of a cached response.

**Fix:** H1 must run against a preview build:
```
PLAYWRIGHT_USE_PREVIEW=1 pnpm exec playwright test journey-h-offline.spec.js
```
Add a `test.skip` guard or separate project config for H that forces the preview
server.

---

### T-5 · `[data-mark="1:1"]` mark card not rendered in E2

**Tests:** E2 surah grouping (both projects)

**Observed:**
```
expect(locator).toBeVisible() failed
Locator: locator('[data-mark="1:1"]')
```

**Suspected cause:** The `data-mark` attribute is confirmed correct
(`src/review/hub.js:698`). The `seedMarks` fixture writes to the `marks` store in
IDB. The review hub at `#/review` reads from the same store. Possible timing issue:
the hub renders before IDB seeds are committed, or the hub needs to re-query after
navigation. May also be a version mismatch if the hub is cached.

**Fix:** After `page.goto('#/review')`, add an explicit wait for the hub to finish
rendering (e.g., wait for at least one `.qa-review-card` before asserting
`[data-mark="1:1"]`).

---

### T-6 · F2 command-sheet active label text mismatch

**Test:** F2 verse preview → ArrowDown → "Mark this verse" (Mobile Chrome)

**Observed:**
```
expect(locator).toHaveText(expected) failed
Locator: locator('.qa-cmd--active').locator('.qa-cmd-item-label')
```

**Suspected cause:** The expected label text ("Mark this verse") doesn't match the
current text in `src/nav/command-sheet.js`. Likely renamed in a prior commit.

**Fix:** Read `command-sheet.js` to find the current label string and update the test
assertion.

---

### T-7 · F5 continue-reading card times out

**Test:** F5 surah list shows continue-reading card (both projects)

**Observed:** Test timeout of 30 000 ms.

**Suspected cause:** F5 visits `#/s/67`, navigates to `#/surahs`, then expects the
continue-reading card. The card relies on `settings.lastSurface` being set during the
reader visit. Possibly `lastSurface` isn't written fast enough before navigation, or
the card selector (`.qa-continue-reading`) doesn't match the actual element class.

**Fix:** Verify the selector in `src/surahs/index.js` and add a short wait after
visiting `#/s/67` before navigating to surahs.

---

## P1: High — Accessibility Violations

All a11y failures were detected by axe-core at WCAG 2 AA level. These affect all
users relying on assistive technology.

### A11y-1 · Color-contrast violations on every surface

**Tests failing:** A1 screen 1 (58 violations), A1 screen 2 (58), B reader (173),
E1 review hub (198), F4 surah list (935), A2/B reader (111+).

**Observed:** `axe` rule `color-contrast` at severity `serious` fires on virtually
every surface. The surah list alone produces 935 instances (one per contrast-failing
element × 114 surahs).

**Suspected cause:** The CSS design tokens (e.g., `--qa-text-secondary`,
`--qa-border`) for the light/sepia theme do not meet the 4.5:1 ratio required by
WCAG 2 AA. The high repeat-count strongly suggests a single problematic variable
cascades through every repeated element.

**Repro:**
```
pnpm exec playwright test journey-e-review.spec.js \
  --project="Mobile Chrome" -g "E1: a11y"
```

**Severity:** P1 — affects every user on AT; fails WCAG 2 AA.

---

### A11y-2 · ARIA input fields without accessible names

**Tests failing:** A2 reader (111 violations), F1 command sheet (617 violations).

**Observed:** axe rule `aria-input-field-name` at severity `serious`. The command
sheet violation count (617) is very high, suggesting the search input or a scrollable
listbox lacks an accessible name and the rule fires once per ARIA item.

**Suspected cause:** The font-size range slider (`src/settings/font-size.js`) and
the command-sheet search input (`src/nav/command-sheet.js`) are missing `aria-label`
or `<label>` associations.

**Severity:** P1 — screen-reader users cannot identify these controls.

---

## P2: Medium — Behavioral Bugs

### Bug-1 · Dock class missing immediately after onboarding completes

**Test:** A1: first-run onboarding → Al-Fatihah (happy path) — both projects

**Observed:**
```
expect(locator('#bottom-nav')).toHaveClass(/qa-dock--hidden/)
Received string: ""  (empty — no classes on the footer)
```

After the user taps through all 4 onboarding screens and "Start Reading" lands them
on `#/s/1`, the dock element has no CSS classes. The ambient dock code
(`src/nav/ambient-dock.js:148-149`) calls `applyRoutePersistence` on `hashchange`
and should add `qa-dock--hidden` on reader routes. Receiving an empty class string
suggests either:
1. `applyRoutePersistence` hasn't run yet when the assertion fires (race with reader
   mount), or
2. The dock is (re-)created AFTER the hash has settled and the initial class isn't
   applied.

**Repro:**
```
pnpm exec playwright test journey-a-onboarding.spec.js \
  --project="Mobile Chrome" -g "A1: first-run"
```

**Severity:** P2 — cosmetically the dock may flash visible before hiding; no data
loss.

---

### Bug-2 · Ambient chrome doesn't surface on Desktop Chrome mouse click

**Test:** B1: tap reader body surfaces dock and pill (chromium project only)

**Observed:** Test timeout — `#bottom-nav` never loses `qa-dock--hidden` after
`page.locator('#main-content').click()` on Desktop Chrome.

**Suspected cause:** The ambient-chrome listener (`src/nav/ambient-pill.js` or
`src/core/events.js`) fires `AMBIENT_SURFACE` only on `touchstart` or `pointerdown`
(mobile-style events). Desktop Chrome's mouse `click` may dispatch `pointerdown`
followed by `mousedown` / `click` but the listener might filter out non-touch
pointers (`event.pointerType !== 'touch'`).

**Repro:**
```
pnpm exec playwright test journey-b-reader.spec.js \
  --project=chromium -g "B1: tap"
```

**Severity:** P2 — desktop users can't surface the ambient chrome via click.

---

### Bug-3 · Offline reload fails — service worker not caching in dev build

**Test:** H1: reload offline serves reader from cache (both projects)

**Observed:** `page.reload()` with network offline throws `net::ERR_INTERNET_DISCONNECTED`.

**Note:** This is primarily an environment issue (dev server ≠ production). However,
the underlying question is whether the service worker caches correctly at all. Needs
verification against `PLAYWRIGHT_USE_PREVIEW=1`.

**Repro:**
```
PLAYWRIGHT_USE_PREVIEW=1 pnpm exec playwright test journey-h-offline.spec.js
```

**Severity:** P2 — offline reading is a key feature; needs verified against a real
build.

---

## Test Maintenance Required

### Legacy spec selector drift

Three legacy spec files were updated to add `markOnboardingComplete` (`beforeEach`)
since they predate the onboarding feature:
- `tests/e2e/launch-navigation.spec.js` ✓ fixed
- `tests/e2e/reader-experience.spec.js` ✓ fixed
- `tests/e2e/performance-budgets.spec.js` ✓ fixed

Remaining legacy selector issues (stale after redesign, not real app bugs):
- `launch-navigation.spec.js`: expects `[data-surah-header]` to contain "Al-Baqarah"
  but header now renders "AL-BAQARAH · SURAH 2 · 286 VERSES · MEDINAN". Update
  `toContainText` to match the new format or use case-insensitive regex.
- `reader-experience.spec.js`: similar header text mismatches; `[data-verse]` count
  assertions may drift with chunk-size changes.
- `performance-budgets.spec.js`: budget threshold (500 ms) may be too tight for CI;
  worth re-evaluating now that the reader is redesigned.

---

## Summary Table

| ID | Scope | Severity | Blocker for |
|----|-------|----------|-------------|
| T-1 | chrome.js More-sheet selector | T (test fix) | B5, B6, D1–D4, G1 |
| T-2 | long-press simulation | T | C1–C6 |
| T-3 | cross-tab verse locator | T | I1, I2 |
| T-4 | H1 needs preview build | T | H1 |
| T-5 | E2 mark card timing | T | E2 |
| T-6 | F2 label text | T | F2 |
| T-7 | F5 continue-reading card | T | F5 |
| A11y-1 | color-contrast all surfaces | P1 | — |
| A11y-2 | ARIA input names | P1 | — |
| Bug-1 | dock class after onboarding | P2 | — |
| Bug-2 | desktop tap ambient chrome | P2 | — |
| Bug-3 | offline SW in dev mode | P2 | — |

**Stage 2 priority order:**
1. Fix T-1 (unblocks 12 test instances immediately)
2. Fix T-2 (unblocks 12 more)
3. Fix A11y-1 + A11y-2 (P1, user-impacting)
4. Fix Bug-1, Bug-2
5. Fix T-3 → T-7 (remaining test selectors)
6. Verify Bug-3 against preview build
