# QuranAtlas Tech Stack

Tools, versions, and operating rules for the current React-only app. Architecture and ownership details live in [`docs/context/`](context/).

> **Keep fresh with code changes.** Any change to `package.json` scripts, dev tools, pinned versions, or CI gates must update this file in the same change.

## Tooling

| Layer | Tool | Version | Purpose |
| --- | --- | --- | --- |
| Package manager | pnpm | `10.31.0` | Strict dependency isolation and reproducible lockfile installs |
| Build tool | Vite | `^8.0.10` | React dev server, production bundling, preview server |
| UI framework | React + React DOM | `^19.2.6` | Sole application framework |
| Vite integration | `@vitejs/plugin-react` | `^6.0.2` | JSX/TSX transform and React refresh |
| Styling | Tailwind CSS v4 + `@tailwindcss/vite` | `^4.3.0` | Utility authoring mapped to QuranAtlas semantic tokens |
| UI primitives | Radix UI React | pinned per package | Behavior primitives used only behind `src/components/ui/**` |
| UI helpers | class-variance-authority, clsx, tailwind-merge, lucide-react | pinned in `package.json` | Component variants, class composition, icons |
| Storage | Dexie | `^4.4.2` | IndexedDB access for `quran-atlas` stores |
| Reader lists | TanStack Virtual | `^3.13.26` | Available for measured list virtualization where needed |
| Language | TypeScript | `^6.0.3` | Strict TS/TSX type checking |
| PWA | vite-plugin-pwa + Workbox | `^1.3.0`, `^7.4.1` | Manifest, service worker, app-shell precache, runtime dataset cache |
| Unit/component tests | Vitest + Testing Library React | `^4.1.5`, `^16.3.2` | jsdom and browser-adjacent component coverage |
| E2E/visual | Playwright | `^1.59.1` | Route, offline, accessibility, and visual regression evidence |
| Storybook | Storybook React/Vite | `10.4.1` | React component development and review surface |
| Lint | ESLint + typescript-eslint | `^10.2.1`, `^8.59.1` | JS/TS/TSX quality gate |
| Perf | Lighthouse CI | `^0.15.1` | Production artifact performance and best-practice gate |
| Deploy | Cloudflare Wrangler | pinned in `package.json` | Deploys the CI-built `dist/` artifact |

`pnpm.overrides` pins patched transitive dependency ranges for CI audit gates. Keep overrides narrow and remove them when upstream direct dependencies resolve without help.

## App Shape

- `index.html` mounts React into `#react-root`.
- `vite.config.js` is the single app build config. `pnpm run build` writes `dist/`; `pnpm run preview` serves `dist/`.
- `src/app/App.tsx` owns hash routing and top-level providers.
- `src/components/ui/**` is the only allowed layer for direct Radix imports.
- `src/design-system/**` is the styling source of truth: semantic tokens, Tailwind theme, registry, recipes, and design-system docs.
- Runtime dataset files are same-origin under `/dataset/**`; build-only source data lives under `data/**`.

## Scripts

| Command | Action |
| --- | --- |
| `pnpm run dev` | Start the Vite React dev server on port 5173 |
| `pnpm run preview` | Serve `dist/` on port 4173 |
| `pnpm run clean` | Remove `dist` and `test-output` |
| `pnpm run build` | Build runtime dataset, then build the React app into `dist/` |
| `pnpm run data -- build` | Build the baseline committed runtime dataset while preserving the existing dataset timestamp unless `QURANATLAS_DATASET_BUILT_AT` is set |
| `pnpm run data -- build --profile=full` | Build every approved current dataset profile |
| `pnpm run data -- check` | Validate source catalog and baseline generated dataset inputs |
| `pnpm run data:fetch -- <type>:<id>` | Fetch and normalize catalog-backed source data |
| `pnpm run test` | Run Vitest once |
| `pnpm run test:e2e` | Run the React Playwright suite |
| `pnpm run test:e2e:golden` | Build if needed, then run `@golden` Playwright specs against preview |
| `pnpm run test:e2e:a11y` | Build if needed, then run `@a11y` Playwright specs against preview |
| `pnpm run test:e2e:offline` | Build if needed, then run `@offline` Playwright specs against preview |
| `pnpm run visual` | Run Playwright visual regression specs |
| `pnpm run storybook` | Start React Storybook on port 6007 |
| `pnpm run build:storybook` | Build Storybook into `storybook-static/` |
| `pnpm run test:storybook` | Run Storybook Vitest/browser checks |
| `pnpm run lint` | Run ESLint over app, shared code, tests, and configs |
| `pnpm run typecheck` | Run TypeScript with `tsconfig.json` |
| `pnpm run check` | Typecheck, lint, import-boundary, design, registry, UI-pattern, and Mushaf asset checks |
| `pnpm run docs` | Regenerate context docs and generated inventories |
| `pnpm run docs:check` | Assert generated docs are current |
| `pnpm run lighthouse` | Build and run Lighthouse CI |
| `pnpm run validate` | Full local release gate: static checks, tests, build, chunks, e2e, offline, visual, Storybook, docs |

`PLAYWRIGHT_SKIP_BUILD=1` tells preview-oriented Playwright scripts to reuse an existing `dist/` artifact. CI uses this after downloading the build job artifact so the same app bundle is tested and deployed.

## Static Gates

- `scripts/check-react-boundaries.mjs`: rejects imports of retired style partials and retired legacy class selectors in React source.
- `scripts/check-react-design-literals.mjs`: keeps colors, radii, motion, and Tailwind arbitrary values token-aligned.
- `scripts/check-react-radix-boundaries.mjs`: allows direct Radix imports only under `src/components/ui/**`.
- `scripts/check-react-component-registry.mjs`: validates registry ordering and referenced component/story/test paths.
- `scripts/check-react-ui-forbidden-patterns.mjs`: keeps feature code on owned UI primitives.
- `scripts/check-react-mushaf-assets.mjs` and `scripts/check-react-mushaf-indexes.mjs`: enforce edition-aware Mushaf contracts and prevent page SVG bodies from shipping in JS bundles.
- `scripts/check-chunks.js`: enforces the production chunk budget.

Warnings from build, lint, check, docs, or CI scripts are treated as failures.

## CI/CD

CI lives at `.github/workflows/ci.yml` and runs on push/PR to `main`, `dev`, and `staging`. Jobs share `.github/actions/setup`, which pins pnpm and Node, restores the pnpm cache, and installs from `pnpm-lock.yaml`.

| Job | Purpose |
| --- | --- |
| `lint` | Job id retained for branch-protection continuity; runs `pnpm run check` |
| `test` | `pnpm run test` |
| `feature-state` | Top-level mutable feature-state guard |
| `docs-check` | `pnpm run docs:check` |
| `dataset-catalog` | `pnpm run data -- check` |
| `dataset-baseline` | `pnpm run data -- build` |
| `dataset-full` | Full profile build when protected branches or dataset-relevant diffs require it |
| `audit` | `pnpm audit --audit-level moderate` |
| `build` | Generates required Mushaf page artifacts, runs `pnpm run build`, uploads `dist/` |
| `lighthouse` | Runs Lighthouse against uploaded `dist/` |
| `e2e` | Runs non-visual React Playwright specs plus explicit offline preview specs against uploaded `dist/` |
| `ci-ok` | Aggregates required job results |

Deploy lives at `.github/workflows/deploy.yml`. On successful CI for branch pushes to `dev`, `staging`, or `main`, it downloads the same `dist/` artifact and deploys it to Cloudflare Pages. CI builds once; deploy does not rebuild.
