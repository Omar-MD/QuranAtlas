# Story 5: Unified review hub

**Phase:** 2 (P2)
**Priority:** P2
**Depends on:** Story 4 (verse marks)

---

## Summary

User reviews all marked verses or filters by tag. Filtered verse reader (FVR) mode shows only matching verses while preserving main reading position.

## Functional Requirements

### FR-014: Review hub

- "All Marks" view: all marked verses sorted by `updatedAt` descending
- Active tags list: derived from `openKeyCursor(null, 'nextunique')` on `by-tag` index
- Only tags that have at least one associated mark appear
- Tapping a tag opens filtered view for that tag

### FR-015: Filtered verse reader (FVR)

- Shows only verses matching the active tag filter
- Each verse card shows Arabic + translation + surah:ayah reference
- Tapping a verse navigates to that verse in the main reader (exits FVR)
- Active filter displayed prominently with clear/back affordance
- Main reading position is NOT modified by FVR browsing

### FR-016: Session continuity

- Review context (current view, active tag filter, scroll position) persisted in IDB `positions` store (key: `"review"`)
- On relaunch: if last session was in review, restore review state
- Exiting review returns to main reader at preserved position

## Acceptance Criteria

- [ ] All Marks shows every marked verse, most recently updated first
- [ ] Tags list shows only tags with at least one mark
- [ ] Deleting the last mark with a tag removes that tag from the list
- [ ] Filtered view shows only verses matching the selected tag
- [ ] Tapping a verse in FVR navigates to that verse in main reader
- [ ] Main reading position unchanged after FVR session
- [ ] Review state persists across reload (close/reopen restores review view)
- [ ] "All active tags" query uses index-only scan (no full record deserialization)

## Data Dependencies

- IDB stores: `marks` (via `by-tag` and `by-updated` indexes), `positions` (key: `"review"`)
- Events: `review:open`, `review:filter`, `review:navigate-to-verse`
