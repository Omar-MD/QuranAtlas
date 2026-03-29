---
paths:
  - 'tests/**'
  - 'vitest.config.js'
  - 'playwright.config.js'
  - 'lighthouserc.json'
---

# Testing Strategy

## Unit Tests (Vitest)

- Location: `tests/unit/{domain}/{module}.test.js`
- Environment: jsdom + fake-indexeddb
- Coverage: v8 provider, thresholds: lines 80%, functions 80%
- Every IDB operation must be tested with fake-indexeddb
- Every pub/sub event must be tested (emit + subscribe)
- Every input validation function must have boundary-value tests

## E2E Tests (Playwright)

- Location: `tests/e2e/{story}.spec.js`
- Browser: Chromium only
- Must test: offline reading (via `context.setOffline()`), IDB state persistence, dataset download + SHA-256 verification, navigation + deep links
- Must NOT test: actual OS-level PWA install dialog

## Performance

- Lighthouse CI thresholds: PWA >= 80, Performance >= 80, A11y >= 90, Best Practices >= 85
- Chunk size gate: no chunk > 150 KB gzip
- Custom metric: `performance.mark('first-verse-render')` asserted in Playwright (< 800 ms at 4x CPU throttle)
