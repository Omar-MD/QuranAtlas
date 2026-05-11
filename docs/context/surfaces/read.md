---
surface: read
src_paths:
  - 'src/read/**'
owns_stores:
  - meta
test_paths:
  unit:
    - 'tests/unit/read/**'
    - 'tests/unit/styles/font-tokens.test.js'
  e2e:
    - 'tests/e2e/read/*.spec.js'
---

# Surface: read

> Reader chrome — verse rendering, ambient dock + pill + margin header, surah header + bismillah, cross-surah scroll, typography knobs, scroll-position persistence, and inline/full tafsir study. NOT the mark-editing flow for existing marks (that's the `mark` surface).

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| Hash route `#/s/:n` | URL | Reader mounts surah n at top |
| Hash route `#/s/:n/:v` | URL | Reader mounts surah n, scrolls to verse v |
| Hash route `#/m/:page` | URL | Mushaf reader mounts the active-riwayah page |
| Hash route `#/` (default) | URL | redirects to `lastSurface` (last-read) |
| Pull-to-swap past edge | gesture | swap to next/prev surah with wrap (114↔1) |
| Click `↑ <prev>` / `<next> ↓` link | tap | swap to prev/next surah |
| MarginHeader hamburger swipe-down (mobile) | gesture | `openNavDrawer('read')` |
| MarginHeader center label tap (mobile) | tap | toggle `surahHeaderHidden` |
| MarginHeader label swipe left/right (mobile) | gesture | next/prev surah (clamped 1–114) |
| MarginHeader gear single tap (mobile) | tap | open Settings sheet (debounced 300 ms) |
| MarginHeader gear double-tap (mobile, ≤300 ms) | gesture | cycle theme (parity with keyboard `d`) |
| AmbientDock tap (desktop) | tap | open command sheet / Review / Marks |
| Verse number tap | tap | edge indicators ~1.6 s + pill label updates |
| Verse text block tap/click | tap / click | toggle that verse's meaning + knowledge lane |
| Verse double-tap / double-click | gesture | open inline tafsir preview for that verse |
| Verse right-click | mouse | open inline tafsir preview for that verse |
| Keyboard `m` on centered verse | keyboard | open inline tafsir preview for that verse |
| Reader body tap | tap | dock + pill fade in for ~3 s |
| Visibility-restore | passive | restore `currentPosition` only when tracker fresh + scroller at top |
| Daily Wird Continue | drawer action | routes to the active plan's next unread reference |

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/read/AmbientDock.svelte` | Desktop (≥1180px) full-height left rail. Rendered into `#bottom-nav` |
| `src/read/AmbientPill.svelte` | On reader route: stays hidden until AMBIENT_SURFACE fires |
| `src/read/EdgeIndicator.svelte` | EdgeIndicator — the pair of left/right fixed indicators that briefly flash |
| `src/read/MarginHeader.svelte` | Mobile / tablet (<1180px) top navigation — single-row layout: |
| `src/read/PullToSwapIndicator.svelte` | PullToSwapIndicator — minimal Chrome-mobile-PTR-style circular progress |
| `src/read/Reader.svelte` | _(no leading comment)_ |
| `src/read/SurahHeader.svelte` | _(no leading comment)_ |
| `src/read/SurahProgress.svelte` | Tiny progress chip under surah title. Tracks the current juz the reader |
| `src/read/TafsirPreview.svelte` | _(no leading comment)_ |
| `src/read/TafsirSheet.svelte` | _(no leading comment)_ |
| `src/read/Verse.svelte` | Translation lookup role for cross-riwayah display. |
| `src/read/audio-autoscroll.ts` | Smart-defer auto-scroll: scroll the playing verse into view UNLESS the |
| `src/read/audio-highlight.ts` | Audio verse-tick highlight. Subscribes to `audio:verse-changed` and |
| `src/read/chunked-virtualiser.ts` | Chunked virtualiser — IntersectionObserver-driven recycler that mounts |
| `src/read/edge-indicators.ts` | Verse-tap edge indicators — lazily-created left/right visual cues that |
| `src/read/font-reshape.ts` | iOS Safari paints the reader DOM with a fallback font when verses mount |
| `src/read/global-position.ts` | Global reading position — single record (current surah + verse) that |
| `src/read/mushaf/MushafControls.svelte` | _(no leading comment)_ |
| `src/read/mushaf/MushafPage.svelte` | _(no leading comment)_ |
| `src/read/mushaf/MushafReader.svelte` | _(no leading comment)_ |
| `src/read/mushaf/mode-switch.ts` | _(no leading comment)_ |
| `src/read/mushaf/navigation.ts` | _(no leading comment)_ |
| `src/read/mushaf/types.ts` | _(no leading comment)_ |
| `src/read/position.ts` | Reader position tracking — observes scroll, persists last-read verse to |
| `src/read/render-helpers.ts` | Reader render helpers — pure functions that produce data / strings used by |
| `src/read/scroll-ancestor.ts` | Find the nearest scrolling ancestor of `el`. |
| `src/read/scroll-tracker.ts` | Scroll position tracking using IntersectionObserver. |
| `src/read/state-ambient.svelte.ts` | _(no leading comment)_ |
| `src/read/state.svelte.ts` | _(no leading comment)_ |
| `src/read/surah-swap.ts` | Cross-surah swap orchestration. |
| `src/read/tafsir-bridge.ts` | _(no leading comment)_ |
| `src/read/tafsir-state.svelte.ts` | _(no leading comment)_ |
| `src/read/translation-tokens.ts` | Tokenise a translation verse into a stream of plain text and footnote |
| `src/read/verse-scroll.ts` | Verse scroll helpers — smooth align a verse element in its container, |
| `src/read/wird/DailyWirdCard.svelte` | _(no leading comment)_ |
| `src/read/wird/WirdDetail.svelte` | _(no leading comment)_ |
| `src/read/wird/metadata.ts` | _(no leading comment)_ |
| `src/read/wird/notifications.ts` | _(no leading comment)_ |
| `src/read/wird/progress.ts` | _(no leading comment)_ |
| `src/read/wird/store.ts` | _(no leading comment)_ |
| `src/read/wird/types.ts` | _(no leading comment)_ |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

### Reader modes

The read surface has two sibling modes:

- **Verse mode** (`#/s/:surah/:ayah?`) mounts `Reader.svelte`, sets `reader.readerMode = 'verse'`, clears `reader.currentMushafPage`, and owns verse scroll/translation/tafsir behavior. If the active `settings.riwayah` text pack is missing from `/dataset/manifest.json`, the reader shows a compact install prompt with Settings + Retry actions and does not render fallback Qaloon ayat under the selected Hafs/Warsh UI state.
- **Mushaf mode** (`#/m/:page`) mounts `MushafReader.svelte`, sets `reader.readerMode = 'mushaf'`, sets `reader.currentMushafPage`, and clears verse-specific reader state. The route has no riwayah param: the active `settings.riwayah` selects `/dataset/mushaf-pages/{riwayah}/manifest.json` and the SVG page asset for the current route page.

Mushaf mode renders one same-origin SVG page at a time with previous/next, numeric page, and scrubber controls. Invalid or out-of-range page params resolve against the active manifest page count and canonicalize through `router.navigate(pageHref(clamped), { replace: true })`, so route events and `lastSurface` see the canonical `#/m/:page` hash. Changing `settings.riwayah` while mounted reloads the same page number against the new active page manifest.

Missing active-riwayah page packs render an install prompt rather than silently falling back to Qaloon pages. SVG asset failures stay inside the page component as retry/open-verse states; offline-missing image errors identify that the page is not cached locally.

### Surah header

Flat 2-column grid header, no card background, no ornament chrome:

- **Left column** (full height, `grid-row: 1 / span 2`): `SURAH {n} · {count} VERSES` uppercase tracked meta caption stacked above the Juz / surah-progress chip (`SurahProgress.svelte`).
- **Right column** (full height, vertically centered): Arabic surah name in `'Amiri Quran'` Mushaf script, no honorific prefix, RTL.

Header gated on `reader.surahHeaderHidden` — `true` unmounts header (toggled via MarginHeader center-label tap; persisted in `settings.surahHeaderHidden`, sole writer `settings/surah-header-visibility.ts`). Toggle is pure show/hide — no auto-scroll.

Below header on every surah except 1 + 9, standalone bismillah renders the Unicode ligature `﷽` (U+FDFD) in naskh-first font stack (`Amiri Quran` → `Scheherazade New` → `Amiri` → `Noto Naskh Arabic` → system Arabic fallback). Italic English translation always renders below the glyph: *"In the Name of Allah — the Most Compassionate, Most Merciful"* — independent of `settings.translationVisible`. `aria-label` exposes voweled text. Bismillah NOT gated by `surahHeaderHidden`.

Cross-surah continuation links (`↑ <prev>` / `<next> ↓`) sit nearly flush against scroller edges (`margin: 2px auto`), muted text color, italic 0.7 rem title, 12 px arrow; reveal to accent on hover/focus.

### Ambient chrome

**Desktop (≥1180 px):** AmbientDock = 56-px full-height left panel (cream surface, right-border separator). Top: Arabic "أ" logo + 4 icon tabs (Read / Search / Review / Marks). Bottom: rotated verse crumb (`{surah}:{verse}`, read bottom-to-top) + ⋯ more button. Always visible — no auto-fade. Hover shows parchment tooltip right. Surah list via ⋯ → drawer, command sheet, or `G+S`.

**Mobile / tablet (<1180 px):** AmbientDock hidden. `MarginHeader` ~56 px tall — left hamburger ≡ (48 px tap target, 26 px icon) opens nav drawer; center single-line Arabic surah label in `'Amiri Quran'` Mushaf script (18 px); right settings gear ⚙ (48 px tap target, 26 px icon). Auto-hides on scroll down, reveals on scroll up or `AMBIENT_SURFACE` emit. It does not render during first-run onboarding. `#main-content` reserves ~60 px top padding.

**Tablet+ (≥768 px):** AmbientDock items grow 38×38 → 42×42 for iPad tap targets.

### Ambient pill

Bottom-of-reader on reader routes only. Tap reader body → pill fades in for ~3 s showing `{surah}:{verse} · {Name}` + `⌘K` hint. Verse-number tap updates pill label. Hidden on non-reader routes (`#/surahs`, `#/review`, `#/about`, etc.).

### Translation rendering

Each verse renders Arabic immediately. When `settings.translationVisible` is on, the active translation renders under every mounted verse without requiring a verse click. When a shipped translation pack contains inline `[N]` markers, they render as bracketed footnote buttons coloured in accent hue. Tap `[N]` → inline footnote panel discloses below translation with text + `×` close. `aria-expanded="true"` flips on marker. Tap same marker / `×` / Esc with focus inside verse → closes; tap different marker swaps panel (one open per verse).

Tap / click a verse toggles only the verse's knowledge lane (theme chips + passage summary). Translation visibility is global-only through Settings or `t`; turning it off hides all translation rows and any open inline footnote panels.

**Cross-riwayah alignment:** translations Hafs-keyed (Kufan numbering). Warsh + Qaloon (Madinan numbering) partition same Quranic text differently in 50 surahs (~22 ayat net diff). Per-ayah aliases at `public/dataset/translations/_verse-aliases.json` (mechanically derived by `scripts/data/derive-verse-aliases.mjs`); `Reader.svelte::loadSurah` resolves each Warsh/Qaloon ayah via `resolveTranslationFor()` → identity / merged / primary / continuation / none. Continuation renders italic `↑ continued from verse N` instead of duplicating translation. Coverage 100% across all three riwayat.

### Knowledge lane

After the base reader payload (Arabic text, translation, aliases, settings) succeeds, `Reader.svelte` starts two optional side-loads for `public/dataset/knowledge/ayah/{surah}.json` and `public/dataset/knowledge/passages/{surah}.json`. These knowledge fetches are not part of the blocking `Promise.all(...)` path, do not create a second skeleton/loading phase, and do not change route, gesture, or scroll-entry behavior.

When knowledge data exists, each tagged verse can render quiet metadata directly under the Arabic/meaning stack:

- theme chips from the ayah knowledge shard
- one passage-context line from the passage summary when that verse's `passageId` resolves to a loaded passage shard

Theme chips + passage context stay collapsed with the verse and reveal only when that verse is opened.

If either knowledge shard is missing, invalid, or fetch-fails, the reader logs a recoverable warning and leaves the knowledge lane empty for that surah. Base verse rendering continues unchanged.

### Tafsir study lane

The Reader's primary per-verse study action is now tafsir, not new mark creation.

1. Double-tap / double-click a verse, right-click a verse, press `m`, or choose the command-sheet verse action to open inline tafsir preview for that verse.
2. The active verse gains the existing left-edge accent treatment and a compact `tafsir` head label. The preview mounts directly under that verse's Arabic / meaning stack, where the old fast-tag panel used to appear.
3. Inline preview loads the saved tafsir source immediately. Optional tafsir bodies are fetched on demand from the same-origin dataset assets when selected; if a selected body is genuinely unavailable, runtime falls back to `muyassar` without breaking the Reader.
4. Preview header includes the source switcher plus compact close (`×`) and **Expand** (`[]`) actions. Switching sources reloads the current surah's tafsir pack and keeps the preview anchored to the same active verse.
5. Grouped tafsir ranges remain grouped. When a verse belongs to a range entry, the preview and full sheet show the shared reference range instead of duplicating the same text per ayah.
6. **Expand** opens the full tafsir sheet overlay. On phone-sized viewports it takes over the full screen and keeps a visible close control pinned in the sheet header; on tablet and desktop it stays a bounded overlay. It replaces the old deep-tag escalation path for new Reader study actions and shows the active source label, verse/range reference, Arabic tafsir text, and the same source picker.
7. Missing tafsir data is a compact unavailable state inside the preview / sheet. Reader rendering and navigation continue normally.

### Cross-surah infinite scroll

Reader is single-surah; only one surah mounted at a time. Pull past edge swaps to N+1 / N-1 with wrap (114 ↔ 1).

1. Pull past bottom past threshold (~110 px) → release → `swapToSurah(nextSurah(N), 'top')` → URL `#/s/{N+1}` → Reader remounts at `scrollTop=0`. Click fallback: single-line `<next.name> ↓` link.
2. Pull past top past threshold → release → `swapToSurah(prevSurah(N), 'bottom')` → URL `#/s/{N-1}` → Reader remounts and anchors `scrollTop=scrollHeight`. Click fallback: `↑ <prev.name>` link above SurahHeader.
3. Wrap: 114→1 forward, 1→114 backward.
4. Native browser pull-to-refresh suppressed via `overscroll-behavior-y: contain` on `#main-content`. Wheel input on desktop accumulates the same way.
5. Position persistence is single-global: each surah load overwrites `settings.currentPosition` to `(newN, 1)` or `(newN, lastVerse)` on backward; in-surah scroll center-band crossings also overwrite.
6. **Within-surah scroll is virtualised** — only ±1 chunk (~60 verses) live in the DOM; chunks outside the window are inert height-preserving spacers (`data-chunk-state="spacer"`). Center-band IO drives the active chunk; eviction transitions are invisible to the user. Scroll-driven materialise transit through a brief skeleton state (one rAF); deep-link / warm-resume materialise synchronously so `scrollToVerse` finds the target.

### Scroll position survives warm-resume (iOS lock / tab-hide)

1. Lock screen / switch tabs → `visibilitychange` fires hidden → `persistOnExit` flushes tracker's pending verse → `settings.currentPosition`.
2. Unlock / return → `visibilitychange` fires visible → `DB_VISIBILITY_VISIBLE` emitted; reader's handler restores scroll **only** when tracker is fresh (no `lastTrackedVerse`) AND scroller has collapsed to top. Otherwise browser's preserved scroll is trusted.
3. Stale IDB values never force-scroll an already-scrolled reader back.

### Typography knobs (live preview)

Two sliders inline in Settings sheet's Reading section drive reader live:

1. **Font size** — 5-step (xs/sm/md/lg/xl), writes `fontSize`, drives `--qa-font-size-base`. Endcaps `Aa` (small) / `Aa` (large).
2. **Reading flow** — 5-step coordinated knob: single drag writes all four spacing keys (`lineSpacing`, `wordSpacing`, `readerMargin`, `verseSpacing`) to same step via `setReadingFlow(step)`. Arabic line-height = `1.92 + delta(step)`; floor (xs) clears KFGQPC tashkeel collisions across all riwayat; md (default) lands at 2.12. Endcaps `▮` (tight) / `▯` (loose).
3. **Reset to default** appears only when at least one knob ≠ md.

Mobile reading-flow margin component drives `.qa-verse` horizontal padding via `--qa-verse-pad-x`. Vertical-spacing component drives `.qa-verse` padding via `--qa-verse-pad-y`.

Font-size keyboard shortcuts: `⌘↑` / `Ctrl+↑` bumps up; `⌘↓` / `Ctrl+↓` bumps down. Announced to screen readers; guarded against focused inputs.

### Verse-number edge indicator

Tap number circle on any verse → thin accent bars appear at verse's row on both viewport edges (~1.6 s). Pill label updates to tapped verse. `settings.currentPosition` updated.

### Auto-hide chrome on scroll

Scroll down → dock hides; scroll back near top → dock surfaces.

### Daily Wird

The Reader owns Daily Wird progress. One active plan can exist at `settings.wirdPlan`.

Reader position saves advance the plan only when the saved reference is inside the plan range. Progress is monotonic: backward scrolling does not reduce `completedThroughRef`. Missed days recompute the current daily assignment from remaining verses and remaining calendar days through `targetEndOn`.

`Continue Wird` navigates to `progress.nextRef`; ordinary `settings.currentPosition` remains the source of truth for normal resume.

The mobile drawer summary card is a single ledger-style tappable surface above the Read source controls; without a plan it invites plan creation, and with a plan it reflects plan state and routes to the in-drawer detail without writing progress from render alone.

Daily Wird summary text respects the selected display unit. Juz and Hizb plans derive remaining counts from Quran boundary metadata instead of falling back to raw verse counts. Browser notification permission is requested only from the reminder permission control; granted/denied/default/unsupported is stored on the plan reminder state. Denied state can be requested again from the same control, though the browser may keep returning denied until the user changes site settings.

## Data

<!-- AUTO-GENERATED:data-owned START -->
- `meta`
<!-- AUTO-GENERATED:data-owned END -->

<!-- AUTO-GENERATED:data-read START -->
_(no cross-surface reads detected)_
<!-- AUTO-GENERATED:data-read END -->

### `meta` store body

Last-read position + sticky-page state. Single global record; updated on every surah mount + center-band scroll crossing + warm-resume hide.

Settings keys read by reader: `riwayah`, `theme`, `nightMode`, `translationVisible`, `translationId`, `tafsirId`, `fontSize`, `lineSpacing`, `wordSpacing`, `readerMargin`, `verseSpacing`, `surahHeaderHidden`, `currentPosition`, `lastSurface`, `wirdPlan`. (See `configure` dossier for `settings` store body.)

Mushaf mode reads `/dataset/mushaf-pages/{riwayah}/manifest.json` for page count, SVG asset paths, first visible verse refs, and `verseToPage` mode-switch mapping. Verse mode reads `/dataset/manifest.json` before loading `riwayat/{riwayah}/{surah}.json` so missing optional Hafs/Warsh text packs surface as install prompts instead of fallback text.

## Events

<!-- AUTO-GENERATED:events-emit START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `ambient:surface` | `Events.AMBIENT_SURFACE` | `src/read/AmbientDock.svelte:64`, `src/read/AmbientPill.svelte:90`, `src/read/EdgeIndicator.svelte:42`, `src/read/MarginHeader.svelte:43`, `src/read/Reader.svelte:668`, `src/read/edge-indicators.ts:62` |
| `reader:position-save-failed` | `Events.READER_POSITION_SAVE_FAILED` | `src/read/position.ts:30` |
| `reader:verse-rendered` | `Events.READER_VERSE_RENDERED` | `src/read/Verse.svelte:62` |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `ambient:surface` | `Events.AMBIENT_SURFACE` | `src/read/AmbientPill.svelte:76`, `src/read/MarginHeader.svelte:180` |
| `audio:verse-changed` | `Events.AUDIO_VERSE_CHANGED` | `src/read/audio-autoscroll.ts:48`, `src/read/audio-highlight.ts:32` |
| `db:visibility-visible` | `Events.DB_VISIBILITY_VISIBLE` | `src/read/position.ts:158` |
| `router:route-change` | `Events.ROUTER_ROUTE_CHANGE` | `src/read/AmbientDock.svelte:86`, `src/read/MarginHeader.svelte:176` |
| `settings:riwayah-changed` | `Events.SETTINGS_RIWAYAH_CHANGED` | `src/read/Reader.svelte:500`, `src/read/mushaf/MushafReader.svelte:95` |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- **Reader text source = active Riwayah.** From `settings['riwayah']` (default Qālūn). Sole writer of `settings['riwayah']` is `settings/riwayah.ts`. Font follows via `--qa-font-arabic` cascade (set by `:root[data-riwayah=...]` overrides). Reader's reading-typography slider drives line-height; floor at `xs` step clears stacked harakat across all riwayat. Each `.qa-verse-arabic` carries `data-riwayah` mirroring active Riwayah.
- **Missing active Riwayah packs prompt installation.** Qaloon is baseline. Hafs/Warsh text or page packs are optional/full-profile assets; if the active pack is absent from the built manifest, Reader/MushafReader must show an install prompt and must not silently render Qaloon text or pages under a Hafs/Warsh UI state.
- **Mushaf route is page-only and position-neutral.** `#/m/:page` does not encode riwayah and does not mutate `settings.currentPosition`. The active manifest's `pageCount` is authoritative for clamping/canonicalization.
- **Mushaf canvas is page-only.** Mushaf mode does not render verse overlays, translation rows, or tafsir inside the SVG page canvas; opening verse mode uses the page manifest's first visible verse reference.
- **Each Riwayah pairs with its own KFGQPC Uthmanic mushaf cut.** Cross-Riwayah reuse mis-renders combining marks. Mapping: `hafs → KFGQPC Uthmanic Hafs v22`, `warsh → KFGQPC Uthmanic Warsh V21`, `qaloon → KFGQPC Uthmanic Qaloon V21`. Each token's font-family chain falls back to **Amiri Quran** (Khaled Hosny, OFL) when KFGQPC isn't loaded, then bare `serif`. No user-facing font picker. Wired through `--ff-kfgqpc-{riwayah}` (`src/styles/tokens/primitives.css`) → `--qa-font-arabic` (`src/styles/tokens/semantic.css`). Regression guard: `tests/unit/styles/font-tokens.test.js`.
- **Hamburger drawer is the sole in-app entry to the full surah list (mobile).** Standalone `#/surahs` page renders only on desktop ≥1180 px; mobile arrivals at that hash hard-redirect to `lastSurface` and open the drawer. Don't add new mobile in-app entries pointing at `#/surahs` without first removing this invariant in the same PR.
- **Reader is single-surah.** Only one surah mounted at a time. Cross-surah scroll swaps the mount; never multi-mount.
- **Knowledge lane is optional and non-blocking.** Reader text render never waits on `dataset/knowledge/**`; missing or invalid ayah/passage shards leave verse theme/context metadata empty and do not introduce a new error surface.
- **Knowledge is the per-verse disclosure.** Arabic remains always visible. Translation rows are controlled only by `settings.translationVisible`; verse clicks reveal/collapse theme chips and passage summary.
- **Reader tafsir is per-verse and source-switchable.** Inline preview and full sheet read from `settings.tafsirId`; optional packs are same-origin on-demand assets outside the baseline manifest, and runtime falls back to `muyassar` only when the selected body cannot be fetched.
- **Daily Wird progress is passive to drawer render.** The drawer can read `settings.wirdPlan` and update reminder browser-permission state through `src/read/wird/` helpers, but only the read surface writer under `src/read/wird/` writes plan progress. Rendering the drawer must not advance progress.
- **Mounted Reader verse content must stay live with Settings.** While the reader stays on the same surah, changing `settings.translationVisible`, `settings.translationId`, or `settings.tafsirId` must refresh the mounted verse tree / active tafsir preview without requiring a route reload.
- **Verse identity DOM contract is `data-token-key`.** Gesture handlers (long-press, bookmark click) and decoration consumers (marks indicator, bookmarks indicator, pulse, VerseSpotlight) MUST read `data-token-key` and resolve to the verse-grain identifier via `tokenVerseKey()` from `core/tokenisable.ts`. New verse-grain reads against `data-verse-key` are forbidden — reviewers should grep `src/` for the attribute on the read side.
- **Reader DOM virtualised; ≤60 `.qa-verse` elements live at any time.** Chunks of 20 ayat; sliding window of ±1 chunk. Outside the window, chunks render as inert spacer divs carrying `data-chunk-state="spacer"` + inline `style.height` (R-19c CSP carve-out per `csp-allowlist.md`). Local component state (footnote popover) does not survive recycle; rune-backed state (tag-session active verse) survives via component re-mount on re-entry. `ensureVerseRendered(N)` synchronously materialises the chunk window for deep-link / warm-resume so `scrollToVerse` finds the target verse on the next rAF. Regression guards: `tests/e2e/read/chrome.spec.js` B-Virt1/2/3 + `tests/unit/read/chunked-virtualiser.test.ts`.
- **`<html>` and `<body>` background-color must resolve to the same `--qa-surface-app` under every theme** (so iOS landscape `viewport-fit=cover` safe-area gutters retint with theme). Regression guard: `tests/e2e/configure/settings.spec.js` D3-bg.

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (24):**

- `tests/unit/read/MarginHeader-toggle.test.ts`
- `tests/unit/read/SurahHeader.test.ts`
- `tests/unit/read/TafsirPreview.test.ts`
- `tests/unit/read/Verse.test.ts`
- `tests/unit/read/bismillah-translation.test.ts`
- `tests/unit/read/chunked-virtualiser.test.ts`
- `tests/unit/read/font-reshape.test.ts`
- `tests/unit/read/global-position.test.ts`
- `tests/unit/read/mushaf/mode-switch.test.ts`
- `tests/unit/read/mushaf/navigation.test.ts`
- `tests/unit/read/mushaf/reader.test.ts`
- `tests/unit/read/render-helpers.test.ts`
- `tests/unit/read/scroll-tracker.test.ts`
- `tests/unit/read/state-ambient.test.ts`
- `tests/unit/read/state.test.ts`
- `tests/unit/read/surah-swap.test.ts`
- `tests/unit/read/tafsir-state.test.ts`
- `tests/unit/read/translation-tokens.test.ts`
- `tests/unit/read/wird/DailyWirdCard.test.ts`
- `tests/unit/read/wird/WirdDetail.test.ts`
- `tests/unit/read/wird/notifications.test.ts`
- `tests/unit/read/wird/progress.test.ts`
- `tests/unit/read/wird/store.test.ts`
- `tests/unit/styles/font-tokens.test.js`

**E2E (5):**

- `tests/e2e/read/chrome.spec.js`
- `tests/e2e/read/cross-surah.spec.js`
- `tests/e2e/read/performance.spec.js`
- `tests/e2e/read/text-sources.spec.js`
- `tests/e2e/read/virtualiser.spec.js`
<!-- AUTO-GENERATED:tests END -->
