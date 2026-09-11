# QuranAtlas Design Brief Addendum — #/surahs search & filter

**Status:** Director design brief (one-shot). Binding for the `ui-implementer` and `ui-visual-reviewer` seats.
**Date:** 2026-09-09 (addendum; user-approved 2026-09-11)
**Surface:** `#/surahs` route — `src/app/routes/navigation/SurahsRoute.tsx` composing `NavigationPageRecipe` + `SurahList`.
**Task:** Task 5 — add a search/filter affordance to the Surahs page.

---

## 1. Evidence base

Static inspection of the current tree (no live-UI pass needed; the change is compositional, not pixel-novel):

- `src/app/routes/navigation/SurahsRoute.tsx:8-13` — renders a bare `<SurahList onNavigate={…} />` inside a `qar:max-w-page` wrapper. No search UI.
- `src/components/navigation/SurahList.tsx` — already accepts `query?: string` and `filter?: 'all' | 'recent'` (`:10-11`) and implements name / `name_ar` / surah-number / verse-count / `n:v` reference parsing internally (`:150-181`, `parseSurahQuery` / `filterSurahs` / `getSearchHint`). Empty-result state already exists: `<Status title="No surahs match your search." tone="info" />` (`:87-89`). Search hint already exists as a `role="status"` line (`:92-98`).
- `src/components/navigation/NavDrawer.tsx:68-71, 150-160, 385-429` — the drawer composes the **same** `SurahList` with an `Input` + `SegmentedControl` and local state. This is the existing, approved pattern; the page adopts it.
- `src/components/ui/form-controls.tsx` — `Input` (slots `label`/`input`, `prefix` node, `hideLabel`) and `SegmentedControl` (radio group, `label`-driven accessible names, registry `segmented-control`).
- `src/design-system/index.css:1710-1756` — the drawer search-field layout classes (`qar-react-nav-drawer-source-search`, `-search-input`, `-search-icon`) are plain token-based flex layout, top-level in `qa-react-components` layer (not scoped under a drawer ancestor) — safe to reuse outside the drawer.
- `src/components/search/useSearchRouteState.ts:712-736` — the app's route-state precedent: hash query params on the route (`#/search?q=…`), `history.replaceState` writes, `hashchange` listener for external edits, base-path guard on every read/write.
- `src/app/router/routes.ts:35` — `matchReactRoute` strips `?…` before matching, so `#/surahs?q=…` already matches the `surahs` route. No router change needed.
- `tests/e2e/core-smoke.spec.ts:14, 35` — the smoke suite asserts URLs and already tolerates/asserts query params (`#/search(?:\?.*)?$`, `#/search?q=mercy`). No smoke assertion covers `#/surahs` today.
- `src/continuity/launch-restore.ts` — `shouldPersistLastSurface` exact-matches `#/surahs`; a parameterized `#/surahs?q=…` hash does not persist as `lastSurface`. Accepted (see Open items).

---

## 2. Decision summary

Change is needed. The Surahs page gains a two-control toolbar — search `Input` + All/Recent `SegmentedControl` — above the existing `SurahList`, with **URL-driven** query/filter state. `SurahList` itself is **not modified**; `NavDrawer` is **not modified**; no design-system CSS, token, or registry changes.

---

## 3. State ownership: URL-driven (decided)

**Decision: the query and filter are URL-driven hash params on `#/surahs`**, following the `useSearchRouteState` precedent, not local component state.

Rationale: the app has exactly one precedent for page-level ephemeral state and it is the URL (`#/search?q=…`, asserted by the smoke suite); the drawer uses local state because it is transient chrome, which does not apply to a page. URL state makes a filtered list restorable on reload, shareable, and honest with the smoke suite's URL assertions. The router already tolerates params on `#/surahs`.

### 3.1 New hook: `src/app/routes/navigation/useSurahsRouteState.ts` (new file)

Mirror the read/write shape of `useSearchRouteState.ts:712-736`, reduced to this route's two params. Export exactly:

```ts
export type SurahsFilter = 'all' | 'recent'
export type SurahsRouteState = {
  query: string
  filter: SurahsFilter
  setQuery: (query: string) => void
  setFilter: (filter: SurahsFilter) => void
}
export function useSurahsRouteState(): SurahsRouteState
```

Internal helpers (private to the file, matching the search-route function names/shape):

- `readSurahsHashState(hash = window.location.hash): { query: string; filter: SurahsFilter }`
  - Base path is `hash.split('?')[0]`; if it is not `REACT_ROUTES.surahs`, return `{ query: '', filter: 'all' }`.
  - Parse the substring after the first `?` with `URLSearchParams`.
  - `query` = `params.get('q')` trimmed; empty → `''`.
  - `filter` = `'recent'` iff `params.get('filter') === 'recent'`, else `'all'`. Unknown values fall back to `'all'`.
- `writeSurahsHashState(state: { query: string; filter: SurahsFilter }): void`
  - Guard: return unless `window.location.hash.split('?')[0] === REACT_ROUTES.surahs` (stale async continuations must never reclaim the address bar — same guard as `writeSearchHashState`).
  - Set `q` only when `query.trim()` is non-empty (write the trimmed value); set `filter` only when `'recent'`. Omit defaults so the clean hash is exactly `#/surahs`.
  - Build `#/surahs` or `#/surahs?<params>`; if equal to the current hash, return.
  - Write with `window.history.replaceState(null, '', next)` — **never** `location.hash =` (no history entries per keystroke, no `hashchange` self-loop).

Hook behavior:

- Initial state from `readSurahsHashState()` via a `useState` initializer (same as `useSearchRouteState.ts:92-93`).
- `setQuery` / `setFilter` update React state **and** call `writeSurahsHashState` with the next pair, synchronously.
- A `useEffect` `hashchange` listener: on every event, if the base path is `#/surahs`, re-read and, when different from current state, apply it (covers manual URL edits and in-page hash links). `replaceState` fires no `hashchange`, so own writes cannot loop.
- No debounce: the filter runs over 114 in-memory rows and `replaceState` is cheap.

### 3.2 SurahList: unchanged

`SurahList` stays exactly as-is — props contract, parsing, hint, empty state, and its `qar-react-nav-drawer-*` list/hint classes are all reused untouched. The route passes `query`, `filter`, `recentSurahs`, and `onNavigate`.

### 3.3 Recent data for the `recent` filter

`SurahsRoute` loads recent surahs itself (the drawer currently owns this for its own instance). On mount only:

```ts
let cancelled = false
void openReactDb()
  .then((db) => readRecentSurahs(db))
  .then((rows) => { if (!cancelled) setRecentSurahs(rows) })
  .catch(() => { if (!cancelled) setRecentSurahs([]) })
return () => { cancelled = true }
```

Imports: `openReactDb` from `src/storage/db`, `readRecentSurahs` + `RecentSurahPosition` type from `src/continuity/recent-surahs` (same imports as `NavDrawer.tsx:8-9`). A DB failure degrades to an empty recents list; the `Recent` segment then shows the existing empty state. `riwayah` is **not** passed — `SurahList`'s `'qaloon'` default is kept, matching the drawer's composition which also omits it.

---

## 4. Exact files to change

| File | Change |
|---|---|
| `src/app/routes/navigation/useSurahsRouteState.ts` | **New.** Hook per §3.1. |
| `src/app/routes/navigation/SurahsRoute.tsx` | **Edit.** Compose toolbar + `SurahList` per §5; load recents per §3.3; Enter-to-jump per §6. |
| `src/components/navigation/navigation.stories.tsx` | **Edit.** Add the two stories in §8. |

Explicitly **not** changed: `SurahList.tsx`, `NavDrawer.tsx`, `src/design-system/index.css`, `src/design-system/tokens/**`, `component-registry.json` (SurahsRoute has never been a registered component — routes are unregistered except the historical `about-route`; this addendum does not add one), `src/app/router/routes.ts`, `src/continuity/launch-restore.ts`, all e2e specs.

---

## 5. Target composition (exact)

`SurahsRoute.tsx` renders:

```tsx
<NavigationPageRecipe title="Surahs">
  <div className="qar:mx-auto qar:grid qar:w-full qar:max-w-page qar:gap-3">
    <div className="qar:grid qar:gap-2">
      <Input
        autoComplete="off"
        className="qar-react-nav-drawer-search-input"
        hideLabel
        label="Search surah by name, number, or verse reference"
        labelClassName="qar-react-nav-drawer-source-search"
        maxLength={20}
        onChange={(event) => setQuery(event.currentTarget.value)}
        onKeyDown={handleSearchKeyDown}
        placeholder="Search by name, number, or 2:255"
        prefix={
          <SearchIcon
            aria-hidden="true"
            className="qar-react-nav-drawer-search-icon"
            size={15}
            strokeWidth={1.7}
          />
        }
        type="search"
        value={query}
      />
      <SegmentedControl
        label="Surah filter"
        onValueChange={(next) => setFilter(next as SurahsFilter)}
        options={[
          { label: 'All', value: 'all' },
          { label: 'Recent', value: 'recent' },
        ]}
        value={filter}
      />
    </div>
    <SurahList
      filter={filter}
      onNavigate={(hash) => {
        window.location.hash = hash
      }}
      query={query}
      recentSurahs={recentSurahs}
    />
  </div>
</NavigationPageRecipe>
```

Composition notes (all deliberate):

- **Reuse of drawer classes is intentional.** `qar-react-nav-drawer-source-search` (flex row, 8px gap), `-search-input` (`flex: 1`, `min-width: 0`, 44px min-height via `--qa-react-control-touch-target`), and `-search-icon` (muted color, `flex: 0 0 auto`) are the existing, token-based layout for an icon-prefixed `Input`. They live unscoped in `src/design-system/index.css` and are reused as-is; no new CSS is written and the names are **not** renamed (out of scope). Do not wrap the controls in `qar-react-nav-drawer-source-tools` or `-source-filter` — those carry drawer-specific padding and full-width segment stretch.
- **SegmentedControl renders at natural inline-flex width**, left-aligned under the input — no stretch wrapper. Two short options never approach the 375px content width; at 1280px a full-width two-option segment would read as a broken table.
- **Layout is a single vertical stack at every viewport**: search input (full width of the capped column), then the segmented control, then the list. Wrapper gaps: outer `qar:gap-3` (12px) between toolbar and list, inner `qar:gap-2` (8px) between input and segments — matching the drawer's `source-tools` 8px rhythm. The `qar:max-w-page` cap and recipe gutters (`px-5`) are unchanged, so 1280×900 and 375×812 need no breakpoint rules.
- `SearchIcon` is `lucide-react`'s `Search`, imported in the route file exactly as `NavDrawer.tsx:2` does (`import { Search as SearchIcon } from 'lucide-react'`). lucide is already a dependency of feature code in this family.

---

## 6. Interaction details

- **Typing:** every keystroke calls `setQuery`, which filters the list live (114 rows, synchronous) and updates the URL via `replaceState`. The browser Back button never steps through intermediate queries.
- **Enter on a reference:** `handleSearchKeyDown(event)` — if `event.key === 'Enter'`, parse the trimmed query against `/^(\d{1,3})\s*:\s*(\d{1,3})$/` (a small private `parseRefQuery` in the route file, the same shape as `NavDrawer.tsx:456` `parseQueryRef`); on a match, `event.preventDefault()` and `window.location.hash = `#/s/${surah}/${verse}``. Otherwise Enter is a no-op. Bounds are not clamped here — `matchReactRoute` already clamps (`routes.ts:37-46`), same as the drawer path. This keeps `SurahList`'s existing hint ("Press Enter to jump to {name} {verse}") truthful on the page.
- **Clear/reset:** clearing relies on the native `type="search"` affordance (as the drawer does) — **no custom clear button**. Clearing the field sets `q` absent, so the URL returns to exactly `#/surahs` (or `#/surahs?filter=recent`). The filter segment is independent and persists until the user changes it; there is no combined "reset all" control.
- **Filter switching:** selecting a segment calls `setFilter` immediately; `all` is the default and is omitted from the URL; `recent` writes `?filter=recent`. Selecting `Recent` with no recents (fresh install or DB failure) shows the existing `Status` "No surahs match your search." — accepted parity with the drawer today.
- **Reload / deep link:** loading `#/surahs?q=ya&filter=recent` restores both controls and the filtered list from the hash. `#/surahs?filter=bogus` selects `All`. `#/surahs?q=` is treated as bare `#/surahs`.
- **External hash edits:** editing the URL hash in place (same `hashchange` event path as the search route) updates the controls, per §3.1's listener.
- **Row navigation:** unchanged — `onNavigate` assigns `window.location.hash`, leaving the filter state behind in the URL only while on the page; navigating back to `#/surahs` fresh starts unfiltered (the bare hash carries no params).

### Accessibility (names an implementer must preserve)

| Control | Accessible name | Mechanism |
|---|---|---|
| Search input | "Search surah by name, number, or verse reference" | `Input` `label` + `hideLabel` (sr-only) — identical string to the drawer's field |
| Filter group | "Surah filter" | `SegmentedControl` fieldset `aria-label` |
| Segment options | "Surah filter: All" / "Surah filter: Recent" | `SegmentedControl` per-option `aria-label` (built into the primitive) |
| Search hint | live announcement | existing `role="status"` inside `SurahList` |
| Empty result | live announcement | existing `Status tone="info"` inside `SurahList` |

The drawer's "Surah filter" group and this page's group can co-exist in the DOM only while the drawer is open; both derive the radio `name` from the label. This is harmless: the drawer is modal (background hidden from AT), the page's radios are `sr-only` React-controlled inputs whose visuals come from React state (not `:checked`), and the drawer unmounts its content when closed. Do not "fix" this by inventing an `id`/`name` prop on `SegmentedControl`.

### Themes & motion

No new colors, tokens, or animations are introduced. Every visual is an existing primitive/token (`bg-surface`, `border-border`, `text-muted`, `--qa-react-focus` focus ring) and inherits light / sepia / dark correctly with zero theme-specific work. Reduced motion: nothing animates; no exceptions needed.

---

## 7. Responsive verification targets

- **375×812:** input spans the full content column (375 − 2×20px gutters); the segmented control sits below it at natural width, left-aligned; list rows unchanged. No horizontal overflow; both controls meet the 44px touch target (`Input` via `--qa-react-control-touch-target`, segments via `qar:min-h-11`).
- **1280×900:** the whole stack is capped at `--qa-react-page-max-width` and centered (`qar:mx-auto qar:max-w-page`); the segmented control does **not** stretch.

---

## 8. Stories (visual proof)

Append to `src/components/navigation/navigation.stories.tsx` (importing `SurahsRoute` from `src/app/routes/navigation/SurahsRoute`; the `AboutRoute` entry in `settings.stories.tsx` is the precedent for route components in component-folder story files):

```tsx
function WithHash({ hash, children }: { hash: string; children: ReactNode }) {
  window.location.hash = hash // synchronous, before the story body mounts and reads the hash
  return <>{children}</>
}

export const SurahsPage: Story = {
  render: () => (
    <WithHash hash="#/surahs">
      <SurahsRoute />
    </WithHash>
  ),
}

export const SurahsPageFiltered: Story = {
  render: () => (
    <WithHash hash="#/surahs?q=ya&filter=recent">
      <SurahsRoute />
    </WithHash>
  ),
}
```

Each story sets its own hash synchronously in render, so story order cannot leak state (the hook reads the hash only at mount). `SurahsPageFiltered` exercises the restored-from-URL path; with an empty storybook IndexedDB the `recent` filter yields the existing "No surahs match your search." empty state, which is itself a state worth reviewing. The hook's `hashchange` listener writes nothing in stories because `replaceState` only fires from user input.

---

## 9. Acceptance criteria (objectively verifiable)

1. `#/surahs` renders a search input with accessible name "Search surah by name, number, or verse reference" and a radiogroup "Surah filter" with options All/Recent, above the surah list, inside the `max-w-page` column.
2. Typing `ya` reduces the list to matching surahs and the address bar shows `#/surahs?q=ya`; no new history entry is created (Back does not step through keystrokes).
3. Typing `2:255` shows the existing hint "Press Enter to jump to Al-Baqarah 255" (role=status); pressing Enter navigates to `#/s/2/255`.
4. Typing a query with no matches shows the existing `Status` "No surahs match your search." (tone info).
5. Selecting **Recent** changes the URL to `#/surahs?filter=recent` and lists only recently read surahs (or the empty state when none exist). Selecting **All** removes the param.
6. Clearing the search field restores the URL to exactly `#/surahs` (or `#/surahs?filter=recent` when Recent is active) — no bare `?`, no empty `q=`.
7. Loading `#/surahs?q=ya&filter=recent` directly restores the query in the field, selects Recent, and shows the filtered list.
8. `#/surahs?filter=bogus` renders with **All** selected; `#/surahs?q=` behaves as bare `#/surahs`.
9. Editing the hash in place (e.g. adding `?q=adam`) while staying on the route updates the field and list without a reload.
10. At 375×812 there is no horizontal overflow and both controls are full touch height; at 1280×900 the segmented control is natural width (not stretched).
11. Light, sepia, and dark themes render the toolbar with no unthemed literals; no visual change to the drawer.
12. Both new stories render: `SurahsPage` (full list, empty field, All selected) and `SurahsPageFiltered` (q=ya, Recent selected, empty state with no recents).
13. `NavDrawer`'s surah search continues to work unchanged (its own local state, own URL-neutral behavior).

---

## 10. Open items (ambiguities resolved by the director)

No blockers; every item below is a decision I made and recorded, not a question.

1. **URL-driven over local state** — chosen for consistency with `#/search` route-state precedent, reload/share restore, and smoke-suite URL assertability. The drawer's local-state pattern was judged inapplicable to a page.
2. **Param names and omission rules** — `q` (matches `#/search`), `filter` with only `recent` serialized; defaults omitted so the clean URL is exactly `#/surahs`.
3. **Placeholder copy differs from the drawer** — the page uses "Search by name, number, or 2:255" instead of the drawer's "Search...", because the page lacks the drawer's surrounding tab context and a sr-only label is invisible to sighted users. The accessible label string stays identical to the drawer's.
4. **Drawer-prefixed CSS classes reused without rename** — `qar-react-nav-drawer-source-search` / `-search-input` / `-search-icon` are the existing token-based pattern; renaming them (and touching the drawer + CSS) is out of scope for this addendum.
5. **Radio-`name` collision with the drawer's "Surah filter" group** — analyzed and accepted (§6): drawer content unmounts when closed, is modal when open, and segment visuals are React-state-driven, so no user-observable effect. `SegmentedControl` is not modified.
6. **`SurahList` untouched, including the generic empty-state copy** — "No surahs match your search." also serves the no-recents case (drawer already ships this). Refining the copy per cause would change drawer behavior too; out of scope.
7. **Search hint keeps its drawer padding** (`0 16px 7px`) on the page — a ≤16px inline offset against the edge-aligned toolbar, only visible for reference/verse-count queries. Accepted to keep `SurahList` byte-identical across both surfaces.
8. **`riwayah` not threaded through** — `SurahList` defaults to `'qaloon'`; the drawer's composition also omits it. Verse-count filtering therefore uses Qaloon counts, matching the drawer.
9. **`launch-restore` not modified** — `shouldPersistLastSurface` exact-matches `#/surahs`, so a parameterized filtered hash is never persisted as `lastSurface`; restart restores the clean Surahs page (or the prior surface). This is the desired behavior, not a gap.
10. **Settings-overlay edge accepted** — opening settings from a filtered `#/surahs` and closing returns to bare `#/surahs` (App's hash state doesn't observe `replaceState`, so the preserved base hash carries no params). No fix; the query is one keystroke away and the same staleness exists for `#/search`.
11. **No debounce, no custom clear button, no result-count badge** — all judged unnecessary weight for a 114-row synchronous filter; `Badge` was considered for a match count and rejected (the list itself is the feedback).
12. **No registry entry for `SurahsRoute`** — routes are not registered components in `component-registry.json` (the historical `about-route` excepted); this addendum does not change registry conventions.
