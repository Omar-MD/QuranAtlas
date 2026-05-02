# AGENTS.md — unit testing rules

These instructions apply to `tests/unit/**`.

## Default

New tests belong here unless the behavior requires browser-only proof from `tests/e2e/AGENTS.md`.

Good unit-test targets in this repo include:

- component structure and interaction
- state transitions
- event-bus emit/listen behavior
- IndexedDB reads and writes through fake IndexedDB
- router parsing and redirect logic
- single-component keyboard handlers
- settings, marks, review, tag, drawer, command-sheet, and similar feature logic

## Style

- Extend the owning surface's existing unit suite before creating a new test file when one already exists.
- Mock module-boundary dependencies, not internal implementation details.
- Prefer focused behavior assertions over snapshot-heavy coverage.
- Use `@testing-library/svelte` plus the existing Vitest setup; do not add custom harness wiring unless the test truly needs it.

## Component recipe

Use the existing test stack:

- `@testing-library/svelte`
- `vitest`
- `fake-indexeddb` from `tests/setup.js`

Typical pattern:

```ts
import { render } from '@testing-library/svelte'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../src/data/dataset', () => ({
  getSurahs: vi.fn(async () => []),
}))
```

If a test starts depending on real layout, service workers, or reload/hydration semantics, stop and move that slice to e2e instead of stretching the unit harness.
