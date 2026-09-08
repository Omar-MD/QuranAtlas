# UI Iteration 2 — Reader family defect wave (JIT plan)

**Spec:** `docs/superpowers/specs/2026-09-08-ui-screen-fix-refactor-design.md` (Phase B, Iteration 2)
**Binding briefs:** `docs/superpowers/specs/ui/2026-09-08-brief-reader.md` (R-D/R-P), `docs/superpowers/specs/ui/2026-09-08-brief-mushaf.md` (M-D/M-P), commonality brief as foundation. Inventory: `2026-09-08-defect-inventory.md` §2.
**Prerequisite:** Iteration 1 landed (IconButton 44px base D3; layer fix — pill consolidation and variant recipes depend on it).
**Owner:** orchestrator plans → `ui-implementer` applies → gates → K2.6 re-review → commit.

## Tasks

### Task 1 — BLOCKING: clear the fixed chrome from mushaf gate/status surfaces (M-P1, fixes M-D1)
- When `MushafRoute` renders `ReaderAssetGate` / page-failure `Status` (not the stage), wrap in a container with `padding-top: calc(env(safe-area-inset-top) + 56px)`, and `calc(env(safe-area-inset-top) + 88px)` at ≤520px portrait (two-row chrome).
- Verify: ui-verify `#/m/2` 375×812 + 1280×900 — "Manage assets"/"Retry" fully visible below chrome, reachable (click coordinates clear of chromeBottom); orchestrator's occlusion measurement must no longer reproduce.

### Task 2 — Bound + center the gate surface (M-P2, fixes M-D2)
- Present gate/failure `Status` inside the existing `.qar-react-mushaf-page-status` recipe (index.css ~3396-3404: grid, place-items center, `--qa-react-mushaf-boundary-surface`, muted text); inner Status `max-width: var(--qa-react-page-max-width); margin-inline: auto`.
- Verify: desktop gate reads as bounded centered surface, not edge-to-edge banner.

### Task 3 — Gate tone icons (M-P3, fixes M-D3)
- Fill `Status` icon slot: `AlertTriangle` (aria-hidden) for missing/stale/failure; keep `Spinner` for installing. Matches onboarding O-P2 treatment (same glyph family).
- Verify: gate reads as state at a glance in all themes (not color-only).

### Task 4 — Mushaf chrome title parity (M-P4, fixes M-D5)
- Mushaf-mode center title consumes the `.qar-reader-chrome-title` recipe (clamp 1.28→1.75rem, `--qa-react-accent`); stays LTR; ≤520px two-row drops per existing recipe.
- Verify: chrome title visually matches verse-reader weight; no 375px collision (two-row layout).

### Task 5 — Consolidate duplicate chrome pill recipes (R-P5/M-P5; inventory folds former R3 remainder)
- Route `.qar-reader-chrome-view-toggle` + `.qar-reader-chrome-wird-status` through `IconButton` with ONE shared reader-chrome pill treatment (chrome-surface bg, nav-control border, pill radius, nav-shadow-control). Delete both bespoke copies. Wird chip reaches 44px via Iteration-1 base.
- No visual change intended beyond 42→44px wird chip.
- Verify: reader chrome desktop+mobile all themes — pills render identically to pre-consolidation (screenshots compare), focus rings intact.

### Task 6 — Verse bookmark glyph affordance (R-P1, fixes R-D1)
- `VerseNumber.tsx` lucide `Bookmark` `size` 13 → 18. Keep 44px ghost Button target, `--qa-react-bookmark-accent`/weight-700 bookmarked treatment, aria-hidden glyph.
- Verify: glyph reads as control at 375×812; bookmarked fill/pulse unchanged.

### Task 7 — Reader error retry action (R-P2)
- `ReaderVerseSurface` error branch: `Status tone="error"` action slot ← `Button size="sm"` "Retry" wired to re-request corpus.
- Verify: error state (force via offline devtools or blocked fetch) shows retry; role/name assertions only.

### Task 8 — Mobile two-row chrome for verse reader (R-P3, fixes R-D3)
- ≤520px portrait: verse-reader chrome adopts the mushaf two-row treatment (index.css ~2069-2092) — clusters row 1, title row 2 spanning 1/-1 at `clamp(1.2rem,6vw,1.48rem)`.
- Verify: `#/s/2` at 375×812 — "Al-Baqarah" fully visible, no truncation, all themes; desktop single-row unchanged.

### Task 9 — Continuity navigation affordance (R-P4, fixes R-D4)
- `SurahContinuityButton`: add direction kicker ("Previous surah"/"Next surah", `--qa-react-text-muted` 0.72rem) above/before target name (inline `·` separator acceptable at 375px). Target name stays `--qa-react-text` (hover accent). Keep 44px ghost Button.
- Verify: both viewports — reads as navigation, no wrap breakage.

### Task 10 — Verse-number rail 44px (R-P6, fixes R-D6)
- `.qar-reader-verse-head` + `.qar-reader-verse-number` `min-height: var(--qa-react-control-touch-target)`; drop negative-margin compensation.
- Verify: verse rows visually unchanged on desktop (sub-pixel); no layout shift on mobile.

### Task 11 — Gates + review + commit
- `mise run check` && `mise run build:ui` && `env -u CI mise run smoke` green.
- K2.6 re-review: `#/s/1`, `#/s/2` (mobile title), `#/m/2` gate (both viewports × light/sepia/dark), bookmark toggle+pulse, chrome pills.
- Correctness review: bounded — Task 7 adds a retry behavior (error recovery wiring); Tasks 1-2 change gate layout only.
- Commit `fix: reader family wave (mushaf gate occlusion, chrome composition, affordances)`.

## Out of scope
Drawer (Navigation wave), settings overlay contents (Settings wave), search (Iter 4), Tabs/SegmentedControl cutovers (Iter 3/4), anything not in R-P/M-P prescriptions.
