---
surface: review
src_paths:
  - 'src/review/**'
  - 'src/edges/**'
owns_stores:
  - activationState
test_paths:
  unit:
    - 'tests/unit/review/**'
    - 'tests/unit/edges/**'
  e2e:
    - 'tests/e2e/journey-e-review*.spec.js'
---

# Surface: review

> Aggregations + filters over marks. Review hub (12-layer selector + group-by + value chips + flat card list), FVR (Filtered-Verse Review) deep-link layer-value pages. Future absorption: typo-merge review, orphan-edges filter, SRS queue, hifz dashboard, edge-clusters, atlas routes, semantic-graph view, compare mode, community/shared collections.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| AmbientDock Review glyph | tap | `#/review` → Review hub |
| `⌘K` → "Review hub" → Enter | keyboard | `#/review` |
| Drawer Study mode → Hub row | tap | `#/review` |
| Drawer Study mode → layer row | tap | `#/review?layer=<name>` |
| Tap thread chip on hub mark card | tap | `#/threads/<tag>` (FVR) |
| Direct deep-link `#/<layer>/:value` | URL | FVR for that layer + canonical value |
| FVR ← Marks button | tap | `#/review` (back to hub) |

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/edges/kinds.ts` | _(no leading comment)_ |
| `src/edges/store.ts` | _(no leading comment)_ |
| `src/review/Hub.svelte` | Props: layer + value are present when route is #/<layer>/:value (FVR) |
| `src/review/ReviewCard.svelte` | _(no leading comment)_ |
| `src/review/parse-layer-query.ts` | _(no leading comment)_ |
| `src/review/state.ts` | Review state persistence. |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

### Open the review hub

`#/review` → Hub renders: 12-layer selector segment (Thread active by default), group-by segment (Value / Surah / Date), value chips for active layer, sort dropdown, surah filter dropdown, mark cards for first 30 results.

### Switch layer + value chip

- Tap layer tab (e.g. **Audience**) → `activeLayer` switches, `activeValue` resets, value chips reload.
- Tap value chip (e.g. `muminin`) → `activeValue = 'muminin'`, card list filters to marks with that canonical value in audience layer. Tap same chip again → clear; all marks for layer shown.

Persistence: each tap writes `positions.review.activeLayer` / `activeValue`.

### Group-by bucket list

The "Group by" segment changes which bucket list the rail shows, **not** how cards are grouped. Cards always render as a flat, unique, single-column list sorted by most-recent update — no duplicates when a mark carries multiple values.

- Tap **Surah** segment → rail shows surah buckets; cards remain flat.
- Tap **Date** segment → rail shows month buckets; cards remain flat.
- Tap **Value** segment (default) → rail shows canonical values for active layer.

Persistence: `positions.review.groupBy`.

### Multi-value filter (desktop ≥1180 px, Value mode)

Tap value rail row → OR filter applied. Tap another → OR filter expands. Chip bar above cards shows active value chips with `×`. `Clear all` removes all filters. Surah and Date modes remain single-select. Mobile keeps chip strip + single-select.

Persistence: `positions.review.activeValue`.

### Tap thread chip → FVR

Tap thread chip on a mark card → browser navigates `#/threads/<tag>`. FVR renders: compact centered header (layer label "Thread", color dot, canonical value, `n verses · n surahs`, hairline) + flat list of mark cards for that thread value.

Persistence: `settings.lastSurface = #/threads/<tag>`, `positions.review.view = 'fvr'` (reset to `'all'` when hub entered directly via `#/review`).

### FVR via direct deep-link

- User navigates `#/people/Moses` → router passes `{ layer: 'people', value: 'Moses' }` to `Hub.svelte` → `validateLayerParam('people', 'Moses')` canonicalizes to `musa`.
- `getByLayerCanonical('people', 'musa')` fetches matching marks → FVR renders with layer label "People", value "musa".
- No marks for layer+value → "Not found" state, link back to `#/review`.
- `settings.lastSurface` persists as `#/people/musa` for session restore.

### Filter by value chip + surah

- Tap value chip in chip strip → filter chip appears in active-filters row; hub re-renders.
- Pick surah from surah dropdown → second filter chip → intersection.
- Tap × on chip → clears that filter; **Clear all** → both clear.

Desktop variant (≥1180 px): mobile chip strip + dropdowns replaced by sticky 220 px left rail (layer selector 12 rows + group-by segment + bucket rows). FVR (`#/<layer>/:value`) keeps centered no-rail layout at desktop.

## Data

<!-- AUTO-GENERATED:data-owned START -->
- `activationState`
<!-- AUTO-GENERATED:data-owned END -->

<!-- AUTO-GENERATED:data-read START -->
_(no cross-surface reads detected)_
<!-- AUTO-GENERATED:data-read END -->

### `activationState` store body

FVR session view-state: `activeLayer`, `activeValue`, `groupBy`, `sort`, `surahFilter`, `view ('all' | 'fvr')`. Persisted under key `'review'` so session restore returns to last hub configuration.

The review surface heavily reads `marks` (owned by `mark` dossier) via `getByLayerCanonical(layer, canonical)` index queries — see `mark` dossier §Typical queries.

## Events

<!-- AUTO-GENERATED:events-emit START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `edges:deleted` | `Events.EDGES_DELETED` | `src/edges/store.ts:107` |
| `edges:save-failed` | `Events.EDGES_SAVE_FAILED` | `src/edges/store.ts:68` |
| `edges:saved` | `Events.EDGES_SAVED` | `src/edges/store.ts:63`, `src/edges/store.ts:95` |
| `review:open` | `Events.REVIEW_OPEN` | `src/review/Hub.svelte:427`, `src/review/Hub.svelte:459` |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `db:visibility-visible` | `Events.DB_VISIBILITY_VISIBLE` | `src/review/Hub.svelte:465` |
| `sync:update-received` | `Events.SYNC_UPDATE_RECEIVED` | `src/review/Hub.svelte:461` |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- **Cards are flat, unique, single-column.** Group-by changes the rail, never duplicates a card across buckets.
- **`#/<layer>/:value` is the canonical FVR route.** Old `#/t/:tag` removed pre-release in commit `cb4e3a2`. Don't reintroduce a tag-only route.
- **Sole writer of `activationState['review']`: `review/Hub.svelte`** (or hub state module).

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (5):**

- `tests/unit/edges/kinds.test.ts`
- `tests/unit/edges/store.test.ts`
- `tests/unit/review/hub.test.ts`
- `tests/unit/review/parse-layer-query.test.ts`
- `tests/unit/review/state.test.ts`

**E2E (1):**

- `tests/e2e/journey-e-review.spec.js`
<!-- AUTO-GENERATED:tests END -->

## Deprecated

- **Pre-release (`cb4e3a2`, `3fec509`):** `#/t/:tag` FVR route removed. Old route dispatched `Hub.svelte` with a `tag` prop and filtered the threads layer only. Replaced by `#/<layer>/:value` scheme. Canonical route for same content: `#/threads/mercy`.
