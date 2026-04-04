---
issue: 5
title: "Story 5: Review Hub"
state: OPEN
---

## Problem Statement

A reader has been marking verses across multiple sessions (Story 4) — tagging them as "Favourite," "Study," "Reflection," or "Question." But there is no dedicated surface to browse, filter, and revisit those marks. To review a set of tagged verses they must navigate to each surah individually and scroll through the reader. Each navigation to the reader risks disrupting their saved reading position.

## Solution

A Review Hub at `#/review`, accessible via a permanent icon in the top bar. The hub has one primary state:

**All Marks view** — a paginated list (30 per page, "Load more" button) of all marked verses. Grouped by surah in canonical Quran order. Sort by createdAt or updatedAt. Filter by tag (multi-select, OR logic) and/or surah (dropdown of surahs that have marks, composable with tag filter). Supports tap-to-edit (reusing Story 4's editor modal), swipe/button delete with undo toast.

Session state (`settings["lastSurface"]`) tracks whether the user last visited the reader or the hub. On app launch, if `lastSurface === "review"`, restore to `#/review` with filters/sort intact. Otherwise fall through to Story 2's reader restore.

## User Stories

1. As a student, I want to open a Review Hub from the top bar with one tap, so that I can access all my marked verses without interrupting my reading flow.
2. As a student, I want to see all my marked verses in the Review Hub sorted by most recently updated, so that I can quickly see what I was working on last.
3. As a student, I want to toggle the Review Hub between surah-grouped and flat (date-sorted) views, so that I can organise my review session the way I study.
4. As a student in surah-grouped view, I want surah groups to appear in canonical Quran order, so that I can read through my marks sequentially.
5. As a student, I want to sort my marks by date created or date updated, so that I can review recently added marks or revisit older ones.
6. As a student, I want to filter marks by one or more tags (OR logic), so that I can focus on a set of related categories at once.
7. As a student, I want to filter marks by surah using a dropdown that only lists surahs with marks, so that I can narrow my review to a specific surah.
8. As a student, I want to combine tag and surah filters simultaneously, so that I can see marks for a specific tag within a specific surah.
9. As a student, I want each filter to be cleared independently, so that I can remove one constraint without losing the other.
10. As a student with 500+ marks, I want to load marks in pages of 30 with a "Load more" button, so that the hub loads quickly and I can browse at my own pace.
11. As a student, I want to tap a mark in the hub to open the same tag editor modal from Story 4, so that I can add or remove tags without leaving the hub.
12. As a student, I want to delete a mark from the hub with an instant delete and a 5-second undo toast, so that cleanup is fast and recoverable.
13. As a student with no marks, I want the hub to show a friendly empty state with a call-to-action to go read and mark verses, so that I understand how to get started.
14. As a student whose filters return no results, I want an inline "No results" message with a "Clear filter" button, so that I can easily reset and try again.
15. As a returning user who was last in the Review Hub, I want the app to reopen to the Review Hub on relaunch, so that I can continue my review session without extra taps.
16. As a returning user who was last reading, I want the app to reopen to the reader (Story 2 restore), so that the hub restore only applies when review was truly my last activity.
17. As a student, I want the Review Hub icon in the top bar to always be visible (even before I have any marks), so that I can discover the feature easily.
18. As a student, I want the top bar icon to be a clean, badge-free icon, so that the distraction-free reader aesthetic is preserved.

## Implementation Decisions

### Modules to Build / Modify

**New: `src/review/`** (extending Phase 0 stub)

- `hub.js` — All Marks view: grouping toggle (surah/flat), sort/filter controls, "Load more" pagination, delete with undo toast, tap-to-edit integration with Story 4 editor modal. Emits `review:open` on mount, `review:filter` on filter/sort change.
- `state.js` — Persists/restores review view mode, active tag filter, surah filter, sort, grouping to `positions["review"]` IDB record. Writes on every state change (immediate, no debounce). Does NOT persist page or scroll offset (always restores to page 1).

**Modify: `src/core/router.js`**

- On launch with empty hash: read `settings["lastSurface"]`. If `"review"`, navigate to `#/review`. Else fall through to Story 2 reader restore.
- Register route: `#/review` → lazy import `../review/index.js`.

**Modify: `src/marks/store.js`** (Story 4 module)

- Must expose `delete(verseKey)` — single IDB transaction, emits `marks:deleted` event.

### IDB Schema

No migration. Existing v1 schema sufficient.

- `marks` store: read via `by-tag` index (index-only key scan for tag enumeration, full record fetch for mark content), `by-updated` for sort. OR-union multi-tag filter: one `IDBKeyRange` per selected tag, merge results in JS.
- `positions["review"]`: `{ id: "review", view: "all", activeTag: string|null, surahFilter: number|null, sortBy: "createdAt"|"updatedAt", groupBy: "surah"|"flat" }`. Written immediately on every state change.
- `settings["lastSurface"]`: `{ key: "lastSurface", value: "review"|"reader" }`. Written on every surface switch (reader ↔ hub).

### Events

- `review:open` — hub mounted at `#/review`
- `review:filter` — tag or surah filter changed (payload: `{ tags, surah }`)

### Performance Targets

- Hub initial render (30 marks): ≤ 300ms
- Tag index scan (active tags, index-only): ≤ 100ms
- Filter/sort response (client-side, already-loaded data): ≤ 100ms
- Mark delete (IDB + toast): ≤ 200ms

## Testing Decisions

A good test exercises only the public interface — what the module emits, returns, and writes to IDB. Never test internal state or private helpers.

**`review/state.js`** (unit, fake-indexeddb): verify persist writes correct IDB record; verify restore reads back all fields; verify `settings["lastSurface"]` is updated on surface switch.

**`review/hub.js`** (integration, jsdom + fake-indexeddb): seed 60 marks across 3 tags and 2 surahs. Verify initial render shows 30. "Load more" shows 60. Toggle grouping — verify surah-grouped renders surah headers in canonical order, flat renders date-sorted. Filter by tag (OR) — verify union. Filter by surah — verify narrows to correct surah. Combine filters — verify AND. Sort by createdAt — verify order. Delete single mark — verify undo toast appears, mark restored on undo, mark gone after 5s.

Prior art: `tests/unit/core/db.test.js` for IDB setup patterns; Story 2 scroll-tracker tests for observer/debounce patterns.

## Out of Scope

- Filtered Verse Review (FVR) — **DEFERRED** to Phase 3
- Tag-grouped view — **CUT** (surah + flat are sufficient)
- Bulk select/delete — **DEFERRED** to Phase 3
- Flashcard / study mode — permanently out of scope
- Spaced repetition
- Export or sharing of marks
- Cross-tab sync (Story 6)
- Tag-based deep link routes like `#/t/favorites` (Story 7)
- Tag usage statistics / intelligence features (future addition to `#/review/tags`)
- Verse notes / free-text in Review Hub
- Manage Tags screen — **DEFERRED** to Phase 3

## Further Notes

- Arabic text in hub must be rendered via `textContent` or `createTextNode` — never `innerHTML` with corpus data.
- `data/dataset.js::getSurah()` is the sole fetch path for hub verse content. Hub never touches Cache Storage directly.
- The `by-tag` index uses `multiEntry: true` (defined in Phase 0 IDB schema). Key-only cursor scan (`openKeyCursor`) is sufficient to enumerate which tags exist — no full record deserialization needed for the tag list.
- OR-union multi-tag filter: open one cursor per selected tag on the `by-tag` index, collect `verseKey` sets, merge in JS. For 500 marks across 10 tags, this is acceptably fast client-side.
- `settings["lastSurface"]` must be written atomically on every route change that switches between `#/review*` and `#/s/*` to ensure correct relaunch behavior.

## Grill-Me Decisions (20 locked)

| Q   | Decision                              | Choice                                                                                                                                              |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Grouping modes                        | Surah-grouped (canonical) + flat (date-sorted). Tag-grouped **CUT**.                                                                                |
| 2   | Tag filter logic (multi-select)       | OR (union) — show marks with ANY selected tag                                                                                                       |
| 3   | Sorting within grouped views          | Surah-grouped: canonical surah order. Sort control (createdAt/updatedAt) applies to marks within each group.                                        |
| 4   | FVR                                   | **DEFERRED** to Phase 3                                                                                                                             |
| 5   | Bulk select UI                        | **DEFERRED** to Phase 3                                                                                                                             |
| 6   | Manage Tags screen                    | **DEFERRED** to Phase 3                                                                                                                             |
| 7   | Surah + tag filter combined           | Yes, composable (AND). Clear each independently.                                                                                                    |
| 8   | Last active surface detection         | Explicit `settings["lastSurface"]` flag ("review" or "reader"). Single source of truth.                                                             |
| 9   | Review state persistence timing       | On every state change (immediate IDB write). Infrequent actions, small record.                                                                      |
| 10  | Review Hub icon badge                 | No badge — static icon. Mark counts shown inside the hub only.                                                                                      |
| 11  | Pagination UI                         | "Load more" button at bottom. Appends next 30 to the existing list.                                                                                 |
| 12  | Session restore with "Load more"      | Restore filters/sort/grouping only. Always reload from page 1 — scroll position not restored.                                                       |
| 13  | Mark editing from hub                 | Tap a mark → reuse Story 4's editor modal in hub context.                                                                                           |
| 14  | Top bar icon visibility               | Always visible, even with 0 marks. Empty state handles first-time users.                                                                            |
| 15  | Hub empty state                       | Friendly message + CTA to start reading and marking                                                                                                 |
| 16  | Filter no-results state               | Inline "No results" + "Clear filter" button                                                                                                         |
| 17  | Tag chip on mark card                 | Shows tag colors; tap does NOT enter FVR (deferred). Shows tag label only.                                                                          |
| 18  | Delete from hub                       | Single delete with 5-second undo toast. Batch delete deferred.                                                                                      |
| 19  | Default tag deletion cascade          | Deleting a default tag removes it from all marks using it. Marks with no remaining tags remain (untagged).                                          |
| 20  | Navigation from hub tap               | Navigate to verse in reader via `#/s/{surah}/{ayah}`. Session restore not affected.                                                                 |
