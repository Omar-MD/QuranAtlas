# QuranAtlas Reader Screen Design Brief — `#/s/:surah[/:ayah]`

**Status:** Director design brief (per-screen, v2 part 2). Binding only after orchestrator vetting against spec §6.
**Date:** 2026-09-08
**Route family:** `#/s/:surah` and `#/s/:surah/:ayah` (anchor state, e.g. `#/s/2/255`).
**Consumes:** `docs/superpowers/specs/ui/2026-09-08-brief-commonality.md` (chrome tiers §2, ownership/state map §3, theme/night §4, motion §5). No new tokens, colors, easings, or namespaces are introduced.

**Evidence base.** Live inspection of `http://127.0.0.1:5173/#/s/2/255` and `#/s/2` at 1280×900 and 375×812, in light / sepia / dark (+ dark+night). Interactions exercised live: verse bookmark toggle + `qar-reader-verse-pulse` (fired, `data-bookmark-pulse="true"` → `aria-pressed` flip → selection ring), anchor scroll (`scrollY≈63974`, verse top 317px clear of the 56px chrome), chrome hide/show on scroll (`translate3d(0,-64px)`, 120ms), reader→Mushaf view toggle, settings entry. Sources: `src/design-system/index.css` (chrome 1890-1965, verse 3684-3768, continue 1364-1397, shell 1399-1406), `src/components/reader/{ReaderChrome,ReaderVerseSurface,VerseBlock,VerseNumber,SurahContinuityButton,ReadingViewToggle}.tsx`.

---

## 1. Composition (target — commonality language)

The reader route composes **Tier A chrome** (commonality §2.1) over a **Tier C `ReaderPageRecipe`** canvas (registry `reader-page-recipe`, commonality §2.3). One fixed `.qar-reader-chrome` bar; content scrolls beneath in a centered `qar:max-w-page` column padded `calc(env(safe-area-inset-top) + 56px)` at top (index.css:1399).

**Vertical structure (ready state), top → bottom:**
1. `ReaderChrome` (Tier A) — left nav `IconButton`, center Arabic surah title in `--qa-react-accent`, right `[wirdStatus?] + ReadingViewToggle + settings IconButton`.
2. `SurahContinuityButton direction="previous"` (only when the window starts at verse 1) — `Button variant="ghost"`.
3. Surah header (`.qar-reader-surah-header`): meta column (kicker `SURAH N · M VERSES` + English name) + Arabic name `h1` with ornament spans.
4. Basmala block (`.qar-reader-basmala`, suppressed for surah 9).
5. `VirtualVerseList` → one `VerseBlock` per verse (registry `verse-block`).
6. `SurahContinuityButton direction="next"` at the end.

**VerseBlock (the repeated unit):** `<article class="qar-reader-verse">` with a head row (`VerseNumber` ghost `Button` = bookmark toggle + optional hint) and a body (Arabic `p` RTL, translation `p` LTR with inline `TranslationFootnote` markers, optional `TranslationFootnote` panel, `KnowledgeChips` when selected).

Every interactive element is a registry primitive: `IconButton` (chrome), `Button variant="ghost"` (verse number, continuity, footnote close), `Button size="sm" variant="ghost"` (footnote close). No hand-rolled buttons.

---

## 2. Defects seen (each cited)

### Blocking
_None observed in reader._

### Major
- **R-D1 — Verse bookmark glyph is 13×13px (sub-44px visual affordance).** `#/s/2/255`, all themes, both viewports. `VerseNumber.tsx` renders lucide `Bookmark size={13}`; computed glyph box 13×13. The wrapping ghost `Button` hit area is 44px (compliant), but the *visible* bookmark affordance is a tiny 13px icon that reads as decoration, not a tappable control. K2.6 flagged "verse bookmark icons ~16×16 sub-44px (major)" — measured 13px, confirmed as a **visibility/affordance** major (the target is already 44px). Source: `src/components/reader/VerseNumber.tsx:24` (`size={13}`), recipe `.qar-reader-verse-bookmark-glyph` (index.css:3771).
- **R-D2 — Mushaf gate `Status` is occluded by the fixed Tier-A chrome (reader-family shared; see mushaf brief M-D1).** Not a reader-verse defect; recorded in the mushaf brief. Cross-listed so the Reader family wave fixes it once.

### Minor
- **R-D3 — Chrome center title column is squeezed on 375px, Arabic title truncates.** `#/s/2`, 375×812, all themes. Chrome grid resolves to `144px 70px 144px`; the center title column is ~71px wide, so "Al-Baqarah" (`.qar-reader-chrome-title`, `max-width: min(100%,24rem)`) is clipped by the adjacent `ReadingViewToggle` pill (observed rendered as "Al-Baqaral"). Source: grid `minmax(0,1fr) auto minmax(0,1fr)` (index.css:1895-1900) with three right-side controls consuming the trailing 1fr.
- **R-D4 — Prev/next-surah continuity link is a narrow low-emphasis text control.** `#/s/2`, both viewports. `.qar-reader-continue` computed 121×44 (44px min-height is compliant — K2.6's "narrow hit area" concern is **partially adjudicated**: the *target* meets 44px). Residual minor: it is `variant="ghost"` with `0.85rem italic` title + 16px arrow in `--qa-react-text-muted`, reading as a footnote rather than a primary navigation affordance; the label is the *target* surah name only ("↑ Al-Fātiḥah"), not an explicit "Previous surah". Source: `SurahContinuityButton.tsx`, recipe index.css:1364-1397.
- **R-D5 — Duplicate view-toggle vs wird-status chip recipes.** Static-audit confirmed: `.qar-reader-chrome-view-toggle` (index.css:1985-2006) and `.qar-reader-chrome-wird-status` (index.css:2015-2037) hand-write identical pill recipes (`--qa-react-chrome-surface` bg, `--qa-react-nav-control-border`, `--qa-react-radius-pill`, `--qa-react-nav-shadow-control`). Both should compose onto `IconButton` (registry `icon-button`) per commonality §3.1, with the chip treatment as a shared reader-chrome pill variant. **This is Phase-C refactor remainder (spec §9), not a visual defect** — flagged so the implementer does not preserve two copies.
- **R-D6 — Verse-number head row floor is 32px, below the 44px control rhythm.** `.qar-reader-verse-head` `min-height: 32px` (index.css:3722) and `.qar-reader-verse-number` `min-height: 32px` (index.css:3733) — the *visual* number chip sits on a 32px rail even though the button's effective box reaches 44px via padding/negative margin (`padding:6px 4px; margin:-6px -4px`). Cosmetic misalignment with the 44px grid; no clipped target. Source: index.css:3722, 3733 (static-audit "verse-number 32px" ~3895/3961 in the old numbering → now 3730-3761).
- **R-D7 — Static-audit "mushaf bookmark toggle `!important` block (~3620-3643)" is NOT present.** A grep of `src/design-system/index.css` for `!important` returns zero matches in the current tree; `.qar-react-mushaf-bookmark-toggle` (index.css:3444-3470) is a plain recipe. **Adjudicated: stale finding, already resolved.** Recorded so it is not re-investigated.

### Adjudicated K2.6 findings (reader)
- **"Chrome icon focus rings thin/low-contrast (minor)" → NOT CONFIRMED.** Real keyboard `:focus-visible` (Tab navigation, not script `.focus()`) yields `outline: 2px solid <accent>; outline-offset: 2px` on chrome `IconButton`s, `ReadingViewToggle`, and verse controls — exactly the commonality §3.2 focus contract. Script-driven `.focus()` does not set `:focus-visible`, which is the likely source of the false positive. No change prescribed. (If K2.6 has a specific control/viewport where the ring is genuinely absent, that evidence should go to the merge.)
- **"Night-mode nearly indistinguishable from dark (minor)" → confirmed as designed, not a defect.** Night is an orthogonal multiply wash (`.qar-react-night-shift`, opacity 0.78) over the active theme, not a fourth theme (commonality §4). Dark + night is *intended* to be dark-with-wash. No reader-screen change; any legibility tuning of `--qa-react-night-wash` is a commonality token decision, out of this brief's scope.

---

## 3. States (single prescription each)

- **Ready:** composition per §1.
- **Loading (`corpus.status` loading/idle):** `Status tone="info"` with `Spinner label="Loading reader text"` icon, title "Loading reader" (ReaderVerseSurface.tsx:39-47). Polite live region. Already on the `Status`/`Spinner` primitives — correct; keep.
- **Unavailable / offline (`status="unavailable"`/`aborted`):** `Status tone="warning"` (never error-red) with the reason; `role=status`. Correct per commonality §3.2.
- **Error (`status="error"`):** `Status tone="error"` (`role=alert`, assertive) with the error message. Add a recovery `Button` (retry) per commonality §3.2 "error → Status with a recovery Button" — currently the reader error Status has **no action slot filled**; prescribe the recovery action.
- **Bookmarked (verse):** `article.qar-reader-verse--bookmarked`; the `VerseNumber` glyph fills (`fill: currentColor`), color → `--qa-react-bookmark-accent`, weight 700. State is **not color-only** (fill + weight + `aria-pressed`). Keep.
- **Bookmark pulse:** `data-bookmark-pulse="true"` runs `qar-reader-verse-pulse` 1000ms ease-out once (bg `--qa-react-reader-selection`, inset edges `--qa-react-bookmark-accent`). Reduced-motion: `animation: none` (index.css:3662) — state change remains instant and visible. Correct; keep.
- **Selected (verse):** `data-selected="true"` → `--qa-react-radius-surface` + 4% text tint + 1px border ring (index.css:3702-3706), reveals `KnowledgeChips`. Distinct from hover (surface fill) and bookmarked. Keep.
- **Chrome hidden:** `.qar-reader-chrome--hidden` → `translate3d(0,-100%-8px)`, `pointer-events:none`, `inert`, `aria-hidden`. Transition `--qa-react-transition-fast`. Keep.
- **Disabled:** any reader control → `opacity-55 + pointer-events-none` (commonality §3.2). No reader control currently disables; the spec is reserved.
- **Focus-visible:** `2px solid var(--qa-react-focus); outline-offset: 2px` on every control (commonality §3.2). Already correct under keyboard focus (see R-D adjudication). The only exception to keep is inset `-2px` where an outer ring clips (not used in reader).

---

## 4. Per-viewport layout

### 1280×900 (desktop)
- Chrome: single row, 56px + safe-area; title column `min(100%,24rem)`, never collides (three right controls fit in the trailing `1fr`).
- Content: `.qar-reader-verse-surface` `max-width:1080px` centered; margin scale `data-reader-margin` `xs→xl` maps surface `max-width` 1320→820px at ≥1180px (index.css:3922-3937). Verse padding `--qa-react-verse-pad-x` 24px default.
- Continuity buttons centered, 44px min-height.

### 375×812 (mobile)
- Chrome: single row, 56px; **defect R-D3** — center title column collapses to ~71px. Prescription below (§5).
- Content: `--qa-react-verse-pad-x` drops to `6/14/24/36/52px` by `data-reader-margin` at ≤767px (index.css:3877-3889); surface full-bleed minus margin.
- Surah header collapses to one centered column at ≤380px (index.css:3867-3878).

---

## 5. Prescriptions (commonality language; zero aesthetic gaps)

**R-P1 — Enlarge the verse bookmark glyph to read as a control (fixes R-D1).** In `VerseNumber.tsx` raise the lucide `Bookmark` `size` from `13` to `18` (matching the 17–20px icon scale used by the Mushaf bookmark toggle and drawer about icon). Keep the wrapping ghost `Button` at its 44px target and the existing `--qa-react-bookmark-accent` / weight-700 bookmarked treatment. No token change; this is an icon-size literal. The glyph stays `aria-hidden`; the button keeps its `aria-label`/`aria-pressed`.

**R-P2 — Add a recovery action to the reader error state (fixes §3 error gap).** `ReaderVerseSurface` error branch: fill the `Status tone="error"` `action` slot with a `Button size="sm"` ("Retry") wired to re-request the corpus. Uses registry `status` + `button`; no new tokens.

**R-P3 — Give the mobile chrome title a minimum column floor (fixes R-D3).** On ≤520px portrait, allow the center title to take the space it needs by reducing the right-cluster footprint *or* wrapping as Mushaf does. Preferred (consistent with mushaf, commonality §2.1 note): at ≤520px portrait switch the verse-reader chrome to the same two-row treatment already used for mushaf (index.css:2069-2092) — left/right clusters on row 1, title on row 2 spanning `1/-1` at `clamp(1.2rem,6vw,1.48rem)`. This reuses an existing, themed recipe; no new tokens/colors. If a single row is retained instead, set the center column to `minmax(min(100%,20rem), auto)` and let the side columns shrink to content. **Pick the two-row option** for chrome-language consistency.

**R-P4 — Make prev/next-surah continuity read as navigation (fixes R-D4, minor).** Keep `SurahContinuityButton` as `Button variant="ghost"` at 44px. Change the visible label to include the direction word: prefix "Previous surah" / "Next surah" in `--qa-react-text-muted` `0.72rem` kicker above the target name, keeping the ↑/↓ arrow. Target name stays `--qa-react-text` (hover → `--qa-react-accent`). No token change; typographic emphasis only. (If the implementer finds this crowds the 375px width, the kicker may sit inline before the name, separated by `·`.)

**R-P5 — Consolidate the two chrome pill recipes onto `IconButton` (R-D5, Phase-C remainder).** Route `.qar-reader-chrome-view-toggle` and `.qar-reader-chrome-wird-status` through the `IconButton` primitive with one shared reader-chrome pill treatment (chrome-surface bg, nav-control border, pill radius, nav-shadow-control). Do not preserve both copies. **Depends on commonality D3 (bare `IconButton` → 44px)** so the wird-status chip's current 42px (sub-44) becomes 44px for free. No visual change intended; this is a composition cutover.

**R-P6 — Align the verse-number rail to 44px (fixes R-D6, minor).** Set `.qar-reader-verse-head` and `.qar-reader-verse-number` `min-height` to `var(--qa-react-control-touch-target)` (44px) and drop the negative-margin compensation. Visual change is sub-pixel on desktop; it removes a hidden inconsistency with the 44px rhythm.

**No change** prescribed for: bookmark pulse timing/colors, anchor scroll offset, chrome hide/show behavior, focus rings, night-mode treatment, selected/hover verse treatments, Basmala/surah-header typography. These are correct and on-token.

---

## 6. Motion / reduced-motion

- Chrome hide/show, hover tints, scrim fade: `--qa-react-transition-fast` (120ms) — inherits the 1ms reduced-motion collapse (commonality §5.2.1).
- Bookmark pulse: `qar-reader-verse-pulse` 1000ms ease-out ×1; `animation:none` under reduce (already correct).
- Verse hover/selected background: `--qa-react-transition-fast` on `background-color` only.
- No new motion introduced by R-P1..R-P6; R-P3's two-row chrome change is a layout shift, not an animation, and follows the existing `--qa-react-transition-fast` transform transition.