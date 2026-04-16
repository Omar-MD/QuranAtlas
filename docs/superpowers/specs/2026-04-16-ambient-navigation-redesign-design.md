# Ambient Navigation Redesign — Design Spec

**Date:** 2026-04-16
**Status:** Approved (pending review)
**Scope:** Full visual + interaction redesign of QuranAtlas navigation and core surfaces.
**Mockups:** `.superpowers/brainstorm/39422-1776297701/content/*.html`

---

## 1. Problem

The current UI stacks three navigation systems — top bar, hamburger drawer, bottom nav — producing visual clutter and a dated aesthetic. Competitive scan of quran.com, tanzil.net, and quranflash confirmed none of them hide chrome while reading; all keep persistent panels or toolbars. QuranAtlas has room to own "ambient reading" as its positioning.

## 2. Design philosophy: *Ambient + Command*

Two ideas, one product.

- **Ambient reading.** Chrome is hidden while reading. A single tap surfaces a top pill (surah:verse reference) and a bottom dock (four glyphs: 📖 Read · ⌕ Search · ✦ Review · ⋯ More). Auto-hides after inactivity.
- **Command sheet (⌘K).** One unified search/action surface replaces the hamburger drawer entirely. Surahs, verses, tags, marks, and commands resolve in scoped result groups.

The rest of the app inherits these two: bottom-sheet conventions for Settings and mark editor, verse-block grammar repeated across Reader / Review cards / FVR / mark editor previews.

## 3. Design tokens

### Palettes

**Dark** (default evening)
- Ink `#0e0e0c` · Card `#1a1814` · Border `#24201a` · Gold accent `#a89968` · Parchment text `#e8e3c9` · Muted `#b8b3a0` · Dim `#6b6656`

**Sepia** (paper)
- Paper `#f3e8cf` · Card `#faf1d8` · Border `#e6d5a6` · Bronze accent `#8b6b3a` · Cocoa text `#3d2e14` · Muted `#4a3a1e` · Dim `#8b6b3a`

**Light** (daylight — carries the same gold-bronze accent family as Sepia, neutral white surface; details inherit from current theme).

**Auto** — follows device; flips at sunset per OS.

### Semantic tag palette (color dots)

`mercy #64a078` · `gratitude #c8a050` · `patience #6e96b4` · `reflection #8c82c8` · `prayer` · `forgiveness #d4a070` · `tawhid #e8c478` · `tawakkul #b4826e` · `hope #c8b46e` · `justice` · `dunya` · `akhirah` · `repentance` · `guidance` · `fear` · `knowledge`. Used as 6–9px dots on chips and list items; never as chip fills.

### Type

- Arabic: Amiri serif, 14px reader default, `direction: rtl`, line-height 1.9, letter-spacing 0.4px.
- Latin headings/body: system `-apple-system, "SF Pro"`, 10.5–12px body in reader.
- Monospace for keyboard hints only.

### Radii / elevation

- Sheets: 16px radius, 1px gold/bronze hairline at 22–28% opacity, shadow `0 18px 40px rgba(0,0,0,0.4)` on dark.
- Pills: 999px.
- Cards: 10–12px.

## 4. Surfaces

### 4.1 Reader — continuous verse-interleaved

Mockup: `themes-v2.html`

- **Layout:** centered surah header (name, meaning, juz/verses meta, 1px hairline), bismillah in accent color, then a stream of **verse blocks**.
- **Verse block:** small index circle (`.vnum`), then Arabic line (`.varabic`, RTL, Amiri), then English translation (`.vtrans`) directly beneath. Blocks separated by a **dotted 1px hairline** in border color. No white-space gutters between languages.
- **Ambient chrome:**
  - Hidden by default while scrolling.
  - Tap surfaces: top **pill** (backdrop-blur, reference `67:14 · Al-Mulk` + ⌘K hint) and bottom **dock** (blurred, 4 glyphs; active = filled accent circle).
  - Edges: thin vertical 2px gold/bronze bars at page edges signal active verse on tap; they are the same vocabulary used for "bookmarked" rows in the surah list.
- **Dock destinations:** 📖 Read (active in reader) · ⌕ opens Command sheet · ✦ opens Review · ⋯ opens Settings/More.
- **No separate top bar, no hamburger.** The pill + dock are the entire nav on this surface.

### 4.2 Themes — Light / Sepia / Dark / Auto

Mockup: `themes.html`, `themes-v2.html`

Three palettes share one gold-bronze accent family so UI vocabulary stays stable across themes. Auto flips at sunset.

### 4.3 Surah list

Mockup: `surah-list.html`

- **Header:** title "Surahs", live count (114 / n matches / n bookmarked).
- **Search row:** inline `⌕` + placeholder "Search surah or number", `⌘K` kbd hint on desktop.
- **Segmented filter (pill):** All · Bookmarked · Recent.
- **Continue-reading card** (only on "All", only if resume state exists): gold-bordered card with `↻` icon, "Continue reading" eyebrow, `Al-Mulk · verse 14`, trailing chevron.
- **List row:** index circle (tabular-nums) · English name + italic meaning · Arabic name (Amiri, RTL) · trailing block with verse count + Meccan/Medinan eyebrow.
- **Bookmarked surahs** carry a 2px gold left-edge (same vocabulary as active-verse edges in reader).
- **Search resolves:**
  - name substring (highlight matches in English and meaning),
  - integer 1–114 → jumps to that surah (shows "Jumping to #n" eyebrow),
  - reference like `2:255` → opens verse directly in reader.
- **Tip/empty state:** dashed-border callout explaining the three input forms.

### 4.4 Command sheet (⌘K)

Mockup: `command-sheet.html`

Replaces the hamburger drawer entirely.

- **Trigger:** dock ⌕ on mobile, ⌘K on desktop.
- **Presentation:** blurred scrim over reader (62% dim on dark / 28% on sepia). Sheet anchored top with 10px inset, 16px radius, 1px accent hairline.
- **Input row:** `⌕` glyph, single large input, `esc` kbd hint. Placeholder: *"Search surah, verse, tag, or command"*.
- **Result body:** scoped groups, only non-empty groups render, each with a count:
  - **Surahs** — name/number matches
  - **Verses** — direct-ref matches (see below)
  - **Tags** — with semantic color dot leading
  - **Marks** — verse excerpts with highlighted term + surah:verse + tag list
  - **Actions / Commands** — "Create tag X", "Switch to dark theme", "Increase font size", nav jumps (Review hub, Surah list, Settings) with shortcut hints (`G R`, `G S`, `G ,`)
- **Leading glyphs:** 24×24 6px-radius tile for nav/actions; colored dot for tags; verse-ref monogram for verses.
- **Direct-ref state:** input like `2:255`, `67`, `114:3` promotes a **verse preview card** (ref eyebrow, Arabic, translation) and primary "Open verse" action, plus Also: Mark this verse (`M`), Copy reference.
- **Empty state (no query):** Recent (last opened verse/tag) + Jump to (Review, Surah list, Settings).
- **Footer (desktop only):** `↑↓` navigate · `↵` open · `esc` close.

### 4.5 Review hub

Mockup: `review.html`

- **Three-segment pill:** groupBy = `tag` (default) · `surah` · `flat`.
- **Sort/filter dropdowns** + active filter chips (dismissible).
- **Mark card** mirrors the reader verse-block: ref eyebrow · Arabic · English · note with gold 2px left-bar · tag chips with semantic dots.
- Pagination PAGE_SIZE=30.
- Tapping a tag chip anywhere in the app deep-links to `#/t/:tag` → FVR.

### 4.6 FVR (Focused tag Value Review)

Mockup: `fvr-v2.html` (approved over v1)

- **Compact centered header:** tag name with color dot, "n marks" subtitle, hairline below. No hero card (v1 rejected as too heavy).
- **Body:** list of mark cards in the shared verse-block grammar.
- Accessed from any tag chip (`#/t/:tag`).

### 4.7 Settings — bottom sheet

Mockup: `settings.html`

- **Presentation:** bottom sheet, 16px top radius, handle bar, backdrop scrim. Dismissible by tap-scrim, swipe-down, or ✕.
- **Sections:** Theme (4 swatches: Light · Sepia · Dark · Auto) · Font size slider (live preview with one Arabic+English verse sample) · Translation picker (same list as onboarding) · More menu (Clear data, About, version).

### 4.8 About

Mockup: `about-v2.html` (approved over v1)

- Wordmark · mission ("Read, reflect, remember.") · blessing 54:17 · **2×2 stat grid:** Marks (47) · Tags (8) · Surahs (23/114) · % Qur'an tagged (2.3%, implied 6,236-verse denominator). **No streaks.** · Attribution · PWA install CTA · version.

### 4.9 Mark editor — multi-tag bottom sheet

Mockup: `mark-editor-v2.html`

- **Trigger:** long-press on a verse. *Long-press has exactly one behavior: open this modal.* No contextual menu, no Copy/Share/Play/Tafsir action sheet; those actions live elsewhere (inside this modal, on the pill, or on verse-number tap).
- **Mobile:** bottom sheet with `display: flex; flex-direction: column; max-height: 86%`. Pinned header, scrollable body (`overflow-y: auto`), pinned footer (Delete · Cancel · Save).
- **Tablet/desktop:** centered modal.
- **Header:** verse ref eyebrow + Arabic + translation preview (shared verse-block grammar).
- **Note field:** multi-line text area.
- **Tag picker — multi-tag pattern:**
  - **Pinned Selected strip** at top of tag region: count badge (`4`), `Clear all` link, each selected chip shows inline × for removal.
  - **All tags** below: renders only unselected chips; tapping adds to Selected.
  - **Search input** (`.tag-input`) with live `.ti-count` ("3 matches") filters both regions.
  - **Create chip** with dashed border appears when search has no exact match ("+ create taqwa").
  - **Dim state:** once 7+ selected, unselected chips render at 0.35–0.4 opacity to keep visual priority on applied tags.
  - **Empty state:** Selected strip shows "No tags yet — pick one below or search."; unselected region sorted most-used-first.
- **Delete flow:** footer Delete button → inline confirm in the footer (not a new dialog) → on confirm, sheet closes and an **undo toast** appears for 8s.

### 4.10 Onboarding — first run

Mockup: `onboarding.html`

Four screens, progress dots, Skip from screen 2 onward (screen 1 is the brand moment, no skip).

1. **Welcome** — wordmark (القرآن أطلس) · tagline "Read, reflect, remember." · 38:29 blessing. Single CTA: Begin.
2. **Theme pick** — three swatches (Light / Sepia / Dark), each showing ﷲ in its palette. Auto note: "let it follow your device — Auto". Sepia preselected.
3. **Translation** — radio list: Saheeh International (default) · Pickthall · Yusuf Ali · Clear Qur'an (Dr. Mustafa Khattab). Lede: "All translations ship offline. Switch between them per verse later."
4. **Tags intro** — teaches the verb. Verse preview of 2:286 with sample chips (mercy, patience, tawakkul). Privacy line: "Your marks live on this device. Private by default — nothing synced, nothing tracked." Two CTAs: **Open Al-Fatihah** / Browse all surahs.

Target time for a user who reads everything: under 30 seconds.

## 5. Cross-cutting rules

- **One gesture, one outcome.** Long-press → mark editor. Tap verse number → edge indicator + ref pill. Tap reader body → surface pill+dock. Nothing else.
- **One nav surface.** Dock + command sheet. No persistent top bar, no hamburger.
- **Shared verse-block grammar.** The ref → Arabic → English → optional note-with-left-bar → tag chips pattern is reused across Reader, Review cards, FVR cards, mark editor preview, and command-sheet direct-ref preview. Changing it changes it everywhere.
- **Bookmark = gold left-edge.** Same 2px edge on surah-list rows and on active/bookmarked verses in reader.
- **Tag chips** always carry a semantic color dot, never fill.
- **Sheets** pin header + footer, scroll body, keep primary actions always reachable.
- **Offline first.** All translations ship bundled; marks live on-device; no sync, no tracking.

## 6. What changes in the codebase (high level)

- `src/nav/index.js` — remove hamburger drawer; dock-only in this file; command sheet is a new module.
- `src/nav/bottom-nav.js` — replace with ambient dock (4 glyphs, auto-hide on scroll stays).
- New: `src/nav/command-sheet.js` — ⌘K surface, scoped result groups, direct-ref resolver.
- New: `src/surahs/list.js` — surah index view.
- New: `src/onboarding/` — four-screen first-run flow, persisted completion flag.
- `src/reader/index.js` — continuous verse-interleaved rendering; ambient pill + edge indicators.
- `src/marks/editor.js` — multi-tag pattern (Selected strip + unselected region + dim state + create chip), pinned footer, undo toast.
- `src/settings/panel.js` — bottom-sheet conversion; theme/font/translation/more sections.
- `src/review/hub.js` — verse-block card parity; tag-chip deep-link to FVR route `#/t/:tag`.
- `src/about/index.js` — 2×2 stat grid (no streak).
- `src/core/theme.css` + `src/core/constants.js` — palette tokens, tag color map, radii/elevation scale.

## 7. Out of scope (deferred)

- Long-press menu with multiple actions (explicitly rejected).
- Streak tracking (explicitly rejected).
- Sync / accounts.
- Audio player (dock has no player glyph).
- Tafsir / translator-comparison surface.

## 8. Open questions

None at time of spec. To be flagged during plan review if any emerge.
