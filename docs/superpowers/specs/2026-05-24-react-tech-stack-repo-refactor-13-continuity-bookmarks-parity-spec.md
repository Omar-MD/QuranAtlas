# React Tech Stack Refactor 13 - Continuity And Bookmarks Parity Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-08-offline-storage-asset-pack-architecture-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-09-reader-surface-parity-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-10-navigation-settings-onboarding-parity-spec.md`

## Purpose

Preserve reading continuity in React: onboarding-gated launch restore, valid
`lastSurface`, saved position fallback, riwayah-scoped bookmarks, bookmark
landing pulse, cross-tab bookmark coherence, reload behavior, and operational
route exclusions.

## Current Docs Requirement

This spec uses QuranAtlas router, IDB, and BroadcastChannel contracts. If
implementation introduces a new routing, storage synchronization, or state
library, fetch current docs through Context7 before writing the implementation
plan.

## Scope

In scope:

- Launch restore cascade.
- `settings.lastSurface` persistence and exclusions.
- `settings.currentPosition` persistence and validation.
- Riwayah-scoped bookmark store behavior.
- Bookmark toggle, indicator, grouped lists, and jump landing pulse.
- Cross-tab bookmark coherence.
- DB version-change and clear-data safety behavior that affects continuity.
- Unit and e2e proof for reload, cross-tab, and bookmark behavior.

Out of scope:

- Personal notes, tags, comments, review, marks, edges, or sync accounts.
- Daily Wird plan internals. That belongs to child spec `14`.
- Reader layout implementation except where continuity requires hooks.
- Changing the IDB schema without a separate migration spec.

## Required Reads

- `AGENTS.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/events.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- `docs/context/surfaces/infra.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- Parent master spec
- Child specs `08`, `09`, and `10`

## Allowed Files And Directories

Allowed create:

- `src-react/continuity/**`
- `src-react/components/navigation/bookmarks/**`
- Unit tests under `tests/unit/**`
- E2E tests under `tests/e2e/read/**`, `tests/e2e/navigate/**`,
  `tests/e2e/onboard/**`, and `tests/e2e/infra/**`

Allowed modify:

- React router and continuity adapters.
- React bookmark UI and registry entries.
- Context docs when current behavior changes.

Forbidden modify:

- Bookmark store schema without a migration spec.
- Cross-device account sync.
- Removed-scope personal study data.
- Runtime upstream fetches.

## Launch Restore Contract

React launch restore must follow:

1. If onboarding is incomplete, navigate to `#/onboarding`.
2. If a valid launchable `settings.lastSurface` exists, navigate there.
3. If `settings.currentPosition` is valid, navigate to `#/s/:surah/:verse`.
4. Otherwise navigate to `#/s/1`.

Excluded operational routes must not become launch surfaces:

- `#/onboarding`;
- `#/settings`;
- `#/assets`;
- any temporary modal, sheet, or install route introduced later.

## Bookmark Contract

Bookmarks remain reading-continuity data:

- store: `bookmarks`;
- key format: active riwayah plus verse key;
- Hafs, Warsh, and Qalun (`qaloon`) bookmarks are separate records;
- verse-number toggle is the primary reader action;
- grouped lists show only active-riwayah bookmarks;
- bookmark jumps route to the verse and pulse the landing target;
- cross-tab updates refresh indicators and lists.

Bookmarks must not become notes, tags, comments, or review cards.

## Deliverables

- React launch-restore, current-position, and `lastSurface` continuity adapters.
- React bookmark toggle, indicator, grouped-list, jump, and landing-pulse flows.
- Same-device cross-tab bookmark coherence and clear-data/version-change safety
  integration.
- Unit/component tests and e2e proof for reload, warm resume, bookmark jump, and
  cross-tab behavior.
- Updated context docs, registry entries, and agent instructions for any current
  continuity or bookmark ownership changes.

## Acceptance Criteria

- Reload after onboarding restores the correct launchable surface.
- Invalid or excluded `lastSurface` falls back safely.
- Saved reader position validates before routing.
- Bookmarks are scoped by active riwayah.
- Bookmark changes synchronize across same-device tabs.
- Clear-data/version-change safety remains visible.
- Continuity tests cover warm resume, reload, bookmark jump, and cross-tab cases.

## Verification

Run targeted continuity tests, plus:

```bash
pnpm run docs:check
git diff --check
```

Run owning e2e specs for browser-only proof:

```bash
pnpm exec playwright test tests/e2e/onboard tests/e2e/navigate tests/e2e/infra --reporter=line
```

If router, storage, or app bootstrap behavior changes, also run:

```bash
pnpm run check
pnpm run build:react
```

Expected result:

- Continuity and bookmark tests pass.
- Cross-tab/browser-only proof passes where changed.
- Docs checks are clean.

## Rollback And Failure Handling

- If launch restore can loop, disable the new restore branch and fall back to
  `#/s/1` until validation is fixed.
- If bookmark writes fail, surface the existing save-failure pattern rather than
  silently dropping the action.
- If cross-tab coherence flakes, prefer narrower event/writer ownership over
  broad polling.

## Handoff

Child spec `14 Daily Wird Parity` must compose with continuity without changing
bookmark scope or launch restore rules. Child spec `15` must include golden
routes for reload and bookmark landing behavior.
