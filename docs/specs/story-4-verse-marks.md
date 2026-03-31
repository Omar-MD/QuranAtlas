# Story 4: Verse marks | P2 | Requires: Story 2

- One mark per verse; schema: `{verseKey, tags:string[], note:string, createdAt:number, updatedAt:number}`; verse number is tap target; marked verses show visual indicator in reading view
- Editor: panel/overlay (not a new page); auto-save debounced 300 ms; tag suggestions from existing tags; inline creation; no duplicate tags (case-insensitive Latin, exact Arabic); note max 2,000 chars
- Delete: confirm if has content (tags or note); 5s undo buffer; empty marks (no tags, no note) need no confirm; tag validation via input-validator.js: non-empty after trim, max 50 chars, no control chars (U+0000–001F, U+007F–009F), collapse internal whitespace
- Mark persist <200 ms; IDB: marks (by-tag multiEntry on tags[], by-updated on updatedAt); events: marks:saved, marks:deleted, marks:undo
