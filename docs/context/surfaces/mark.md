---
surface: mark
src_paths:
  - 'src/mark/**'
test_paths:
  unit:
    - 'tests/unit/mark/**'
    - 'tests/unit/mark/tag/**'
  e2e:
    - 'tests/e2e/mark/*.spec.js'
---

# Surface: mark

Removed product scope. Personal mark/tag runtime, persistence helpers, and tests
were deleted during the Reader First `src/` refactor, so this dossier remains
only as a tombstone for historical orientation.

## Current state

- No active routes.
- No active overlays.
- No owned stores.
- No shipped runtime files in the current tree.

## Regression note

Bookmarks remain active reading continuity under the navigate/continuity
surfaces. Future personal annotation work should be treated as a new approved
product area, not as a restoration of the removed mark implementation.
