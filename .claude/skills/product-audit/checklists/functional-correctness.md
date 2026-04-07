# Functional Correctness — Core Checklist

**Weight: 5** | **Version: 2** | **Items: 22**

## Must-Check Items

> **Not-assessable rule:** If a module referenced by a checklist item does not exist in the codebase, mark the item as `not-assessable` with evidence: "Module not yet implemented (Phase N)". Not-assessable items are excluded from the score denominator.

1. **Verse rendering accuracy** — Every verse renders with correct Arabic text, translation, and verse number. No missing, duplicated, or out-of-order verses.
   - Check: `reader/index.js` render logic, basmala rules (skip for surah 9, included in surah 1)
   - Verify: Dataset integrity for edge cases (surah 1, surah 9, short surahs)

2. **Basmala rules** — Surah 1 (Al-Fatiha): basmala IS verse 1 (numbered, per PUA encoding). Surahs 2–113: basmala displayed as decorative prefix (not a numbered verse). Surah 9 (At-Tawbah): no basmala. Basmala is always Arabic-only, unaffected by translation toggle (Story 1 Q5, Q6).
   - Check: `reader/index.js` basmala rendering logic — verify all three cases
   - Verify: No double-rendering when dataset already includes basmala. Translation toggle does not hide/show basmala text

3. **Surah ordering** — Surahs appear in canonical Quranic order (1-114). Navigation reflects correct ordering.
   - Check: `data/dataset.js` surah list ordering
   - Verify: `nav/index.js` displays surahs in correct order

4. **Deep link handling** — `#/s/:surah`, `#/s/:surah/:ayah` routes correctly navigate to the specified surah/verse. Invalid routes show error state, not blank screen.
   - Check: `core/router.js` route matching, `reader/index.js` param validation
   - Verify: Edge cases — surah 0, surah 115, ayah 0, ayah > verse count, non-numeric params

5. **Marking flow** — Long-press or hover triggers mark editor. Tags are saved to IndexedDB. Indicators appear on marked verses. Marks persist across sessions.
   - Check: `marks/store.js`, `marks/editor.js`, `marks/indicator.js`
   - Verify: Mark save/load/delete cycle, undo toast functionality

6. **Position tracking** — Reading position saves correctly on scroll. Resume indicator appears on return. Position restores to correct verse.
   - Check: `reader/scroll-tracker.js`, `core/db.js` position operations
   - Verify: Position saves debounce doesn't lose data on rapid scroll

7. **Session restore** — App reopens to last-used surface (reader, review, settings) and last position within that surface.
   - Check: `core/app.js` initialization flow, `core/db.js` position retrieval
   - Verify: `lastSurface` tracking in settings store

8. **Navigation search/filter** — Search by surah name (English transliteration, case-insensitive), surah number, or verse reference ("2:255", "Baqarah 255"). Strict matching only — no fuzzy match (Story 3 Q2, Q4). Juz navigation is CUT (Story 3 Q17).
   - Check: `nav/index.js` search logic, `safety/input-validator.js::parseNavigationInput()` validation
   - Verify: Edge cases — empty search, special characters, misspelled names rejected, out-of-range verse shows specific error (Story 3 Q5), "2:300" rejected for Al-Baqarah (286 verses)

9. **Settings persistence** — Theme and translation toggle preferences save to IndexedDB and apply correctly on reload. Font size controls are DEFERRED to Phase 3 (product-info.md).
   - Check: `settings/index.js`, `settings/theme.js`, `core/db.js` settings operations
   - Verify: Theme applies instantly on click (no confirmation, Story 9 Q4). Translation toggle persists via `settings["translationVisible"]`. Both survive app restart

10. **Offline data integrity** — Downloaded dataset matches source. No corruption, truncation, or missing verses after offline download.
    - Check: `data/offline.js` download flow, `src/sw.js` cache operations
    - Verify: Dataset verification after download completes

11. **Basmala + translation toggle** — Basmala always displays Arabic-only regardless of translation visibility state (Story 1 Q6). Translation toggle affects only verse translation text, not basmala.
    - Check: `reader/index.js` — basmala rendering when `translationVisible = false`
    - Verify: Toggling translation off does not remove or alter basmala display

12. **Session restore surface routing** — If `settings["lastSurface"] === "review"`, app opens to `#/review` with filters/sort intact (Story 5). If `"reader"`, Story 2 position restore applies. Deep links override both (Story 7).
    - Check: `core/router.js` launch logic, `settings["lastSurface"]` read
    - Verify: `lastSurface` written atomically on every route change between `#/review*` and `#/s/*` (Story 5 spec)

13. **Deep link precedence** — `#/s/:surah/:ayah` overrides session restore and opens at the exact verse (Story 7). `#/s/:surah` (no ayah) falls through to session restore. Saved IDB position is NOT overwritten by deep link itself — only by subsequent scrolling.
    - Check: `reader/index.js::init()` — `params.ayah` present vs absent logic
    - Verify: Deep link to 2:255 with saved position at 1:1 renders 2:255. IDB still shows 1:1 immediately after load

14. **Review Hub pagination and state** — Marks load in pages of 30 with "Load more" button (Story 5). Filters, sort, and grouping persist to `positions["review"]` in IDB. On restore, always starts at page 1 — scroll position not restored.
    - Check: `review/hub.js` pagination logic, `review/state.js` persist/restore
    - Verify: 60 marks shows 30 initially, "Load more" shows remaining 30. Filter/sort state survives app restart

15. **Clear all data completeness** — Deletes all Cache Storage entries (`quran-dataset-v1`, `quran-dataset-staging`, `quran-fonts-v1`), deletes IndexedDB entirely, and navigates to reader (Story 9). Requires typing "DELETE" (case-insensitive) to confirm. No undo.
    - Check: `settings/clear-data.js` — deletion sequence and confirmation logic
    - Verify: After clear, app behaves as first-time visit. All marks, positions, settings, and cached data are gone

16. **Tag deletion cascade** — Deleting a default tag removes it from all marks using that tag (Story 4). Marks with no remaining tags remain as untagged (not deleted). Deleted default tags persisted to `settings["deleted-default-tags"]`.
    - Check: `marks/tags.js` — cascade deletion logic
    - Verify: Mark with tags [Favourite, Study] after deleting Favourite has tags [Study]. Mark with only [Favourite] becomes untagged (empty tags array), not deleted

17. **Undo toast navigation dismissal** — Undo toast after mark deletion is dismissed on navigation (Story 4 Q). Undo opportunity is lost. Toast does not persist across route changes.
    - Check: `marks/editor.js` — undo toast lifecycle
    - Verify: Navigating away during 5-second undo window causes toast dismissal and mark deletion becomes permanent

18. **Idempotent initialization** — Calling a module's `init()` twice (e.g., rapid navigation back to the same route) does not produce duplicate DOM elements, double event subscriptions, or corrupted state. `init()` is safe to call repeatedly.
    - Check: All route handler `init()` functions — do they clean up before re-initializing?
    - Verify: Navigating to `#/s/2` → `#/s/3` → `#/s/2` does not produce duplicate verse elements or double IntersectionObservers

19. **State machine completeness** — All state machines (dataset update, offline download, activation state) define every valid transition. Invalid transitions are rejected or logged, never silently ignored.
    - Check: `data/dataset-updater.js`, `data/offline.js` — state transition logic
    - Verify: Attempting an invalid transition (e.g., `idle → pending-confirmation` without `downloading`) is either impossible by code structure or explicitly guarded

20. **Boundary value correctness** — First and last values in all ranges are tested and handled correctly: surah 1, surah 114, verse 1, last verse of each surah, 0 marks, 1 mark, maximum marks.
    - Check: `reader/index.js`, `nav/index.js`, `marks/store.js`, `review/hub.js` — boundary handling
    - Verify: Surah 1 renders with basmala as verse 1. Surah 114 has no "next surah" edge case. Empty mark list shows empty state. Single mark shows correctly without pagination

21. **Data invariant enforcement** — All IDB records conform to their schema. Marks always have `verseKey` and `tags[]`. Positions always have `surah`, `verse`, and `savedAt`. No partial or malformed records can be written.
    - Check: `marks/store.js`, `core/db.js` — write operations validate record shape before IDB put
    - Verify: Attempting to save a mark without `verseKey` throws or is rejected. No code path can write a `null` or `undefined` field to IDB

22. **Race condition prevention** — Rapid sequential operations (fast navigation between surahs, rapid mark/unmark, double-tap on buttons) do not produce inconsistent state.
    - Check: `reader/index.js` — navigation guard prevents rendering surah B while surah A is still loading. `marks/editor.js` — save button debounced or disabled after first tap
    - Verify: Navigating `#/s/1` → `#/s/2` → `#/s/3` quickly renders only surah 3. No remnants of surah 1 or 2 in DOM. No stale fetch results applied after navigation
