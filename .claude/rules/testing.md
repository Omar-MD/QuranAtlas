---
paths:
  - 'tests/**'
  - 'vitest.config.js'
  - 'playwright.config.js'
  - 'lighthouserc.json'
---

## Unit (Vitest)
Location: `tests/unit/{domain}/{module}.test.js` · jsdom + fake-indexeddb · coverage v8: lines 80%, functions 80%
- Test every IDB operation (fake-indexeddb), every pub/sub emit+subscribe, every validation function with boundary values.

## E2E (Playwright, Chromium only)
Location: `tests/e2e/{story}.spec.js`
- Must cover: offline reading (`context.setOffline()`), IDB persistence, dataset download + SHA-256 verify, navigation + deep links.
- Must NOT test: OS-level PWA install dialog.

## Performance
- Lighthouse CI: PWA ≥ 80, Performance ≥ 80, A11y ≥ 90, Best Practices ≥ 85
- Chunk size: no chunk > 150 KB gzip
- `performance.mark('first-verse-render')` asserted in Playwright (< 800 ms at 4× CPU throttle)
