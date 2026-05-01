---
surface: mark
src_paths:
  - 'src/marks/**'
  - 'src/tag/**'
owns_stores:
  - marks
test_paths:
  unit:
    - 'tests/unit/marks/**'
    - 'tests/unit/tag/**'
  e2e:
    - 'tests/e2e/journey-c-marking*.spec.js'
---

# Surface: mark

> Per-verse tagging. Fast-tag inline panel + deep TagSheet (12-layer editor) + marks IDB persistence + cross-tab sync.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| Reader, double-tap verse (touch) | gesture | `beginFast(verseKey)` → fast-tag inline panel |
| Reader, right-click verse (desktop) | mouse | `beginFast(verseKey)` → fast-tag inline panel |
| Reader, keyboard `m` on centered verse | keyboard | `beginFast(centerVerseKey)` → fast-tag inline panel |
| Command sheet, "Mark this verse" (`F2`) | keyboard | `beginFast(activeVerseKey)` → fast-tag inline panel |
| Fast-tag panel, `⛶` button | tap | `openDeep(verseKey)` → deep TagSheet |
| Fast-tag panel, `⌘/Ctrl + Enter` | keyboard | `openDeep(verseKey)` → deep TagSheet |
| Review hub row → "Edit mark" | tap | `editor-bridge::openEditor(verseKey)` → deep TagSheet |
| App boot → state restore | passive | hydrate marks indicators across visible reader |

Routes: no own route; surface mounts inside `Reader.svelte` (fast-tag panel) and as a global overlay (TagSheet) bridged via `tag/session-bridge.ts`.

Viewport-conditional: deep TagSheet renders full-screen <1180 px, right-side vertical panel ≥1180 px.

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/marks/VerseTagPanel.svelte` | Inline fast-path tag panel. Rendered inside the active verse under the |
| `src/marks/editor-bridge.ts` | Imperative bridge for opening the mark editor from vanilla-JS consumers. |
| `src/marks/indicator.ts` | Colored dot indicators on marked verses. |
| `src/marks/long-press.ts` | Svelte action: long-press on a verse element → open mark editor. |
| `src/marks/store.ts` | IDB CRUD for marks (v2 — 12-layer schema). |
| `src/marks/tags.js` | Tag palette, seed tags, and color resolution. |
| `src/tag/TagChip.svelte` | Quickbar chip. Distinct from `marks/TagChip.svelte` (which drives deep sheet). |
| `src/tag/TagSheet.svelte` | Deep tagging sheet. |
| `src/tag/VerseSpotlight.svelte` | Dims reader + draws attention to focused verse. Fixed scrim w/ a "hole" |
| `src/tag/session-bridge.ts` | Imperative bridge to begin a fast-path tagging session from a verse tap. |
| `src/tag/sheet-bridge.ts` | Bridge for the deep TagSheet overlay (`tag/TagSheet.svelte`). Migrated |
| `src/tag/state.svelte.ts` | Tag-session state (runes). Holds the live state for a single tagging |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

### Fast-tag inline panel (primary entry)

1. Trigger fires `beginFast(verseKey)` — verse gains active-state treatment (left-edge accent bracket, inset hairline ring, parchment-bright verse key, "tagging" dot-dim label in verse head).
2. `marks/VerseTagPanel.svelte` renders inline in the active verse below the translation: one row per layer group (Speech / Narrative / Themes / Entities), `#value` chips colored by layer hue, `+ add` affordance per group, `⛶` escalation top-right.
3. Tap chip → toggle membership; selections debounce-save to `marks` store after 350 ms via `marks/store::save`.
4. `+ add` swaps row to inline input. Input requires explicit `<prefix>:<value>` syntax; prefix autofills as user types (`s` → `speaker:`, `q` → `quoted:`, `d` in Entities → `divine:`). Aliases in `src/data/tag-layers.ts::LAYER_PREFIXES`. Empty value or unresolved prefix → red underline, commit refused. Enter commits, Escape cancels.
5. Switch active verse: short-tap any other verse → `beginFast(newKey)` swaps target; panel re-renders inside the new active verse. Short-tap while session closed = no-op.
6. Exit: tap `✕` (mobile, sole exit affordance — no Esc on touch); press Escape (desktop). Both paths call `tagSession.end()` → state resets, panel unmounts.

### Deep TagSheet (escalation)

- Reachable only from fast-tag `⛶` button, `⌘/Ctrl+Enter` keyboard shortcut, or programmatic bridges (Review hub via `editor-bridge::openEditor`).
- Mobile (<1180 px): full-screen sheet, sticky header + footer, safe-area insets, tap-collapsible verse-preview card (chevron).
- Desktop (≥1180 px): right-side panel, `min(560px, 44vw)`, same chevron preview-collapse.
- Header: "Mark verse" only (no `verseKey · SURAH` subline; ref lives on preview card).
- Body: no tab switcher. Four layer groups stack outer→inner: Speech (speaker, audience, quotedSpeaker, form) → Narrative (mode, tone) → Themes (threads, subjects) → Entities (events, people, places, divineNames). Each group has hue-colored left rail nesting its rows. Hashtag-style chips (`#value` with `#` colored by layer hue) match fast-tag visual; tap chip to remove; underline combobox per row for type-to-create with seed suggestions.
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
- **Sole writer:** `src/marks/store.ts`. External callers NEVER populate `_canon` — it is computed inside the writer.

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
| `marks:deleted` | `Events.MARKS_DELETED` | `src/marks/store.ts:113` |
| `marks:save-failed` | `Events.MARKS_SAVE_FAILED` | `src/marks/store.ts:95` |
| `marks:saved` | `Events.MARKS_SAVED` | `src/marks/store.ts:88` |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `db:visibility-visible` | `Events.DB_VISIBILITY_VISIBLE` | `src/marks/indicator.ts:149` |
| `marks:deleted` | `Events.MARKS_DELETED` | `src/marks/indicator.ts:113` |
| `marks:saved` | `Events.MARKS_SAVED` | `src/marks/indicator.ts:100` |
| `marks:undo` | `Events.MARKS_UNDO` | `src/marks/indicator.ts:119` |
| `reader:verse-rendered` | `Events.READER_VERSE_RENDERED` | `src/marks/indicator.ts:96` |
| `sync:update-received` | `Events.SYNC_UPDATE_RECEIVED` | `src/marks/indicator.ts:132`, `src/tag/TagSheet.svelte:175` |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- **Fast-tag panel is the sole per-verse action surface.** Double-tap, right-click, keyboard `m`, command sheet F2 all route through `beginFast(verseKey)`. Deep TagSheet reachable only via panel `⛶`, `⌘/Ctrl+Enter`, or programmatic bridges (`editor-bridge::openEditor`). **Do not** introduce contextual menu, multi-action sheet, or preview popover as alternative per-verse action surface. Verse-number tap (B3) surfaces edge indicators only — navigation affordance, not per-verse action — unaffected.
- **`_canon` is computed inside `marks/store.ts::save()` only.** No external caller may populate `_canon`. Bypassing `store.ts` to write the IDB store directly will leave `_canon` stale, indexes wrong, indicators stale, peer tabs missing the change.
- **Empty-mark guard.** A mark must carry ≥1 tag across the 12 layers to persist. `save()` rejects empty input with `EmptyMarkError` before any IDB touch — a note alone is not sufficient. UI guards Save at callsite so the error should never be user-visible. Exported helper: `hasAnyTag(input)`.
- **Sole writer of `marks` store: `marks/store.ts`.** Anywhere else writing `marks` directly is a bug.

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (8):**

- `tests/unit/marks/indicator.test.ts`
- `tests/unit/marks/long-press.test.ts`
- `tests/unit/marks/store.test.js`
- `tests/unit/marks/store.test.ts`
- `tests/unit/marks/tags.test.js`
- `tests/unit/tag/tag-session.test.ts`
- `tests/unit/tag/tag-sheet.test.ts`
- `tests/unit/tag/verse-tag-panel.test.ts`

**E2E (1):**

- `tests/e2e/journey-c-marking.spec.js`
<!-- AUTO-GENERATED:tests END -->

## Deprecated

- **2026-04-25:** retired `MarginHeader` fast-tag dot and desktop `TagModePill`. All four entry points (double-tap, right-click, `m`, F2) now route through `beginFast(verseKey)`.
- **2026-04-25:** retired the "press same verse twice → exit" rule. Double-tap fires `onShort` on its first tap (which switches active verse), so a same-verse → exit rule fired spuriously. Exit now requires explicit `✕` (mobile) or Escape (desktop).
- **2026-04-25 (mobile-nav-redesign):** double-tap previously opened the deep TagSheet directly; now opens fast-tag inline panel. Deep sheet only via `⛶` escalation or `⌘/Ctrl+Enter`.
- **2026-04-20 → polish pass:** mark-level flags `hasQuestion` / `hasApplication` were briefly in the data-model spec but removed from UI + schema. Deferred to `future-work.md` §Tag/verse multi-layer §v2+ if usage data later shows demand.
- **Pre-2026-04-25:** retired the legacy fast-tag bottom sheet; replaced by inline `VerseTagPanel.svelte`.
