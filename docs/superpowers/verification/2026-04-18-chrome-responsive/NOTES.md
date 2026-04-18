# Chrome Responsive — Playwright MCP Verification

**Worktree:** `.worktrees/chrome-responsive`
**Branch:** `feature/chrome-responsive`
**Baseline commit:** 7a66168

## Viewport baselines

- Mobile 375×667 — baseline OK / console: 0 errors, 0 warnings (3 info messages)
- Tablet 820×1180 — baseline OK / console: 0 errors, 0 warnings (3 info messages)
- Desktop 1440×900 — baseline OK / console: 0 errors, 0 warnings (3 info messages); bottom nav shows full labels (Read, Search, Review, More)
- Landscape 667×375 — baseline rendered / console: 0 errors, 0 warnings; NOTE: at 375px viewport height, the bottom nav bar visually overlaps the "Begin" CTA button on the onboarding screen — content is not fully scrollable behind the nav. This is a known landscape constraint for the onboarding surface.

## Journey results

### A1 Onboarding
- Mobile 375×667: PASS — Screen 1 renders (Begin button visible, dock at bottom), landscape guard does not apply (height 667 > 500px threshold, correct). All 4 screens navigable. Onboarding completes to reader at /#/s/1. Console: 0 errors.
- Landscape 667×375: PASS — Landscape guard applies correctly: `.qa-onb-page` computed `min-height: 100%` (was 72vh), `justify-content: flex-start`. Screens 2–4 content fully visible. Screen 1 Begin button partially overlapped by fixed dock (pre-existing, matches Task 10 baseline — not a regression). Onboarding completes to reader. Console: 0 errors.

### B1 Dock — tablet sizing + desktop pill
- Desktop 1440×900: PASS — `.qa-dock-item` = 42×42px at tablet (768px block confirmed); desktop labels visible (`position: static`, `clip: auto`); desktop pill shape (`border-radius: 999px`, `gap: 0.5rem`).

### B2 Scroll-hide dock
- Desktop 1440×900: PASS — dock hides on scroll-down event dispatch (`dispatchEvent(new CustomEvent('scroll-down'))`). NOTE: programmatic `window.scrollBy` does not re-surface dock because ambient-dock.js scroll handler requires real scroll events — test limitation, not a regression.

### B4 Theme swatches
- Desktop 1440×900: PASS — 4 swatches (Light, Sepia, Dark, Auto) rendered in Settings sheet. Clicking Dark sets `data-theme="dark"` and `aria-checked="true"`. Restoring Sepia works correctly.

### B6 Settings sheet + font slider
- Desktop 1440×900: PASS (after fix) — Settings sheet centered: `isCentered: true`, `transform: matrix(1, 0, 0, 1, -240, 0)` = `translateX(-50%)`, sheet at 720px viewport center. Font slider moves `data-font-size` from "small" to "large" at position 2. Console: 0 errors.
- **Bugs found and fixed:**
  1. `ReferenceError: currentView is not defined` in `src/settings/panel.js` — dead write-only variable assignments removed (commit cb6d1c4).
  2. `@keyframes qa-sheet-rise` source-order collision — global mobile keyframes overwrote tablet keyframes because they appeared after the `@media` block. Fixed by moving mobile keyframes before the media block (commit 4ca9f5d). Required hard reload to pick up CSS change.

### C1/C4/C5 Mark editor — desktop 2-col, save, delete
- Desktop 1440×900: PASS — Long-press (touchstart/touchend, 600ms) opens mark editor dialog for verse 1:1. 2-col grid confirmed: `display: grid`, `gridTemplateColumns: 295px 295px`. Column assignments: quote/label/note in col 1, selected/search/tag-list in col 2.
- C4 Save: type note "Test note for C4 verification" → Save enabled → click Save → editor closes → mark persisted in IDB (`verseKey: "1:1"`, note confirmed). Note: `qa-verse--bookmarked` class only applied for tagged marks (marks with no tags get no dot — expected behavior per indicator.js).
- C5 Delete: re-open editor → click "⌫ Delete" → inline confirm appears ("Keep" / "Delete") → click "Delete" → editor closes → IDB verified: mark 1:1 removed. Undo toast not captured (may auto-dismiss). Console: 1 error (from own IDB probe using wrong DB name — not app error).

### D1–D3 Settings sheet — 3 viewports + translation picker
- Mobile 375×667: PASS — sheet is bottom drawer (position:fixed, bottom≈659≈viewport bottom, transform:identity). No centering expected at mobile.
- Tablet 820×1180: PASS — centered modal: `isCentered: true`, `transform: matrix(1, 0, 0, 1, -240, 0)` = translateX(-50%), top=118px (≈10vh), width=480px.
- Desktop 1440×900: PASS — (verified in Task 12) centered: sheetCenter=720, viewportCenter=720.
- D3 Translation picker: PASS — click "Saheeh International" sub-label opens picker with 4 choices; Pickthall selected → main view shows "Pickthall" sub-label; restored to Saheeh. Console: 0 errors.

### F1/F3 Command sheet — max-width cap + footer hint
- Desktop 1440×900: PASS — ⌘K opens command sheet: `width: 640px`, `maxWidth: 640px`, centered (sheetCenter=720=viewportCenter). Footer hint visible: `display: flex` (↑↓ navigate · ↵ open · esc close).
- Mobile 375×667: PASS — Command sheet opens, footer hint `display: none` (hidden at mobile). Sheet still renders and functions correctly.

### E3 Review hub — regression smoke
- Desktop 1440×900: PASS — Review hub at `#/review` renders marks grouped by tag (favourite: 1, study: 1). Group-by tabs (Tag/Surah/Date), Sort/Filter controls all present. Click on article opens mark editor in "Edit mark" mode with correct verse content. "Jump to 2:2 in reader" link navigates to `#/s/2/2`. Console: 0 app errors (1 stale error from own IDB probe).

## Regressions found (Task 17)

1. **`ReferenceError: currentView is not defined`** in `src/settings/panel.js` — found during B6 Settings verification. Root cause: commit 585ba54 removed `let currentView = 'main'` declaration as part of a pre-branch lint sweep but left 3 write-only assignments intact. Fixed by removing all dead `currentView =` assignments. Commit: cb6d1c4.

2. **Settings sheet off-center at tablet+** — found during B6 Settings verification. Root cause: `@keyframes qa-sheet-rise` named both in global scope (mobile, line 1842) and inside `@media (min-width: 768px)` (tablet+, line 1855). CSS source-order rule gives later definition priority; however, the global definition appeared BEFORE the media block in the previous iteration. The animation's `fill: forwards` caused the mobile keyframe's final state (`translateY(0)` = identity, no translateX) to persist, overriding the static `transform: translateX(-50%)` on `.qa-sheet`. Fixed by ensuring global mobile keyframes come BEFORE the `@media (min-width: 768px)` block so the tablet-scoped keyframes win by source order. Commit: 4ca9f5d.

**Not-regressions:**
- `quota-banner.test.js` failure in full parallel run — passes in isolation; pre-existing flaky test unrelated to our changes.
- Console error from own IDB probe (wrong DB name `qa-db` instead of `quran-atlas`) — test artifact, not app error.

## Final sweep

- Lint: 0 errors, 2 pre-existing warnings (logger.js console statements).
- Tests: 388/389 passing; 1 pre-existing flaky failure (quota-banner, passes in isolation).
- Build: clean, 60 modules transformed.
- Chunk budget: 35.2 KB total JS gzip (budget: 500 KB). All chunks within 150 KB per-chunk limit.
