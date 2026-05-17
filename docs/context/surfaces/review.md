---
surface: review
src_paths:
  - 'src/review/**'
test_paths:
  unit:
    - 'tests/unit/review/**'
  e2e:
    - 'tests/e2e/review/*.spec.js'
---

# Surface: review

Removed product scope. Review/FVR/edges runtime and tests were deleted during
the Reader First `src/` refactor, so this dossier remains only as a tombstone
for historical orientation.

## Current state

- No active routes.
- No active UI.
- No owned stores.
- No shipped runtime files in the current tree.

## Regression note

Cross-tab and continuity behavior now belongs to active bookmark, continuity,
and infra modules. Future personal review features must be re-specified and
approved separately.
