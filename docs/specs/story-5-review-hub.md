# Story 5: Review hub | P2 | Requires: Story 4

- "All Marks" sorted by updatedAt desc; active tags via `openKeyCursor(null,'nextunique')` on by-tag index (index-only scan, no full record deserialization); tap tag → filtered view
- FVR shows only verses matching tag (Arabic + translation + surah:ayah ref); tap verse → navigate main reader + exit FVR; does NOT modify positions["main"]; active filter shown with clear/back affordance; deleting last mark for a tag removes tag from list
- Review state (view, active tag, scroll) persisted to IDB positions["review"]; relaunch restores review if last session was there; exit review returns to main reader at preserved position
- IDB: marks (by-tag, by-updated), positions["review"]; events: review:open, review:filter, review:navigate-to-verse
