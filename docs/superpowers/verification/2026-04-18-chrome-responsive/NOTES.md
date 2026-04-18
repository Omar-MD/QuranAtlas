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

## Regressions found

(filled in by Task 17)
