# QuranAtlas Unsupported-Hash Fallback Design Brief — `#/nope` (unmatched route)

**Status:** Director design brief (per-screen, v2 part 2). Binding only after orchestrator vetting against spec §6.
**Date:** 2026-09-08
**Route family:** any hash `matchReactRoute` cannot parse (e.g. `#/nope`) → `route.type === 'unsupported'`.
**Consumes:** `docs/superpowers/specs/ui/2026-09-08-brief-commonality.md` (chrome tiers §2, ownership/state map §3, theme/night §4, motion §5). No new tokens, colors, easings, or namespaces are introduced.

**Evidence base.** Live inspection of `http://127.0.0.1:5173/#/nope` at 1280×900 and 375×812, in light / sepia / dark (+ dark+night). Sources: `src/app/App.tsx:263-281` (`UnsupportedRoute`), `src/app/router/routes.ts:56` (fallback), `src/app/routes/navigation/NavigationRouteHost.tsx`, `src/design-system/recipes/navigation-page.tsx`, `src/components/ui/feedback.tsx` (`Status`).

---

## 1. Composition (target — commonality language)

`#/nope` composes **Tier B chrome** (registry `chrome-frame`, commonality §2.2, via `NavigationRouteHost` with `statusMessage="Unavailable"`) over content. **Target composition:** the content should sit in a **Tier C `NavigationPageRecipe`** (registry `navigation-page-recipe`, commonality §2.3 — the recipe the commonality brief explicitly assigns to "Surahs/Bookmarks/unsupported content"), with:

1. Recipe header — single h1 (recipe `title`), no kicker.
2. One `Status` (registry `status`) carrying the explanation and the recovery action.

**Actual composition today:** the route hand-rolls a bare `<main aria-label="Unsupported route">` (`App.tsx:264-268`, `max-w-2xl` grid) and puts the `Status` inside it — bypassing the recipe and, with it, the h1. The `Status`'s own `title` prop renders a plain `<div>` (feedback.tsx), so the page ships with **no heading at all**.

The current `Status` is `tone="warning"` — title "This link is not supported", description naming the offending hash, action `Button variant="secondary"` "Go to Surah list" (→ `#/surahs`).

---

## 2. Defects seen (each cited)

### Blocking
_None._

### Major
- **U-D1 — The page has no heading (h1) — sweep finding confirmed.** Measured live: `document.querySelectorAll("h1,h2,h3,h4")` is **empty** at both viewports in all three themes. The only landmark label is `aria-label="Unsupported route"` on the hand-rolled `<main>`; the `Status` title is a `<div>`. This breaks the single-h1 page rhythm every other Tier-B route has (commonality §2.3) and removes the page's accessible name-by-heading. Fix in §5 U-P1 (route through `NavigationPageRecipe`).

### Minor
- **U-D2 — Heading-less composition also drops the recipe's content rhythm.** The hand-rolled `main` uses `max-w-2xl` + `py-8` instead of the recipe's `px-5 py-5 gap-4`, so the fallback's gutters and vertical rhythm differ from `#/surahs`/`#/bookmarks` for no reason. Resolves for free under U-P1.
- **U-D3 — Status title would duplicate the recipe h1 if composed naively.** Once the recipe provides the h1, the `Status`'s own `title` ("This link is not supported") repeats it verbatim two elements later. The composition needs a distinct status title — exact copy in §5 U-P1.

### Adjudicated findings
- **"'Go to Surah list' button ~36px sub-44px (major)"** → **NOT REPRODUCED.** Measured 44px tall (`min-h-11` on `Button`), width 135px, at 1280×900 and 375×812 in all three themes. No change.
- **"Dark-theme wordmark near-invisible"** → **NOT REPRODUCED; no shared token prescribed** — adjudicated once in the launch brief (§2, measured 12.4:1 in dark on the Tier-B header) and cross-referenced here; same `ChromeFrame` wordmark.
- **Tone adjudication (`warning` vs `error`):** **`warning` is correct.** An unmatched hash is a user/link problem, not an app failure; commonality §3.2 reserves `error` (assertive `role=alert`) for genuine failures. The fallback is a polite dead-end with a recovery action — `tone="warning"` with `role=status` is the owned treatment. Keep.

---

## 3. States (single prescription each)

- **Ready (only state):** composition per §1 (after U-P1). `Status tone="warning"`, `role=status` (polite) — keep.
- **Recovery:** the `Button` navigates to `#/surahs` (a safe, always-valid destination — not the reader, which may itself have been the malformed target). Keep.
- **ChromeFrame status region:** announces "Unavailable" politely (`NavigationRouteHost` `statusMessage`). Keep — with U-P1's h1, the visual and announced names align.
- **Focus-visible:** `2px solid var(--qa-react-focus); outline-offset: 2px` on the wordmark, chrome IconButtons, and the recovery `Button`. Verified the contract.
- **Night:** the wash covers the page uniformly; the `warning` tinted surface stays legible (verified dark+night on the sibling about route's status tones).

---

## 4. Per-viewport layout

### 1280×900 (desktop)
- **Today:** `Status` spans 632px (`max-w-2xl`), top 105, left-aligned under the chrome bar.
- **Target (U-P1):** the recipe's full-width column (`px-5`); the `Status` reads at the same left edge as `#/surahs` content, title h1 24px/600 above it. The warning `Status` keeps its own internal padding; no max-width needed (the card is the content).

### 375×812 (mobile)
- `Status` 335px wide, top 105, entirely above the fold; recovery `Button` 44px.
- Recipe gutters match the other Tier-B pages; no horizontal overflow (measured `scrollWidth === 375`).

---

## 5. Prescriptions (commonality language; zero aesthetic gaps)

**U-P1 — Compose the fallback through `NavigationPageRecipe` (fixes U-D1, U-D2, U-D3).** Replace the hand-rolled `<main>` with `NavigationPageRecipe` (registry `navigation-page-recipe`):
- Recipe `title` → h1: **"This link is not supported"**.
- Inside the recipe, keep the single `Status tone="warning"`; change its `title` to **"Address not recognized"** (so it no longer duplicates the h1), keep the description (`The address {hash} is not recognized by QuranAtlas. Choose a supported destination to continue.`) and the recovery `Button variant="secondary"` "Go to Surah list".
This gives the page its single h1, restores the shared content rhythm, and keeps the `aria-label` on the recipe's `main` aligned with the h1. No token/component additions; the recipe and `Status` are already registered.

**No change** prescribed for: the `warning` tone (adjudicated correct, §2), the recovery destination, the chrome tier, the 44px target (verified), or the announced status message. These are correct and on-token.

---

## 6. Motion / reduced-motion

- **No motion on this surface** — the fallback is static; the `Status` and `Button` render without animation. Correct for a dead-end page.
- **Button hover/focus:** `transition-colors` (150ms); instant under `prefers-reduced-motion` (global collapse, commonality §5.2.1).
- **No new motion** is introduced by U-P1 (a composition cutover to a recipe that itself has no motion).
