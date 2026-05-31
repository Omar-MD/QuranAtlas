# AGENTS.md — e2e testing rules

These instructions apply to `tests/e2e/**`.

## Placement

Only add or extend an e2e test when the behavior depends on at least one browser-only property:

- real layout or paint
- real gesture timing or pointer behavior
- service-worker lifecycle
- cross-tab browser behavior
- axe-core scan on a fully rendered page
- keyboard traversal across routed multi-screen flows
- reload and real re-hydration
- performance-budget assertions
- router/hash assertions that must prove both URL change and mounted surface

If a test does not need one of those, it belongs under `tests/unit/`.

## Scope

- Keep specs under the owning `tests/e2e/<surface>/` folder and extend an existing file there when the concern already has a natural home.
- Treat suite wall time as a budget. Optimize setup duplication before trimming assertions.
- Prefer user-observable browser outcomes over implementation selectors. Use roles, labels, text, URL state, persisted browser state, accessibility results, screenshots, and real layout measurements when they prove behavior. Do not assert CSS class names, icon internals, markup shape, or component placement unless the assertion is specifically proving a browser-only visual/layout regression that cannot be expressed through a public role, label, or visible result.
- Do not use CSS class selectors only to prove absence or presence of a component. Prefer the missing/present role, label, text, URL state, persisted state, or public status. Likewise, do not assert `data-token-key`, `data-selected`, or other implementation state when visible verse text, accessible names, route changes, or stored state prove the same behavior.
- When real layout measurements are necessary, keep them attached to a user-visible outcome such as no overflow, readable minimum size, touch target size, centered visible content, or a screenshot/axe proof. Avoid measuring decorative children or internal wrappers unless that internal node is the only browser-rendered evidence of the regression.

## Performance rules

### No fixed sleeps

Do not use `page.waitForTimeout()` or equivalent sleep helpers in test code.

Use assertion- or condition-based waits instead:

- `expect(locator).toHave...`
- `expect.poll(...)`
- `expect(...).toPass(...)`
- `page.waitForFunction(...)`

Allowed carve-outs:

- gesture fixtures where physical timing is the assertion
- long-press tests that must hold near the app threshold

Document the threshold inline when you keep a timing literal.

### Wait for async work before reload or navigation

After a click that triggers async state, wait for the completion signal before `page.reload()` or `page.goto()`. Do not assume click-then-reload is race-free.

### Scope IDB resets narrowly

Prefer single-store reset helpers over `clearAllData()` unless the test is explicitly about onboarding, clear-data UX, or a cross-store invariant.

If the right helper does not exist, add it to the typed fixture under `tests/e2e/fixtures/` instead of inlining IndexedDB teardown inside a spec.

### One setup hook per spec file

Avoid stacked or nested `beforeEach` chains that repeat cold-boot setup. Hoist the shared setup once and vary only the delta.

### Mobile and offline routing

- Tag mobile-specific behavior with `@mobile`
- Tag service-worker / production-only behavior with `@offline`

Default assumption: viewport-agnostic tests run once on chromium.

### Reuse onboarded storage state

React e2e specs seed the required IndexedDB state through typed fixtures. Opt out only when the test is explicitly about onboarding or empty-browser bootstrap.

### Prefer the dev server

Use the dev server unless the assertion specifically requires the production build or real service worker.

Use `PLAYWRIGHT_SKIP_BUILD=1` only when an existing `dist/` was produced by `pnpm run build` or `pnpm run ci:build`; raw Vite builds omit runtime dataset and Search pack assets.

## Timing check for new e2e work

For a materially expanded surface spec, time the spec locally:

```bash
time pnpm playwright test tests/e2e/<surface>/<spec-file>.spec.ts --reporter=line
```

If the added coverage materially increases wall time, shrink setup or explain why the browser-only coverage is worth it.
