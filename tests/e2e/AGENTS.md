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

- Extend the owning `journey-*.spec.js` file for the surface instead of creating a new spec file unless the surface has no current journey owner.
- Treat suite wall time as a budget. Optimize setup duplication before trimming assertions.

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

If the right helper does not exist, add it to `tests/e2e/fixtures/idb.js` instead of inlining IndexedDB teardown inside a spec.

### One setup hook per spec file

Avoid stacked or nested `beforeEach` chains that repeat cold-boot setup. Hoist the shared setup once and vary only the delta.

### Mobile and offline routing

- Tag mobile-specific behavior with `@mobile`
- Tag service-worker / production-only behavior with `@offline`

Default assumption: viewport-agnostic tests run once on chromium.

### Reuse onboarded storage state

If the first action would otherwise be “skip onboarding”, use:

```js
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })
```

Opt out only when the test is explicitly about onboarding or empty-browser bootstrap.

### Prefer the dev server

Use the dev server unless the assertion specifically requires the production build or real service worker.

## Timing check for new e2e work

For a materially expanded journey spec, time the spec locally:

```bash
time pnpm playwright test tests/e2e/<journey-file>.spec.js --reporter=line
```

If the added coverage materially increases wall time, shrink setup or explain why the browser-only coverage is worth it.
