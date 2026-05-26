# React Tech Stack Refactor 16 - Cutover Readiness Evidence

## Status

React is not production-shipped by this evidence document. Svelte remains the
production entry until Wave `17` explicitly flips it after approval.

## Approval Gate

Wave `17` may begin only after the user/stakeholder explicitly approves
production entry flip based on this evidence.

Approval status: not approved.

## Child Spec Readiness

| Wave | Gate | Evidence command or file | Status | Notes |
| --- | --- | --- | --- | --- |
| 00 | Stack docs verified | `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md` | pass | Current-doc verification policy is recorded in the master spec and handoff log. |
| 01 | React dual-build isolated | `pnpm run build:react` | pass | React remains non-deploy during dual-build. |
| 02 | Svelte reference baseline frozen | `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-appendix.md` | pass | Accepted differences remain none. |
| 03 | Tokens/Tailwind checks | `pnpm run check:react` | pass | Included in `validate:react`. |
| 04 | Storybook/component harness | `pnpm run build:storybook:react && pnpm run test:storybook:react` | pass | Included in `validate:react`. |
| 05 | Visual regression provider durable | `pnpm run visual:react` | pass | Local Playwright screenshot baselines remain the selected durable strategy. |
| 06 | Owned component layer | `pnpm run check:react` | pass | Direct Radix/raw component checks are included. |
| 07 | Registry and agent rules | `pnpm run check:react-registry` | pass | Registry drift checks are included. |
| 08 | Offline/storage architecture | `pnpm run test:react` | pass | React v7 storage mirror and offline contracts are covered by unit tests. |
| 08A | Mushaf app/asset split | `pnpm run check:react-mushaf-assets` | pass | No Mushaf SVG bodies or legacy React paths in `dist-react/`. |
| 09 | Reader parity | `pnpm run test:e2e:react:golden` | pass | Verse and Mushaf golden fixtures pass. |
| 10 | Navigation/settings/onboarding parity | `pnpm run test:e2e:react:golden` | pass | Navigation, settings, assets, about, and onboarding fixtures pass. |
| 11 | Search/index parity or explicit deferral | `pnpm run test:e2e:react:golden` | pass | React preview search route and query hash routing pass; generated production search shards remain a cutover follow-up if required. |
| 12 | Curated metadata parity | `pnpm run test:react` | pass | Metadata unit coverage remains part of React tests. |
| 13 | Continuity/bookmarks parity | `pnpm run test:e2e:react:golden` | pass | Empty-hash launch restore and bookmarks route proof pass. |
| 14 | Daily Wird parity | `pnpm run test:e2e:react:golden` | pass | Daily Wird no-plan/active route-adjacent proof passes. |
| 15 | Golden/a11y/offline/visual gates | `pnpm run validate:react` | pass | Wave 15 gates are included in the React composite gate. |

## Command Evidence

| Command | Expected outcome | Result |
| --- | --- | --- |
| `pnpm run validate` | Existing Svelte production gate passes | pass: check, 130 Vitest files / 927 tests, production build, chunk checks, and docs check |
| `pnpm run validate:react` | React parity gate passes | pass: React static checks, 21 React unit files / 48 tests, build, 37 React e2e passes with one offline-in-dev skip, explicit offline preview pass, visual, Storybook, and docs check |
| `pnpm run build:react` | React app-shell artifact builds in its non-production output path | pass |
| `pnpm run test:e2e:react` | React Playwright route and golden/a11y specs pass; offline preview spec is skipped unless explicitly enabled | pass: 37 passed, 1 skipped |
| `pnpm run docs:check` | Generated docs are current | pass: `derive: all clean` |
| `git diff --check` | No whitespace errors | pass |

## Artifact Routing Readiness

- Current production deploy artifact: `dist/` from `pnpm run build`.
- Current CI artifact name: `build-output`.
- Current deploy workflow: `.github/workflows/deploy.yml` downloads `build-output`
  into `dist/` and runs `pnpm dlx wrangler@latest pages deploy dist --project-name=quranatlas --branch="${TARGET_BRANCH}" --commit-hash="${TARGET_SHA}"`.
- React dual-build artifact before Wave `17`: `dist-react/`, proof-only and not deployed.
- React preview service worker before Wave `17`: emitted only into `dist-react/` by `vite.react.config.js`; it does not replace the shipped Svelte service worker.
- Wave `17` must decide whether to keep `dist/` as the deploy path by making `pnpm run build` emit React there, or update CI/deploy artifact routing in the same production flip.
- Same-origin asset-pack publish root: `/dataset/**`.
- App-shell deploy without the validated asset-pack artifact set is not a complete production flip.

## Rollback Plan

Rollback before Wave `17`: no production rollback needed; Svelte remains production.

Rollback after Wave `17`: revert the production entry/config/CI/deploy changes
from Wave `17`, keep Svelte source and dependencies retained, redeploy the
previous Svelte-compatible `dist/` artifact, and preserve same-origin
`/dataset/**` asset packs unless the rollback evidence proves a cache conflict.

## Staging And Dev Soak Policy

- Dev soak: React production-entry candidate must run on `dev` after Wave `17`
  with green CI, golden routes, a11y, visual, offline, and smoke checks.
- Staging soak: React candidate must run on `staging` with the same gates and
  manual smoke over reader, Mushaf, settings/assets, search, bookmarks, Daily
  Wird, onboarding, and offline installed assets.
- Main production flip: allowed only after dev and staging soak pass and
  rollback remains documented.
- Soak failure: revert Wave `17` production entry changes; do not start Wave `18`.

## Wave 17 Handoff

Wave `17` must update these surfaces in one production-flip change:

- `package.json` and lockfile if script/dependency routing changes.
- production Vite/app entry and React service-worker production config.
- `.github/workflows/ci.yml` and `.github/workflows/deploy.yml` if artifact routing changes.
- `docs/tech-stack.md`, `docs/context/architecture.md`,
  `docs/context/repo-structure.md`, `docs/context/implemented.md`, generated
  context docs, and repo-local skills.
- service-worker migration and rollback smoke tests.
