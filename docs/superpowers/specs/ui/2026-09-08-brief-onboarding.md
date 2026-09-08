# QuranAtlas Onboarding Flow Design Brief — `#/onboarding`

**Status:** Director design brief (per-screen, v2 part 2). Binding only after orchestrator vetting against spec §6.
**Date:** 2026-09-08
**Route family:** `#/onboarding` (fresh-user Mushaf-edition setup) and its gate states (`choose` / `missing` / `availability-error` / empty-editions).
**Consumes:** `docs/superpowers/specs/ui/2026-09-08-brief-commonality.md` (chrome tiers §2, ownership/state map §3, theme/night §4, motion §5). No new tokens, colors, easings, or namespaces are introduced.

**Evidence base.** Live walk of the flow at 1280×900 and 375×812 in light / sepia / dark. Method (per context): snapshotted all 7 IDB stores, surgically flipped `settings.mushafEditionSetupVersion` 1→0 (and invalidated `mvpAssetContractId` to defeat the contract auto-repair in `asset-contract-reset.ts`), intercepted `/dataset/indexes/mushaf-assets.json` to present **two** editions (the shipped index has exactly one, which auto-completes without interaction), walked choose → select → Continue → save → complete, captured the `missing` gate live against the real index, then restored all stores and verified an exact record-level match (settings 11, bookmarks 5, savedSearches 1 — siblings' state intact). Sources: `src/app/routes/onboarding/OnboardingRoute.tsx`, `src/app/routes/onboarding/onboarding-flow.ts`, `src/launch/mushaf-edition-setup.ts`, `src/launch/asset-contract-reset.ts`, `src/design-system/recipes/onboarding-page.tsx`, `src/components/ui/form-controls.tsx` (`SegmentedControl`), `src/components/ui/feedback.tsx` (`Status`, `Progress`, `Spinner`).

---

## 1. Route behavior and composition (target — commonality language)

`useLaunchRestore` resolves `setup.status`; anything but `complete` mounts `OnboardingRoute` regardless of the address-bar hash (App.tsx:189-200). A *completed* user visiting `#/onboarding` is redirected to the resolved reader surface — **expected behavior** (adjudicated, §2).

Every state composes **Tier C `OnboardingPageRecipe`** (registry `onboarding-page-recipe`, commonality §2.3): centered `max-w-md` column, `kicker="QuranAtlas"` (`--qa-react-text-muted`), single h1 in `--qa-react-text`. No chrome tier — first boot has no destinations yet.

**Choose state (the interactive flow):**
1. Recipe header — kicker + h1 "Choose your Mushaf edition".
2. Muted instruction line (`text-sm`, `--qa-react-text-muted`).
3. `SegmentedControl` (registry `segmented-control`) — `role=radiogroup` (`aria-label="Mushaf edition"`), one labelled radio per edition; selected option uses the shared selected treatment (accent-tinted bg `--qa-react-nav-control-selected-bg`, accent ink).
4. `Button variant="primary"` "Continue" — full column width, disabled until a selection exists.
5. Conditional: save `Progress` while writing; `Status tone="error"` + retry `Button` if the write fails.

**Gate states** (each is recipe + `Status` + one recovery `Button`): `missing` (selected edition vanished → `tone="error"` "Go to About"), `availability-error` (index fetch failed → `tone="error"` "Retry edition availability"), empty-editions (`tone="warning"` "Retry availability").

---

## 2. Defects seen (each cited)

### Blocking
_None._

### Major
_None._

### Minor
- **O-D1 — Save progress is a fake determinate value.** `OnboardingRoute.tsx:166`: while writing the selection, the flow renders `<Progress label="Saving Mushaf setup" value={60} />` — a hardcoded 60% on an IDB write whose real progress is unknown (measured live: the write completes in <100ms locally; the bar either flashes a meaningless 60% or never appears). Commonality §3.1 owns determinate `Progress` for *measured* progress and `Spinner` for indeterminate loading; a fabricated determinate value is dishonest in both directions. Fix in §5 O-P1.
- **O-D2 — Gate `Status` surfaces have no tone icon.** `#/onboarding` `missing`/`availability-error`/empty states (verified live for `missing`, light + dark): the `Status` renders title + description + action only (`hasIcon: false`). At first boot the error reads as a bare text block. Commonality §3.2 requires state to not be color-only when composed with text; the `Status` `icon` slot is the owned mechanism (mushaf brief M-P3 prescribes the same for its gates). Fix in §5 O-P2.
- **O-D3 — Segmented options can wrap mid-label on narrow columns.** 375×812 with a long edition label (my second mocked edition "Qalun Quran.ws — Large print" wrapped to two lines inside its 44px option; the group itself stayed 335px with **no horizontal overflow** — confirmed). Single-line truncation (`text-overflow: ellipsis`) or the `shortLabel` option slot (`SegmentedControl` supports it) is preferable to mid-label wrapping in a mode selector. Minor because the shipped catalog today has exactly one edition; the wrap needs a 2+-edition catalog with long labels to appear. Fix in §5 O-P3.

### Adjudicated findings
- **"Onboarding redirected for completed users"** → **expected behavior.** Confirmed: with `mushafEditionSetupVersion === 1`, `#/onboarding` resolves straight to the reader. No change.
- **"Flow itself unaudited"** → audited fresh (this brief). Choose/save/complete/missing all exercised live; availability-error and empty-editions verified in source with their `Status` compositions confirmed against the registry (identical recipe + Status + Button pattern).
- **Disabled Continue contrast (dark)** → **adjudicated: correct.** Dark disabled Continue measures accent `#d4a253` with ink `--qa-react-text-on-accent #15110a` at `opacity: 0.55` — effective text ≈ 4.4:1 on the blended fill, and the control reads as *disabled* (the intended signal per commonality §3.2 "disabled = opacity-55 + pointer-events-none; never color-only"). Enabled state is 7.4:1. No change.
- **Spinner in the installing/save states** → the launch brief's L-D2 (no reduced-motion kill on `Spinner`) applies to this flow's spinners; fixed once by L-P1, cross-referenced (§6).

---

## 3. States (single prescription each)

- **Choose (idle, no selection):** composition per §1. Continue disabled (`opacity-55`, `pointer-events-none`). Keep.
- **Choose (option selected):** selected option = `--qa-react-nav-control-selected-bg` + accent ink + native `checked` radio (real form semantics — keep). Continue enabled (primary, 44px). Verified live: selection flips `checked` and Continue to `opacity: 1`, `disabled: false`.
- **Single-edition catalog:** `useEffect` auto-selects the only edition and completes without interaction (OnboardingRoute.tsx:76-84) — the shipped one-edition catalog means fresh users see choose → save → reader as a brief auto-advance. **Keep** — do not add a forced confirmation step; it would be friction for a non-choice.
- **Saving (`persistenceStatus === 'saving'`):** Continue disabled; indeterminate loading indicator labelled "Saving Mushaf setup" (per O-P1, `Spinner`, not fake `Progress`). Polite.
- **Persistence failed (`persistenceStatus === 'error'`):** `Status tone="error"` (`role=alert`) "Could not save Mushaf setup" + retry `Button variant="secondary"`; retry receives focus (`retryRef`). Selection is preserved. Correct per commonality §3.2 (error → Status + recovery Button); keep, plus O-P2 icon.
- **Gate `missing`:** `Status tone="error"` (`role=alert`) "Your selected Mushaf edition is no longer available" + "Go to About" `Button variant="secondary"` (44px measured). Keep; plus O-P2 icon.
- **Gate `availability-error`:** `Status tone="error"` + "Retry edition availability" `Button`. Keep; plus O-P2 icon.
- **Gate empty-editions:** `Status tone="warning"` ("No Mushaf editions are available", connect-and-retry) + "Retry availability" `Button`. Warning (not error) is correct — this is degraded/offline, per commonality §3.2. Keep.
- **Focus-visible:** `2px solid var(--qa-react-focus); outline-offset: 2px` on radios, segmented options, and buttons (commonality §3.2). Verified the contract on the segmented options and Continue.
- **Night:** the wash covers the recipe uniformly; no per-component change (commonality §4).

---

## 4. Per-viewport layout

### 1280×900 (desktop)
- Recipe column `max-w-md` (448px) centered; h1 24px/600; kicker above.
- `SegmentedControl` inline-flex, options at content width, all 44px tall (measured 126–215px wide per label).
- Continue full column width (448px), 44px.

### 375×812 (mobile)
- Column 335px (full width minus `px-5`); h1 at `top: 48`.
- Segmented group 335px; options 44px, wrap *within* the group with no horizontal overflow (measured `scrollWidth === viewport`). Long labels wrap mid-label — O-D3.
- Continue full column width (335px), 44px, top 204 — entirely above the fold.
- All gate `Status` surfaces fit above the fold (title + 2-line description + one button).

---

## 5. Prescriptions (commonality language; zero aesthetic gaps)

**O-P1 — Replace the fake save `Progress` with an indeterminate `Spinner` (fixes O-D1).** In the `writing` branch, render `<Spinner label="Saving Mushaf setup" />` in place of `<Progress value={60} … />`. The write has no measurable progress; commonality §3.1 owns `Spinner` for indeterminate loading. Keep Continue disabled during the write (already correct). No token change.

**O-P2 — Add tone icons to the gate `Status` surfaces (fixes O-D2).** Fill the `Status` `icon` slot: `missing` and `availability-error` → error tone icon (lucide `AlertTriangle`, the glyph already used for warnings in `ui.stories.tsx:177`; error tone uses the same alert-family glyph); empty-editions → warning tone icon (same `AlertTriangle`, warning tone). Icons `aria-hidden`. Matches mushaf brief M-P3 so all app gates share one treatment. No new tokens.

**O-P3 — Keep segmented option labels on one line (fixes O-D3).** In the onboarding `SegmentedControl`, pass the existing `shortLabel` slot for narrow columns where an edition label is long (e.g. "Qalun Quran.ws — Large print" → shortLabel "Qalun Large"), and let the option truncate with `text-overflow: ellipsis` rather than wrap mid-label. The group's 44px height and one-line labels stay intact at 375px. No token change; uses the primitive's existing `shortLabel` API.

**No change** prescribed for: the auto-advance single-edition path, the recipe/kicker/h1 composition, the selected/disabled state language, the `missing`/`availability-error` tones, the retry-focus behavior, or the completion navigation. These are correct and on-token.

---

## 6. Motion / reduced-motion

- **Save `Spinner` (after O-P1):** 1s spin; inherits the launch brief's L-P1 reduced-motion `animation: none` kill (one primitive rule covers this flow). Cross-referenced, not re-prescribed.
- **Segmented selection / Continue enable / gate appearance:** instant state changes; the selection tint follows `--qa-react-transition-fast` where the primitive transitions background. Inherits the global 1ms collapse (commonality §5.2.1).
- **Auto-advance (single edition):** no animation — choose → reader is an instant swap; correct.
- **No new motion** is introduced by O-P1..O-P3 (O-P1/O-P2 swap one labelled indicator for another of the same family; O-P3 is a label/truncation change).
