# QuranAtlas Launch Surface Design Brief — `#/` (boot / LaunchSplash)

**Status:** Director design brief (per-screen, v2 part 2). Binding only after orchestrator vetting against spec §6.
**Date:** 2026-09-08
**Route family:** `#/` (launch hash) and the `LaunchSplash` surface shown while launch-restore is in flight.
**Consumes:** `docs/superpowers/specs/ui/2026-09-08-brief-commonality.md` (chrome tiers §2, ownership/state map §3, theme/night §4, motion §5). No new tokens, colors, easings, or namespaces are introduced.

**Evidence base.** Live inspection of `http://127.0.0.1:5173/#/` at 1280×900 and 375×812, in light / sepia / dark (+ dark+night). The transient splash was captured live by delaying `/dataset/indexes/mushaf-assets.json` (request interception, no source edits) and by CPU throttling; phases were observer-instrumented. Sources: `src/components/launch/LaunchSplash.tsx`, `src/design-system/recipes/onboarding-page.tsx`, `src/app/App.tsx` (launch-restore wiring, 186-235), `src/continuity/launch-restore.ts`, `src/components/ui/feedback.tsx` (`Spinner`), `src/components/navigation/ChromeFrame.tsx`.

---

## 1. Route behavior and composition (target — commonality language)

**`#/` is a continuity entry point, not a destination.** `useLaunchRestore` resolves an empty/launch hash to the persisted last reader surface (`lastSurface`/`currentPosition` settings records; `#/s/1` when none exists) and `history.replaceState`s to it (launch-restore.ts:88-112, App.tsx:129-136). Resuming the last route on `#/` is **expected behavior** (baseline finding adjudicated, §2). The launch *surface* itself — designed here as the first-boot face — is the transient `LaunchSplash` shown in two windows:

1. `launchRestore.status === 'loading'` (App.tsx:188) — IDB/settings resolution.
2. `Suspense fallback={<LaunchSplash />}` while the resolved route's chunk lazy-loads (App.tsx:190, 201).

**Composition (single surface):** `LaunchSplash` composes **Tier C `OnboardingPageRecipe`** (registry `onboarding-page-recipe`, commonality §2.3) with `title="QuranAtlas"` — the recipe's single h1 in `--qa-react-text` — containing one `<section aria-label="Launch restore">` (centered grid, `gap-3`):

1. `Spinner` (registry `spinner`) — `role=status`, `aria-label`, 20px ring: `border-2 border-border border-t-accent` on the recipe column; measured `animation: spin 1s linear infinite`.
2. Muted copy line in `--qa-react-text-muted` (`text-sm`).

There is deliberately **no chrome tier** on the splash (no Tier-A/B bar): it is a boot surface, not a destination page. The h1 "QuranAtlas" is the only brand element; there is no Georgia wordmark here (that is Tier-B chrome only, commonality §2.2).

---

## 2. Defects seen (each cited)

### Blocking
_None._

### Major
_None confirmed._

### Minor
- **L-D1 — Splash copy misdescribes continuity restore.** `#/any-hash` re-entry, all themes, both viewports. The copy reads "Opening Al-Fatihah · Preparing the default Qaloon reader." (`LaunchSplash.tsx`, spinner `label="Opening Al-Fatihah"`) but the dominant case is a *returning* user being restored to their last surface (e.g. `#/s/2/255` or `#/m/41`) — not Al-Fatihah, and not necessarily the verse reader. The splash also renders during the `Suspense` fallback of *any* lazy route (including `#/about`, `#/nope`). Source: `src/components/launch/LaunchSplash.tsx:6-8`.
- **L-D2 — Spinner spin has no reduced-motion kill.** `Spinner` uses the Tailwind `animate-spin` utility (1s linear infinite); grep of `src/design-system/index.css` shows reduced-motion kills for the search sheen (762-766), verse pulse (3662-3666), and mushaf turn (3537-3540), and the global duration collapse (98-102) — but **no `animation: none` for the spinner**. The spin is a `@keyframes` animation, not a token-driven transition, so it does **not** inherit the 1ms collapse; under `prefers-reduced-motion: reduce` it keeps spinning indefinitely. Per commonality §5.2 rule (b), this is out of contract. This affects every `Spinner` consumer (launch, reader loading, mushaf installing, onboarding save); the fix is prescribed once here as the framing-family owner of first paint and cross-referenced from the other briefs.

### Adjudicated findings
- **"Launch resumes last route (continuity)"** → **expected behavior, not a defect.** Confirmed live: `#/` → `#/s/1` with replaceState (no history entry); `#/onboarding` for a completed user likewise resolves to the reader. The launch surface is designed as the first-boot face per this brief. No change.
- **"Dark-theme wordmark near-invisible (contrast); repeats across launch/bookmarks/search chrome bars"** → **NOT REPRODUCED in settled state; no shared token prescribed (stated once here, cross-referenced by the about/unsupported briefs).** Settled live measurements:
  - Tier-B chrome wordmark (`.qar-react-chrome-wordmark`, ghost `Button` → `--qa-react-text`) in **dark**: `#dcdcdc` on header `--qa-react-surface #181c21` ≈ **12.4:1** (AAA).
  - Sepia: `#2f281f` on `#f4e6c4` ≈ **11.6:1**. Light: `#2d2820` on `#f8f2e4` ≈ **12.9:1**.
  - Launch splash h1 in **dark**: `#dcdcdc` on `--qa-react-canvas #0f1215` ≈ **12.4:1**; muted copy `#a3a3a3` on `#0f1215` ≈ **7.4:1**; spinner accent arc on canvas ≈ 10:1.
  - Dark+night: the `.qar-react-night-shift` wash (opacity 0.78, multiply) leaves the wordmark clearly legible — verified live.
  The one real mechanism matching the report is **transient**: `Button` carries `transition-colors` (150ms) while the chrome header `background-color` flips instantly, so for ~150ms after a theme flip the wordmark ink can still be the *previous* theme's value on the new surface (reproduced synthetically: sepia ink `#2f281f` measured on dark surface `#181c21` ≈ 1.2:1 mid-transition). **No color/token change is prescribed** — the settled language is correct. The optional polish is a theme-switch transition note (§5 L-P2), not a blocking item.
- **"Launch splash vertically off-center / top-anchored" (observed, not reported)** → **kept as designed.** The splash shares `OnboardingPageRecipe` (`min-h-screen content-start`) with the onboarding flow, so the boot sequence splash → onboarding-choose keeps the column and h1 perfectly fixed (no layout shift between phases). Vertical centering is deliberately **not** prescribed.

---

## 3. States (single prescription each)

- **Resolving (default):** composition per §1. `Spinner` `role=status` with the label carries the polite announcement; the muted copy is descriptive text (not a live region). Keep.
- **Suspense fallback (chunk load):** identical surface. Keep — the identical composition is what makes the two windows seamless.
- **Restore resolved:** splash unmounts; destination route renders. No transition between splash and destination (instant swap is correct for boot; no fade prescribed).
- **Restore failure (`resolve()` catch):** launch-restore falls through to the onboarding `choose` state with zero editions (launch-restore.ts:126-136) — the onboarding **empty-editions warning gate** (see onboarding brief §3). Not a launch-surface design item; cross-referenced.
- **Reduced motion:** after L-P1 lands, the spinner freezes to a static accent-arc ring; label/copy unchanged. State change (page appears) remains instant.
- **Night:** no special handling; the wash covers the splash uniformly (verified dark+night).

---

## 4. Per-viewport layout

### 1280×900 (desktop)
- Recipe column `max-w-md` (448px) centered horizontally; content starts at `py-6` from the top (h1 top measured 24px).
- h1 "QuranAtlas" 24px/600; spinner + copy centered under it in the `Launch restore` section.
- No chrome bar; canvas is `--qa-react-canvas` edge to edge.

### 375×812 (mobile)
- Recipe column full-width minus `px-5` gutters (335px measured); same rhythm, same sizes. No wrapping issues; copy fits on two lines maximum.
- No safe-area conflict (no fixed chrome; content starts below `py-6`).

---

## 5. Prescriptions (commonality language; zero aesthetic gaps)

**L-P1 — Give the spinner a reduced-motion kill (fixes L-D2; shared, cross-referenced).** Add an explicit `animation: none` for the `Spinner` under `@media (prefers-reduced-motion: reduce)`, per commonality §5.2 rule (b). The frozen ring still reads as a labelled `role=status` indicator; the label/copy continue to announce. One rule on the primitive covers every consumer (launch, reader loading, mushaf installing, onboarding save). No token change.

**L-P2 — (Optional polish) Align theme-switch transitions for text-on-chrome.** The transient wordmark mismatch (§2 adjudication) comes from `transition-colors` on `Button` text vs instant surface flips. If the orchestrator wants it: transition the Tier-B header `background-color` over `--qa-react-transition-fast` so ink and surface sweep together. **Not required for sign-off**; recorded so the pixel finding is explained.

**L-P3 — Make the splash copy surface-agnostic (fixes L-D1).** Replace the hardcoded "Opening Al-Fatihah · Preparing the default Qaloon reader." with copy that is true for first boot, continuity restore, and Suspense fallback alike:
- Spinner `label`: `"Opening QuranAtlas"`
- Copy line: `"Opening QuranAtlas · restoring your reading surface."`
No token/component change; copy only. (First boot restores to `#/s/1`; the copy stays honest because restore *computes* the surface before navigating.)

**No change** prescribed for: the recipe choice, top-anchored layout, h1 treatment, spinner size/ring language, the absence of chrome, the instant splash→destination swap, or night behavior. These are correct and on-token.

---

## 6. Motion / reduced-motion

- **Spinner:** `spin` 1000ms linear infinite (utility keyframe). Reduced-motion: `animation: none` (L-P1). This is the only motion on the surface.
- **Surface swap:** instant; no transition (boot surfaces must not fade or slide — the app's first paint must be immediate).
- **Theme/night fades** that happen to overlap the splash use `--qa-react-transition-fast` and inherit the 1ms collapse (commonality §5.2.1).
- No new motion is introduced by L-P1..L-P3.
