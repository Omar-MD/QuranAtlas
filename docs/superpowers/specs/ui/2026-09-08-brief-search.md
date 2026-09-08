# QuranAtlas Search Design Brief — v2 Part 2

**Status:** Director design brief (K3, BriefSearchFamily seat). Binding only after orchestrator vetting against spec §6.
**Date:** 2026-09-08
**Spec:** `docs/superpowers/specs/2026-09-08-ui-screen-fix-refactor-design.md`
**Consumes:** `docs/superpowers/specs/ui/2026-09-08-brief-commonality.md` (binding) — chrome tiers §2, ownership/state map §3, theme/night §4, motion §5. This brief invents no new tokens, colors, or easings.

**Scope.** `#/search` — empty, results (answer-preview), no-results, and the Overview / Verses / Explore / Sources panels; the sticky query-controls bar; Save search; Show all matches; result detail/jump. Chrome (Tier B `ChromeFrame` bar + nav drawer) is owned by the commonality brief and the navigation-family brief; only search-owned surfaces are specified here.

**Evidence base.** Live inspection of the running app at `http://127.0.0.1:5173/#/search` at 1280×900 and 375×812 in light, sepia, dark; real queries `mercy`, `merciful`, `2:255`, Arabic `الرحمن`, gibberish `zzxqwv`. Sources: `src/design-system/tokens/semantic.css`, `src/design-system/registry/component-registry.json`, `src/components/search/{SearchShell,SearchHeader,SearchBox,SearchWorkspace,SearchOverview,SearchAnswerPreview,SearchResultList,SearchResultCard,SearchResultDetail,SearchSourcePanel,SearchExplorePanel,SearchGraphExplore,SavedSearchesNavPanel,SearchIndexGate}.tsx`, `src/components/search/useSearchRouteState.ts`, `src/design-system/index.css:220-1355`. Console and network were clean across every exercised query and theme.

---

## 1. Defects seen (each cites route/theme/viewport/file)

### Blocking

- **S-B1 — Stale cross-query "ghost" detail panel that Close cannot dismiss.** `#/search`, all themes, 1280×900 (and 375×812). Repro: run `mercy` → Show all matches → open a match's Details (opens `1:1`) → edit the query to `2:255`, `zzxqwv`, or `الرحمن` and submit → the new answer-preview renders **with the `1:1` Details panel still open inline**, showing the previous query's evidence under the new query's heading. Clicking its Close (ghost) control does not remove it. Root: `SearchWorkspace.tsx` holds `selectedPreviewMatch` in component-local state; `SearchAnswerPreview.tsx` renders `<SearchResultDetail previewMatch={selectedMatch} …>` inline. `useSearchRouteState.submitSearch` resets `selectedResult` (the verses-path selection) but cannot clear the workspace-local `selectedPreviewMatch`, so the panel is orphaned from the query lifecycle and its `onCloseMatch` path does not reliably fire. This is the single worst search defect: it corrupts every subsequent query's Overview with wrong-verse evidence.

### Major

- **S-M1 — "No results" is unreachable; gibberish renders the answer-preview path.** `#/search?q=zzxqwv`, all themes, both viewports. `SearchResultList` renders the designed `Status tone="info" title="No results"` empty state, but `SearchWorkspace` routes every query that yields `answerPreview && !brief && results.length===0` into `PreviewOnlyTabPanel` for Verses and `SearchAnswerPreview` for Overview — and the search client returns an answer-preview for `zzxqwv`. The user therefore never sees "No results"; they see "ANSWER PREVIEW / zzxqwv / Mixed / Answer limits / The available v1 sources are not enough to answer this query as prose." The designed no-results `Status` is dead code in practice.

- **S-M2 — Answer-preview contract is mis-framed for verse-lookup queries.** `#/search?q=mercy`, `merciful`, `2:255`, `الرحمن`, all themes, both viewports. Every ordinary query lands on the "Ask preview" surface (`SearchAnswerPreview`) whose headline status reads "Evidence shown without answer claims", whose badge reads "Mixed", and whose `Answer limits` Status (`tone="info"`) says **"The available v1 sources are not enough to answer this query as prose."** (`src/search/ask/boundaries.ts:91`). For a word/ref lookup this copy is wrong twice: (a) it frames a successful evidence retrieval as a *failure to answer*, and (b) the phrase "as prose" is engine-jargon, not user language. The "No best evidence" Status immediately below compounds the failure framing even when matches exist. This is a design-contract defect, not a copy tweak: the answer-preview lane must distinguish "question-shaped query that could not be answered" from "lookup query with direct verse matches".

- **S-M3 — Workspace tab selected state violates the commonality selected language.** `#/search` Overview/Verses/Explore/Sources tablist, all themes, both viewports. The active tab trigger is a **solid accent fill with surface-colored text** (`Tabs` primitive, `menus.tsx:55`: `data-[state=active]:bg-accent data-[state=active]:text-surface`). Commonality §3.2 "Selected (single-choice within a control)" prescribes `--qa-react-nav-control-selected-bg` background + accent text + (for source tabs) a 2px accent underline — never a solid-accent fill. The solid fill also renders the wrong on-color token: `text-surface` is `#f8f2e4` in light (reads washed on `#78592e` accent) and `#181c21` in dark; the correct on-accent ink is `--qa-react-text-on-accent`. This is the same dark-forces-solid-accent pattern flagged in spec §9 MEDIUM for filter options.

- **S-M4 — Mobile-only "Back to search results" icon button renders on desktop.** `#/search`, all themes, 1280×900. `SearchResultDetail` renders `<IconButton className="qar-react-search-detail-back">` and `index.css:954` sets `.qar-react-search-detail-back { display: none }` (with the `inline-flex` override inside `@media (max-width:767px)` at `index.css:972`). But the `IconButton` primitive's own Tailwind utility `qar:inline-flex` (`icon-button.tsx`) is unlayered and therefore beats the layered `display:none`, so the mobile-only back-arrow is **visible at 1280×900** (measured 40×40px in the open detail panel) alongside the desktop `Close` ghost button. Redundant, and violates the mobile/desktop control split the CSS intends.

- **S-M5 — Result "jump to reader" icon target is 40px, under the 44px rule.** `#/search`, all themes, both viewports. `.qar-react-search-result-jump` (`index.css:914-921`) sets `min-width/min-height: 34px`; the `IconButton` primitive default `qar:min-h-10 min-w-10` (40px) overrides it via the unlayered-utility win, so the rendered target is **40×40px** (measured). Both 34px (authored) and 40px (rendered) violate the commonality §3.3 44px touch-target rule (`--qa-react-control-touch-target`). This is the same root as commonality defect D3 (IconButton base 40px) plus a search-local 34px authorial override.

- **S-M6 — Evidence-basis cards render with dead vertical space (desktop) and ragged 2+1 wrap (mobile).** `#/search` Overview → Evidence basis. Desktop 1280×900: the three items (`Quran text` / `Translation` / `Morphology`) measure 168×110px with the value (`Used` / `Available, not used`) occupying the top ~40px and ~60px of empty padding below — the card is twice as tall as its content (cause: the section `.qar-react-search-evidence-basis` is a grid item that stretches, and the inner `div` fills it). Mobile 375×812: `grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr))` (`index.css:560-566`) yields two 146.5px columns, so the third item wraps to a lone second row leaving a 147×50px void at its right — K2.6's "ragged 2+1" is **confirmed**.

- **S-M7 — Loading and index-unavailable gate surfaces are not `Status`.** `#/search`, all themes. (a) The index-loading / pack-unavailable gate (`SearchIndexGate.tsx`) renders a raw `<p>` with `border bg-surface` — a hand-rolled box, not `Status`, so it has no live-region role and no tone. (b) The Explore loading surface (`SearchGraphExplore.tsx`) renders a custom sheen (`.qar-react-search-graph-loading`) with three animated bars; the bars are correct under reduced-motion (index.css:762-766 sets `animation: none`) but the block is not a `Spinner`/labelled `Status`. (c) `SearchExplorePanel` unavailable and `SearchSourcePanel` empty already use `Status` correctly — the inconsistency is internal to the search surface family.

### Minor

- **S-m1 — "Mixed" badge border washes out on the light canvas.** `#/search` Overview head, light theme. The `Badge` (neutral tone) is `text` on `surface` with a `border` hairline; the border `#f1e9d3` on the surrounding canvas `#fbf8f0` is subtle enough that the pill reads as floating text rather than a container. Contrast of the *text* is fine; this is a border-definition polish item. In sepia and dark the badge holds up. K2.6's "low contrast" is a light-theme border note, not a text-contrast failure.

- **S-m2 — "Save search" secondary button hairline washes out on the light canvas.** `#/search` controls bar, light theme. `Button variant="secondary"` is `bg-surface` + `border-border` (`#f8f2e4` / `#f1e9d3`); on the translucent controls bar (canvas@95%) the hairline is low-definition. This is K2.6's "Save-search ghost low contrast on light" — adjudicated: the button is `secondary`, not `ghost`, and the issue is border definition, not a variant misuse.

- **S-m3 — "Search data is ready on this device." status row is ambient noise when healthy.** `#/search`, all themes, both viewports. `.qar-react-search-status-row` (`SearchShell`) always shows the pack message; in the healthy `active` state it announces readiness that carries no action. It is a polite status line (correct role) but visually it is a muted line that competes with the tablist for no user benefit in the common case.

### Adjudication of K2.6 / static-audit inputs

- **K2.6 "primary Search button ~36px"** — **Not reproduced.** Measured 80×44px (light, 1280×900); `Button` base is `min-h-11` = 44px and `.qar-react-search-submit` adds only `min-width: max-content` (`index.css:268-271`). No 36px target exists on the Search button.
- **K2.6 "tab pills ~32px"** — **Not reproduced.** Measured 84/68/72/77 × **44px**; `Tabs` trigger is `qar:min-h-11`. The workspace override (`index.css:631-634`) sets `padding-inline: 8px` and `min-width: 0` but does not shrink height below 44px.
- **K2.6 "Save-search ghost low contrast on light"** — **Partially confirmed, re-cast as S-m2** (it is a `secondary` button; the note is border definition, not a ghost variant).
- **K2.6 "Mixed label low contrast"** — **Partially confirmed, re-cast as S-m1** (border washout on light; text contrast is fine; sepia/dark hold).
- **K2.6 "Evidence-basis grid ragged 2+1 on mobile"** — **Confirmed (S-M6)**.
- **Static audit "57 `.qar-search-*` selectors"** — **Confirmed at ~57**; the live prefix is `.qar-react-search-*` (`index.css:220-1355`). Mapping in §6.
- **Static audit "`.qar-search-result-jump` !important cluster ~1016-1029"** — **Stale.** There is **no `!important`** anywhere in `index.css:220-1360` (grep). The `.qar-react-search-result-jump` block at `index.css:914-928` is clean; the 34px target is at `:915-916`. The 1016-1029 line reference no longer points at search CSS.
- **Static audit "sub-44px at ~949, 1018, 1033"** — **Stale line numbers.** Live sub-44px sites are the 34px-authored/40px-rendered jump button (`:914-916`, S-M5) and the 32px `min-height` on `.qar-react-search-result-row-head` (`:844-848`, a non-interactive flex row — not a touch target, so not a violation).

---

## 2. Target composition (commonality language + registry components)

### 2.1 Page shell and chrome
- Route renders inside `ChromeFrame` (registry `chrome-frame`) — Tier B app chrome bar (commonality §2.2). No change to the bar, drawer host, or status region.
- Page body: `main[aria-label="Search"]` with a single `h1` "Search" and the muted kicker pattern from `NavigationPageRecipe` rhythm (`px-5 py-5 gap-4`). The `.qar-react-search-page-shell` / `-content` / `-content-inner` wrappers keep their canvas/color roles (`--qa-react-canvas`, `--qa-react-text`) and their nav-open padding compensation; these are layout shells, not cards.

### 2.2 Query-controls bar (sticky)
- One sticky controls bar, `position: sticky; top: 0` (mobile) / `top: calc(env(safe-area-inset-top) + 56px)` (≥768px), z-20. Background **must consume `--qa-react-chrome-surface`** (the commonality §1.2 A1 single-prescription) with `backdrop-filter: blur(14px)` kept as a local property — replacing the current hand-written `color-mix(canvas 95%, transparent)` at `index.css:252-253`.
- Composition: `Input` (registry `input`, label "Search Quran text, translation, or context", `hideLabel`, `name="query"`, `min-h-11`) in a flexible column; `Button variant="primary"` "Search" (`type="submit"`); `Button variant="secondary"` "Save search" (`type="button"`, `disabled` when no query). Grid `minmax(0,1fr) auto auto` desktop; `minmax(0,1fr) auto` with the input spanning full width at ≤520px (existing `index.css:1242-1256` behavior — keep).

### 2.3 Workspace tabs
- `Tabs` (registry `tabs`) with four items: Overview, Verses, Explore, Sources; `label="Search result views"`; controlled (`value`/`onValueChange`). **Selected trigger state must follow commonality §3.2**: `--qa-react-nav-control-selected-bg` background + `--qa-react-accent` text (not the current solid `bg-accent`/`text-surface`). This is a Tabs-primitive selected-variant correction (see §7, design decision D-T1).

### 2.4 Overview panel
- `SearchOverview`: eyebrow kicker ("Overview", `--qa-react-text-muted`, 0.72rem, 700), title (`h2`, `--qa-react-text`), interpreted-as line (`--qa-react-text-muted`), `Badge` (neutral) for primary match type.
- Facts grid: bordered cells (`--qa-react-border`, `--qa-react-radius-control`, `--qa-react-surface`) with mono `dd` values (`--qa-react-font-mono`) — keep `repeat(auto-fit, minmax(9rem, 1fr))`.
- Recovery → `Status tone="info"`. Top-Surahs / Top-Forms lists → keep the two-column value rows. Actions → `Button` group, first `primary`, rest `secondary`, `size="sm"`.
- **Overview is the full-brief surface.** When only an answer-preview exists, Overview renders `SearchAnswerPreview` (below).

### 2.5 Answer-preview surface (Overview tab when no brief)
- `SearchAnswerPreview`: same head language as Overview (eyebrow "Answer preview", `h2` query, mode line, `Badge`).
- **Claims list** → ordered list; each claim row is claim text + a `Badge` (citation count + source label). Keep `.qar-react-search-citation-chip` wrapping behavior.
- **Answer-limits / no-claims state** → `Status tone="info"` (see §5 for the corrected contract and copy).
- **Evidence basis** → keep the bordered `dl` section; **grid becomes `repeat(3, minmax(0,1fr))` desktop / single column ≤520px** (fixes S-M6 ragged 2+1); items sized to content (no forced stretch).
- **Best evidence** → list of `PreviewEvidenceCard` rows (see result-row language §2.7); empty → `Status tone="info" title="No best evidence"`.
- **Show all matches / Load more** → `Button variant="secondary" size="sm"`, `disabled` while loading, loading label swaps to "Loading matches"/"Loading more matches".
- **All matches** → same result-row list; head is `h3` + inline loading note.

### 2.6 Verses panel
- Result-count line (`--qa-react-text-muted`, 0.86rem) in the `count` grid area.
- `SearchResultList` → `section[aria-label="Verses"]` of `SearchResultCard` rows; **Load more** `Button variant="secondary"` bottom; **empty** → `Status tone="info" title="No results"`.
- **Selected result + detail**: desktop ≥980px two-column `list / detail` grid with sticky detail (`top: 96px`, `max-height: calc(100dvh - 110px)`); 768-979px single column with static detail; ≤767px the detail **replaces** the list (list + count hidden, detail full-width) — existing `index.css:958-979` behavior, kept.
- `SearchResultDetail`: bordered card (`--qa-react-border`, `--qa-react-radius-surface`, `--qa-react-surface`, `--qa-react-nav-shadow-row`), eyebrow "Details" + `h3` title, "Why this matched", DetailRows sections (Texts / Reader mapping / Evidence / Sources). **Desktop shows only the `Close` ghost `Button`; mobile ≤767px shows only the back-arrow `IconButton`.** The back-arrow must be hidden on desktop by a mechanism the IconButton utility cannot override (see §7 D-M4).

### 2.7 Result-row language (Verses list + answer-preview evidence/match cards)
- Row = bordered `article` (`--qa-react-nav-row-border`, `--qa-react-radius-control`, `--qa-react-nav-row-surface`, separator `--qa-react-nav-row-separator`). Ref label (`--qa-react-font-mono`, `--qa-react-text-muted`, 0.74rem) + jump `IconButton` on the head row; Arabic snippet (`--qa-react-font-arabic`, right-aligned, `dir="rtl"`); translation context (`--qa-react-font-translation`, `--qa-react-text-muted`); `Details` `Button variant="secondary" size="sm"` in the actions row.
- **Selected row** = `--qa-react-nav-current-bg` + `inset 3px 0 var(--qa-react-accent)` spine + `aria-current="true"` (commonality §3.2 "current"). The two divergent selected rules at `index.css:793-797` (accent spine) and `:828-831` (plain border wash) must collapse to the single nav-current language.
- **Jump IconButton target = 44px** (`--qa-react-control-touch-target`); remove the 34px authorial override (`index.css:915-916`) and rely on the corrected IconButton base (commonality D3) or an explicit `min-h-11 min-w-11`.

### 2.8 Explore panel
- `SearchExplorePanel`: intro line (`--qa-react-text-muted`); `ExploreSummaryList` module cards (bordered, focused module gets the `data-focused` accent border + inset spine at `index.css:768-771` — keep, it matches the current-row language); unavailable → `Status tone="info"`.
- Result-level modules before a seed: `Status tone="info"` + `ListRow` per graph module (already `ListRow` — correct).
- `SearchGraphExplore`: notes block, `Load Explore sections` `Button variant="secondary"`; **loading → labelled `Spinner` (or a `Status tone="info"` with `Spinner` icon) replacing the bespoke sheen**, preserving the reduced-motion freeze; error → `Status tone="error"` replacing the bare `<p class="text-danger">`; loaded → `Accordion` of sections (existing).

### 2.9 Sources panel
- `SearchSourcePanel`: three `SourceRows` `dl` groups (`Search index` / `Reader mapping summary` / `Result boundary notes`); empty → `Status tone="info"`. No structural change; already on-token.

### 2.10 Drawer saved-searches panel
- `SavedSearchesNavPanel` lives in the nav drawer `searchPanel` slot (Tier B drawer, commonality §2.4). Rows are unstyled `Button` swipe-rows with a delete `Button`; empty → `Status tone="info"`-equivalent line ("No saved searches yet.", currently a `role="status"` `<p>`). Undo affordance is a `role="status"` block + `Button variant="secondary" size="sm"`. This surface is styled by the navigation drawer CSS family (`.qar-react-nav-drawer-saved-searches-*`), not the `.qar-react-search-*` block — it is **out of the §6 migration scope** and belongs to the navigation-family refactor.

---

## 3. States (single prescription each)

- **Empty (no query, index active):** `Status tone="info" title="Search the Quran" description="Enter a word, phrase, or ayah reference."` on the active tab (currently Overview via `SearchOverview` null-overview path and `SearchAnswerPreview` null-preview path). Keep both null-guards but render one Status per panel.
- **Loading (index):** `SearchIndexGate` must render `Status tone="info"` with a `Spinner` icon and the pack message ("Loading search index"), not the current raw bordered `<p>`. During an active query the status row reads "Searching"; the previous results stay mounted (no layout collapse).
- **Results (answer-preview):** §2.5 composition; the `Answer limits` / `No best evidence` states follow the corrected contract in §5.
- **Results (full brief):** §2.4 Overview + §2.6 Verses.
- **No results:** a query with zero verse matches **and** no answer-preview claims must surface `Status tone="info" title="No results" description=<mode-specific recovery>` (`emptyResultMessageForMode`) on **both** the Overview and Verses panels — replacing the answer-preview detour for the true-empty case (S-M1). The answer-preview lane is reserved for queries that produce claims/evidence; the no-results Status owns the zero-evidence case.
- **Error:** `Status tone="error" title="Search unavailable" description=<error>` (`role="alert"`) above the workspace — already correct at `SearchShell`; keep. Explore-section error → `Status tone="error"`.
- **Offline / unavailable pack:** `SearchIndexGate` → `Status tone="warning"` with the pack message ("Search data is not available on this device."), never a bare box; warning tone per commonality §3.2 (offline/degraded = warning, not error-red).
- **Selected (result row):** §2.7 nav-current language + `aria-current="true"`.
- **Selected (workspace tab):** §2.3 / D-T1 — selected-bg + accent text, `aria-selected="true"`.
- **Disabled:** Save search / Load more / Show all matches → `opacity-55` + `pointer-events-none` (Button base), never color-only.
- **Focus:** every interactive element `outline: 2px solid var(--qa-react-focus); outline-offset: 2px`; the detail panel's programmatic focus uses `outline-offset: 3px` (`index.css:950-953` — keep). Details close restores focus to the originating trigger (existing behavior — keep; assert role/name, not classes).

---

## 4. Per-viewport layout

### 1280×900 (desktop)
- Content column `max-width: 72rem`-bounded inner (`--qa-react-page-max-width`), padded `18px 22px` at ≥1180px (`index.css:1338-1342`), `14px` at ≥768px.
- Controls bar: one row `minmax(0,1fr) auto auto`, sticky at `top: calc(safe-area + 56px)`.
- Workspace tabs: full-width tablist, four equal columns (`index.css:624-629`).
- Verses panel: two-column `list / detail` (`minmax(0,1fr) 25rem` at ≥1180px, `minmax(18rem, 0.72fr)` at ≥768px); sticky detail.
- Evidence basis: **three equal columns** (`repeat(3, minmax(0,1fr))`).

### 375×812 (mobile, ≤767px)
- Controls bar: sticky at `top: 0`; at ≤520px input spans full width, Search + Save share the second row (`index.css:1242-1256` — keep).
- Workspace tabs: full-width, four equal columns, 44px each.
- Verses panel: single column; opening a result **replaces** the list with the detail (list + count hidden), back-arrow `IconButton` returns to the list (this is the intended mobile pattern the CSS already encodes — S-M4 is the desktop leak of this control).
- Evidence basis: **single column** at ≤520px (no ragged 2+1), full-width cards sized to content.
- Answer-preview: same single-column stack; mobile details replace the preview content (`data-mobile-details` swap at `index.css:958-961` — keep).

---

## 5. Answer-preview contract (design-director judgment on the behavioral sweep)

The behavioral sweep is correct that `"The available v1 sources are not enough to answer this query as prose"` renders for ordinary verse queries, and it is a **design defect (S-M2)**, not acceptable copy. Judgment:

1. **Two query shapes, two lanes.** The search engine returns an `AnswerPreview` for near-everything, but the *surface* must branch on whether the query is question-shaped. A word/phrase/reference lookup (`mercy`, `2:255`, `الرحمن`, even gibberish) is a **lookup**: the user wants matching verses, not a prose answer. The current surface treats every lookup as a failed question.
2. **Lookup lane contract.** When the query is a lookup with verse matches: Overview leads with the match summary (the `SearchOverview` brief language), **not** an "Answer limits" apology. When the lookup has matches but the ask-layer produced no claims, the surface is the match list; no "not enough to answer as prose" copy appears at all.
3. **Ask lane contract.** The "Answer limits" Status appears **only** when the query is genuinely question-shaped (an interrogative/Ask intent) and the evidence cannot support a prose answer. Copy is rewritten to user language and marked as a proposal (copy is design; the exact string below is the binding prescription):
   - Title: `"No supported answer"`
   - Description: `"The sources on this device do not contain enough evidence to answer this as a question. The matching verses are shown below."`
   - The phrase "v1", "sources … as prose", and "Evidence shown without answer claims" (the current mode line) are engine internals and must not be user-facing; the mode line becomes `"Answer preview"` / `"Partial answer"` / `"Evidence only"` (the existing `answerModeLabel` strings, minus "claims" jargon).
4. **"No best evidence"** (`tone="info"`) is acceptable when true but must not stack directly under an "Answer limits" Status for a lookup — in the lookup lane it is omitted entirely (the match list *is* the evidence).
5. **No-results (S-M1)** is the zero-match lookup case and routes to the `No results` Status (§3), never to the answer-preview.

This is a presentation-model contract (which lane, which copy), not a token/color change; the `Status`/`Badge` components and tones already exist. The presentation-model branching (`search-presentation-model.ts`) owns the lane decision; the design brief binds the *visible outcome* of each lane.

---

## 6. `.qar-react-search-*` migration map (selector-group → registry primitive)

The ~57 selectors (`index.css:220-1355`) break into groups. "Migrate" = move the *visual* responsibility onto the named registry primitive and delete the bespoke class; "Keep as layout shell" = the class is a route-level grid/positioning wrapper with no visual token content and stays as thin layout (the registry does not own page grids).

| Selector group (index.css) | Current responsibility | Target primitive / disposition |
|---|---|---|
| `-page-shell`, `-content`, `-content-inner` (:221-241) | canvas/color, column padding, nav-open offset | **Keep as layout shell** (route grid). Consume `--qa-react-canvas`/`--qa-react-text` only. |
| `-controls`, `-controls-primary`, `-query-field`, `-submit`, `-save`, `-mode-strip` (:243-278, 1242-1314) | sticky bar, control grid, button widths | **Migrate surface to `--qa-react-chrome-surface`** (commonality A1); grid stays as shell; buttons already `Button`. |
| `-status-row`, `-result-count` (:280-298) | muted status line | **Keep as shell text** (`--qa-react-text-muted`); consider demoting healthy "ready" line (S-m3). |
| `-overview`, `-overview-head/-eyebrow/-title/-mode/-facts/-list/-note/-actions` (:300-424) | Overview card typography + facts grid | **Migrate to `Card` + `Badge`**; eyebrow/title/mode are type styles on `Card` header slots; facts cells use `--qa-react-border`/`radius-control`. |
| `-answer-preview`, `-answer-head`, `-answer-claims`, `-citation-chip` (:427-452, 501-534) | answer-preview stack, claim rows | **Migrate to `Card` + `Badge`** (chip is `Badge`); claims list is flow content. |
| `-preview-tab-note`, `-preview-tab-actions`, `-preview-tab-status` (:454-499) | preview-mode tab note | **Migrate to `Status tone="info"`** (title + description) + `Button` actions; the note is an info status, not a bespoke box. |
| `-evidence-basis`, `-evidence-basis-grid`, `-best-evidence`, `-all-matches` (:536-614) | bordered evidence-basis section, 3-col grid | **Migrate to `Card`**; grid becomes `repeat(3,…)`/1-col responsive (S-M6). |
| `-answer-card-list`, `-answer-actions`, `-all-matches-head` (:597-614) | card list spacing, action rows | **Keep as thin shell** (list gap + flex row); cards are result rows (§2.7). |
| `-workspace` (:616-634) | workspace grid + tablist columns | **Keep as shell**; tab trigger sizing moves to `Tabs` selected variant (D-T1). |
| `-verses-panel` (:636-645, 1279-1285, 1349-1355) | list/detail grid areas | **Keep as layout shell** (grid template areas are route layout). |
| `-explore-panel`, `-explore-modules` (+ `[data-focused]` :768-771) | explore stack, module cards, focused spine | **Migrate module cards to `Card`**; focused state keeps the `--qa-react-accent` inset spine + border (matches current-row language). |
| `-source-panel` (:653-657) | sources stack | **Keep as shell**; content already `Status` + `dl`. |
| `-graph-loading`, `-graph-loading-bars`, `@keyframes -loading-sheen` (:712-766) | explore loading sheen | **Migrate to `Spinner`/labelled `Status`**; delete the bespoke sheen + keyframes (preserve the reduced-motion kill as the Spinner/Status already freeze). |
| `-result-list` (:773-777) | list stack | **Keep as shell**. |
| `-result-row`, `-result-row[data-selected]`, `-result-row-head`, `-result-ref`, `-result-snippet`, `-result-arabic`, `-result-passages`, `-result-context`, `-result-why`, `-result-actions`, `-result-lanes` (:779-912) | result row card + selected + type | **Migrate row to `ListRow` (slots: num→ref, title→snippet, arabic, action→jump/Details)**; selected → `ListRow` `current` variant (nav-current language). Arabic/translation type styles become the row's arabic/meta slot styles. **This is the core of the HIGH refactor remainder.** |
| `-result-jump` (:914-928) | jump icon button 34px + hover | **Migrate to `IconButton`** (44px base after commonality D3); delete the 34px override; hover = IconButton `hover:border-accent`. |
| `-result-actions .qar:inline-flex` 34px (:930-932) | min-height on Details button | **Delete** — `Button size="sm"` is already `min-h-11` (44px); the override is redundant and was masking a non-issue. |
| `-result-detail`, `-result-detail:focus-visible` (:934-953) | detail card + focus ring | **Migrate to `Card`**; focus ring keeps `--qa-react-focus`/`3px offset`. |
| `-detail-back`, `-detail-close` (:954-978) | mobile/desktop close control split | **Migrate to `IconButton` (back) / `Button variant="ghost"` (close)**; the visibility split must be enforced in the component (conditional render), not a CSS class the utility overrides (S-M4). |
| `@media` blocks (:958-979, 1242-1355) | responsive list/detail swap, control stacking | **Keep as shell** (responsive grid is route layout); the mobile detail-replaces-list swap stays. |

---

## 7. Design decisions for the implementer (binding where marked)

- **D-T1 (binding):** `Tabs` trigger selected state changes from solid `bg-accent`/`text-surface` to `--qa-react-nav-control-selected-bg` background + `--qa-react-accent` text (commonality §3.2). This is a change to the shared `Tabs` primitive's selected variant; it is the same correction the spec §9 MEDIUM flags for dark filter-option selected states and resolves both under one token rule.
- **D-M4 (binding):** the mobile-back / desktop-close split in `SearchResultDetail` is enforced by conditional rendering (render the back `IconButton` only ≤767px, the `Close` `Button` only ≥768px), not by a `display:none` class the IconButton utility overrides.
- **D-M5 (binding):** the jump `IconButton` renders at 44px via the corrected IconButton base (commonality D3); the `.qar-react-search-result-jump` 34px override is deleted.
- **D-B1 (binding, blocking):** the answer-preview detail (`selectedPreviewMatch`) and the verses detail (`selectedResult`) are cleared whenever the submitted query changes, and the preview detail's Close reliably clears it. This is a state-ownership fix in `SearchWorkspace`/`SearchShell`; the design constraint is "no detail panel may outlive the query that produced it."
- **D-M1 (binding):** the no-results `Status` owns the zero-match lookup; the answer-preview lane is gated to queries with claims/evidence (§5).
- **S-m1/S-m2 (advisory):** the light-theme hairline washout on the neutral `Badge` and `secondary` `Button` is a *border-definition* polish item; if addressed, it is a tokens-level border strengthening in `semantic.css` light (e.g. a slightly deeper `--qa-react-border`), **not** a per-component color change — flag to the commonality iteration rather than special-casing search.
- **S-m3 (advisory):** the healthy "Search data is ready on this device." line may be demoted to render only on state *change* or collapsed into the polite status region without a persistent visible line; this is a chrome-level decision to coordinate with the navigation brief's status-region ownership.

---

## 8. Theme + night + reduced-motion (search-specific confirmations)

- All three themes verified live on `#/search`: light/sepia/dark canvas, surface, border, accent, and status tones shift as a set (measured). No search surface hardcodes a hex; all draw from `--qa-react-*`. The sticky controls bar is the one surface bypassing a token (canvas@95% inline mix) — fixed by §2.2/`--qa-react-chrome-surface`.
- Dark: `--qa-react-accent` `#d4a253` and the overridden `--qa-react-offline-warning` are consumed correctly by the offline/warning gate (once it is `Status tone="warning"`).
- Night mode: orthogonal wash via `.qar-react-night-shift` (commonality §4); no search component implements its own dimming — confirmed, none do.
- Reduced motion: the search loading sheen already freezes (`index.css:762-766`); when migrated to `Spinner`/`Status` the freeze is inherited. All control transitions consume `--qa-react-transition-fast` (collapse to 1ms under reduce, commonality §5.2). No search surface introduces non-token motion.

---

**Handoff.** This brief consumes the commonality chrome/state/token language without new namespaces. The binding decisions are D-T1 (Tabs selected), D-M4 (detail close split), D-M5 (44px jump), D-B1 (detail lifecycle), D-M1 (no-results lane); §5 is the answer-preview contract; §6 is the `.qar-react-search-*` → primitive migration map. K2.6 adjudications are in §1. No `src/**` edits are made or implied as screenshots/DOM-shape assertions; verification targets roles, names, visible text, and the 44px/selected/focus contracts.
