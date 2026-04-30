# Deprecated surfaces — graveyard

Cross-surface deprecations that don't cleanly attach to a single dossier's §Deprecated section. Each entry is **dated**, **commit-pinned**, and **explains what replaced it** so future reviewers don't re-litigate retired designs.

Per-surface deprecations live in the owning dossier's §Deprecated section.

---

## E3 (legacy). `#/t/:tag` FVR route — removed in commit `cb4e3a2`

The old FVR route `#/t/:tag` (e.g. `#/t/mercy`) dispatched `Hub.svelte` with a `tag` prop and filtered the threads layer only. Replaced by the `#/<layer>/:value` scheme in cluster-3-review-hub-fvr (commits `cb4e3a2`, `3fec509`). Pre-release — no users when removed. The new canonical route for the same content is `#/threads/mercy`.

Owner dossier: `review`.

## B1/D1/D4/G1 (legacy). MoreSheet — retired 2026-04-25 in commit `c297e61`

First-level parent sheet from the dock's ⋯ button. Held five rows: Settings · Review hub · Surah list · About · Clear data. Replaced by `NavDrawer.svelte` (left-slide, two items: Review · About) plus per-surface entry points: gear icon → Settings, About → Clear-data, ambient pill / center label → Surah list, command sheet → "Browse all surahs". Pre-release — no users when removed.

Owner dossiers (originally): `read` (dock origin) + `configure` (held Settings) + `navigate` (held Surah list).

## B1/C1b (legacy). MarginHeader two-row layout + fast-tag dot — retired 2026-04-25 in commit `daaff6b`

Mobile/tablet header was ~108 px tall: row 1 = surah crumb pill + circular fast-tag dot + ⋮ kebab; row 2 = Read · Review N · Marks · Threads tabs (two of which stubbed to `#/review`). Replaced by single-row layout (~52 px) — hamburger · bilingual surah label · settings gear. Fast-tag entry moved to double-tap / right-click on a verse.

Owner dossier: `read` (MarginHeader is reader chrome).

## C1/C1b (legacy). TagModePill — retired 2026-04-25 in commit `ba94d8d`

Desktop-only top-right "Tag mode" toggle pill. Replaced by the unified gesture model: right-click any verse to start fast-tag at all breakpoints. `TagModeToggle.svelte` (Fast/Deep mini-pill) was already orphaned and deleted in the same commit.

Owner dossier: `mark`.

## C1 (legacy). Double-tap → mark editor — flipped 2026-04-25 in commit `818001b`

Double-tap / right-click / keyboard `m` previously opened the deep mark editor (`tag/TagSheet`). Now opens the fast-tag inline panel (`reader/VerseTagPanel`) via `beginFast(verseKey)`. Deep editor reachable only via the panel's `⛶` escalation, `⌘+Enter`, or programmatic bridges (Review hub).

Owner dossier: `mark`.

## D4 (legacy). Clear data in Settings sheet / More sheet — moved 2026-04-25 in commit `0890a53`

Clear-data row sat at the bottom of the Settings sheet (and earlier the More sheet). Moved to the About page footer; confirmation flow (`safety/clear-data.ts::showClearDataConfirmation`) unchanged.

Owner dossier: `configure`.

## B1/F4 (legacy). MarginHeader center-label tap → surah list, full-width "Continue to {surah}" buttons — retired 2026-04-25 (`<commit-pending>`)

Mobile center label used to be a button: tap routed to `#/surahs` (or back if already there); cold-load with no in-memory surah resumed via `loadGlobalPosition()`. Decoration: bilingual label + `▾` chevron implying a destination. Replaced by a non-interactive `<div>` (no chevron); surah list reachable only via the hamburger drawer or header swipe-down. Continue-to-prev/next buttons in the Reader were full-width uppercase tracked-text rows (~46 px tall, "← Continue to Al-Isrāʾ" / "Continue to Maryam →"); replaced by single-line italic arrow + surah title (~22 px tall) — `↑ Al-Isrāʾ` and `Maryam ↓`. Standalone `#/surahs` page is now desktop-only; mobile arrivals at the route hard-redirect to `lastSurface` and open the drawer.

Owner dossiers: `read` (MarginHeader + Continue links) + `navigate` (`#/surahs` redirect).

## B1/F4 (legacy). NavDrawer two-row Review/About list — retired 2026-04-25 (`<commit-pending>`)

Drawer was a left-slide narrow side panel with two rows: Review (→ `#/review`), About (→ `#/about`). Replaced by a full-screen tabbed surface on mobile: Surahs tab (search + filter pills + auto-anchored surah list, sole mobile entry to the surah directory) and Review tab (Hub row + 12 grouped layer rows linking to `#/review?layer=<name>`). Header wordmark + ⓘ icon is the new About entry. Desktop kebab path keeps the narrow side-panel size but uses the same tabbed component.

Owner dossier: `navigate`.

---

## Adding to this graveyard

Move an entry here only if the deprecation spans multiple surface dossiers (cross-cutting retirement) or if the original journey letter is ambiguous about ownership. Single-surface deprecations belong in the owning dossier's §Deprecated section — keep them there so context-of-change stays adjacent.
