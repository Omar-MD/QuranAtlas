---
surface: listen
src_paths:
  - 'src/listen/**'
test_paths:
  unit:
    - 'tests/unit/listen/**'
  e2e:
    - 'tests/e2e/listen/*.spec.js'
---

# Surface: listen

Removed product scope. The listen/audio runtime and tests were deleted during the
Reader First `src/` refactor, so this dossier remains only as a tombstone for
historical orientation.

## Current state

- No active routes.
- No active UI.
- No owned stores.
- No shipped runtime files in the current tree.

## Regression note

If audio returns in a future approved product scope, treat it as a fresh surface
design rather than reviving the deleted implementation described by older docs
or plans.
