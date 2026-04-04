---
issue: 5
title: "Story 5: Review Hub"
state: OPEN
---

## Problem Statement

A reader has been marking verses across multiple sessions (Story 4) — tagging them as "Study," "Reflection," or custom categories. But there is no dedicated surface to browse, filter, and revisit those marks. To review a set of tagged verses they must navigate to each surah individually and scroll through the reader. There is also no way to see tagged verse content (Arabic + translation) without navigating away from review context entirely. Each navigation to the reader risks disrupting their saved reading position.

## Solution

A Review Hub at `#/review`, accessible via a permanent icon in the top bar. The hub has two primary states:

1. **All Marks view** — a paginated list (30 per page, "Load more" button) of all marked verses. Three grouping modes: surah-grouped (canonical order), flat (date-sorted), and tag-grouped (alphabetical by tag name). Sort by createdAt or updatedAt. Filter by tag (multi-select, OR logic) and/or surah (dropdown of surahs that have marks, composable with tag filter). Supports tap-to-edit (reusing Story 4's editor modal), swipe/button delete with undo toast, and bulk-select delete.

2. **Filtered Verse Review (FVR)** — entered by tapping a tag chip on a mark card or the "Review" button on a tag-group header. Renders a mini-reader: only the tagged verses, in canonical surah:ayah order, with Arabic text + translation + surah:ayah reference. Tapping a verse opens the reader in **preview mode**: position tracking is disabled, and a persistent banner shows "Back to Review" (programmatic nav to `#/review`, state restored) and "Read from here" (saves position, exits preview mode). Preview mode stays until explicit action — scrolling alone does not end it.

A dedicated Manage Tags screen at `#/review/tags` handles tag rename (custom only), tag delete (custom and default), and shows all tags including those with 0 marks. This route is designed to grow into a tag statistics and intelligence surface in future stories.

Session state (`settings["lastSurface"]`) tracks whether the user last visited the reader or the hub. On app launch, if `lastSurface === "review"`, restore to `#/review` with filters/sort/grouping intact. Otherwise fall through to Story 2's reader restore.

## User Stories

1. As a student, I want to open a Review Hub from the top bar with one tap, so that I can access all my marked verses without interrupting my reading flow.
2. As a student, I want to see all my marked verses in the Review Hub sorted by most recently updated, so that I can quickly see what I was working on last.
3. As a student, I want to toggle the Review Hub between surah-grouped, flat, and tag-grouped views, so that I can organise my review session the way I study.
4. As a student in surah-grouped view, I want surah groups to appear in canonical Quran order, so that I can read through my marks sequentially.
5. As a student in tag-grouped view, I want tag groups to appear in alphabetical order, so that I can quickly scan and locate a category.
6. As a student, I want to sort my marks by date created or date updated, so that I can review recently added marks or revisit older ones.
7. As a student, I want to filter marks by one or more tags (OR logic), so that I can focus on a set of related categories at once.
8. As a student, I want to filter marks by surah using a dropdown that only lists surahs with marks, so that I can narrow my review to a specific surah.
9. As a student, I want to combine tag and surah filters simultaneously, so that I can see marks for a specific tag within a specific surah.
10. As a student, I want each filter to be cleared independently, so that I can remove one constraint without losing the other.
11. As a student with 500+ marks, I want to load marks in pages of 30 with a "Load more" button, so that the hub loads quickly and I can browse at my own pace.
12. As a student, I want to tap a mark in the hub to open the same tag editor modal from Story 4, so that I can add or remove tags without leaving the hub.
13. As a student, I want to delete a mark from the hub with an instant delete and a 5-second undo toast, so that cleanup is fast and recoverable.
14. As a student, I want to tap a "Select" button to enter bulk-select mode with checkboxes on each mark, so that I can select and delete multiple marks at once.
15. As a student in bulk-select mode, I want a "Delete selected" button and a "Cancel" button, so that I can confirm or abort the batch operation.
16. As a student, I want bulk delete to show a single undo toast covering the entire batch, so that I can recover from an accidental mass deletion.
17. As a student with no marks, I want the hub to show a friendly empty state with a call-to-action to go read and mark verses, so that I understand how to get started.
18. As a student whose filters return no results, I want an inline "No results" message with a "Clear filter" button, so that I can easily reset and try again.
19. As a student, I want to tap a tag chip on a mark card (or the "Review" button on a tag-group header) to enter the Filtered Verse Review, so that I can see all verses with that tag in context.
20. As a student in FVR, I want to see verses in canonical surah:ayah order with Arabic text, translation, and surah:ayah reference, so that I can read them in Quran sequence.
21. As a student in FVR, I want the translation to respect my global translation toggle setting, so that my reading preference is consistent across the app.
22. As a student in FVR, I want to delete a mark with undo toast, so that I can clean up tags without leaving the review surface.
23. As a student in FVR, I want tapping a verse to open the reader at that verse in preview mode, so that I can see the full context without losing my reading position.
24. As a student in preview mode, I want a persistent banner saying "Back to Review" and "Read from here", so that I always have a clear path back or forward.
25. As a student in preview mode, I want to tap "Back to Review" to return to FVR with my scroll position restored, so that I can continue reviewing without losing my place.
26. As a student in preview mode, I want to tap "Read from here" to save my position at this verse and exit preview mode, so that I can seamlessly transition from review to reading.
27. As a student in preview mode, I want any navigation to a different surah (via nav panel or URL) to silently exit preview mode and resume normal position tracking, so that preview mode doesn't trap me.
28. As a returning user who was last in the Review Hub, I want the app to reopen to the Review Hub on relaunch, so that I can continue my review session without extra taps.
29. As a returning user who was last reading, I want the app to reopen to the reader (Story 2 restore), so that the hub restore only applies when review was truly my last activity.
30. As a student, I want to open Manage Tags from the Review Hub, so that I can organise my tag vocabulary.
31. As a student in Manage Tags, I want to see all my tags including ones with 0 marks, so that I can find and delete unused tags.
32. As a student in Manage Tags, I want to rename a custom tag (cascades to all marks using that tag), so that I can correct a misspelling or refine a category name.
33. As a student in Manage Tags, I want to delete any tag (custom or default), with deletion cascading to all marks using it, so that I can permanently remove categories I no longer use.
34. As a student, I want the Review Hub icon in the top bar to always be visible (even before I have any marks), so that I can discover the feature easily.
35. As a student, I want the top bar icon to be a clean, badge-free icon, so that the distraction-free reader aesthetic is preserved.

## Implementation Decisions

### Modules to Build / Modify

**New: `src/review/`** (extending Phase 0 stub)

- `hub.js` — All Marks view: grouping toggle, sort/filter controls, "Load more" pagination, delete/bulk-delete with undo toast, tap-to-edit integration with Story 4 editor modal. Emits `review:open` on mount, `review:filter` on filter/sort change.
- `fvr.js` — Filtered Verse Review: fetches tagged verse keys via `by-tag` index, loads surah data via `dataset/getSurah()`, renders Arabic + translation + surah:ayah ref in canonical order. "Load more" for 30+ verses. Delete from FVR with undo toast. Emits `review:navigate-to-verse` on verse tap.
- `tags.js` — Manage Tags screen at `#/review/tags`: list all tags (including 0-mark), rename custom, delete any (cascade via `marks/store.js`).
- `state.js` — Persists/restores review view mode, active tag filter, surah filter, sort, grouping to `positions["review"]` IDB record. Writes on every state change (immediate, no debounce). Does NOT persist page or scroll offset (always restores to page 1).

**Modify: `src/reader/`**

- Add preview mode: skip `savePosition()` calls when `previewMode === true`. Inject a non-scrolling banner at the top of `#main-content` with "Back to Review" (programmatic `history.pushState` to `#/review`) and "Read from here" (call `savePosition()` once, set `previewMode = false`, remove banner). Any navigation event from nav panel or URL clears preview mode silently.

**Modify: `src/core/router.js`**

- On launch with empty hash: read `settings["lastSurface"]`. If `"review"`, navigate to `#/review`. Else fall through to Story 2 reader restore.
- Register routes: `#/review` and `#/review/tags` → lazy import `../review/index.js`.

**Modify: `src/marks/store.js`** (Story 4 module)

- Must expose bulk-delete method: `deleteMany(verseKeys[])` — single IDB transaction, emits one batched `marks:deleted` event.

### IDB Schema

No migration. Existing v1 schema sufficient.

- `marks` store: read via `by-tag` index (index-only key scan for tag enumeration, full record fetch for mark content), `by-updated` for sort. OR-union multi-tag filter: one `IDBKeyRange` per selected tag, merge results in JS.
- `positions["review"]`: `{ id: "review", view: "all"|"fvr", activeTag: string|null, surahFilter: number|null, sortBy: "createdAt"|"updatedAt", groupBy: "surah"|"flat"|"tag" }`. Written immediately on every state change.
- `settings["lastSurface"]`: `{ key: "lastSurface", value: "review"|"reader" }`. Written on every surface switch (reader ↔ hub).
- `positions["main"]`: NOT touched during preview mode.

### Events

- `review:open` — hub mounted at `#/review`
- `review:filter` — tag or surah filter changed (payload: `{ tags, surah }`)
- `review:navigate-to-verse` — FVR verse tapped (payload: `{ verseKey }`, reader enters preview mode)

### Performance Targets

- Hub initial render (30 marks): ≤ 300ms
- Tag index scan (active tags, index-only): ≤ 100ms
- FVR verse rendering (30 verses): ≤ 500ms
- Filter/sort response (client-side, already-loaded data): ≤ 100ms
- Mark delete (IDB + toast): ≤ 200ms

## Testing Decisions

A good test exercises only the public interface — what the module emits, returns, and writes to IDB. Never test internal state or private helpers.

**`review/state.js`** (unit, fake-indexeddb): verify persist writes correct IDB record; verify restore reads back all fields; verify `settings["lastSurface"]` is updated on surface switch.

**`review/hub.js`** (integration, jsdom + fake-indexeddb): seed 60 marks across 3 tags and 2 surahs. Verify initial render shows 30. "Load more" shows 60. Toggle grouping — verify surah-grouped renders surah headers in canonical order, tag-grouped renders tag headers alphabetically. Filter by tag (OR) — verify union. Filter by surah — verify narrows to correct surah. Combine filters — verify AND. Sort by createdAt — verify order. Delete single mark — verify undo toast appears, mark restored on undo, mark gone after 5s. Bulk select: enter select mode, check 3 marks, delete — verify batch gone, undo restores all 3.

**`review/fvr.js`** (integration, jsdom + fake-indexeddb + mock `dataset/getSurah()`): seed 5 marks for tag "Study" across 2 surahs. Enter FVR for "Study". Verify 5 verse cards in canonical order. Verify Arabic set via `textContent` (never `innerHTML`). Tap verse — verify `review:navigate-to-verse` emitted with correct verseKey. Delete mark in FVR — verify card removed, undo toast; deleting last mark shows empty state.

**`review/tags.js`** (unit, fake-indexeddb): verify all tags including 0-mark appear; rename cascades to marks; delete cascades to marks; default tags can be deleted; custom tags can be renamed.

**`reader/` preview mode** (integration): navigate with `previewMode = true`; verify banner rendered; verify `savePosition` not called during scroll; tap "Read from here" — verify `savePosition` called, banner removed; tap "Back to Review" — verify `history.pushState` to `#/review`; navigate via nav panel — verify banner removed silently.

Prior art: `src/core/db.test.js` for IDB setup patterns; Story 2 scroll-tracker tests for observer/debounce patterns.

## Out of Scope

- Flashcard / study mode — permanently out of scope for this story
- Spaced repetition
- Export or sharing of marks
- Cross-tab sync (Story 6)
- Tag-based deep link routes like `#/t/favorites` (Story 7)
- Tag usage statistics / intelligence features (future addition to `#/review/tags`)
- Verse notes / free-text in Review Hub

## Further Notes

- Arabic text in FVR must be rendered via `textContent` or `createTextNode` — never `innerHTML` with corpus data.
- `dataset/getSurah()` is the sole fetch path for FVR verse content. FVR never touches Cache Storage directly.
- The `by-tag` index uses `multiEntry: true` (defined in Phase 0 IDB schema). Key-only cursor scan (`openKeyCursor`) is sufficient to enumerate which tags exist — no full record deserialization needed for the tag list.
- OR-union multi-tag filter: open one cursor per selected tag on the `by-tag` index, collect `verseKey` sets, merge in JS. For 500 marks across 10 tags, this is acceptably fast client-side.
- `settings["lastSurface"]` must be written atomically on every route change that switches between `#/review*` and `#/s/*` to ensure correct relaunch behavior.
- Manage Tags at `#/review/tags` is designed as a growth surface. The route and module structure should make it straightforward to add a tag statistics panel in a future story without restructuring.

## Grill-Me Decisions (20 locked)

| Q   | Decision                              | Choice                                                                                                                                              |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | FVR entry point                       | Tap tag chip on a mark card, or "Review" button on tag-group header. Tag filter dropdown stays as filter only.                                      |
| 2   | Tag filter logic (multi-select)       | OR (union) — show marks with ANY selected tag                                                                                                       |
| 3   | Sorting within grouped views          | Surah-grouped: canonical surah order. Tag-grouped: alphabetical by tag name. Sort control (createdAt/updatedAt) applies to marks within each group. |
| 4   | FVR verse order                       | Canonical order (surah:ayah)                                                                                                                        |
| 5   | Delete from FVR                       | Allowed. Deleting last mark for the tag shows empty state in FVR.                                                                                   |
| 6   | Bulk select UI                        | Toggle "Select" button in toolbar → checkboxes on each mark → "Delete selected" + "Cancel"                                                          |
| 7   | Manage Tags screen type               | Separate route `#/review/tags` (room to grow: stats, intelligence)                                                                                  |
| 8   | Surah + tag filter combined           | Yes, composable (AND). Clear each independently.                                                                                                    |
| 9   | FVR uncached surah data               | No special handling — corpus is all-or-nothing (Story 1). Edge case negligible.                                                                     |
| 10  | Last active surface detection         | Explicit `settings["lastSurface"]` flag ("review" or "reader"). Single source of truth.                                                             |
| 11  | Review state persistence timing       | On every state change (immediate IDB write). Infrequent actions, small record.                                                                      |
| 12  | Preview banner dismissal on other nav | Any non-preview navigation exits preview mode silently. Banner disappears, normal tracking resumes.                                                 |
| 13  | Review Hub icon badge                 | No badge — static icon. Mark counts shown inside the hub only.                                                                                      |
| 14  | Manage Tags: 0-mark tags              | Show all tags including 0-mark tags. Admin surface for cleanup of orphaned tags.                                                                    |
| 15  | Pagination UI                         | "Load more" button at bottom. Appends next 30 to the existing list.                                                                                 |
| 16  | Session restore with "Load more"      | Restore filters/sort/grouping only. Always reload from page 1 — scroll position not restored.                                                       |
| 17  | FVR "Back to Review" with emptied tag | Return to FVR regardless. If 0 marks remain, FVR shows empty state with back button to All Marks.                                                   |
| 18  | Mark editing from hub                 | Tap a mark → reuse Story 4's editor modal in hub context.                                                                                           |
| 19  | Top bar icon visibility               | Always visible, even with 0 marks. Empty state handles first-time users.                                                                            |
| 20  | FVR translation toggle                | Respect global translation toggle — one setting everywhere.                                                                                         |
