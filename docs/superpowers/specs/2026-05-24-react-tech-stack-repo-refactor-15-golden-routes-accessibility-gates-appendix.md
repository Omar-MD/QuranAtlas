# React Tech Stack Refactor 15 - Golden Routes And Accessibility Gates Appendix

## Status

React remains non-production during this gate. Svelte remains the production
entry until a later approved production flip changes build and deploy routing.

## Fixture Source

- React fixture module: `tests/e2e/fixtures/react-golden-routes.ts`
- Svelte reference appendix: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-appendix.md`
- Visual-regression policy: Wave `05` selected local Playwright screenshot baselines

## Accepted Svelte-Reference Differences

Initial accepted differences: none.

| Fixture id | Difference | Product reason | Proof link or command | Approval source |
| --- | --- | --- | --- | --- |

## Gate Evidence Index

| Gate | Command | Expected outcome |
| --- | --- | --- |
| React validation | `pnpm run validate:react` | static, registry/token, unit/component, Storybook, build, e2e, visual, offline, and docs checks pass |
| Golden routes | `pnpm run test:e2e:react:golden` | all golden fixtures pass against the React dev target |
| Accessibility | `pnpm run test:e2e:react:a11y` | axe, overflow, touch-target, keyboard/focus, and route assertions pass |
| Offline/SW | `pnpm run build:react && pnpm run test:e2e:react:offline` | React preview build serves app shell offline through its isolated service worker |
| Visual regression | `pnpm run visual:react` | selected local Playwright screenshot baselines pass under Wave `05` policy |

## Fixture Coverage

The Wave 15 fixture matrix covers empty-hash launch restore, onboarding, Verse
reader, ayah deeplink, Mushaf reader, Surah directory, bookmarks, settings,
asset management, About, search, Daily Wird no-plan/active states, and React
preview offline reload. The matrix records viewport and theme coverage; durable
browser proof is owned by the React e2e specs listed in each fixture.
