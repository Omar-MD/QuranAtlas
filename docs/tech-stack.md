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
| Unit/component tests | Vitest + Testing Library React | `^4.1.6`, `^16.3.2` | Split Node script/shared coverage and jsdom React/component coverage |
| E2E/visual | Playwright | `^1.59.1` | Route, offline, accessibility, and visual regression evidence |
| Storybook | Storybook React/Vite | `10.4.1` | React component development and review surface |
| Lint | ESLint + typescript-eslint | `^10.2.1`, `^8.59.1` | JS/TS/TSX quality gate |
| Perf | Lighthouse CI | `^0.15.1` | Production artifact performance and best-practice gate |
| Deploy | Cloudflare Wrangler | pinned in `package.json` | Deploys the CI-built `dist/` artifact |
| Private Mushaf import | Poppler (`pdfinfo`, `pdftocairo`) + WebP (`cwebp`, `webpinfo`) | host tooling; exact command version output recorded per import | Verifies the explicit PDF CropBox, renders and encodes the pinned local-only Qaloun edition, and validates WebP output |
| Private Mushaf transport | GitHub Releases (`gh`) + USTAR (`tar`) | host tooling; archive contract pinned in the catalog | Publishes one immutable, checksum-bound normalized Furatiyyah input without the source PDF |

`pnpm.overrides` pins patched transitive dependency ranges for CI audit gates, including toolchain-only packages such as `esbuild` when upstream Storybook/Vite/Wrangler ranges lag an audit advisory. Keep overrides narrow and remove them when upstream direct dependencies resolve without help.

## App Shape

- `index.html` mounts React into `#react-root`.
- `vite.config.js` is the single app build config. Vite's default full `public/` copy is disabled; raw Vite builds emit only shell public assets (`_headers`, favicon, notification service-worker helper, fonts, and icons). `pnpm run build` and `pnpm run ci:build` copy runtime dataset and Search pack assets into `dist/` after Vite finishes; `pnpm run preview` serves `dist/`.
- `src/app/App.tsx` owns hash routing and top-level providers.
- `src/components/ui/**` is the only allowed layer for direct Radix imports.
- `src/design-system/**` is the styling source of truth: semantic tokens, Tailwind theme, registry, recipes, and design-system docs.
- `src/design-system/tokens/tailwind-theme.css` uses Tailwind v4 explicit source registration so generated datasets and Search pack assets are not scanned as class sources.
- Runtime dataset files are same-origin under `/dataset/**`; build-only source data lives under `data/**`.

## Scripts

| Command | Action |
| --- | --- |
| `pnpm run dev` | Start the Vite React dev server on port 5173 |
| `pnpm run preview` | Serve `dist/` on port 4173 |
| `pnpm run clean` | Remove `dist` and `test-output` |
| `pnpm run build` | Build runtime dataset, build the React app into `dist/`, then copy runtime dataset/Search assets into the artifact |
| `pnpm run ci:affected` | Internal CI/local helper: print changed-file gate decisions |
| `pnpm run ci:build` | Internal CI/local helper: build `dist/` while skipping dataset generation unless affected gates require it, then copy runtime `public/dataset` and `public/search-packs` into the release artifact |
| `pnpm run data -- build` | Build the baseline committed runtime dataset while preserving the existing dataset timestamp unless `QURANATLAS_DATASET_BUILT_AT` is set |
| `pnpm run data -- build --skip=mushaf-pages` | Rebuild non-Mushaf baseline dataset lanes while reusing existing local/generated Mushaf page assets |
| `pnpm run data -- build --profile=full` | Build every approved current dataset profile |
| `pnpm run data -- check` | Validate source catalog and baseline generated dataset inputs, including Search pack bytes; stamped Mushaf page artifacts are checked when local page inputs are present |
| `pnpm run data -- mushaf-pages import --edition=qalun-furatiyyah-2023-v1 --pdf="/absolute/path/to/pinned.pdf"` | Verify the pinned PDF and passed runtime media gate, then atomically import it into ignored edition-scoped WebP inputs with current contract and exact tool-version provenance; requires `pdfinfo`, `pdftocairo`, `cwebp`, and `webpinfo` |
| `pnpm run data -- mushaf-pages restore-release --archive=/absolute/path/to/archive.tar` | Verify and atomically restore the exact checksum-pinned private normalized USTAR from a local path; download/network ownership stays outside the data module |
| `QURANATLAS_PRIVATE_MUSHAF=1 PLAYWRIGHT_USE_PREVIEW=1 PLAYWRIGHT_INCLUDE_OFFLINE=1 pnpm exec playwright test <private-reader-specs>` | Run the gated private production-preview reader and exact-rendition offline proof; trusted `dev` push CI sets the flag, while PR/`staging`/`main` lanes leave it disabled |
| `pnpm run data:fetch -- <type>:<id>` | Fetch and normalize catalog-backed source data |
| `pnpm run test` | Run the full Vitest unit suite once across Node and React projects |
| `pnpm run test:fast` | Run the split Vitest unit suite while skipping generated Search pack/morphology integration smoke tests |
| `pnpm run test:node` | Run script and shared Vitest suites in the Node project without jsdom or Testing Library setup |
| `pnpm run test:react` | Run React Vitest suites in the jsdom project with Testing Library setup |
| `pnpm run test:unit:full` | Explicit full Vitest unit-suite alias used when local loops need release-equivalent unit coverage |
| `pnpm run test:e2e` | Run the React Playwright suite |
| `pnpm run test:e2e:preview -- <args>` | Ensure the preview artifact has the Qaloon Mushaf page pack, then run Playwright against preview |
| `pnpm run test:e2e:golden` | Run `@golden` Playwright specs, including their accessibility assertions, through the shared preview runner |
| `pnpm run test:e2e:offline` | Run `@offline` Playwright specs through the shared preview runner with offline coverage enabled |
| `pnpm run visual` | Run Playwright visual regression specs |
| `pnpm run storybook` | Start React Storybook on port 6007 |
| `pnpm run build:storybook` | Build Storybook into `storybook-static/` |
| `pnpm run test:storybook` | Run Storybook Vitest/browser checks |
| `pnpm run lint` | Run ESLint over app, shared code, tests, and configs |
| `pnpm run typecheck` | Run TypeScript with `tsconfig.json` |
| `pnpm run check` | Run the parallel static-gate orchestrator for typecheck, lint, import-boundary, design, registry, UI-pattern, Mushaf asset, feature-state, and UI-reference checks |
| `pnpm run docs` | Regenerate context docs and generated inventories |
| `pnpm run docs:check` | Assert generated docs are current |
| `pnpm run lighthouse` | Build and run Lighthouse CI |
| `pnpm run validate` | Full local release gate: static checks, tests, build, chunks, e2e, offline, visual, Storybook, docs |
| `pnpm run validate:affected` | Local affected release gate: static checks/tests always, then build/e2e/visual/Storybook only when changed-file gates require them |

`PLAYWRIGHT_SKIP_BUILD=1` tells preview-oriented Playwright scripts to reuse an existing `dist/` artifact. CI downloads the build job artifact and runs Playwright directly against preview so the same app bundle is tested and deployed.

The standalone preview scripts are non-overlapping lanes: `test:e2e:golden` owns current accessibility assertions because the browser accessibility specs are tagged `@golden @a11y`, and `test:e2e:offline` owns service-worker/offline coverage. Use `test:e2e:preview -- <args>` for ad hoc Playwright filters instead of adding tag aliases that rerun the same tests.

## Static Gates

- `scripts/check-react-boundaries.mjs`: rejects imports of retired style partials and retired legacy class selectors in React source.
- `scripts/check-react-design-literals.mjs`: keeps colors, radii, motion, and Tailwind arbitrary values token-aligned.
- `scripts/check-react-radix-boundaries.mjs`: allows direct Radix imports only under `src/components/ui/**`.
- `scripts/check-react-component-registry.mjs`: validates registry ordering and referenced component/story/test paths.
- `scripts/check-react-ui-forbidden-patterns.mjs`: keeps feature code on owned UI primitives.
- `scripts/check-react-mushaf-assets.mjs` and `scripts/check-react-mushaf-indexes.mjs`: enforce edition-aware Mushaf contracts and prevent page SVG bodies from shipping in JS bundles.
- `scripts/check-no-feature-state.js`: prevents mutable feature-state scaffolding from shipping.
- `scripts/check-ui-references.mjs`: validates committed UI reference images and notes.
- `scripts/check-chunks.js`: enforces the production chunk budget.
- `scripts/ci/check.mjs`: runs independent static gates in parallel for the local/CI `check` lane.

Search pack generation is part of the data lane. `scripts/data/search/build.mjs` emits `public/search-packs/registry.json` and immutable pack manifests/shards under `public/search-packs/packs/<contentHash>/**`; `scripts/data/search/validate.mjs` verifies the generated registry, manifest, shard checksums, and forbidden `/dataset/search/**` URL shape. QAC morphology source validation runs in the same lane before morphology-derived Search shards can ship. Phase 3 graph builders under `scripts/data/search/graph/**` emit bounded attested following-wording, shared-wording, repeated-phrase, occurs-once, ayah-ending, and Counts & patterns shards.

Warnings from build, lint, check, docs, or CI scripts are treated as failures.

## CI/CD

CI lives at `.github/workflows/ci.yml` and runs on push/PR to `main`, `dev`, and `staging`. Jobs share `.github/actions/setup`, which pins pnpm and Node, restores the pnpm cache, and installs from `pnpm-lock.yaml`.

| Job | Purpose |
| --- | --- |
| `lint` | Job id retained for branch-protection continuity; runs `pnpm run check` |
| `test` | `pnpm run test` |
| `docs-check` | `pnpm run docs:check` |
| `dataset-catalog` | `pnpm run data -- check` when dataset-relevant diffs require it |
| `dataset-baseline` | `pnpm run data -- build` when dataset-relevant diffs require it |
| `dataset-full` | Full profile build when dataset-relevant diffs require it |
| `audit` | `pnpm audit --audit-level moderate` |
| `build` | Restores and prebuilds the private Mushaf profile for trusted `dev` pushes, otherwise generates baseline Mushaf pages when affected/Playwright gates require them; then runs `ci:build`, checks chunks, and uploads uncompressed `dist/` |
| `lighthouse` | Runs three Lighthouse collections against uploaded `dist/` when build-relevant diffs require it |
| `e2e` | Runs non-visual, offline, and visual React Playwright specs against uploaded `dist/` |
| `storybook` | Builds Storybook and runs Storybook Vitest/browser checks when Storybook-relevant diffs require it |
| `ci-ok` | Aggregates required job results |

Deploy lives at `.github/workflows/deploy.yml`. On successful CI for branch pushes to `dev`, `staging`, or `main`, it downloads the same `dist/` artifact and deploys it to Cloudflare Pages. CI builds once; deploy does not rebuild.

Affected-change and branch-profile decisions live in `scripts/ci/affected.mjs` so CI and local validation share the same path groups and only a trusted `push` to `dev` selects the private Mushaf lane. That lane reads the committed distribution descriptor, caches the ignored normalized edition by its complete archive SHA only, downloads the exact GitHub Release asset on a miss, restores it through the local USTAR boundary, ensures quran.ws normalized pages, and prebuilds/checks the private profile before `ci:build`. It also forces production-preview E2E with the private flag. PR, `staging`, and `main` builds retain the affected baseline behavior.

The production app bundle still builds for deployable CI runs, but baseline dataset generation runs only when source data, dataset scripts, Search contracts, Search pack outputs, reader asset profiles, or dependency files that affect those artifacts changed. `scripts/ci/build.mjs` preserves a prebuilt Mushaf profile while rebuilding other affected lanes, then copies `public/dataset` and `public/search-packs` into `dist/`. The build artifact uses upload compression level 0 because its page media is already compressed; Lighthouse, Playwright, and the unchanged deploy workflow consume the same artifact. All Search dataset lanes (`shared/search/**`, `scripts/data/search/**`, Search catalogs and normalized sources, and `public/search-packs/**`) trigger dataset and full-dataset gates, while baseline Mushaf page import/build remains scoped to Mushaf page inputs or Playwright-selected artifacts.
