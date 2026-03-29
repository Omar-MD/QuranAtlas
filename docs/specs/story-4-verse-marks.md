# Story 4: Auto-saved verse marks

**Phase:** 2 (P2)
**Priority:** P2
**Depends on:** Story 2 (continuous reader)

---

## Summary

User taps a verse number to open a mark editor. Marks auto-save with tags and optional notes. One mark per verse.

## Functional Requirements

### FR-010: Mark model

- One mark per verse, keyed by `verseKey` string (e.g., `"2:255"`)
- Mark schema: `{ verseKey, tags: string[], note: string, createdAt: number, updatedAt: number }`
- Verse number in reading view is the tap target to open mark editor

### FR-011: Mark editing

- Mark editor opens as a panel/overlay (not a new page)
- Auto-save on every change (debounced 300 ms)
- Tag input: suggestions from existing tags, inline creation of new tags
- No duplicate tags per mark (case-insensitive for Latin, exact for Arabic)
- Note field: plain text, max 2000 characters

### FR-012: Mark deletion

- Delete button in mark editor
- If mark has meaningful content (tags or note): confirmation required before delete
- After delete: temporary undo affordance (5 seconds) before permanent removal
- Empty marks (no tags, no note) can be deleted without confirmation

### FR-013: Tag validation

- Non-empty after trimming whitespace
- Max 50 characters
- No control characters (U+0000-U+001F, U+007F-U+009F)
- Trimmed, internal whitespace collapsed to single space
- Validated by `src/safety/input-validator.js`

## Acceptance Criteria

- [ ] Tapping verse number opens mark editor for that verse
- [ ] Adding a tag auto-saves within 300 ms (verified: IDB contains the tag after debounce)
- [ ] Tag suggestions show existing tags filtered by input
- [ ] Creating a new tag inline works and appears in suggestions for next mark
- [ ] Duplicate tag (case-insensitive) is rejected with inline feedback
- [ ] Note text saves on input (debounced)
- [ ] Mark persistence completes in < 200 ms
- [ ] Deleting a mark with content shows confirmation
- [ ] Undo within 5 seconds restores the deleted mark
- [ ] Tag validation rejects: empty string, 51+ characters, strings with control characters
- [ ] Marked verses have a visual indicator in the reading view
- [ ] `by-tag` index (multiEntry) correctly indexes all tags
- [ ] `by-updated` index correctly orders by `updatedAt`

## Data Dependencies

- IDB store: `marks` (key: `verseKey`, indexes: `by-tag` multiEntry on `tags[]`, `by-updated` on `updatedAt`)
- Events: `marks:saved`, `marks:deleted`, `marks:undo`
- Validation: `input-validator.js` (validateTagLabel, validateNoteBody)
