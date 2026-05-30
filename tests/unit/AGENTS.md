# AGENTS.md — unit testing rules

These instructions apply to `tests/unit/**`.

## Default

New tests belong here unless the behavior requires browser-only proof from `tests/e2e/AGENTS.md`.

Good unit-test targets in this repo include:

- React component structure and interaction
- state transitions and reducer logic
- IndexedDB reads and writes through fake IndexedDB
- router parsing and redirect logic
- single-component keyboard handlers
- settings, drawer, bookmarks, reader, Daily Wird, storage, data, and script logic

## Style

- Extend the owning surface's existing unit suite before creating a new test file when one already exists.
- Mock module-boundary dependencies, not internal implementation details.
- Prefer focused behavior assertions over snapshot-heavy coverage.
- Use `@testing-library/react`, Vitest, and the shared setup in `tests/setup.js`.
- Keep React app tests under `tests/unit/react-*`; keep dataset/script contract tests under `tests/unit/scripts`; keep shared contract tests under `tests/unit/shared`.

## Component Recipe

Use the existing React test stack:

- `@testing-library/react`
- `vitest`
- `fake-indexeddb` from `tests/setup.js`

Typical pattern:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/data/reader-corpus', () => ({
  loadReaderSurah: vi.fn(async () => ({ status: 'missing' })),
}))
```

If a test starts depending on real layout, service workers, or reload/hydration semantics, move that slice to e2e instead of stretching the unit harness.
