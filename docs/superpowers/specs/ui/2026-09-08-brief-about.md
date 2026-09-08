# QuranAtlas About Screen Design Brief — `#/about`

**Status:** Director design brief (per-screen, v2 part 2). Binding only after orchestrator vetting against spec §6.
**Date:** 2026-09-08
**Route family:** `#/about` (product information, attribution, app updates, destructive clear-data).
**Consumes:** `docs/superpowers/specs/ui/2026-09-08-brief-commonality.md` (chrome tiers §2, ownership/state map §3, theme/night §4, motion §5). No new namespace. One **token proposal** (A-D1, values for all three themes) is marked as such.

**Evidence base.** Live inspection of `http://127.0.0.1:5173/#/about` at 1280×900 and 375×812, in light / sepia / dark (+ dark+night), with line-box instrumentation for the bidi wrap at 320/375/430/520/640/768/1280 widths. Sources: `src/app/routes/settings/AboutRoute.tsx`, `src/design-system/recipes/settings-page.tsx`, `src/components/navigation/ChromeFrame.tsx`, `src/components/ui/button.tsx`, `src/components/ui/overlays.tsx` (`Dialog`), `src/components/ui/form-controls.tsx` (`Input`), `src/design-system/tokens/semantic.css`.

---

## 1. Composition (target — commonality language)

`#/about` composes **Tier B chrome** (registry `chrome-frame`, commonality §2.2) over a **Tier C `SettingsPageRecipe`** (registry `settings-page-recipe`, `title="About"` → single h1). The recipe column is full-bleed (`px-5` gutters, no max-width). Vertical structure:

1. Tagline "Read, reflect, remember." (`text-base`, medium).
2. **Remembrance card** — a bordered surface section (`rounded-surface border bg-surface p-4`, `aria-label="Quran remembrance"`): the Q 54:17 Arabic verse (RTL, `text-2xl`, right-aligned) + its English citation (muted, `text-sm`). This is `Card`-language (commonality §3.1) hand-rolled as a section.
3. **Attribution** — `h2` + a `<ul>` of four credit lines (muted, `text-sm`).
4. **Install** (conditional) — `Button variant="primary"` when the PWA install prompt is available.
5. Version line (`text-sm`, muted, `v{pkg.version} · dev`).
6. **App updates** — `h2` + a polite `aria-live` status line + `Button variant="secondary"` "Fetch latest app" (lucide `RefreshCw` 16px).
7. **Clear local data** — separated by a hairline `border-t`; a `Dialog` (registry `dialog`) with `Button variant="danger"` trigger "Clear all data", typed-confirmation `Input`, and Cancel/Confirm actions.

Every control is a registry primitive; the only hand-rolled surfaces are the remembrance card and the attribution list.

---

## 2. Defects seen (each cited)

### Blocking
_None._

### Major
- **A-D1 — Destructive "Clear all data" ink fails contrast in dark (token gap; proposal).** Settled live, dark, both viewports: `Button variant="danger"` renders `background: --qa-react-danger` = `danger-600 #a63a2f` with ink `qar:text-surface` = `#181c21` → **≈2.66:1** (fails 4.5:1). Light/sepia pass (ink `#f8f2e4` / `#f4e6c4` on `#a63a2f` ≈ 5.9:1). Root cause: `button.tsx` hardcodes `text-surface` as the on-fill ink for `primary` **and** `danger`, but the dark `--qa-react-surface` is near-black and the dark danger fill is *not* lightened, so the dark pairing collapses. The existing `--qa-react-text-on-accent` cannot serve both fills in dark (its dark value `#15110a` is correct on the light bronze accent `#d4a253`, but on `#a63a2f` it is ≈2.76:1). This needs a dedicated on-danger ink. **Adjudication of "destructive color outside warm palette":** the danger *fill* is correct and owned — `--qa-react-danger` = `danger-600` is the single destructive tone (commonality §1.1), and `variant="danger"` is the right primitive for this action. **Do not re-hue the fill.** The defect is the dark *ink* on that fill. Fix + token proposal in §5 A-P1 (shared with the settings brief by cross-reference — the clear-data confirm dialog's destructive action consumes the same primitive fix).

### Minor
- **A-D2 — Arabic attribution parenthetical splits across lines mid-phrase (bidi wrap).** The first credit embeds an Arabic institution name in an LTR sentence: `…Qur'an Printing Complex (مجمع الملك فهد لطباعة المصحف الشريف), Madinah`. Where the line breaks inside the Arabic run, the RTL fragment splits across two line boxes and the closing parenthesis detaches — measured live as 2 Arabic line boxes at **320, 375, 430, and 768px** (single box at 520/640/1280). At 375×812 the phrase breaks after its first word: end of line 2 `(مجمع` → start of line 3 `الملك فهد لطباعة المصحف الشريف)`. Source: `AboutRoute.tsx:14-18` (bare parenthesized Arabic inside a plain `<li>`, no `dir`/`lang` span).
- **A-D3 — Citation uses ASCII straight quotes and a hyphen separator, against the app's typographic voice.** Live text: `"And We have certainly made the Qur'an easy for remembrance, so is there any who will remember?" - 54:17` — straight `"`, straight apostrophe in `Qur'an`, and ` - ` before the reference. Elsewhere the app sets typographic marks (reader footnotes "Qira'at…" with `'`, surah titles "Al-An'ām — The Cattle" with `'ā` and em-dash). Same straight-apostrophe issue in the credit lines (`Qur'an text`, `Qur'an Printing Complex`). Fix in §5 A-P3 (exact copy).
- **A-D4 — Attribution bullets are suppressed in *all* themes (not just light/sepia).** Measured `list-style-type: none` on the credit `<ul>` in light, sepia, **and** dark — Tailwind preflight strips the markers and only `qar:pl-5` indent remains, so the four credits read as unmarked run-on paragraphs. **Adjudication of the baseline finding "markers invisible in light/sepia but square in dark":** the *invisibility* is real, but the "square in dark" half does not reproduce — there is no theme-conditional list style anywhere (`grep list-style` over `src/design-system` shows only component-specific `none`s for search/drawer/bookmarks). The cross-theme truth is simpler and worse: no markers at all, anywhere. Fix in §5 A-P4.
- **A-D5 — Clear-all section sits below the fold on mobile (structure, not styling).** 375×812, all themes: `scrollHeight 919` vs viewport 812; "Fetch latest app" top 778 (partly cut), "Clear all data" top 855 (fully below fold). A destructive control being below the fold is acceptable — it should not be prominent — but the *App updates* action is the one users reach for and it is clipped at the fold on the smallest supported viewport. Fix in §5 A-P5 (content-order polish; no visual change to any component).

### Adjudicated findings
- **"'Fetch latest app' button ~36px sub-44px (major)"** → **NOT REPRODUCED.** Measured 44px tall (`min-h-11` on the `Button` primitive) at 1280×900 and 375×812 in all three themes; width 164px. The primitive enforces the 44px rule (commonality §3.3). If a 36px reading exists, it was an unstuck measurement or a different element; no change prescribed.
- **"Dark-theme wordmark near-invisible"** → **NOT REPRODUCED; no shared token prescribed** — adjudicated once in the launch brief (§2, measured ratios light/sepia/dark 12.9/11.6/12.4:1 on the Tier-B header) and cross-referenced here; the same ghost-`Button` wordmark serves this route.
- **Dialog trigger/focus contract** → verified correct in source: `Dialog` owns focus trap + `initialFocusRef` on Cancel; typed-confirmation gates the destructive action. No change.

---

## 3. States (single prescription each)

- **Ready:** composition per §1.
- **Fetch latest app (idle/checking/reloading/error):** the `aria-live="polite"` line carries the message; the button is `disabled` while `checking`/`reloading` (`opacity-55 + pointer-events-none`, commonality §3.2) with label switching "Checking…" / "Reloading…" — keep. Error falls back to the live line ("Could not check for app updates…"); no separate `Status` is needed for this transient condition — keep as-is.
- **Install (available/done):** primary `Button`; `done` renders disabled "Installed!". Keep.
- **Clear-data dialog (open):** `Dialog` over the shared scrim — **note:** the scrim is currently `qar:bg-text/30` (overlays.tsx:37), commonality defect **D1**; it becomes `var(--qa-react-scrim)` when the commonality iteration lands (not re-prescribed here). `Input` labelled "Type DELETE to confirm"; error line `role=alert`; Confirm `Button variant="danger"` (inherits A-P1 ink fix); Cancel is `initialFocusRef`. Keep the typed-confirmation gate.
- **Focus-visible:** `2px solid var(--qa-react-focus); outline-offset: 2px` on the wordmark, both IconButtons, both content buttons, and the dialog controls. Verified the contract.
- **Night:** the wash covers the page uniformly; the citation card and lists stay legible (verified dark+night).

---

## 4. Per-viewport layout

### 1280×900 (desktop)
- Recipe column full-bleed (`px-5`), content left-aligned; the remembrance card and attribution list span the full 1240px content width — the credits' line length (~90ch) is long but acceptable for a reference page; no change prescribed.
- All sections well above the fold; bidi wrap does not trigger (single Arabic line box measured).
- App updates + Clear sections visible without scrolling.

### 375×812 (mobile)
- Column 335px; h1 "About" at the recipe's standard top rhythm.
- Remembrance card: Arabic verse wraps naturally RTL (correct); the citation wraps to ~4 lines.
- Attribution: bidi defect A-D2 active (2 Arabic line boxes at this width); credits wrap to 3-5 lines each.
- App updates status + button at the fold (button top 778, partly clipped); Clear-all fully below fold (A-D5).

---

## 5. Prescriptions (commonality language; zero aesthetic gaps)

**A-P1 — Give the danger `Button` a real on-fill ink (fixes A-D1; token proposal).** Two coordinated changes:
1. **Proposal (marked):** add `--qa-react-text-on-danger` to `semantic.css` with values — light `#faf1d8`, sepia `#faf1d8`, dark `#f8f2e4` — each ≥5.9:1 on `danger-600 #a63a2f`. (The existing `--qa-react-text-on-accent` stays as-is for the accent fill; it cannot serve the darker danger fill in dark.)
2. **Consumer cutover:** `button.tsx` `variant="danger"` consumes `--qa-react-text-on-danger` instead of `qar:text-surface`. The `primary` variant keeps `text-surface` (its dark pairing `#181c21` on `#d4a253` ≈ 7.4:1 is fine).
The danger fill is **not** re-hued (owned tone, §2 A-D1 adjudication). This single primitive fix also covers the clear-data *confirm* action — the settings brief cross-references it rather than re-prescribing.

**A-P2 — Make the Arabic institution name an atomic inline unit (fixes A-D2).** Wrap the Arabic parenthetical in its own `<span dir="rtl" lang="ar">` rendered as an atomic inline (treated as a single unbreakable inline box) so it wraps *whole* to the next line instead of splitting mid-phrase; the closing parenthesis and "Madinah" stay with the LTR flow. This carries the `dir`/`lang` semantics the verse paragraph already uses elsewhere on the page. No token change; bidi-mechanism fix only.

**A-P3 — Set the citation and credits in the app's typographic voice (fixes A-D3).** Exact copy:
- Citation: `“And We have certainly made the Qur’an easy for remembrance, so is there any who will remember?” — Qur’an 54:17` (curly double quotes “…”, curly apostrophe ’, em-dash separator, and name the source Qur’an before the verse reference).
- Credit apostrophes: `Qur’an` (curly ’) in the first credit and its `King Fahd Glorious Qur’an Printing Complex` expansion; `Qur'an text` opening word likewise.
No layout/component change.

**A-P4 — Restore attribution list markers (fixes A-D4).** Render the four credits with visible `disc` markers in `--qa-react-text-muted` (matching the text), keeping the existing `pl-5` indent and `text-sm` rhythm — a local `list-disc` treatment on this list only, consistent in all three themes (the fix is identical per theme; there is no dark-specific variant to preserve). No new tokens. (Alternative the implementer may prefer: compose each credit as a `ListRow` without `num` — acceptable, but the simple marked list is the lighter change and matches the reference-page register.)

**A-P5 — Raise the App updates section above Clear local data on the content stack (fixes A-D5).** Reorder the page so the interactive sections read: remembrance card → attribution → install (when present) → version → **App updates** → **Clear local data**. This is already the source order; the fold pressure at 375px comes from the credits' length. After A-P2/A-P4 the credits tighten; **no component change** — if App updates still clips at 375×812 after A-P2/A-P4 land, the remedy is the credits' tighter copy, not moving Clear-all (the destructive control *should* remain the least prominent). Record the fold check as the iteration's verification step at 375×812.

**No change** prescribed for: the chrome tier, recipe, h1/h2 rhythm, remembrance-card surface language, the update-check state machine, the install flow, the dialog composition (beyond the A-P1 ink its confirm button inherits), or the 44px targets (all verified compliant).

---

## 6. Motion / reduced-motion

- **Dialog open/close + scrim fade:** `--qa-react-transition-fast`; inherits the global 1ms collapse (commonality §5.2.1).
- **Button hover/ink transitions:** `transition-colors` (150ms); under reduce, instant.
- **Update-check spinner-in-button:** none today (label text changes only); no motion introduced.
- **No new motion** is introduced by A-P1..A-P5 (token/ink, bidi span, copy, list markers, and a fold-verification note).
