---
surface: mark
src_paths:
  - 'src/mark/**'
  - 'src/mark/tag/**'
owns_stores:
  - marks
test_paths:
  unit:
    - 'tests/unit/mark/**'
    - 'tests/unit/mark/tag/**'
  e2e:
    - 'tests/e2e/mark/*.spec.js'
---

# Surface: mark

> Existing-mark editing and persistence. Review opens the deep TagSheet for saved marks, but the Reader no longer creates new marks from its primary per-verse actions.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| Review hub row | tap | `editor-bridge::openEditor(verseKey)` → deep TagSheet |
| Existing programmatic caller | passive | `openDeep(verseKey)` / `openEditor(verseKey)` → deep TagSheet |
| App boot → state restore | passive | hydrate marks indicators across visible reader |

Routes: no own route; deep TagSheet is a global overlay bridged via `tag/session-bridge.ts` / `editor-bridge.ts`.

Viewport-conditional: deep TagSheet renders full-screen <1180 px, right-side vertical panel ≥1180 px.

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/mark/VerseTagPanel.svelte` | Inline fast-path tag panel. Rendered inside the active verse under the |
| `src/mark/editor-bridge.ts` | Imperative bridge for opening the mark editor from vanilla-JS consumers. |
| `src/mark/indicator.ts` | Colored dot indicators on marked verses. |
| `src/mark/long-press.ts` | Svelte action: long-press on a verse element → open mark editor. |
| `src/mark/store.ts` | IDB CRUD for marks (v2 — 12-layer schema). |
| `src/mark/tag/TagChip.svelte` | Quickbar chip. Distinct from `marks/TagChip.svelte` (which drives deep sheet). |
| `src/mark/tag/TagSheet.svelte` | Deep tagging sheet. |
| `src/mark/tag/VerseSpotlight.svelte` | Dims reader + draws attention to focused verse. Fixed scrim w/ a "hole" |
| `src/mark/tag/session-bridge.ts` | Imperative bridge to begin a fast-path tagging session from a verse tap. |
| `src/mark/tag/sheet-bridge.ts` | Bridge for the deep TagSheet overlay (`tag/TagSheet.svelte`). Migrated |
| `src/mark/tag/state.svelte.ts` | Tag-session state (runes). Holds the live state for a single tagging |
| `src/mark/tags.js` | Tag palette, seed tags, and color resolution. |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

### Deep TagSheet (escalation)

- Reachable from Review hub rows and programmatic bridges (`editor-bridge::openEditor`, `tag/session-bridge::openDeep`).
- Mobile (<1180 px): full-screen sheet, sticky header + footer, safe-area insets, tap-collapsible verse-preview card (chevron).
- Desktop (≥1180 px): right-side panel, `min(560px, 44vw)`, same chevron preview-collapse.
- Header: "Mark verse" only (no `verseKey · SURAH` subline; ref lives on preview card).
- Body: no tab switcher. Four layer groups stack outer→inner: Speech (speaker, audience, quotedSpeaker, form) → Narrative (mode, tone) → Themes (threads, subjects) → Entities (events, people, places, divineNames). Each group has hue-colored left rail nesting its rows. Hashtag-style chips (`#value` with `#` colored by layer hue); tap chip to remove; underline combobox per row for type-to-create with seed suggestions.
- Route changes close the deep TagSheet before the next surface renders so the editor cannot cover unrelated pages.
- Delete: button renders only for existing marks. First tap → inline confirm row (`Delete this mark? [Keep] [Delete]`). Second tap on solid red → commit + undo toast. Closing sheet resets pending confirm.

### Save / persistence

- `marks/store.ts::save()` takes `MarkInput` (raw layer arrays, no `_canon`).
- Computes `_canon` via `core/normalize.ts::canonicalize()` per label.
- `put`s record (preserves `createdAt`, refreshes `updatedAt`).
- Emits `MARKS_SAVED` with `{ verseKey, tags }` (canonical keys union across 12 layers).
- Calls `broadcastMarkChange([verseKey])` — peer tabs receive `SYNC_UPDATE_RECEIVED` and re-read.

### Delete with undo

- `marks/store.ts::del()` writes, emits `MARKS_DELETED`, broadcasts.
- Sheet closes → undo toast (~5 s).
- Tap **Undo** → mark restored with original note + tags → gold edge returns.

### Reader indicator

- `marks/indicator.ts` listens to `MARKS_SAVED` / `MARKS_DELETED` and updates the gold left-edge on `.qa-verse[data-verse-key=…]`.

## Data

<!-- AUTO-GENERATED:data-owned START -->
- `marks`
<!-- AUTO-GENERATED:data-owned END -->

<!-- AUTO-GENERATED:data-read START -->
_(no cross-surface reads detected)_
<!-- AUTO-GENERATED:data-read END -->

### `marks` store body

- **keyPath:** `verseKey` (string, e.g. `'2:255'`).
- **DB_VERSION:** 2 (v1 → v2 dropped and recreated; no migration; pre-release).
- **Indexes:** `by-canon-{threads,subjects,audience,speaker,quotedSpeaker,mode,form,tone,people,places,events,divineNames}` on each `_canon.<layer>` (multiEntry); `by-updated` on `updatedAt`.
- **Validated fields (all required):** `verseKey: string`, 12 layer fields (`string[]`), `_canon: Record<LayerName, string[]>`, `note: string`, `createdAt: number`, `updatedAt: number`. Types in `src/core/db/types.ts` (`MarkRecord`, `LayerName`, `LAYER_NAMES`).
- **Sole writer:** `src/mark/store.ts`. External callers NEVER populate `_canon` — it is computed inside the writer.

```ts
{
  verseKey: string,
  threads: string[], subjects: string[], audience: string[],
  speaker: string[], quotedSpeaker: string[],
  mode: string[], form: string[], tone: string[],
  people: string[], places: string[], events: string[], divineNames: string[],
  _canon: Record<LayerName, string[]>,  // computed inside save(); callers must not set
  note: string,
  createdAt: number,
  updatedAt: number,
}
```

#### Typical queries

- All marks: `getAll()` → `store.getAll()`.
- One mark: `getByVerseKey(verseKey)` → `store.get(verseKey)`.
- By layer canonical (FVR deep link / filter): `getByLayerCanonical(layer, canonical)` → `index('by-canon-<layer>').getAll(canonical)`.
- All canonical values for a layer: `getAllCanonicalValues(layer)` — key-only cursor scan.
- By recency: hub sorts in-memory after `getAll()`; `by-updated` index available if cursor-based fetch needed.

## Events

<!-- AUTO-GENERATED:events-emit START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `marks:deleted` | `Events.MARKS_DELETED` | `src/mark/store.ts:113` |
| `marks:save-failed` | `Events.MARKS_SAVE_FAILED` | `src/mark/store.ts:95` |
| `marks:saved` | `Events.MARKS_SAVED` | `src/mark/store.ts:88` |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `db:visibility-visible` | `Events.DB_VISIBILITY_VISIBLE` | `src/mark/indicator.ts:149` |
| `marks:deleted` | `Events.MARKS_DELETED` | `src/mark/indicator.ts:113` |
| `marks:saved` | `Events.MARKS_SAVED` | `src/mark/indicator.ts:100` |
| `marks:undo` | `Events.MARKS_UNDO` | `src/mark/indicator.ts:119` |
| `reader:verse-rendered` | `Events.READER_VERSE_RENDERED` | `src/mark/indicator.ts:96` |
| `router:route-change` | `Events.ROUTER_ROUTE_CHANGE` | `src/mark/tag/TagSheet.svelte:179` |
| `sync:update-received` | `Events.SYNC_UPDATE_RECEIVED` | `src/mark/indicator.ts:132`, `src/mark/tag/TagSheet.svelte:175` |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- **Reader no longer creates new marks from its primary verse actions.** Double-tap, right-click, keyboard `m`, and the command-sheet verse action belong to the `read` surface's tafsir flow now. Existing marks, mark indicators, Review, and deep TagSheet editing remain valid and must keep working.
- **`_canon` is computed inside `marks/store.ts::save()` only.** No external caller may populate `_canon`. Bypassing `store.ts` to write the IDB store directly will leave `_canon` stale, indexes wrong, indicators stale, peer tabs missing the change.
- **Empty-mark guard.** A mark must carry ≥1 tag across the 12 layers to persist. `save()` rejects empty input with `EmptyMarkError` before any IDB touch — a note alone is not sufficient. UI guards Save at callsite so the error should never be user-visible. Exported helper: `hasAnyTag(input)`.
- **Sole writer of `marks` store: `marks/store.ts`.** Anywhere else writing `marks` directly is a bug.

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (8):**

- `tests/unit/mark/indicator.test.ts`
- `tests/unit/mark/long-press.test.ts`
- `tests/unit/mark/store.test.js`
- `tests/unit/mark/store.test.ts`
- `tests/unit/mark/tag/tag-session.test.ts`
- `tests/unit/mark/tag/tag-sheet.test.ts`
- `tests/unit/mark/tag/verse-tag-panel.test.ts`
- `tests/unit/mark/tags.test.js`

**E2E (1):**

- `tests/e2e/mark/tag-sheet.spec.js`
<!-- AUTO-GENERATED:tests END -->
