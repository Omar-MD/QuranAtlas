# QuranAtlas UI Defect Inventory — Phase A merge (Iteration 0)

**Date:** 2026-09-08 · **Spec:** `docs/superpowers/specs/2026-09-08-ui-screen-fix-refactor-design.md` §5 Phase A step 5
**Owner:** Orchestrator (merged streams; adjudications final unless new evidence).

## Streams merged

| Stream | Seat | Weight in merge |
|---|---|---|
| Per-screen design audits ×10 | K3 (`ui-director` ×5 family seats) | Highest — DOM-measured, source-cited; each brief vetted vs spec §6 |
| Pixel audit (all screens × viewports × themes) | K2.6 (`ui-visual-reviewer`) | Corroborating — pixel estimates; every measurement conflict resolved in favor of K3 DOM values (see §5) |
| Visual + gate baseline (64 screenshots, 3 gates) | `ui-implementer` (multi-modal) | High — gates green; observations feed briefs; state-dependent notes point-in-time (shared profile) |
| Behavioral sweep (console/network/a11y/focus/persistence) | Orchestrator | High — zero console errors, zero ≥400, persistence ✅; fed S-B1/S-D2 adjudications |
| Static-audit remainder (spec §9) | history | **Stale-checked against live tree** — see §4; spec §9 was anchored to pre-cleanup tree `bb54638`, not baseline `c8cf103` |

**Severity taxonomy:** blocking = unusable/broken/a11y violation · major = visible inconsistency, clipping, contrast, wrong state · minor = polish.

## 0. Environment facts (scope constraints)

- **Mushaf page media is private/unavailable** (`data/normalized/mushaf-pages` absent; server SPA-falls-back). The asset **gate** surfaces are environment-true and designed; the page stage was verified in source only. `check:mushaf-assets` runs in release verification only.
- Shared headless-browser profile across seats → persisted state racy for point-in-time audits (bookmarks mutated mid-baseline). Structural/theme findings unaffected.
- `mise run smoke` requires `env -u CI` while `qa-dev` holds 5173 (harness injects `CI=true`, flipping Playwright's `reuseExistingServer`).

## 1. Systemic finding — the cascade layer war (highest leverage)

Component-layer (`@layer qa-react-components`) recipes **lose to Tailwind utilities** wherever both style the same element (Tailwind v4 `@import "tailwindcss"` layer chain vs author layers; empirically DOM-verified by three independent seats). Victims:

| Defect | Effect |
|---|---|
| S-D4 (major) | entire `adaptive-settings` variant inert — sheet renders base Sheet utilities (canvas bg, shadow-lg, z-50, w-96, radius-12, p-20) |
| S-D3 (major) | sheet z-50 < reader chrome z-95 → chrome paints over full-bleed mobile sheet |
| S-D1 (major) | settings scrim = `bg-text/30` (text-colored fog in dark), token override loses |
| N1 (major) | drawer source-tab/filter `aria-selected` bg never paints in ANY theme (ghost Button `qar:bg-transparent` wins) |
| S-M4 (major) | mobile-only back IconButton visible on desktop (`display:none` loses to `qar:inline-flex`) |
| N2 (minor) | wird card renders on Button base — border/fill/elevation lost |
| S-M5 (part) | jump target 40px (IconButton base) beats authored 34px — both wrong |

**Disposition:** fixed once in **Iteration 1 Task 5** (layer architecture + `adaptive-settings` re-founding). N1's full SegmentedControl cutover and S-M4's conditional-render fix still land in their family waves (language correctness independent of the cascade fix).

## 2. Defect ledger (by wave assignment)

### Blocking (2)
| ID | Family | Defect | Wave |
|---|---|---|---|
| M-D1 | Mushaf | gate Status occluded by fixed chrome (both viewports; mobile hides Manage-assets/Retry entirely — orchestrator-verified: chromeBottom 88, status top 0, all buttons hidden) | **Iter 2 Reader** (M-P1) |
| S-B1 | Search | stale cross-query ghost detail panel; Close cannot dismiss (`selectedPreviewMatch` survives query changes) | **Iter 4 Search** (D-B1) |

### Major (20)
| ID | Family | Defect | Wave |
|---|---|---|---|
| R-D1 | Reader | verse bookmark glyph 13×13 — invisible affordance (target is 44px; visual is not) | Iter 2 (R-P1) |
| M-D2 | Mushaf | gate Status full-width edge-to-edge, no bound/centering | Iter 2 (M-P2) |
| M-D3 | Mushaf | gate Status icon-less (color+text only) | Iter 2 (M-P3) |
| S1 | Surahs | row content centered in full-width row — dead gutters all viewports | Iter 3 (ListRow) |
| S2 | Surahs | dark rows read elevated (fill+inset-shadow) vs flat in light/sepia | Iter 3 (flat dividers) |
| B1 | Bookmarks | `outline: none` on row/delete focus-visible — no keyboard ring | Iter 3 (ListRow ring) |
| B2 | Bookmarks | delete affordance invisible until swipe; desktop hover pill degenerates to 31×8px | Iter 3 (always-visible delete IconButton) |
| N1 | Drawer | selected-state never paints (see §1) | Iter 1 fixes paint; Iter 3 cutover (SegmentedControl) |
| S-M1 | Search | "No results" Status unreachable — gibberish routes to answer-preview lane | Iter 4 (D-M1) |
| S-M2 | Search | answer-preview mis-framed for lookups ("v1 sources… as prose" failure copy on success) | Iter 4 (§5 contract) |
| S-M3 | Search | Tabs selected = solid accent + wrong on-color token | Iter 4 (D-T1) |
| S-M4 | Search | mobile back button renders on desktop (see §1) | Iter 4 (conditional render) |
| S-M5 | Search | jump target 40px/34px — sub-44 | Iter 1 base fix + Iter 4 (delete override) |
| S-M6 | Search | evidence cards 110px dead space desktop; ragged 2+1 mobile | Iter 4 |
| S-M7 | Search | loading/index-gate surfaces not Status/Spinner | Iter 4 |
| S-D1 | Settings | scrim fog (see §1) | Iter 1 (S-P1) |
| S-D2 | Settings | open-from-ChromeFrame teleports base to reader + focus lands on stale trigger | Iter 5 (S-P4) — behavior change → correctness review |
| S-D3 | Settings | chrome over sheet (see §1) | Iter 1 (S-P2) |
| S-D4 | Settings | variant package inert (see §1) | Iter 1 (S-P2) |
| U-D1 | Unsupported | no heading on page (h1–h4 empty) | Iter 6 (U-P1) |
| A-D1 | About | danger Button ink 2.66:1 in dark (token gap) | Iter 1 (A-P1 `--qa-react-text-on-danger`) |

### Minor (25 — scheduled by wave)
- **Iter 2 Reader:** R-D3 (375px title truncation — two-row chrome), R-D4 (continuity link reads as footnote), R-D6 (verse-number rail 32px), M-D5 (mushaf chrome title plainer than reader's), reader error state lacks retry action (R-P2).
- **Iter 3 Navigation:** S3 (chevron column 16px vs 18.4px glyph), S4 (no page cap — 1240px bands), S5 (Arabic column can squeeze copy), B3 (swipe clips verse ref), B4 (double-clipped Arabic snippet — drop 50-char JS cut), B5 (count badges not Badge primitive), B6 (route loading/error bare `<p>`), N2 (wird card on Button base), N3 (drawer search input cramped 197px), N4 (modes as tab-buttons, not SegmentedControl), N5 (juz/hizb centered content).
- **Iter 4 Search:** S-m1 (Badge border washes light), S-m2 (secondary hairline washes light), S-m3 (healthy "data ready" line is noise).
- **Iter 5 Settings:** S-D5 (mobile scroll affordance), S-D6 (write-error not Status), S-D7 (orphaned mushaf rule in settings block), post-S-P2 verification of authored values (sticky header, close affordance, night-selected states).
- **Iter 6 Framing:** L-D1 (splash copy misdescribes restore), L-D2→Iter 1 (Spinner no reduced-motion kill — cross-cutting, primitive), O-D1 (fake `Progress value={60}`), O-D2 (gate Status icon-less), O-D3 (segmented label wrap), A-D2 (bidi split of Arabic attribution), A-D3 (ASCII quotes vs typographic voice), A-D4 (attribution markers suppressed all themes), A-D5 (App-updates clipped at 375px fold — verify post A-P2/A-P4).

## 3. Phase B/C ordering decision

Spec's expected order **confirmed**: Iter 1 Commonality → 2 Reader (blocking M-D1) → 3 Navigation → 4 Search (blocking S-B1) → 5 Settings → 6 Framing. Rationale: Iteration 1's layer fix + 44px base unblocks the correct rendering of half the majors; both blockings land by wave 4; Settings wave depends on S-P2's variant foundation; Framing is lowest-severity. Screens with zero post-merge findings: none (every screen has at least a minor).

**Phase C re-scope (see §4):** R1 = `.qar-react-search-*` migration → folded into Iter 4 (brief §6 map). R2 = token retirements → Iter 1 (gates green); touch-target completion distributed (Iter 1 base, Iter 2 glyph/rail, Iter 4 jump). R3 = `!important` elimination → **already resolved in tree**; residual duplicate-recipe consolidation (R-P5/M-P5 chrome pills) folded into Iter 2. R4 = final acceptance journey unchanged (both blockings + all majors closed prerequisite).

## 4. Spec §9 staleness adjudication (input vs live tree)

Spec §9 was written from `.scratch/static-visual-audit-current.md` (tree `bb54638` + then-working-tree). The landed cleanup commits pre-`c8cf103` removed most of it; `src/` is byte-identical `c8cf103..HEAD` (verified `git diff --stat` empty).

| §9 item | Live tree reality | Disposition |
|---|---|---|
| 57 `.qar-search-*` selectors (HIGH) | **Renamed** `qar-react-search-*`, ~57 remain (index.css:220-1355), consumed by 10+ search components | OPEN — Iter 4 (R1) |
| Dark filter-option solid-accent `!important` (MEDIUM) | CSS already tokenized; live form = N1 cascade-order never-paints | Iter 1 + Iter 3 |
| Token retirement blocked: `nav-current-spine`, `bookmark-pulse-*` | Zero consumers confirmed by orchestrator grep (2026-09-08) | Retire in Iter 1 (fresh gate required) |
| `radius-sm/md/circle` retirement | **Tokens do not exist** in semantic.css | Stale spec entry — dropped |
| Sub-44px touch targets (32-42px sites) | Most cited sites stale; real: IconButton base 40px, jump 34/40px, wird chip 42px, verse glyph 13px visual, verse rail 32px | Distributed (Iter 1/2/4) |
| 214 `!important` (deferred) | **Zero `!important`** in all design-system CSS | **Resolved** — R3 collapsed |
| Adaptive-settings `!important` re-layout (deferred) | No `!important`; recipe too WEAK (layer war) | Iter 1 (S-P2) |
| Reader-chrome/drawer override blocks (deferred) | Blocks gone; duplicate chrome pill recipes remain | Iter 2 (R-P5/M-P5) |
| `[data-swatch]` over-scoping (deferred) | Confirmed narrow; works in current shell | Revisit only on second consumer |
| Duplicate view-toggle/wird-status recipes (deferred) | Confirmed present | Iter 2 |

## 5. K2.6 pixel-audit cross-check (merge weighing rule)

DOM-measured seat values override pixel estimates. **Not reproduced** (K3 re-measured): wordmark dark contrast (12.4:1 AAA — the "near-invisible" reading was a mid-theme-transition artifact), chrome focus rings "thin" (real `:focus-visible` = 2px accent + 2px offset), Search button 36px (44px), tab pills 32px (44px), Fetch-latest 36px (44px), Go-to-Surah-list 36px (44px), Reading-flow Select 36px (160×44px), theme radios 20px (boxes 44px+), slider track 4px (8px, 44px hit), mushaf bookmark `!important` (absent). **Confirmed:** bookmark glyph small (13px actual), evidence-grid ragged wrap (S-M6), drawer search cramped (N3), settings scrim problem (cause corrected: light fog, not darkness), dark surahs rows elevated (S2), delete affordance invisible (B2 — desktop pill 31×8px), chevron cramp (S3), wird icon (chip 42px). **By-design (not defects):** night-vs-dark subtlety (orthogonal wash), launch/onboarding redirects (continuity), `ERR_ABORTED` fetches (superseded requests).

## 6. Non-defects / expected behavior (recorded, no action)

Launch `#/` resumes last surface (continuity restore, replaceState). Completed-user `#/onboarding` redirect. Settings URL normalizes to underlying base (overlay is state, not destination) — but S-D2's *reader teleport* on ChromeFrame close IS a defect (Iter 5). Verse counts differ from common Hafs counts (tradition/riwayah-dependent, data-side; out of scope per spec §10 — flagged to user, not scheduled). Dark+night double-dim is intended.

## 7. Backlog items NOT scheduled (user decisions required)

- Surahs list has no search/filter/jump over 114 items (UX gap — feature decision, not a defect).
- Reader chrome has two near-identical book-ish icons (wird vs bookmarks) — icon distinctness is a K3 judgment call deferred to the Reader wave's K3 addendum if the implementer needs it.
- Attribution/citation line-length (~90ch full-bleed desktop) — acceptable per about brief; revisit only with user preference.

## 8. Verified-clean (no findings)

Reader content typography/hierarchy all themes; Bismala/verse layout balance; drawer structure/IA; drawer focus open/return from both tiers; mobile drawer modal + desktop rail per commonality §2.4; bookmarks card layout; search empty-state card; about content hierarchy; unsupported card copy; reduced-motion honoring on all audited surfaces except Spinner (L-D2); theme persistence round-trip; console/network cleanliness app-wide.


---

## 9. Execution status (2026-09-08, session close)

Iterations landed on `dev`, each green through the full loop (gates + K2.6 visual + correctness review + fix rounds):

| Iteration | Commit | Outcome |
|---|---|---|
| 0 — audit + briefs + inventory | `8160787` (+ plans `766a775`) | 11 vetted briefs, merged inventory |
| 1 — commonality layer | `f59df2d` | scrim token (+dark 38%), sheet variant + cascade layer fix, 44px IconButton base, token retirement R1/R2, Spinner reduce kill, danger ink token; 9-finding fix round (dark success token restore, safe-area rule restore, layer-flip sizing inversions) |
| 2 — Reader family | `f74018a` | BLOCKING M-D1 closed (gate chrome clearance, keyboard-verified), M-D2/3/4/5, R-D1/3/4/6, R-P2 retry, pill consolidation, gate inert/focus suspension |
| 3 — Navigation family | `f5a376f` | ListRow/SegmentedControl/Badge cutovers (−759 net lines), always-visible delete + focus contract, shared BookmarksProvider, ul/li semantics, retry race guards |
| 4 — Search family (+R1 folded) | `85ba1ca` | BLOCKING S-B1 closed, lane contract + copy, Tabs selected variant, `.qar-react-search-*` migration (~30 selector families deleted), hash rehydration incl. race guard |
| 5 — Settings family | `935a1a8` | S-D2 base preservation (+e2e URL pin update), write-error Status, scroll cue, dock-rule relocation; fix round closed search-wipe regression + retry banner lifecycle + cue scope |

**Remaining (not started, per user stop directive):** Iteration 6 — Framing family wave (plan `docs/superpowers/plans/2026-09-08-ui-iter-6-framing.md`: U-P1 fallback h1, L-P3 splash copy, O-P1..O-P3 onboarding honesty, A-P2..A-P5 about typography/markers/fold). R4 — final acceptance journey (both blockings + all majors now closed; run after Iteration 6). R2/R3 remainder is nil: R1 folded into Iteration 4; R3's `!important` was already absent from the tree; R2's retirements landed in Iteration 1 (only `--qa-react-settings-backdrop` zero-consumer retirement still gated on a future cleanup pass).

**Recorded edges (non-blocking):**
- Pre-existing (verified on a reverted build, NOT caused by Iter 5): leaving `#/search` live rewrites the URL back to `#/search` via a stale async write — breaks reload/back-forward after search. Needs its own defect/ticket.
- IconButton `focus-visible` ring color resolves to `currentColor` rather than `--qa-react-focus` — pre-existing registry-wide behavior; candidate registry follow-up.
- Registry JSON `list-row` entry text ("no runtime consumer yet") is stale after the Iteration-3 cutover.
- Search ready-before-restore hash race: closed in `85ba1ca` (parking condition includes `!restoredHashStateRef.current`).