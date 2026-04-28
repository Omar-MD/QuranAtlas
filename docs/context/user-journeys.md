# User Journeys

Cross-surface happy paths a user can actually walk today. Each entry shows the trigger, the step sequence, the surfaces involved (see `feature-map.md`), and any IDB persistence (see `data-model.md`). Use this when you want to answer "what can this app do end-to-end?" without booting it.

> ## ⚠ Maintenance rule
>
> **Any UI change — new surface, renamed button, moved flow, altered CTA, reordered screens — requires updating this file in the same commit.** If the change is too small to be worth documenting, it's also too small to change. Journeys drift faster than any other doc in the repo; keeping them honest is the only way they stay useful.
>
> When adding a journey, keep steps **surface-level** ("tap Save", "open More sheet") — not pixel-level. Skip animations, exact labels, and hover states. Those belong in specs, not context docs.
>
> If a journey is *removed* (feature deleted), move it to the **Deprecated** section at the bottom and note the commit that removed it. Don't silently delete — the absence should be explicit.

Source of truth baseline is the M10 E2E smoke-test matrix from `docs/superpowers/plans/2026-04-16-ambient-navigation-redesign.md`. These journeys were verified at the close of the ambient-navigation redesign.

---

## Keyboard shortcuts

Full, in-app reference is the `?` cheatsheet (see G3). Summary:

**Universal**
- `/` — open command sheet
- `⌘K` / `Ctrl+K` — open command sheet (alias)
- `?` — open shortcut cheatsheet
- `Esc` — close sheet · back from FVR

**Go to** (g-chord)
- `g h` — home / continue reading
- `g s` — surah list
- `g r` — review hub
- `g a` — about
- `g p` — preferences (settings)

**Reader** (only on `#/s/*`, blocked when a text input is focused)
- `j` / `k` — next / previous verse
- `]` / `[` — next / previous surah
- `Home` / `End` — first / last verse
- `m` — mark the centered verse
- `t` — toggle translation visibility
- `+` / `-` — bigger / smaller font
- `0` — reset font size to default
- `d` — cycle theme (light → sepia → dark → auto)

**Command sheet** (while open)
- `↑` / `↓` — move selection
- `Tab` / `Shift+Tab` — next / previous result group
- `Enter` — activate
- `Esc` — close

**Gestures**
- Double-tap a verse — open mark editor (touch parity with `m`)

---

## A. First run & session restore

### A1. First-run onboarding → Al-Fatihah

Launch with a clean IDB (or cleared data).

Screens: 1) Welcome, 2) Theme, 3) Riwayah, 4) Translation, 5) Shortcuts, 6) Tags intro + final CTAs.

1. App boots → `handleLaunchRestore` checks `settings.onboardingComplete`, finds nothing → navigates to `#/onboarding`.
2. Screen 1 (Welcome): wordmark, blessing, Begin CTA, progress dot 1 lit. No dock, no pill.
3. Tap **Begin** → Screen 2 (Theme): 4 swatches (Light / Sepia / Dark / Auto), Skip button appears.
4. Pick a theme (e.g. Dark) → applied live → tap **Continue** → Screen 3 (Choose Riwayah): three radio cards — Ḥafṣ ʿan ʿĀṣim · Warsh ʿan Nāfiʿ · Qālūn ʿan Nāfiʿ. Default-selected: Qālūn. Tap **Continue** to persist and advance; tap **Skip** to leave the default unchanged and advance. Persists `settings['riwayah']` (sole writer `settings/riwayah.ts`).
5. Tap **Continue** → Screen 4 (Translation): the options are derived from the shipped dataset's `provenance.json`. Saheeh International ships as the default English pack (since 2026-04-27); when it is the only available option the screen shows it as a single non-interactive row and the Continue button advances immediately. Picker becomes interactive once a second translation lands.
6. Tap **Continue** → Screen 5 (Shortcuts). Screen 5 teaches core shortcuts: `/` search; `?` full cheatsheet; `j` / `k` / `]` / `[` verse/surah nav; `m` mark; `t` translation toggle; `+` / `-` / `0` font; `g h` continue reading; double-tap to mark. Desktop renders 2-col grid; mobile stacks single-col. Tap **Continue** → Screen 6 (Tags intro).
7. Screen 6: 2:286 verse preview with 3 sample chips, privacy note. Tap **Open Al-Fatihah** → `settings.onboardingComplete = true`, `#/s/1`, ambient chrome returns.

**Surfaces:** Onboarding → Reader. **Persistence:** `settings.theme`, `settings.riwayah`, `settings.translationId`, `settings.onboardingComplete`.

**Alt paths:**
- Any screen from 2 onward, tap **Skip** → same completion write, land on `#/s/1`.
- Screen 5, tap **Browse all surahs** → completion write, land on `#/surahs`.

### A4. Power up (onboarding shortcuts screen)

Screen 5 of the onboarding flow (see A1).

1. Shown after translation selection; lists 9 curated rows: `/`, `?`, `j`/`k` verse nav, `]`/`[` surah nav, `m` mark, `t` translation, `+`/`-`/`0` font, `g h` continue reading, double-tap gesture. Lede reminds users they can press `?` anywhere for the full list.
2. Desktop (≥1180px) shows rows in a 2-column grid; mobile stacks in single column.
3. Tap **Continue** → Screen 5 (Tags intro).

**Landscape phone / short viewport:** When viewport height is under 500px (phones in landscape, small-height browser windows), the onboarding page drops its `72vh` min-height and top-aligns content with reduced hero padding, so no content clips off-screen.

### A2. Reload stays on the last surface

Any route other than `#/onboarding`.

1. Browser refresh → hash cleared → `ROUTER_LAUNCH_RESTORE` fires.
2. Onboarding check passes → `settings.lastSurface` read → router navigates there with replace.

**Surfaces:** any. **Persistence:** reads `settings.lastSurface` (written by the router after every successful mount).

---

## B. Reader & ambient chrome

> **Invariant (Riwayah + reader text source).** Reader text source = active Riwayah (from `settings['riwayah']`, default Qālūn). Sole writer of `settings['riwayah']` is `settings/riwayah.ts`. Font follows via `--qa-font-arabic` cascade (set by `:root[data-riwayah=...]` overrides — each Riwayah binds to its own KFGQPC Uthmanic mushaf cut). Reader's reading-typography slider drives line-height; floor at the `xs` step clears stacked harakat across all riwayat. Each `.qa-verse-arabic` element carries `data-riwayah` mirroring the active Riwayah for CSS specificity.

> **Invariant (Reader Arabic font, dedicated per Riwayah).** Each Riwayah is paired with its own KFGQPC Uthmanic mushaf cut — the official KSA Madinah Mushaf hand authored against that Riwayah's orthography. Cross-Riwayah reuse of a single font (e.g. the Hafs cut on Warsh text) mis-renders combining marks. Mapping:
> - `data-riwayah='hafs'`   → `--ff-kfgqpc-hafs`   → `'KFGQPC Uthmanic Hafs' v22`
> - `data-riwayah='warsh'`  → `--ff-kfgqpc-warsh`  → `'KFGQPC Uthmanic Warsh' V21`
> - `data-riwayah='qaloon'` → `--ff-kfgqpc-qaloon` → `'KFGQPC Uthmanic Qaloon' V21`
>
> Each token's font-family chain falls back to **Amiri Quran** (Khaled Hosny, OFL) when KFGQPC isn't loaded, then bare `serif`. No user-facing font picker. Wired through `--ff-kfgqpc-{riwayah}` (`src/styles/tokens/primitives.css`) → `--qa-font-arabic` (`src/styles/tokens/semantic.css`). **Regression guard:** `tests/unit/styles/font-tokens.test.js` enforces the 1:1 Riwayah ↔ KFGQPC-cut binding and rejects any future cross-Riwayah font misuse.

### B0. Surah header composition (post 2026-04-26)

At the top of every surah the reader shows a flat 2-column grid header — no card background, no ornament chrome:

- **Left column (full height — `grid-row: 1 / span 2`):** stacks `SURAH {n} · {count} VERSES` (uppercase tracked meta caption; surah English name dropped — Arabic title carries it) above the Juz / surah-progress chip (`SurahProgress`).
- **Right column (full height — `grid-row: 1 / span 2`, vertically centered):** Arabic surah name in **`'Amiri Quran'` Mushaf script**, no honorific prefix, RTL, body-text color.

Header is gated on `reader.surahHeaderHidden` — when `true` (toggled via the MarginHeader center-label tap; preference persisted across surahs in `settings.surahHeaderHidden`, sole writer `settings/surah-header-visibility.ts`), the header is unmounted and the bismillah + verses render directly. Toggle is a pure show/hide — no auto-scroll on un-hide.

Below the header, on every surah except 1 and 9, the standalone Bismillah renders as the Unicode Quranic ligature `﷽` (U+FDFD) in a naskh-first font stack (`Amiri Quran` → `Scheherazade New` → `Amiri` → `Noto Naskh Arabic` → system arabic fallback). **Below the glyph, an italic English translation always renders:** *"In the Name of Allah — the Most Compassionate, Most Merciful"* — independent of `settings.translationVisible` (the glyph already sets the religious convention; translation accompanies it as a fixture, not a per-verse toggle). Full voweled text exposed via `aria-label` for screen readers. Bismillah is NOT gated by `surahHeaderHidden` — when the user hides the header the bismillah still renders.

Cross-surah continuation links (`↑ <prev>` and `<next> ↓`) sit nearly flush against the scroller's top/bottom edges (`margin: 2px auto`), styled in muted text color with small italic title (0.7rem) and 12px arrow; reveal to accent color on hover/focus. (Originally tried `opacity: 0.4` for a stronger recede but that pushed contrast below WCAG 1.4.3 — reverted; visual recede now comes from small font + flush margin only.) Pull-to-swap is the primary touch affordance (see B-Cross).

**Surfaces:** Reader (`SurahHeader.svelte`). **Persistence/regression-guards:** `tests/unit/reader/SurahHeader.test.ts` (markup, 2-col layout, visibility gate), `tests/unit/reader/bismillah-translation.test.ts` (translation present surah 2; absent surah 1+9; independent of `translationVisible`; bismillah survives header-hidden), `tests/unit/state/reader.test.ts` (`surahHeaderHidden` rune), `tests/unit/settings/surah-header-visibility.test.ts` (set/toggle/load/init + persistence-across-surah-change), `tests/unit/nav/MarginHeader-toggle.test.ts` (label tap toggles).

### B1. Tap to surface chrome

On the reader.

1. Surah loads → dock briefly surfaces at bottom (then auto-fades after ~3s).
2. Tap reader body → dock fades in again, pill fades in at top showing `{surah}:{verse} · {Name}` + ⌘K hint.
3. No further input for ~3s → both fade out.

**Surfaces:** Reader, Ambient dock, Ambient pill. **Persistence:** none.

**Tablet+ variant:** Dock items grow from 38×38 to 42×42 for easier iPad tap targets (≥768px). Auto-hide behavior unchanged.

**Desktop variant:** On viewports ≥1180px, the reader renders as a single centered column capped at ~1080px. Each verse stacks Arabic (justified, RTL — fills the full column width and wraps naturally) on top, translation below. Toggling Hide translation in Settings simply hides the translation block; the column width is unchanged.


**Desktop variant (≥1180px):** Ambient dock is a 56-px full-height left panel (cream surface, right-border separator). Top: Arabic "أ" logo + 4 icon tabs (Read / Search / Review / Marks). Bottom: rotated verse crumb (`{surah} : {verse}`, read bottom-to-top) + ⋯ more button. Always visible — no auto-fade. Hover shows a parchment tooltip to the right. Surah list reached via ⋯ → drawer (no Surah-list item), command sheet, or `G`+`S` shortcut (not a rail tab). Bottom-center pill is gone; **TagModePill retired 2026-04-25** — desktop fast-tag entry is now via right-click on a verse, same as mobile double-tap.

**Mobile / tablet variant (<1180px) — single-row redesign 2026-04-25, drawer overhauled 2026-04-25, label retuned 2026-04-26, sizes bumped 2026-04-27:** Ambient dock is hidden entirely. Primary navigation is `MarginHeader` at the top, ~56 px tall — left **hamburger ≡** (48px tap target, 26px icon) opens the nav drawer, center **single-line Arabic surah label** in `'Amiri Quran'` Mushaf script (18 px; the previous uppercase smallcaps English subline was dropped 2026-04-26), right **settings gear ⚙** (48px tap target, 26px icon). No second-row tabs, no kebab, no fast-tag dot. Header auto-hides on scroll down and reveals on scroll up or any `AMBIENT_SURFACE` emit. `#main-content` reserves ~60 px of top padding. **Gestures:** **tap label = toggle in-reader Surah Header visibility** (post 2026-04-26 — was no-op; sole writer `settings/surah-header-visibility.ts`, IDB key `surahHeaderHidden`, preference persists across surahs; bismillah + verses keep rendering); swipe left/right on label = next/prev surah (clamped 1–114); swipe down on header = `openNavDrawer('surahs')` (no longer hash navigation); single-tap gear = settings sheet (debounced 300 ms so a follow-up tap can suppress); double-tap gear (≤300 ms between taps) = cycle theme (parity with keyboard `d`). Replaced 2026-04-26 long-press; `MarginHeader` no longer arms a long-press timer. **Regression guard:** `tests/e2e/journey-b-reader.spec.js` 'mobile margin header is a single row, ≤ 60 px tall' + `tests/unit/nav/MarginHeader-toggle.test.ts` (label tap → toggle, off-route no-op, wordmark-mode no-op, keyboard Enter parity, swipe-still-navigates regression guard, English line dropped).

**Mobile drawer (full-screen, post 2026-04-25):** Hamburger or swipe-down opens a full-screen drawer with two tabs — **Surahs** (default) · **Review**. Surahs tab: search input + filter pills (All / ★ Bookmarked / ⏱ Recent) + scrolling surah list, auto-scrolled to and highlighting the currently-reading surah. Each row shows the number badge, English name, optional ★ bookmark glyph, and the **Arabic surah title** (`s.name_ar`, RTL, `--qa-font-arabic`) right-aligned (added 2026-04-27 — was rendering blank because the component read a non-existent `arabic` field). Review tab: top **Hub** row (→ `#/review`) + 12 layer rows in 4 grouped sections (Speech / Narrative / Themes / Entities) — tapping a layer navigates to `#/review?layer=<name>`. Header carries a tappable QuranAtlas wordmark + ⓘ icon → `#/about`. ✕ closes; backdrop tap, swipe-left, Esc also dismiss. Drawer state is local; not persisted. **Regression guards:** `tests/unit/nav/drawer.test.ts` (Review tab structure, search-text filter, Bookmarked pill, 2:255 ref-jump hint + Enter, verseNum filter, Arabic-title-on-every-row — Rule 5 break-and-restore validated) + `tests/e2e/journey-f-navigation.spec.js` `F-mobile-1` (current-surah highlight) / `F-mobile-2` (layer-tap navigates) / `F-mobile-3` (wordmark→About) / `F-mobile-4` (deep-link redirect) / `F-mobile-5` (center-label no-op).

**Invariant (mobile, post 2026-04-25):** the hamburger drawer is the sole in-app entry to the full surah list. The standalone `#/surahs` page renders only on desktop ≥1180px; mobile arrivals at that hash hard-redirect to `lastSurface` and open the drawer. Don't add new mobile in-app entries pointing at `#/surahs` without first removing this invariant in the same PR.

### B-Translation. Read English translation + open inline footnote

On the reader, with `settings.translationVisible: true` (default).

1. Surah loads. Each verse renders Arabic on top and the English translation directly below in a flowing single-line block.
2. Within the translation, footnote references appear as small bracketed numbers (`[1]`, `[2]`, …) coloured in the accent hue. Sequential within the surah; the same upstream footnote appearing in two verses appears under two different per-surah indices.
3. Tap a `[N]` marker → an inline footnote panel discloses below the translation with the footnote text and a `×` close button. `aria-expanded="true"` flips on the marker.
4. Tap the same marker again, or the `×`, or press **Esc** with focus inside the verse → panel closes. Tapping a different marker swaps the open panel to that footnote (one open footnote per verse at any time).
5. Toggle **Hide translation** (Settings sheet or `t` key) → the translation block, all `[N]` markers, and any open footnote panel disappear in one repaint via `settings.translationVisible` rune. Toggling back on restores text and markers but starts with no panel open.

**Surfaces:** Reader (`Verse.svelte`, `reader/translation-tokens.ts`). **Persistence/regression-guards:** `tests/unit/reader/translation-tokens.test.ts` (token parser — text/marker splits, contiguous markers, no markers, malformed). Translation pack absent / `loadTranslationForSurah` returns `null` ⇒ verses render with empty translation strings, no markers, no panels — reader stays functional.

**Default translation:** Saheeh International (`settings.translationId === 'saheeh'`); see `data-model.md` §Translation packs for schema and `architecture.md` §Translation pipeline for the build/runtime path.

### B2. Scroll hides dock, scroll-to-top surfaces it

1. Scroll down in reader → dock hides.
2. Scroll back near the top → dock surfaces again.

**Surfaces:** Reader, Ambient dock.

### B3. Tap verse number for edge indicator

1. Tap the number circle on any verse → thin accent bars appear at the verse's row on both viewport edges (~1.6s).
2. Pill label updates to the tapped verse.

**Surfaces:** Reader, Ambient pill. **Persistence:** `settings.currentPosition` updated (single global record; see B-Cross).

### B4. Non-reader routes → persistent dock, no pill

1. Navigate to `#/surahs`, `#/review`, `#/about`, etc. → dock is visible and doesn't fade.
2. Ambient pill is hidden on all non-reader routes.

**Surfaces:** Ambient dock, Ambient pill.

### B5. Typography live preview (font size · reading flow)

From Settings sheet → **Typography** row → Typography subview (see D1, D5).

1. Two sliders only — **Font size** and **Reading flow**. Reading flow is a coordinated knob that drives line spacing, word spacing, reader margins, and verse spacing all at the same step (xs/sm/md/lg/xl). Drag → font-size emits `SETTINGS_FONT_SIZE_CHANGED`; reading-flow writes the four IDB keys via `reading-typography.ts::setReadingFlow` → CSS attribute selectors on `<html data-line-spacing|data-word-spacing|data-reader-margin|data-verse-spacing>` re-render the reader live.
2. Live preview line at the top of the subview reflects the change immediately.
3. On mobile, the reading-flow slider's margin component drives `.qa-verse` horizontal padding via `--qa-verse-pad-x` (xs ≈ edge-to-edge, xl wide gutters); `#main-content` drops its outer 1rem horizontal padding when reader content is present so the slider owns the full inset budget. The vertical-spacing component drives `.qa-verse` padding via `--qa-verse-pad-y` everywhere.

**Surfaces:** Settings sheet (Typography subview), Reader.

**Desktop variant (viewport ≥1180px):**
The reader renders a single centered column (max ~1080px). Each verse stacks Arabic (RTL, justified, filling the full column width and wrapping naturally) on top, translation below (no separator line). Toggling translation off in Settings hides the translation block; column width is unchanged. Double-tap works on either cell to open the mark editor for that verse. All other behaviors (scroll position persistence, bookmark edge indicators, verse numbers) are unchanged.

### B7. Scroll position survives warm-resume (iOS lock / tab-hide)

Reader is deep in a surah.

1. Lock screen / switch tabs → `visibilitychange` fires with hidden → `persistOnExit` flushes the tracker's pending verse and writes it to `settings.currentPosition`.
2. Unlock / return to tab → `visibilitychange` fires with visible → `DB_VISIBILITY_VISIBLE` is emitted, but the reader's handler restores scroll **only** when the tracker is fresh (no `lastTrackedVerse`) AND the scroller has collapsed to the top. Otherwise the browser's preserved scroll is trusted.
3. Stale IDB values (e.g. a prior write the hide-time save hadn't replaced yet) never force-scroll an already-scrolled reader back to an earlier verse.

**Surfaces:** Reader. **Persistence:** `settings.currentPosition` on hide; read on fresh-mount restore only. **Regression guard:** `tests/e2e/journey-b-reader.spec.js` §B7.

### B-Cross. Cross-surah infinite scroll (forward + backward, with wrap)

Reader is single-surah; only one surah is mounted at a time. Pulling past the end of N (or top of N) swaps the mounted surah to N+1 / N-1 with wrap (114 ↔ 1).

1. **Pull-to-swap (primary affordance).** When the user pulls past either edge of the scroller, a Chrome-mobile-style circular progress indicator appears (centered, top for backward / bottom for forward). The arc fills as the user pulls; once it completes (~110 px of pull) the swap commits on release. The native browser pull-to-refresh is suppressed via `overscroll-behavior-y: contain` on `#main-content`. Wheel input on desktop accumulates the same way.
2. **Forward swap.** Pull past bottom past the threshold → release → `swapToSurah(nextSurah(N), 'top')` → URL becomes `#/s/{N+1}` → Reader remounts at `scrollTop=0`. Click fallback (post 2026-04-25 redesign): single-line `<next.name> ↓` link below the last verse — italic, hairline-muted, ~22 px tall.
3. **Backward swap.** Pull past top past the threshold → release → `swapToSurah(prevSurah(N), 'bottom')` → URL becomes `#/s/{N-1}` → Reader remounts and anchors `scrollTop=scrollHeight` so the user emerges from the previous surah's terminal verse. Click fallback: single-line `↑ <prev.name>` link above the SurahHeader.
4. **Wrap.** Surah 114 forward → surah 1; surah 1 backward → surah 114.
5. **Position persistence is single-global.** Each surah load overwrites `settings.currentPosition` to (newN, 1) or (newN, lastVerse) on backward; in-surah scroll center-band crossings overwrite it as the user reads.

**Surfaces:** Reader. **Persistence:** `settings.currentPosition` (overwritten on every swap). **Regression guard:** `tests/e2e/journey-b-reader.spec.js` §B-Cross1–§B-Cross5 + `B-Cross-arrow` (continue link shape + height) + `tests/unit/reader/surah-swap.test.ts` (wheel/touch pull tracker, threshold + commit).

### B6. Auto theme follows OS

From Settings sheet with Auto swatch selected.

1. OS/browser flips `prefers-color-scheme` → `settings/theme.ts` listener swaps `<html data-theme>`.
2. Reader and all chrome reflect the new theme without reload.

**Surfaces:** Settings sheet, all surfaces (theme applies globally).

### B6-bg. Theme covers safe-area gutters + PWA chrome

Implicit on every theme apply.

1. `settings/theme.ts::applyTheme` swaps `<html data-theme>` and writes `<meta name="theme-color">` from the live `--qa-surface-app` value, so installed-PWA system chrome (Android Chrome toolbar, iOS standalone status bar fallback) retints with the theme instead of staying white.
2. `styles/base.css` paints `<html>` with `var(--qa-surface-app)`. iOS landscape `viewport-fit=cover` exposes safe-area gutters around the notch — without an html bg they showed UA white/cream regardless of theme. Now they match the theme.

**Surfaces:** all (cross-cutting). **Invariant:** `<html>` and `<body>` background-color must resolve to the same `--qa-surface-app` value under every theme. **Regression guard:** `tests/e2e/journey-d-settings.spec.js` D3-bg (light / sepia / dark).

---

## C. Marking a verse

### C1. Double-tap → fast-tag inline panel

On the reader (post 2026-04-25 mobile-nav-redesign — was deep mark editor).

1. Double-tap a verse (touch) or right-click a verse (desktop) → `beginFast(verseKey)` → the fast-tag inline panel (`reader/VerseTagPanel.svelte`) renders inside that verse below the translation.
2. Verse gains the active-state treatment (left-edge accent bracket, "tagging" dot in verse head). No persistence until a chip is toggled.

The deep TagSheet (12-layer editor) is reachable **only** through the panel's `⛶` escalation button or the `⌘/Ctrl+Enter` keyboard shortcut. Programmatic bridges (Review hub) still call `editor-bridge::openEditor`, which routes via `app-bootstrap` to `openDeep`.

**Surfaces:** Reader, Fast-tag inline panel. **Persistence:** none until first chip toggle. **Regression guard:** `tests/e2e/journey-c-marking.spec.js` 'C1: double-tap opens fast-tag inline panel, not TagSheet' + 'C1: right-click opens fast-tag inline panel, not TagSheet'.

### C1b. Fast-tag inline panel

On the reader.

1. **Entry points (post 2026-04-25):** double-tap verse (touch), right-click verse (desktop), keyboard `m` on centered verse, command-sheet "Mark this verse" (F2). All four call `beginFast(verseKey)`. The retired `MarginHeader` fast-tag dot and desktop `TagModePill` no longer exist.
2. The verse gains the active-state treatment: left-edge accent bracket, inset hairline ring, parchment-bright verse key, "tagging" dot-dim label in the verse head.
3. The fast-tag panel (`reader/VerseTagPanel.svelte`) renders inline inside the active verse, below the translation: one row per layer group (Speech / Narrative / Themes / Entities — all four always rendered, every layer reachable) of `#value` chips colored by layer hue, plus a `+ add` affordance per group and a muted regenerate icon top-right. Tap a chip to toggle — selections debounce-save to IDB after 350 ms via `marks/store::save`. Click `+ add` to swap in an inline input. The input **requires** an explicit `<prefix>:<value>` — the prefix autofills as the user types (e.g. typing `s` in Speech fills `speaker:` with the completion selected, typing `q` fills `quoted:`, typing `d` in Entities fills `divine:`). The next keystroke either accepts the completion or replaces it. Aliases live in `data/tag-layers::LAYER_PREFIXES`; autofill logic in `autofillPrefix`, commit parse in `parseLayeredValue`. If the prefix doesn't resolve to a layer in the group, or the value is empty, commit is refused (red underline + error state). Enter commits, Escape cancels.
4. **Switch active verse while session is open:** short-tap any other verse in the reader → the session's target verse swaps to the tapped one (`beginFast(newKey)`), the panel re-renders inside the new active verse. A short-tap while the session is *closed* does nothing (no auto-start from verse tap).
5. **Exit the session.** Two paths: (a) tap the `✕` close button top-right of the panel (sole exit affordance on mobile, no Esc key); (b) press `Escape` (desktop). Double-tap on a *different* verse switches the active verse rather than exiting. The old long-press "press same verse twice → exit" rule was retired with the 2026-04-25 gesture switch — a double-tap fires onShort on its first tap (already switching the active verse), so a "same verse → exit" rule would fire spuriously. Both paths call `tagSession.end()` → state resets, verse returns to normal styling, panel unmounts.

**Surfaces:** Reader, Fast-tag inline panel (`reader/VerseTagPanel.svelte`). **Persistence:** `marks` store via debounced save. **Regression guard:** `tests/unit/tag/verse-tag-panel.test.ts` (⛶ escalate, ✕ close, chip toggle) + `tests/e2e/journey-c-marking.spec.js` 'C: double-tap on a different verse switches the active verse, panel stays open' (gesture).

**Panel escalation:** `⌘/Ctrl + Enter` keyboard shortcut OR tap the `⛶` button top-right of the panel (replaces the retired "regenerate" placeholder) → `openDeep(verseKey)` → deep TagSheet. No "accept all" button — chip toggles and inline add are the only mutations from this surface.

**Deep sheet presentation:**
- **Mobile (<1180px):** full-screen sheet with sticky header + footer and safe-area insets. The verse-preview card is tap-collapsible (chevron) so a long ayah can be reduced to a one-line summary and the body content (search, layer tabs, chips, note) gets more breathing room.
- **Desktop (≥1180px):** right-side vertical panel (~min(560px, 44vw)); preview-collapse still available via the same chevron.
- **Header:** "Mark verse" title only (no duplicated `verseKey · SURAH` subline — the ref already lives on the preview card).
- **Body layout:** no tab switcher — all four layer groups stack as sections in outer→inner reading order (Speech → Narrative → Themes → Entities), each with a hue-colored left rail that visually nests its layer rows. Layers within each group follow the same outer→inner principle (Speech: speaker → audience → quotedSpeaker → form; Narrative: mode → tone; Themes: threads → subjects; Entities: events → people → places → divineNames). Chips are hashtag-style (`#value` with `#` colored by layer hue) matching the fast-tag panel visual — tap a chip to remove it; underline combobox per row for type-to-create with seed suggestions.
- **Delete flow:** Delete button only renders for existing marks. First tap swaps the footer into an inline confirm row (`Delete this mark? [Keep] [Delete]`); second tap on the solid red button commits and fires the undo toast. Closing the sheet resets any pending confirm.
- **Empty-mark guard:** `marks/store::save` rejects (`EmptyMarkError`) any mark with zero tags across all 12 layers — a note alone is not sufficient. UI enforces the same rule proactively: Save button is disabled in the deep sheet + legacy mark editor until ≥1 tag is selected; the inline fast-tag panel's debounced save skips writes while the draft is empty.

### C2. Multi-tag selection (per layer)

Inside mark editor.

1. Tap a tag chip in a layer's chip pool → chip moves to that layer's selected row with ×; the layer count badge increments.
2. Repeat for more tags (same layer or other layers). Tap × on a selected chip → chip moves back to the pool.

**Surfaces:** Mark editor.

### C3. Create a new tag inline (per layer)

Inside mark editor.

1. Type a new label in a layer's search input → no match found → "+ label" chip appears.
2. Tap the create chip → new tag added to this layer's pool and moved to selected; search clears.

**Surfaces:** Mark editor.

### C4. Note + save

Inside mark editor with ≥1 tag selected (any layer) or note text.

1. Type into the note textarea → Save button enables.
2. Tap **Save** → `marks/store.ts::save` writes to IDB with all 12 layer arrays → `MARKS_SAVED` fires → `broadcastMarkChange` fires across tabs → sheet closes → reader shows gold left-edge on the verse.

**Surfaces:** Mark editor, Reader (indicator). **Persistence:** `marks[verseKey]` with 12 layer arrays + note + timestamps.

### C5. Delete with undo

Inside mark editor on an existing mark.

1. Tap **Delete** → footer swaps to inline "Delete this mark?" confirm.
2. Tap the red **Delete** → `marks/store.ts::del` writes → `MARKS_DELETED` fires → sheet closes → undo toast appears at bottom.
3. Tap **Undo** before it expires (~5s) → mark restored with original note/tags → gold edge returns.

**Surfaces:** Mark editor, core undo toast, Reader. **Persistence:** delete then re-insert on undo.

### C6. Double-tap has no alternative gesture

1. Right-click or double-tap a verse → only the **fast-tag inline panel** opens (post 2026-04-25 redesign).
2. No browser context menu, no multi-action sheet, no preview popover, no deep sheet.

This is a cross-cutting rule, not a feature — preserved intentionally. **Regression guard:** `tests/e2e/journey-c-marking.spec.js` 'C6: right-click and double-tap each open ONLY the fast-tag panel (⛶ → TagSheet)'.

### C7. Multi-layer tag round-trip

Inside mark editor, new mark.

1. Select a tag from the Threads layer → chip appears in layer's selected row.
2. Expand Audience layer → select a tag → chip appears in Audience selected row.
3. Tap **Save** → sheet closes → gold edge appears.
4. Reopen editor for the same verse → "Edit mark" shown → Threads and Audience layers pre-populated with the selected tags.

**Surfaces:** Mark editor, Reader (indicator). **Persistence:** `marks[verseKey].threads`, `marks[verseKey].audience`.

> **Invariant (formerly `CLAUDE.md` Rule 4) — reframed 2026-04-25.** The **fast-tag inline panel** is the sole per-verse action surface. Double-tap, right-click, keyboard `m`, and the command sheet's "Mark this verse" (F2) all route to it via `beginFast(verseKey)`. The deep TagSheet is reachable **only** via the panel's `⛶` escalation, the `⌘/Ctrl+Enter` keyboard shortcut, or programmatic bridges (Review hub via `editor-bridge::openEditor`). Do **not** introduce a contextual menu, multi-action sheet, or preview popover as an alternative per-verse action surface. The verse-number tap (B3) surfaces edge indicators only — that's a navigation affordance, not a per-verse action, and is unaffected.

---

## D. Settings & appearance

### D1. Open Settings sheet

Post 2026-04-25 mobile-nav-redesign (was More sheet → Settings).

1. **Mobile (<1180px):** single-tap the gear `⚙` on the right side of `MarginHeader` → Settings sheet opens (after the 300 ms double-tap window expires, so a quick second tap can rewrite the action). Double-tap gear (≤300 ms apart) cycles theme without opening the sheet.
2. **Desktop (≥1180px):** navigate to `#/settings` (e.g. via `G`+`P` shortcut or command sheet "Preferences") → Settings sheet opens.
3. Sheet content (post 2026-04-25): theme swatches, **Typography** nav row (opens subview — see D5), Reading section (Riwayah three-swatch picker + translation toggle + picker link). The Riwayah picker sits above the translation toggle; switching emits `SETTINGS_RIWAYAH_CHANGED`, broadcasts cross-tab via `safety/sync.ts::broadcastRiwayahChange`, and re-renders the reader with the new Riwayah's text + font + line-height floor.

**Surfaces:** MarginHeader (mobile) or Router (desktop) → Settings sheet.

**Tablet+ variant (≥768px):** Settings sheet opens as a centered modal (~480px wide, top 10vh) instead of sliding up from the bottom. Previously this happened at 720px; now aligns with the canonical tablet breakpoint.

**Font size keyboard shortcuts** still work outside the subview: `⌘↑` (Mac) / `Ctrl+↑` (others) bumps up; `⌘↓` / `Ctrl+↓` bumps down; announced to screen readers. Guarded against focused inputs.

### D5. Typography subview (font size · reading flow)

Inside Settings sheet, post 2026-04-25.

1. Tap the **Typography** row on the main Settings view → subview opens. Subtitle reads `Default` when both knobs are `md`, otherwise a compact summary like `Aa lg · ↕ xl`.
2. Subview top: live preview block (one Arabic verse + translation line) wrapped in the reader's column rules so margin and spacing changes are visible inside the sheet. The Arabic preview text is the active Riwayah's actual rendering of Sūrat ar-Raḥmān 1–2 — same characters and tashkeel encoding the reader will produce, so the preview is a true sample (not a generic Naskh string). The Arabic font is whatever the active Riwayah is bound to (Hafs → KFGQPC Hafs, Warsh → KFGQPC Warsh, Qaloon → KFGQPC Qaloon — see the Reader Arabic-font invariant in section B).
3. **Font size** slider — 5-step (xs / sm / md / lg / xl), writes `fontSize` IDB key, drives `--qa-font-size-base`.
4. **Reading flow** slider — 5-step coordinated knob: a single drag writes all four spacing keys (`lineSpacing`, `wordSpacing`, `readerMargin`, `verseSpacing`) to the same step via `setReadingFlow(step)`. CSS attribute selectors on `<html data-…>` re-render the reader live. The four IDB keys remain individually-addressable so a future advanced view can split them again. Arabic line-height = `1.92 + delta(step)` — the floor (xs) clears KFGQPC tashkeel collisions across all riwayat, md (default) lands at 2.12.
5. **Reset to default** appears below the sliders only when at least one knob (font size or reading flow) ≠ `md`. Tap → font size + all four flow keys return to `md` and the button hides.
6. Back arrow returns to main Settings view; subtitle reflects new state.

**Surfaces:** Settings sheet (Typography subview), Reader. **Persistence:** `settings.fontSize`, `settings.lineSpacing`, `settings.wordSpacing`, `settings.readerMargin`, `settings.verseSpacing`. **Sole writer (line/word/margin/verse-spacing):** `src/settings/reading-typography.ts`. **Regression guards:** `tests/unit/settings/{panel,reading-typography}.test.ts` (subview structure, slider → IDB, reset button, persist round-trip) + `tests/e2e/journey-d-settings.spec.js` 'D5: reading-flow …' (real-CSS line-height / word-spacing / max-width assertions).

### D2. Pick a translation

Inside Settings sheet. Available translations are sourced from the dataset's `provenance.json` at render time — the picker never surfaces options that aren't actually present in the corpus.

1. The **Show translation** row's subtitle shows the name of the currently-selected translation — Saheeh International by default since 2026-04-27. With a single shipped pack the picker sub-view is not opened on tap (the row is informational); when a second pack lands the row becomes interactive and tapping it opens the Translation picker sub-view. Tap an option → `settings.translationId` writes → returns to main Settings view with subtitle updated.
2. Toggle the translation-visibility switch → `settings.translationVisible` rune updates → reader's `$effect` on the rune re-renders with the translation line hidden/shown. Footnote markers (`[N]`) and any open inline footnote panels disappear with the translation.

**Surfaces:** Settings sheet, Reader. **Persistence:** `settings.translationId`, `settings.translationVisible`.

### D3. Theme swap (explicit)

Inside Settings sheet.

1. Tap a theme swatch (Light / Sepia / Dark / Auto) → `settings/theme.js::setTheme` writes `settings.theme` and flips `<html data-theme>`.
2. All surfaces re-theme live. Auto additionally attaches a `prefers-color-scheme` listener.

**Night recitation mode (post 2026-04-25)** is an independent toggle below the theme swatches that overlays a dim+warm tint via the persistent `.qa-night-shift` element (mounted in `App.svelte`, styled in `styles/surfaces/night-shift.css`, driven by `data-night-mode="on"` on `<html>` written by `settings/night-mode.ts`). Composes with any base theme. Reachable from the Settings row or via the global `n` reader shortcut (announced via `a11y/announcer`). Persists in `settings.nightMode` (boolean). **Regression guards:** `tests/unit/settings/night-mode.test.ts` (toggle / IDB write / init reload round-trip) + `tests/e2e/journey-d-settings.spec.js` 'D6: settings switch toggles data-night-mode + overlay opacity' (real overlay CSS) + 'D6: pressing n on reader toggles night mode' (global keybind).

### D4. Clear all data

Post 2026-04-25 mobile-nav-redesign — Clear-data lives on About page footer (was Settings sheet bottom row).

1. Navigate to `#/about` (drawer → About) → scroll to footer → tap **Clear all data** link → confirmation dialog appears.
2. Type `DELETE`, tap red **Clear All Data** → `safety/sync.js::suppressNextVersionChange()` arms, then `deleteDB()` runs → DB gone → page reloads → first-run onboarding (A1) starts fresh.
3. Cancel / Escape → dialog closes, nothing changes.

**Surfaces:** About page → clear-data confirmation → full app reset. **Regression guards:** `tests/unit/settings/{panel,clear-data-confirm}.test.ts` (Settings has no clear-data row + dialog cancel/Escape/disabled-until-DELETE) + `tests/e2e/journey-d-settings.spec.js` 'D4: Clear data → type DELETE → confirm → page reloads → onboarding restarts' (real reload→onboarding leg) + `tests/e2e/journey-g-about.spec.js` 'G: Clear data link is present on About page footer'.

---

## E. Reviewing marks

### E1. Open the review hub

1. Dock → tap **Review** glyph (or ⌘K → "Review hub" → Enter) → `#/review`.
2. Hub renders: 12-layer selector segment (Thread active by default), group-by segment (Value / Surah / Date), value chips for the active layer, sort dropdown, surah filter dropdown, mark cards for the first 30 results.

**Surfaces:** Review hub. **Persistence:** reads `positions.review` for view state (activeLayer/activeValue/groupBy/sort/filters).

### E2. Switch layer + value chip

Inside review hub.

1. Tap a layer tab (e.g. **Audience**) → `activeLayer` switches, `activeValue` resets, value chips reload for that layer.
2. Tap a value chip (e.g. `muminin`) → `activeValue = 'muminin'`, card list filters to marks with that canonical value in the audience layer.
3. Tap the same chip again → `activeValue` clears; all marks for that layer shown.

**Persistence:** each tap writes `positions.review.activeLayer` / `positions.review.activeValue`.

### E2b. Switch group-by bucket list

Inside review hub.

The "Group by" segment changes which bucket list the rail shows, not how cards are grouped. Cards always render as a flat, unique, single-column list sorted by most-recent update — no duplicates when a mark carries multiple values.

1. Tap **Surah** segment → rail shows surah buckets; cards remain flat.
2. Tap **Date** segment → rail shows month buckets; cards remain flat.
3. Tap **Value** segment (default) → rail shows canonical values for the active layer.

**Persistence:** each tap writes `positions.review.groupBy`.

### E2c. Filter by multiple values (desktop)

In Value mode on desktop (≥1180px).

1. Tap a value rail row → OR filter applied; cards show marks that have that canonical value in the active layer.
2. Tap another value rail row → OR filter expands; cards show marks carrying *either* value.
3. A chip bar appears above the cards showing active value chips with `×` to remove each.
4. `Clear all` removes all active value filters.

Surah and Date modes remain single-select. Mobile keeps the chip strip and single-select behavior.

**Persistence:** `positions.review.activeValue`.

### E3. Tap thread chip → FVR deep link

Inside review hub (any card — threads layer only).

1. Tap a thread chip on a mark card → browser navigates to `#/threads/<tag>`.
2. FVR renders: compact centered header (layer label "Thread", color dot, canonical value, `n verses · n surahs`, hairline) + flat list of mark cards for that thread value.

**Surfaces:** Review hub → FVR. **Persistence:** `settings.lastSurface = #/threads/<tag>`, `positions.review.view = 'fvr'` (reset to `'all'` when hub is entered directly via `#/review`).

### E4. FVR back to hub

Inside FVR.

1. Tap **← Marks** → `#/review` → review hub re-renders with layer segment, group-by pill, and all cards.

### E5. Filter by value chip + surah

Inside review hub.

1. Tap a value chip in the chip strip → filter chip appears in active-filters row; hub re-renders with only cards having that canonical value in the active layer.
2. Pick a surah from the surah dropdown → second filter chip → hub shows intersection.
3. Tap × on a chip → that filter clears; tap **Clear all** → both clear.

**Persistence:** `positions.review.activeValue`, `positions.review.surahFilter`.

**Desktop variant (≥1180px):** The mobile chip strip and dropdowns are replaced by a sticky 220px left rail containing the layer selector (12 rows) + group-by segment + bucket rows. In Value mode, multiple rows can be tapped for an OR filter (see E2c); in Surah/Date modes, a single row is selected at a time. Tapping an active row clears it. FVR (`#/<layer>/:value`) keeps its existing centered no-rail layout at desktop.

### E6. FVR via direct deep link

Navigating directly to a layer-value URL.

1. User navigates to `#/people/Moses` → router passes `{ layer: 'people', value: 'Moses' }` to Hub.svelte → `validateLayerParam('people', 'Moses')` canonicalizes to `musa`.
2. `getByLayerCanonical('people', 'musa')` fetches matching marks → FVR renders with layer label "People", value "musa".
3. If no marks found for that layer+value → "Not found" state, link back to `#/review`.
4. `settings.lastSurface` persists as `#/people/musa` for session restore.

**Surfaces:** FVR. **Persistence:** `settings.lastSurface`, `positions.review` (view: 'fvr').

---

## F. Navigation (command sheet, surah list, keyboard)

### F1. Command sheet direct verse-ref

1. Press **⌘K** (or tap Search glyph in dock) → command sheet opens.
2. Type `2:255` → preview card shows (Arabic of Ayat al-Kursi + English); "Open verse" row is focused.
3. Press Enter → `NAVIGATION_NAVIGATE { surah: 2, verse: 255 }` → `app-bootstrap.ts` routes to `#/s/2/255` → reader scrolls to 2:255.

**Surfaces:** Command sheet → Reader.

**Tablet+ variant:** Keyboard-shortcut footer hint (`⌘K`, `esc`) is explicitly shown at ≥768px (hidden below 640px mobile).

**Desktop variant (≥1180px):** Command sheet caps at 640px wide; result rows stay comfortably readable instead of stretching edge-to-edge.

### F2. Mark a verse from command sheet

Inside command sheet with a verse preview card (F1). Post 2026-04-25 mobile-nav-redesign.

1. Arrow-down past "Open verse" → "Mark this verse" row focused.
2. Enter → command sheet closes → `beginFast(verseKey)` → fast-tag inline panel opens on that verse (was deep mark editor).

**Surfaces:** Command sheet → Fast-tag inline panel. **Regression guard:** `tests/e2e/journey-f-navigation.spec.js` 'F2: verse preview → ArrowDown to "Mark this verse" → Enter opens fast-tag panel'.

### F3. Tag search → FVR

Inside command sheet.

1. Type `mer` → Tags group in the results shows `mercy` with count badge.
2. Enter → `#/threads/mercy` FVR (same landing as E3).

**Surfaces:** Command sheet → FVR.

### F4. Surah directory

1. Dock → **Search** (or keyboard shortcut `G` then `S`, or command sheet → "Browse all surahs") → `#/surahs`.
2. Directory renders: 114 rows. Search `67` → 1 match, "Jumping to #67" eyebrow, Al-Mulk row (with gold left-edge if bookmarked).
3. Tap row → `#/s/67`.

**Surfaces:** Surah list → Reader.

### F5. Continue-reading card

On surah list.

1. With search cleared and All filter active → Continue-reading card shows at top with the last-read position.
2. Tap → navigates to that surah + verse.

**Persistence:** read from `settings.currentPosition` via `loadGlobalPosition`.

### F6. Keyboard navigation

1. Tab focus lands on the ambient pill → Enter opens command sheet.
2. Inside command sheet: Arrow-up/down moves focus, Enter activates, Esc closes.
3. Global shortcut `G` then `S` → surah list.

---

## G. About

### G1. Open About

Post 2026-04-25 mobile-nav-redesign — was More sheet → About.

1. **Mobile (<1180px):** tap hamburger `≡` on `MarginHeader` → drawer slides in from left → tap **About**.
2. **Desktop (≥1180px):** tap `⋯` on ambient dock → drawer slides in from left → tap **About**.
3. About renders: wordmark, mission, 54:17 Arabic blessing + translation, 2×2 stat grid (Marks / Tags / Surahs / % Qur'an), attribution list, PWA install button (if install prompt has been captured), version line, **Clear all data** link in footer (D4 entry point). No back link.

**Surfaces:** MarginHeader / AmbientDock → NavDrawer → About. **Regression guard:** `tests/e2e/journey-g-about.spec.js` 'G: hamburger drawer opens with Review and About items'.

### G3. Shortcut cheatsheet (`?`)

From any non-text-input context.

1. Press `?` → bottom sheet slides up titled "Keyboard shortcuts".
2. Sheet lists every binding grouped into 4 sections: Universal, Go to, Reader, Command sheet — plus the double-tap gesture row.
3. Tap backdrop, tap `×`, or press `Esc` → sheet closes; focus returns to the prior surface. No persistence.

**Surfaces:** any route → Shortcuts sheet.

### G2. Install PWA

On About with a captured install prompt.

1. Tap **Install App** → `promptInstall()` runs browser install flow.
2. On accept → button text becomes "Installed!" and disables; `OFFLINE_INSTALL_COMPLETE` fires (no UI listener today).

---

## H. Offline

### H1. Reload offline

With the service worker active and the dataset cached.

1. DevTools → Network → Offline.
2. Reload → reader still loads (shell + dataset served from cache); command sheet still works; ⌘K → `2:255` → preview renders from cache.

**Surfaces:** all major surfaces degrade gracefully. **Persistence:** none new; reads from IDB + SW cache.

---

## I. Cross-tab coherence

### I1. Another tab marks a verse

Two tabs open on `#/s/1`.

1. Tab A double-taps 1:5 → saves a mark → `broadcastMarkChange(['1:5'])` fires.
2. Tab B's `safety/sync.ts` receives → emits `SYNC_UPDATE_RECEIVED { verseKeys: ['1:5'] }`.
3. Tab B's reader indicator refreshes → gold edge appears on 1:5 without reload.

**Surfaces:** Reader (both tabs). **Persistence:** IDB is shared; no double-write.

### I2. Another tab deletes the mark I'm editing

1. Tab A has mark editor open for 2:255.
2. Tab B deletes 2:255 → broadcast → Tab A's editor receives `SYNC_UPDATE_RECEIVED` with that key → editor closes silently (no error, no toast).

**Surfaces:** Mark editor.

### I3. Another tab runs Clear Data

1. Tab A running normally.
2. Tab B runs Clear Data → `suppressNextVersionChange()` keeps Tab B's banner off → `deleteDB` triggers `onversionchange` in Tab A.
3. Tab A's `safety/sync.ts` shows a "Data was cleared in another tab — reload" banner.

---

## Deprecated

### E3 (legacy). `#/t/:tag` FVR route — removed in commit cb4e3a2

The old FVR route `#/t/:tag` (e.g. `#/t/mercy`) dispatched Hub.svelte with a `tag` prop and filtered the threads layer only. It was replaced by the `#/<layer>/:value` scheme in cluster-3-review-hub-fvr (commits cb4e3a2, 3fec509). Pre-release — no users when removed. The new canonical route for the same content is `#/threads/mercy`.

### B1/D1/D4/G1 (legacy). MoreSheet — retired 2026-04-25 in commit c297e61

First-level parent sheet from the dock's ⋯ button. Held five rows: Settings · Review hub · Surah list · About · Clear data. Replaced by `NavDrawer.svelte` (left-slide, two items: Review · About) plus per-surface entry points: gear icon → Settings, About → Clear-data, ambient pill / center label → Surah list, command sheet → "Browse all surahs". Pre-release — no users when removed.

### B1/C1b (legacy). MarginHeader two-row layout + fast-tag dot — retired 2026-04-25 in commit daaff6b

Mobile/tablet header was ~108 px tall: row 1 = surah crumb pill + circular fast-tag dot + ⋮ kebab; row 2 = Read · Review N · Marks · Threads tabs (two of which stubbed to `#/review`). Replaced by single-row layout (~52 px) — hamburger · bilingual surah label · settings gear. Fast-tag entry moved to double-tap / right-click on a verse.

### C1/C1b (legacy). TagModePill — retired 2026-04-25 in commit ba94d8d

Desktop-only top-right "Tag mode" toggle pill. Replaced by the unified gesture model: right-click any verse to start fast-tag at all breakpoints. `TagModeToggle.svelte` (Fast/Deep mini-pill) was already orphaned and deleted in the same commit.

### C1 (legacy). Double-tap → mark editor — flipped 2026-04-25 in commit 818001b

Double-tap / right-click / keyboard `m` previously opened the deep mark editor (`tag/TagSheet`). Now opens the fast-tag inline panel (`reader/VerseTagPanel`) via `beginFast(verseKey)`. Deep editor reachable only via the panel's `⛶` escalation, `⌘+Enter`, or programmatic bridges (Review hub).

### D4 (legacy). Clear data in Settings sheet / More sheet — moved 2026-04-25 in commit 0890a53

Clear-data row sat at the bottom of the Settings sheet (and earlier the More sheet). Moved to the About page footer; confirmation flow (`safety/clear-data.ts::showClearDataConfirmation`) unchanged.

### B1/F4 (legacy). MarginHeader center-label tap → surah list, full-width "Continue to {surah}" buttons — retired 2026-04-25 in commit `<commit-pending>`

Mobile center label used to be a button: tap routed to `#/surahs` (or back if already there); cold-load with no in-memory surah resumed via `loadGlobalPosition()`. Decoration: bilingual label + `▾` chevron implying a destination. Replaced by a non-interactive `<div>` (no chevron); surah list reachable only via the hamburger drawer or header swipe-down. Continue-to-prev/next buttons in the Reader were full-width uppercase tracked-text rows (~46 px tall, "← Continue to Al-Isrāʾ" / "Continue to Maryam →"); replaced by single-line italic arrow + surah title (~22 px tall) — `↑ Al-Isrāʾ` and `Maryam ↓`. Standalone `#/surahs` page is now desktop-only; mobile arrivals at the route hard-redirect to `lastSurface` and open the drawer.

### B1/F4 (legacy). NavDrawer two-row Review/About list — retired 2026-04-25 in commit `<commit-pending>`

Drawer was a left-slide narrow side panel with two rows: Review (→ `#/review`), About (→ `#/about`). Replaced by a full-screen tabbed surface on mobile: Surahs tab (search + filter pills + auto-anchored surah list, sole mobile entry to the surah directory) and Review tab (Hub row + 12 grouped layer rows linking to `#/review?layer=<name>`). Header wordmark + ⓘ icon is the new About entry. Desktop kebab path keeps the narrow side-panel size but uses the same tabbed component.
