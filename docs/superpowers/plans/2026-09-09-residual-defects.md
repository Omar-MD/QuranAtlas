# QuranAtlas UI Residual Defects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every remaining defect/gap/edge from the UI refactor (post Iterations 0–6 + R4, HEAD `5ef79dd` on `dev`): the `#/search` stale-async URL rewrite, the IconButton/primitive focus-ring token failure, stale registry coverage text, the `--qa-react-settings-backdrop` retirement, and explicit dispositions (scheduled, decision-gated, or no-action) for every recorded edge and backlog item.

**Architecture:** Four independent scheduled tasks, each one commit: two pure-metadata fixes (registry JSON, token CSS), one primitive-layer class-string fix verified through build-output greps plus computed-style probes, and one behavioral fix in `useSearchRouteState.ts` (guard the hash writer against writes from outside the search route) with a smoke-journey URL-contract tripwire and a documented manual race probe. Backlog items 7–9 are decision-gated sections with recommendations; items 5/6/10 are recorded no-actions backed by tree evidence.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS v4.3.3 (`prefix(qar)` + `@theme` in `src/design-system/tokens/tailwind-theme.css`), Vite 8, Playwright 1.59 (desktop-smoke 1280×900 + mobile-smoke 375×812), mise front door (Node 24.20.0, pnpm 10.31.0).

**Spec:** `docs/superpowers/specs/ui/2026-09-08-defect-inventory.md` (§9 recorded edges) + `docs/superpowers/specs/2026-09-08-ui-screen-fix-refactor-design.md` (§10 scope/backlog). Plans from Iterations 1–6 live under `docs/superpowers/plans/2026-09-08-ui-iter-*.md` and describe the landed conventions this plan follows.

## Global Constraints

- Tools pinned: Node `24.20.0`, pnpm `10.31.0`; `mise install` then `mise run install` for a fresh checkout.
- Command front door is mise only: `mise run check`, `mise run build:ui`, `env -u CI mise run smoke` (requires a dev server holding 5173 — Playwright's `reuseExistingServer` is disabled when `CI` is set, which the harness injects), `mise run offline` only when service-worker/offline behavior changes (no task below touches it).
- Durable-test charter (hard): browser specs may assert only accessible roles/names, visible content, URLs, persisted state, network outcomes, service-worker behavior. NEVER CSS classes, DOM shape, icon internals, screenshots, or implementation-only state. Coverage scope = offline lifecycle + desktop/mobile core UI smoke journey.
- UI boundaries: check `src/design-system/registry/component-registry.json` before UI work; compose approved primitives from `src/components/ui/**`; direct Radix imports only inside `src/components/ui/**`.
- Design-literal guardrail (`mise run check:design`): no raw hex outside `primitives.css`/`semantic.css`, no `var(--qar-*)` outside token files, no Tailwind palette utilities, and arbitrary utilities must match `qar:...-[...]` bracket syntax allowlist — the paren form `qar:...-(--qa-react-*)` used in Task 3 does NOT match the bracket regex and needs no allowlist entry.
- No new dependencies, no new CSS namespace, no screenshot artifacts, no committing browser state.
- Commit style: conventional prefix `fix:`/`refactor:`/`docs:`/`test:`, explicit paths only; tree clean after each task; never commit red.
- Invariants that must survive: `resolveSettingsPreviousHash` preserves ChromeFrame bases (`#/surahs`, `#/bookmarks`, `#/search`, `#/about`) and reader bases; search's `onHashChange` ignores non-`#/search` hashes (Task 4 extends the same rule to the hash WRITER, it does not touch the reader).
- Environment traps for browser probes: shared browser profile — never clear site data; snapshot/restore the 7 `quran-atlas` IndexedDB stores with in-line keys (`put(value)`) if you must mutate; hidden headless tabs freeze CSS transitions; use DOM `.click()` on accessible-name-matched buttons when coordinate clicks miss sticky chrome; `page.route` is unavailable in the OMP tab bridge (tests in `tests/e2e/**` run under plain Playwright and CAN use `page.route`).

## Dispositions at a glance (authoritative item → plan section)

| # | Item | Disposition |
|---|---|---|
| 1 | `#/search` stale-async URL rewrite | **Task 4** (scheduled) |
| 2 | IconButton focus ring resolves to `currentColor` | **Task 3** (scheduled) |
| 3 | Registry `list-row` stale "no runtime consumer" text | **Task 1** (scheduled; same-class stale text on `card`, `list-row-actions`, `status` fixed in the same commit) |
| 4 | `--qa-react-settings-backdrop` retirement | **Task 2** (scheduled; zero-consumer grep recorded below) |
| 5 | Bookmarks section count badge "hand-rolled pill" | **No-action** — investigation contradicts the note; cutover already landed (evidence below) |
| 6 | About "Fetch latest app" at 375×812 fold | **No-action** — accepted per brief (top 766 / bottom 810 ≤ 812; Clear-all below fold) |
| 7 | Surahs list search/filter over 114 items | **Task 5 — decision-gated**, recommendation: approve |
| 8 | Reader chrome ambiguous book icons | **Task 6 — decision-gated**, recommendation: approve |
| 9 | Verse-count tradition differences | **Decision-gated, recommendation: separate data spec** — data-pipeline change, not UI |
| 10 | `.gitignore` uncommitted `+.agents/` line | **Note only** — user/harness territory; never scheduled by this plan |

---

### Task 1: Registry coverage-text refresh (defect-inventory §9 "stale registry text")

**Files:**
- Modify: `src/design-system/registry/component-registry.json:229` (card), `:703` (list-row), `:749` (list-row-actions), `:1751` (status)

**Interfaces:**
- Consumes: nothing from other tasks; fully independent.
- Produces: accurate `tests[].behaviors` strings for `card`, `list-row`, `list-row-actions`, `status`; no schema change (free-form string array per `component-registry.schema.json:81`); `check:registry` stays green.

The tree has FOUR stale "no runtime consumer yet" entries (verified by grep), not just `list-row` — all four landed their consumers in Iterations 3–6 and are fixed in this one commit. Verified runtime consumers: ListRow ← `SurahList.tsx:108`, `BookmarksList.tsx:7`, `HizbList.tsx:5`, `SearchAnswerPreview.tsx:5`, `SearchResultCard.tsx:4`, `SearchExplorePanel.tsx:2`; ListRowActions ← `SearchResultCard.tsx:23`, `SearchAnswerPreview.tsx:199`, plus the ListRow action slot itself (`feedback.tsx:148`); Card ← `DailyWirdCard.tsx:4`, `SearchOverview.tsx:1`, `SearchAnswerPreview.tsx:5`, `SearchExplorePanel.tsx:2`, `SearchResultDetail.tsx:4`; Status ← `ReaderAssetGate.tsx`, `ReaderVerseSurface.tsx:57/63`, `BookmarksRoute.tsx:18`, `SearchIndexGate.tsx:25`, `OnboardingRoute.tsx:150`, `App.tsx:286` (unsupported fallback).

- [ ] **Step 1: Re-verify consumers at your HEAD (must match the lists above)**

Run: `grep -rn "import {" src/components/navigation/SurahList.tsx src/components/navigation/BookmarksList.tsx src/components/navigation/HizbList.tsx src/components/search/SearchResultCard.tsx src/components/search/SearchAnswerPreview.tsx src/components/search/SearchOverview.tsx src/components/reader/wird/DailyWirdCard.tsx | grep -E "ListRow|Card|Status"`
Expected: each file imports the primitive(s) claimed above. If any list is stale, adjust the replacement strings in Step 2 to the truth before editing.

- [ ] **Step 2: Replace the four stale behaviors strings**

In `src/design-system/registry/component-registry.json`, replace exactly these strings:

`card` (line 229) — replace
`"coverage reserved: Card has no runtime consumer yet (ui.stories.tsx only); e2e behavior coverage lands with the onboarding, reader/Mushaf, and Settings/Assets/About/Unsupported route-cutover milestones"`
with
`"runtime consumers: DailyWirdCard in the navigation drawer; SearchOverview, SearchAnswerPreview, SearchExplorePanel, and SearchResultDetail on #/search. Durable e2e coverage is bounded by the smoke charter; storybook states remain the per-state matrix."`

`list-row` (line 703) — replace
`"coverage reserved: ListRow has no runtime consumer yet (ui.stories.tsx only); e2e behavior coverage lands with the navigation/Surahs/Bookmarks and Search route-cutover milestones"`
with
`"runtime consumers: SurahsRoute surah list; NavDrawer read-tab surah list; BookmarksList rows; HizbList rows; SearchResultCard and SearchAnswerPreview evidence rows on #/search. Durable e2e coverage is bounded by the smoke charter; storybook states remain the per-state matrix."`

`list-row-actions` (line 749) — replace
`"coverage reserved: ListRowActions has no runtime consumer yet (ui.stories.tsx only); e2e behavior coverage lands with the navigation/Surahs/Bookmarks route-cutover milestone"`
with
`"runtime consumers: SearchResultCard and SearchAnswerPreview action clusters (Open in Reader IconButton with Tooltip) and the ListRow action slot itself. Durable e2e coverage is bounded by the smoke charter; storybook states remain the per-state matrix."`

`status` (line 1751) — replace
`"coverage reserved: Status has no runtime consumer yet (ui.stories.tsx only); e2e behavior coverage lands with the onboarding, reader/Mushaf, navigation/Surahs/Bookmarks, Search, and Settings/Assets/About/Unsupported route-cutover milestones"`
with
`"runtime consumers app-wide: reader/Mushaf asset gates and corpus states, bookmarks route error, search index gate, onboarding edition-unavailable, unsupported-hash fallback. Durable e2e coverage is bounded by the smoke charter; storybook states remain the per-state matrix."`

- [ ] **Step 3: Confirm no other stale entries remain**

Run: `grep -c "no runtime consumer" src/design-system/registry/component-registry.json`
Expected: `0`

- [ ] **Step 4: Run the gates**

Run: `mise run check`
Expected: `static checks passed` (includes `check:registry` schema + consumer-boundary validation over the edited file).

- [ ] **Step 5: Commit**

```bash
git add src/design-system/registry/component-registry.json
git commit -m "docs: refresh stale registry coverage notes to real consumers"
```

---

### Task 2: Retire `--qa-react-settings-backdrop` (R2 leftover)

**Files:**
- Modify: `src/design-system/tokens/semantic.css:54` (delete the single line)

**Interfaces:**
- Consumes: nothing.
- Produces: removal of the zero-consumer alias; `--qa-react-scrim` (its underlying token, `semantic.css:27` light / `:172` dark) and the `.qar-react-scrim` recipe (`index.css:1018`) are untouched and keep serving every overlay.

**Zero-consumer grep (recorded at planning time, HEAD `5ef79dd`):** repo-wide search for `settings-backdrop` matches ONLY `src/design-system/tokens/semantic.css:54` (the definition) plus historical docs (`docs/superpowers/plans/2026-09-08-ui-iter-5-settings.md:38`, `docs/superpowers/specs/ui/2026-09-08-brief-settings.md:43`, `docs/superpowers/specs/ui/2026-09-08-defect-inventory.md:140`). Zero consumers in `src/**`, `.storybook/**`, stories, or the registry. Historical docs are audit records and are NOT edited.

- [ ] **Step 1: Re-run the retirement gate grep**

Run: `grep -rn -- '--qa-react-settings-backdrop' src .storybook 2>/dev/null`
Expected: exactly one line — `src/design-system/tokens/semantic.css:54:    --qa-react-settings-backdrop: var(--qa-react-scrim);`. If anything else appears, STOP: a new consumer landed; report it instead of retiring.

- [ ] **Step 2: Delete the definition**

In `src/design-system/tokens/semantic.css`, delete line 54:

```css
    --qa-react-settings-backdrop: var(--qa-react-scrim);
```

The surrounding block keeps `--qa-react-settings-sheet` (line 55) onward unchanged — those still have consumers.

- [ ] **Step 3: Run the gates**

Run: `mise run check && mise run build:ui && env -u CI mise run smoke`
Expected: `static checks passed`; vite build succeeds; `2/2` smoke projects pass (desktop-smoke + mobile-smoke). No SW/offline surface touched → `mise run offline` not required.

- [ ] **Step 4: Commit**

```bash
git add src/design-system/tokens/semantic.css
git commit -m "refactor: retire unused --qa-react-settings-backdrop token"
```

---

### Task 3: Primitive focus ring resolves to the focus token (registry-wide)

**Files:**
- Modify: `src/components/ui/button.tsx:8`
- Modify: `src/components/ui/icon-button.tsx:15`
- Modify: `src/components/ui/disclosure.tsx:16`
- Modify: `src/components/ui/form-controls.tsx:12`, `:155`, `:186`, `:221`
- Modify: `src/components/ui/menus.tsx:122`
- Modify: `src/components/ui/feedback.tsx:17` (Badge warning tone border, same defect class)

**Interfaces:**
- Consumes: the semantic token `--qa-react-focus` (defined per theme: `semantic.css:14` light `#78592e`, `:119` sepia `#815c2b`, `:150` dark `#d4a253`).
- Produces: class-string convention `qar:focus-visible:outline-(--qa-react-focus)` / `qar:border-(--qa-react-focus)` — an explicit var-reference utility that emits `outline-color: var(--qa-react-focus)` directly instead of routing through the `@theme` color indirection (`--color-focus` in `tailwind-theme.css:14`) that currently fails to paint (R4 computed-style measurement: ring color = `currentColor`). No component API changes; `IconButtonProps`, `buttonVariants`, `BadgeProps` signatures unchanged.

Mechanism note for the implementer (do not re-litigate, just context): the emitted production CSS contains `outline-style:solid` / `outline-width:2px` / `outline-offset:2px` rules for the same class chains but NO `outline-color` declaration resolving the token, so `outline-color` computes to its initial value (`currentColor`). The component recipes that spell the ring out in plain CSS (`.qar-react-list-row:focus-visible` → `outline: 2px solid var(--qa-react-focus)`, `index.css:2304-2308`) were keyboard-verified by R4 — the fix applies the same direct-token idea in utility form. The paren form does not match the `check:design` arbitrary-utility regex (`qar:...-[...]` brackets) and passes `check:ui-patterns` (raw-controls only) and `cn()`/tailwind-merge (unknown classes are preserved).

- [ ] **Step 1: Record the pre-fix state (reproduce-or-close gate)**

With the dev server on 5173 (`mise run dev` or the harness `qa-dev`), in a VISIBLE browser tab at `http://127.0.0.1:5173/#/s/1` (shared profile — do NOT clear site data), run via evaluate:

```js
const btn = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Open navigation')
const token = getComputedStyle(document.documentElement).getPropertyValue('--qa-react-focus').trim()
btn.focus()
// :focus-visible needs keyboard focus: send real Tab keypresses from the page body
// until btn.matches(':focus-visible') (OMP tab bridge key send, or DevTools focus+
// keyboard). Then:
;[document.activeElement.matches(':focus-visible'), getComputedStyle(document.activeElement).outlineColor, token]
```

Expected pre-fix: `[true, "rgb(...)" <text color, not the token>, token]`. Record the three values.
**Branch:** if `outlineColor` already equals the token's rgb() in all of light/sepia/dark (set `document.documentElement.dataset.theme` per theme and re-read), the defect does not reproduce at your HEAD — record that, make NO code change, and close the task as not-reproduced. Otherwise continue.

- [ ] **Step 2: Record the pre-fix build gap**

Run: `mise run build:ui && grep -o 'outline-color:var(--qa-react-focus)' dist/assets/*.css | sort | uniq -c`
Expected pre-fix: no output (zero occurrences) — this is the emission gap. Keep the output for the task report.

- [ ] **Step 3: Swap the utility at all nine occurrences**

Replace the class token `qar:focus-visible:outline-focus` with `qar:focus-visible:outline-(--qa-react-focus)` in exactly these strings (each is a single-line className string; everything else in the line is unchanged):

`src/components/ui/button.tsx:8`:
```ts
  'qar:inline-flex qar:min-h-11 qar:items-center qar:justify-center qar:gap-2 qar:border qar:border-border qar:px-4 qar:py-2 qar:font-ui qar:text-sm qar:font-medium qar:transition-colors qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-(--qa-react-focus) qar:disabled:pointer-events-none qar:disabled:opacity-55',
```

`src/components/ui/icon-button.tsx:15`:
```ts
        'qar:inline-flex qar:min-h-11 qar:min-w-11 qar:items-center qar:justify-center qar:rounded-control qar:border qar:border-border qar:bg-surface qar:text-text qar:transition-colors qar:hover:border-accent qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-(--qa-react-focus) qar:disabled:pointer-events-none qar:disabled:opacity-55',
```

`src/components/ui/disclosure.tsx:16`:
```ts
        className="qar:w-full qar:cursor-pointer qar:text-left qar:text-sm qar:font-medium qar:text-text qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-(--qa-react-focus)"
```

`src/components/ui/form-controls.tsx:12` (fieldClass):
```ts
  'qar:min-h-11 qar:w-full qar:rounded-control qar:border qar:border-border qar:bg-surface qar:px-3 qar:py-2 qar:font-ui qar:text-sm qar:text-text qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-(--qa-react-focus) qar:disabled:opacity-55'
```

`src/components/ui/form-controls.tsx:155` (checkbox indicator):
```ts
          'qar:flex qar:size-5 qar:items-center qar:justify-center qar:rounded-control qar:border qar:border-border qar:bg-surface qar:text-surface qar:data-[state=checked]:bg-accent qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-(--qa-react-focus)',
```

`src/components/ui/form-controls.tsx:186` (switch):
```ts
          'qar:relative qar:inline-flex qar:min-h-11 qar:min-w-11 qar:items-center qar:justify-center qar:rounded-control qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-(--qa-react-focus)',
```

`src/components/ui/form-controls.tsx:221` (slider thumb):
```ts
          className="qar:block qar:size-5 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:shadow-sm qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-(--qa-react-focus)"
```

`src/components/ui/menus.tsx:122`:
```ts
            className="qar:flex qar:min-h-9 qar:items-center qar:gap-2 qar:rounded-control qar:px-3 qar:text-left qar:text-sm qar:text-text qar:hover:bg-canvas qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-(--qa-react-focus)"
```

`src/components/ui/feedback.tsx:17` (Badge warning tone — same defect class, `qar:border-focus` → explicit token):
```ts
          'qar:border-(--qa-react-focus) qar:text-text': tone === 'warning',
```

- [ ] **Step 4: Confirm emission in the built CSS**

Run: `mise run build:ui && grep -o 'outline-color:var(--qa-react-focus)' dist/assets/*.css | sort | uniq -c && grep -o 'border-color:var(--qa-react-focus)' dist/assets/*.css | sort | uniq -c`
Expected: first grep ≥ 1 occurrence (one rule serves all `focus-visible:outline-(...)` chains); second grep ≥ 1 occurrence (Badge warning string is scanned from `src/components/ui/ui.stories.tsx` under `@source "../../../src"`). **Fallback if either is 0:** the paren shorthand failed to emit — switch that occurrence to bracket form `qar:focus-visible:outline-[var(--qa-react-focus)]` (or `qar:border-[var(--qa-react-focus)]`), add it to `src/design-system/docs/measured-layout-allowlist.json` `allowedArbitraryUtilities` with reason `"Focus ring token emits only via explicit var reference; theme-indirection utility does not paint."`, and re-run this step.

- [ ] **Step 5: Run the gates**

Run: `mise run check && env -u CI mise run smoke`
Expected: `static checks passed`; smoke `2/2` (focus styling is asserted nowhere in specs — charter excludes computed style — so this is a no-regression run over reader/search/settings).

- [ ] **Step 6: Post-fix computed-style probe across themes (manual, per charter)**

Repeat Step 1's probe at `#/s/1` for `data-theme` = `light`, `sepia`, `dark` (set via settings UI or `document.documentElement.dataset.theme`):

```js
;[...['light','sepia','dark'].map((t) => {
  document.documentElement.dataset.theme = t
  return [t, getComputedStyle(document.documentElement).getPropertyValue('--qa-react-focus').trim()]
})]
// with the target button still :focus-visible:
getComputedStyle(document.activeElement).outlineColor
```

Expected: for each theme, `outlineColor` equals the theme's token rgb() (light `rgb(120, 89, 46)`, sepia `rgb(129, 92, 43)`, dark `rgb(212, 162, 83)`). Record the three pairs in the task report. Restore the original theme afterwards.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/icon-button.tsx src/components/ui/disclosure.tsx src/components/ui/form-controls.tsx src/components/ui/menus.tsx src/components/ui/feedback.tsx
git commit -m "fix: resolve primitive focus ring to the focus token"
```

---

### Task 4: `#/search` stale-async URL rewrite — fix + URL-contract tripwire

**Files:**
- Modify: `src/components/search/useSearchRouteState.ts:255-257` (async continuation guard) and `:765-775` (`writeSearchHashState` surface guard)
- Modify: `tests/e2e/core-smoke.spec.ts` (extend the existing search leg)

**Interfaces:**
- Consumes: `REACT_ROUTES.search` (`'#/search'`, `src/app/router/routes.ts:9`) — already imported in `useSearchRouteState.ts`; `readyRef` (set false by the pack-effect cleanup on unmount, `useSearchRouteState.ts:165-167`).
- Produces: the URL invariant "nothing may `replaceState` a `#/search*` hash while `window.location.hash` is not `#/search*`", consumed by the extended smoke spec (URL assertions only — charter-clean). No change to `SearchHashState`, `readSearchHashState`, `applyHashState`, or the `onHashChange` ignore rule for non-search hashes.

Racing writer (verified in source): `submitSearch`'s `askPreview().then(...)` (`useSearchRouteState.ts:253-301`) checks only `sequence !== requestSequence.current`. When the user leaves `#/search` (e.g. opens a result in the reader, or a launch-restore/settings rewrite swaps the hash), `SearchRoute` unmounts — the pack-effect cleanup flips `readyRef.current = false` but does NOT bump `requestSequence` — so a still-in-flight `askPreview` resolves later, passes the sequence check, and calls `writeSearchHashState({...})` (`:277`), which unconditionally runs `window.history.replaceState(null, '', '#/search?q=…')` (`:765-775`) — rewriting the address bar while the reader is rendered. Reload/back-forward is then broken. `writeSearchHashState`'s existing `window.location.hash === nextHash` check only prevents redundant writes, never stale ones. All synchronous call sites (`:205`, `:248`, `:574`, `:586`, `:599`, `:616`) run while the search route owns the hash (user actions on the search page, the restore effect while mounted, or `applyHashState` from `onHashChange` which already ignores non-search hashes) — so a current-hash surface guard cannot break any legitimate write.

- [ ] **Step 1: Reproduce pre-fix via the manual race probe (browser-timing-dependent — this is the regression proof of record)**

On the dev server at 5173, in a VISIBLE tab (shared profile; never clear site data):
1. Go to `#/search`, wait for the sr-only status to read `Search data is ready on this device.`
2. Type `mercy of the worlds` into the search box and press Enter.
3. IMMEDIATELY (before the status leaves "Searching") click `Open navigation` (accessible name), then the `Al-Baqarah` row — arriving at `#/s/2`.
4. Watch `window.location.hash` for 5 seconds (evaluate poll or the address bar).

Expected pre-fix: the hash flips to `#/search?q=mercy%20of%20the%20worlds` while the reader renders. Record the flip. If three attempts never flip (race lost), record that too — the code-level race above still justifies the guard; note "repro attempted, not observed" in the report.

- [ ] **Step 2: Add the unmount bail to the async continuation**

In `src/components/search/useSearchRouteState.ts`, in the `askPreview(...).then((preview) => {` block, make the first two lines:

```ts
        .then((preview) => {
          if (sequence !== requestSequence.current) return
          // Unmounted (route left) or pack torn down: a late preview must not
          // touch hash or state.
          if (!readyRef.current) return
```

(Insert only the comment + `if (!readyRef.current) return` — line 256's sequence check already exists.)

- [ ] **Step 3: Add the surface guard to the hash writer**

Replace the body opening of `writeSearchHashState` (lines 765-775) so the function reads:

```ts
function writeSearchHashState(state: SearchHashState): void {
  if (typeof window === 'undefined') return
  // Stale async continuations (an in-flight askPreview resolving after the
  // user left #/search) must never reclaim the address bar: only write while
  // the search route still owns the current hash. Synchronous callers all run
  // on the search surface; the settings overlay preserves the search base
  // hash, and onHashChange already ignores non-search hashes.
  if (window.location.hash.split('?')[0] !== REACT_ROUTES.search) return
  const params = new URLSearchParams()
  if (state.query?.trim()) params.set('q', state.query.trim())
  if (state.tab && state.tab !== 'overview') params.set('tab', state.tab)
  if (state.selectedResultId) params.set('selected', state.selectedResultId)
  const nextHash = params.toString() ? `${REACT_ROUTES.search}?${params.toString()}` : REACT_ROUTES.search
  if (window.location.hash === nextHash) return
  window.history.replaceState(null, '', nextHash)
}
```

- [ ] **Step 4: Extend the smoke journey with the URL contract (journey tripwire — deterministic-green, charter-clean; the race itself stays covered by Step 1's probe)**

In `tests/e2e/core-smoke.spec.ts`, inside the existing test, append after the settings-close assertion (currently the last lines `await expect(page.getByRole('heading', { name: 'Verse settings' })).toHaveCount(0)`):

```ts
  // Defect-inventory §9: after leaving #/search the URL must stay on the
  // destination — a stale async search write may never reclaim it. The settle
  // window re-assertion is the durable tripwire; the race itself is verified
  // by a manual probe (browser-timing-dependent).
  await page.goto('/#/search')
  await expect(page.getByRole('status')).toContainText('Search data is ready')
  await page.getByLabel('Search Quran text, translation, or context').fill('mercy')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/search\?q=mercy$/)
  await page.getByRole('button', { name: 'Show all matches' }).click()
  await page.getByRole('button', { name: 'Open 1:1 in Reader' }).first().click()
  await expect(page).toHaveURL(/#\/s\/1(\/1)?$/)
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await page.waitForTimeout(1_200)
  await expect(page).toHaveURL(/#\/s\/1(\/1)?$/)
```

Asserted contracts: search-ready status content (accessible status region), input accessible name (pre-existing), URL shapes only. No CSS/DOM-shape assertions. The strings `Show all matches` (`SearchAnswerPreview.tsx:119`, `SearchWorkspace.tsx:285`) and `Open 1:1 in Reader` (`SearchResultCard.tsx:26` label `Open ${card.refLabel} in Reader`) are existing accessible names verified by the R4 journey.

- [ ] **Step 5: Run the smoke suite**

Run: `env -u CI mise run smoke`
Expected: `2/2` passed (desktop-smoke + mobile-smoke), including the new leg in both projects. Each project runs a fresh context, so the search pack downloads per run — the `toContainText('Search data is ready')` wait covers pack install before Enter.

- [ ] **Step 6: Run static gates**

Run: `mise run check && mise run build:ui`
Expected: `static checks passed`; build succeeds. (`mise run offline` not required — no SW/offline change.)

- [ ] **Step 7: Post-fix manual probes**

Probe A (race): repeat Step 1 exactly. Expected: hash stays `#/s/2` for the full 5-second window; record it.
Probe B (settings-over-search regression, protects the S-P4/S-D2 invariant): at `#/search?q=mercy` with results visible, open `#/settings`, then `Close settings`. Expected: URL returns to `#/search?q=mercy` and the search results are intact.
Probe C (back/forward): run the search, click `Open 1:1 in Reader`, then one `history.back()`. Expected: lands on `#/search?q=mercy` (the pre-navigation entry was not replaced by a stale write).

- [ ] **Step 8: Commit**

```bash
git add src/components/search/useSearchRouteState.ts tests/e2e/core-smoke.spec.ts
git commit -m "fix: stop stale search writes from reclaiming the URL"
```

---

### Task 5 [DECISION-GATED — user approval required]: Surahs page search/filter over 114 items

**Status:** NOT scheduled. Spec §10 / defect-inventory §7 record this as a user decision (feature, not defect). **Recommendation: approve** — the composition cost is low because the machinery already exists: `SurahList` accepts `query?: string` and `filter?: 'all' | 'recent'` and already implements name/name_ar/surah-number/verse-count/ref parsing (`src/components/navigation/SurahList.tsx:10-11`, `:150-181`); the navigation drawer already composes that path with a search input, while the `#/surahs` page renders `SurahList` bare (`src/app/routes/navigation/SurahsRoute.tsx:8-13`) — 114 unfiltered rows. Approving closes a real usability gap on a core surface with zero new primitives.

If approved, execute in this order (design dimensions belong to the director seat; the implementer never invents them):

- [ ] **Step 0 (gated): one-shot ui-director addendum — single dispatch, self-contained bundle**

Dispatch `ui-director` ONCE with everything needed for a complete brief, instructing it to write `docs/superpowers/specs/ui/2026-09-09-addendum-surahs-filter.md`: (a) task: design the search/filter affordance for the `#/surahs` page; (b) current state: `SurahsRoute` → `NavigationPageRecipe` (single h1 "Surahs", 1240px-capped content band) → bare `SurahList` (ListRow rows, `aria-current` for the open surah, `meta` like "285 verses" / "Last reached 2:37"); drawer precedent composes the same list with a search Input; (c) available primitives (registry): `Input` (`form-controls.tsx`, min-h-11), `SegmentedControl`, `Badge`, `ListRow`, `Status`, `Button`; tokens only from `--qa-react-*` (no additions unless proposed with values for light+sepia+dark); (d) questions to decide: input placement (page header vs sticky under chrome), placeholder/label copy, empty-query behavior, All/Recent filter presence, jump-to-number semantics (Enter opens `#/s/N`?), empty/no-result state (Status tone+copy), mobile 375×812 behavior, and which storybook states to add; (e) constraints: 44px targets, keyboard path, themes+night, reduced motion, durable-test charter (any spec additions may assert roles/names/URLs only). Later steps read the written brief; the director is never re-consulted.
- [ ] **Step 1 (gated): implementer applies the brief** — `Files: src/app/routes/navigation/SurahsRoute.tsx`, `src/components/navigation/SurahList.tsx` (only if the brief moves filter state), `src/components/navigation/navigation.stories.tsx`, plus whatever the brief names. Verification: `mise run check && mise run build:ui && env -u CI mise run smoke`; manual browser pass at 1280×900 + 375×812 × light/sepia/dark per `skill://ui-verify`; K2.6 re-render of the touched surface; commit `feat: surahs page search filter (brief 2026-09-09-addendum-surahs-filter)` with explicit paths. (Exact code is intentionally not pre-written here — it must come from the approved brief, not this plan.)

If declined: record the decision beside defect-inventory §7; nothing lands.

---

### Task 6 [DECISION-GATED — user approval required]: Reader chrome icon semantics (wird vs reading-view book glyphs)

**Status:** NOT scheduled. Defect-inventory §7/§9 record the ambiguity; the inventory explicitly deferred icon distinctness to a director addendum "if the implementer needs it" — it was never written. **Recommendation: approve a single icon-semantics addendum** — the chrome's right cluster carries two adjacent book-silhouette glyphs that read as near-identical at 15–24px: the wird status indicator (lucide `BookOpen` size 15 inside `qar-reader-chrome-wird-core`, `src/components/reader/wird/ReaderWirdStatusIndicator.tsx:24`; `Check` when complete) and the reading-view toggle's custom open-book `OpenMushafGlyph` (`src/components/reader/ReadingViewToggle.tsx:4-19`), with bookmark affordances using lucide `Bookmark` elsewhere (`VerseNumber.tsx:31` 13px, `MushafPageViewer.tsx:543` 17px). Both chrome controls carry tooltips, so the fix is purely visual semantics — no a11y-name changes, hence no durable-spec impact.

If approved:

- [ ] **Step 0 (gated): one-shot ui-director addendum — single dispatch, self-contained bundle**

Dispatch `ui-director` ONCE, instructing it to write `docs/superpowers/specs/ui/2026-09-09-addendum-chrome-icons.md`: (a) task: pick distinct glyph semantics for the reader/Mushaf chrome cluster (wird status, view toggle, and how bookmark affordances relate); (b) current state with file:line cites as above, plus `ReaderChrome.tsx:66-90` (right cluster composition: `wirdStatus` → `ReadingViewToggle` → settings gear) and lucide-react as the only icon source (registry `icon-button` dependencies `icons: ["lucide-react"]`); (c) constraints: existing accessible names (`Open navigation`, `Switch to Mushaf view`/`Switch to Verse view`, wird label, `Bookmark …`/`Remove bookmark for …`) must not change; sizes/stroke widths stay within current chrome rhythm (15–26px, strokeWidth 1.6–1.85); themes+night, 44px targets unchanged; no new tokens. The brief must state exactly which glyph each control gets (or explicitly keep-and-justify).
- [ ] **Step 1 (gated): implementer applies the brief** — `Files:` the two icon components the brief names (`ReaderWirdStatusIndicator.tsx` and/or `ReadingViewToggle.tsx`, imports from `lucide-react`). Verification: `mise run check && mise run build:ui && env -u CI mise run smoke` (no spec change — icon internals are excluded from the durable charter); manual visual pass on both viewports × themes; K2.6 re-render sign-off; commit `fix: distinct chrome icon semantics (brief 2026-09-09-addendum-chrome-icons)` with explicit paths.

If declined: record beside defect-inventory §7; the tooltips remain the disambiguator.

---

### Item 9 [DECISION-GATED — recommendation only, no UI task]: Verse-count tradition differences

**Disposition: recommend a separate data-side spec; do not schedule UI work.** Evidence: verse counts are consumed from the generated dataset `/dataset/surahs.json` as `counts: Record<Riwayah, number>` (`src/data/surah-index.ts:5-10`) and rendered per-riwayah (`surah.counts[riwayah]`, `SurahList.tsx:105`; `row.counts.qaloon`, `NavDrawer.tsx:101`) — e.g. R4 recorded "Surah 2 · 285 verses" under Qalun while the common Hafs count is 286. Any alignment work therefore changes `data/normalized/**` generation and validation under `scripts/data/**`, which spec §10 declares out of scope for the UI refactor ("datasets/catalog/taxonomy … escalates to the user"). Supporting evidence that divergence originates data-side: `FALLBACK_WIRD_COUNTS` (`NavDrawer.tsx:27-31`) hardcodes common counts (`{n:2,count:286}`) that disagree with the Qalun dataset (285) — that fallback mismatch is a candidate line-item for the same data spec, not for this plan. If the user wants cross-tradition alignment, open a new spec covering the dataset pipeline; if not, no action.

---

### No-action dispositions (recorded, with evidence)

- **Item 5 — Bookmarks section count badge: investigation CONTRADICTS the R4 visual note; the cutover already landed.** At HEAD, `src/components/navigation/BookmarksList.tsx:105-108` composes `<Badge tone="neutral">` with an sr-only `` `${list.length} bookmarks` `` span plus an `aria-hidden` numeral (role/name parity already present), and `HizbList.tsx:99-102` does the same for hizb groups. The Iteration-3 plan (`docs/superpowers/plans/2026-09-08-ui-iter-3-navigation.md` Task 7) retired `.qar-react-bookmarks-section-count`/`hizb-group-count`/marker mini-pills, and `grep -c 'section-count\|hizb-group-count\|juz-marker\|hizb-marker' src/design-system/index.css` returns 0. Audit command for whoever closes this plan: `grep -rn 'qar-react-bookmarks-section-count' src` → no matches. No task.
- **Item 6 — About "Fetch latest app" at the 375×812 fold: accepted per brief.** R4 measured top 766 / bottom 810 ≤ 812 after A-P2/A-P4; the destructive Clear-all stays below the fold. No task.
- **Item 10 — `.gitignore` uncommitted `+.agents/` line: user/harness territory.** Noted by the R4 report as "not made by this seat; left untouched". This plan never schedules it; whoever owns the working tree decides.

---

## Self-review

**Spec coverage:** Every enumerated item maps to a disposition: 1→Task 4; 2→Task 3; 3→Task 1 (plus same-class `card`/`list-row-actions`/`status`); 4→Task 2 (grep result recorded in the task); 5→no-action with contradicting evidence; 6→no-action accepted; 7→Task 5 gated with recommendation; 8→Task 6 gated with recommendation; 9→gated recommendation for a separate data spec (fallback-counts mismatch noted as data-side evidence); 10→note only. Invariants preserved: Task 4 guards the hash WRITER only — `resolveSettingsPreviousHash` and the `onHashChange` non-search ignore rule are untouched (Probe B explicitly re-verifies the settings-over-search base behavior).
**Placeholder scan:** Tasks 1–4 carry real code/strings/commands with expected outcomes; the only intentionally unspecified code is inside Tasks 5/6 Step 1, which is gated on an unapproved scope and must be authored from the director brief by design — the gated steps still name exact files, gates, verification, and commit format. No "TBD"/"similar to Task N" anywhere.
**Type consistency:** `writeSearchHashState(state: SearchHashState): void` signature unchanged; `REACT_ROUTES.search` reused (already imported in the hook); `readyRef` semantics match the pack-effect cleanup; spec code uses only existing accessible names verified in source (`Search Quran text, translation, or context`, `Show all matches`, `Open 1:1 in Reader`, `main` name "Verse reader"); Task 3's paren-utility form verified against all three guardrail scripts (`check:design` bracket regex, `check:ui-patterns` raw-controls, `check:registry` consumer boundaries) plus `cn()`/tailwind-merge passthrough, with an explicit bracket-form fallback path.
