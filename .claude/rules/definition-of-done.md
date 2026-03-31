---
paths:
  - 'src/**'
  - 'tests/**'
---

- All spec ACs met
- `npm run lint` passes (zero errors, zero warnings); `npm run test` passes (coverage thresholds met)
- No forbidden patterns; no cross-module imports outside `core/` (except `safety/`, `a11y/`)
- Quran text: `textContent` only, no string transforms
- Touch targets ≥ 44×44 CSS px; `prefers-reduced-motion` honoured for any animation/transition
- Arabic font ≥ 20 CSS px, line-height ≥ 1.8×
- Works offline if feature touches the reading path
