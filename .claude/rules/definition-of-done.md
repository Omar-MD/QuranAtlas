---
paths:
  - 'src/**'
  - 'tests/**'
---

# Definition of Done

A task is done when:

1. All acceptance criteria from the spec are met
2. `npm run lint` passes (zero errors, zero warnings)
3. `npm run test` passes (all unit tests, coverage thresholds met)
4. No forbidden patterns introduced
5. No direct cross-module imports outside `core/` (except `safety/`, `a11y/`)
6. Quran text rendered verbatim — `textContent` only, no string transforms
7. Touch targets >= 44x44 CSS px for interactive elements
8. `prefers-reduced-motion` honoured for any new animation/transition
9. Arabic font >= 20 CSS px, line-height >= 1.8x
10. Works offline if the feature touches the reading path (after dataset download)
