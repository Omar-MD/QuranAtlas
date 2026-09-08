# UI Iteration 6 — Framing family defect wave (JIT plan)

**Spec:** `docs/superpowers/specs/2026-09-08-ui-screen-fix-refactor-design.md` (Phase B, Iteration 6)
**Binding briefs:** `docs/superpowers/specs/ui/2026-09-08-brief-launch.md` (L-P3), `-onboarding.md` (O-P1..O-P3), `-about.md` (A-P2..A-P5), `-unsupported.md` (U-P1).
**Prerequisites:** Iteration 1 (L-P1 spinner kill already landed). Independent of Iterations 2-5.
**Owner:** orchestrator plans → `ui-implementer` → gates → K2.6 re-review → commit.

## Tasks

### Task 1 — Unsupported fallback through NavigationPageRecipe (U-P1, fixes U-D1/U-D2/U-D3)
- Replace hand-rolled `<main>` with `NavigationPageRecipe`: h1 "This link is not supported"; inner `Status tone="warning"` title "Address not recognized" (no duplicate), same description + "Go to Surah list" secondary Button.
- Verify: `#/nope` has exactly one h1; rhythm matches `#/surahs`; tone/recovery unchanged.

### Task 2 — Launch splash copy (L-P3, fixes L-D1)
- `LaunchSplash`: spinner label "Opening QuranAtlas"; copy "Opening QuranAtlas · restoring your reading surface." Copy-only.
- Verify: transient splash (throttle/CPU) reads honest for first boot + restore + Suspense.

### Task 3 — Onboarding save indicator (O-P1, fixes O-D1)
- Writing branch: `<Spinner label="Saving Mushaf setup" />` replaces fake `<Progress value={60}>`. Continue stays disabled.
- Verify: flow still completes; save state honest (spinner may be sub-perceptual — acceptable).

### Task 4 — Onboarding gate icons + labels (O-P2, O-P3)
- Gate `Status` icon slot: `AlertTriangle` aria-hidden for missing/availability-error/empty-editions (error/warning tones per state).
- Edition `SegmentedControl`: `shortLabel` for long labels + single-line truncation (no mid-label wrap).
- Verify: gates render icon+text (force `missing` state surgically via settings-store flag flip with snapshot+restore — onboarding brief §1 method); 375×812 long-label single line.

### Task 5 — About: bidi + typography + markers (A-P2, A-P3, A-P4)
- Arabic institution name → atomic `<span dir="rtl" lang="ar">` inline unit (wraps whole).
- Citation/credit copy → typographic marks per brief §5 A-P3 exact strings.
- Attribution list → visible `disc` markers in `--qa-react-text-muted`, keep `pl-5`/`text-sm`.
- Verify: 375×812 no mid-phrase Arabic split; markers visible all 3 themes; copy exact.

### Task 6 — About fold check (A-P5)
- After Task 5: verify "Fetch latest app" fully above fold at 375×812. If still clipped: tighten credits copy (per brief — do NOT move Clear-all; destructive stays least prominent).
- Record the measured tops in the report.

### Task 7 — Gates + review + commit
- `mise run check` && `mise run build:ui` && `env -u CI mise run smoke`.
- K2.6 re-review: `#/about`, `#/nope`, splash, onboarding flow (fresh-walk via flag flip) both viewports × themes.
- Correctness review: only if behavior changed (Tasks 3-4 touch flow states — bounded if implementer report shows contract changes).
- Commit `fix: framing family wave (fallback heading, onboarding honesty, about typography)`.

## Out of scope
Reader/search/settings/navigation surfaces (their waves); launch restore logic; wordmark (adjudicated non-defect); surahs list filtering (user backlog).
