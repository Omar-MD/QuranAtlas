# UI Iteration 5 — Settings family defect wave (JIT plan)

**Spec:** `docs/superpowers/specs/2026-09-08-ui-screen-fix-refactor-design.md` (Phase B, Iteration 5)
**Binding brief:** `docs/superpowers/specs/ui/2026-09-08-brief-settings.md` (S-D ledger §2, states §3, layouts §4, prescriptions §5 S-P4/S-P5/S-P6(optional)/S-P7/S-P8).
**Prerequisite:** Iteration 1 S-P2 landed (variant foundation). Independent of Iterations 2-4.
**Owner:** orchestrator plans → `ui-implementer` → gates → K2.6 re-review + correctness review → commit.

## Tasks

### Task 1 — Preserve the active base on open-from-ChromeFrame (S-P4, fixes S-D2)
- `App.tsx` hash path `openSettingsOverlay`: `resolveSettingsPreviousHash` accepts the CURRENT hash when it is a valid base — extend the guard beyond `isReaderHash` to ChromeFrame surfaces (`#/surahs`, `#/bookmarks`, `#/search`, `#/about`).
- Focus: `onCloseAutoFocus` (overlays.tsx) prefers the actual invoker — `chrome-settings-trigger` joins `targetIds` ahead of the reader fallback when opened from ChromeFrame.
- Verify: `#/surahs` → gear → close: still on `#/surahs`, focus on `#chrome-settings-trigger`. Reader path unchanged. `#/assets` alias still expands assets.

### Task 2 — Write-error → Status (S-P5, fixes S-D6)
- `SettingsRoute.tsx` hand-rolled alert div → `Status tone="error"` (role=alert) + existing Retry `Button` in action slot.
- Verify: force a write failure (block IDB or stub); role/name assertions.

### Task 3 — Mobile scroll affordance (S-P7, fixes S-D5)
- ≤767px: `.qar-react-settings-body` bottom cue — `box-shadow: inset 0 -1px 0 var(--qa-react-settings-divider)`. Token-only; no scrollbar element, no motion.
- Verify: 375×812 first group visible above fold + cue reads; K2.6 judges "enough".

### Task 4 — Orphaned rule relocation (S-P8, fixes S-D7)
- Move `.qar-react-mushaf-page-actions > button` 48px rule out of the adaptive-settings block to the mushaf dock region. No value change.
- Verify: mushaf dock sizing unchanged (Iter-2 surfaces unaffected); settings block self-contained.

### Task 5 — S-P2 authored-values verification pass (no new prescriptions)
- Verify against live rendering: desktop rail `min(28rem, 100vw-24px)` + `--qa-react-settings-sheet` fill + `--qa-react-settings-shadow`; sticky header; mobile full-bleed header clear of chrome + visible close affordance; theme/night `aria-checked` selected treatment paints in all themes; night-selected states visible (baseline had flagged "no selected state" — post-layer-fix this must paint; if it does NOT, report as delta for K2.6/orchestrator before proceeding).
- Optional (S-P6): appearance icon 19→20px optical parity — implementer taste, skip freely.

### Task 6 — Gates + review + commit
- `mise run check` && `mise run build:ui` && `env -u CI mise run smoke`.
- K2.6 re-review: settings overlay from reader AND ChromeFrame bases, both viewports × themes, scroll cue, error status.
- Correctness review: REQUIRED for Task 1 (routing/focus contract change); Task 2 role semantics.
- Commit `fix: settings family wave (base preservation, error status, scroll affordance)`.

## Out of scope
Scrim values (Iter 1), search/settings content sections beyond named defects, theme engine, `--qa-react-settings-backdrop` retirement (zero-consumer flagged — orchestrator gates it in a later cleanup).
