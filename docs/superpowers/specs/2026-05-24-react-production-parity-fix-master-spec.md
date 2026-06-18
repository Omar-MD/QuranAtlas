# React Production Parity Fix Master Spec

> Superseded current-state note: `docs/superpowers/specs/2026-05-28-mvp-default-assets-reset-design.md` narrows the active parity target to the MVP default reader asset profile: Qaloon text/font, Qaloon Mushaf, and Bridges translation. Any older instruction here to restore onboarding source choices, tafsir UI, optional Hafs/Warsh packs, or install/verify asset workflows is historical planning context, not current implementation guidance.

## Purpose

React currently builds as a production-target preview, but the completed parity audit shows that the preview is not production-parity with the working Svelte app. This spec converts audit issues `RPA-001` through `RPA-012` into an executable recovery program.

The goal is to make the React proof app match the current working Svelte runtime wherever React is intended to carry behavior, while preserving a few intentional React exclusions named by the user. React remains proof-only throughout this program.

## Authority And Oracle

The parity oracle is the current working Svelte app:

- Runtime behavior from `src/**`.
- CSS and responsive behavior from `src/styles/**`.
- Surface dossiers under `docs/context/surfaces/**`.
- Current Svelte production preview output from `pnpm run build` and `pnpm exec vite preview`.

Ignore `DESIGN.md` for expected behavior in this effort. It is later, unproven direction and must not redirect parity work.

For UI craft, `DESIGN.md` may be read only as supporting product-style context. Its Svelte-era rule that all styling belongs in `src/styles/**` does not override this recovery spec's React-only styling contract: React parity styling belongs in `src-react/design-system/**`, owned React components, and `qar:` utilities backed by `--qa-react-*` semantic tokens.

React parity must be proven against a production-target React build:

```bash
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm exec vite preview --config vite.react.config.js --host 127.0.0.1 --port <react-port> --strictPort
```

Svelte comparison proof must use:

```bash
pnpm run build
pnpm exec vite preview --host 127.0.0.1 --port <svelte-port> --strictPort
```

## Non-Goals

- No production flip.
- No Wave 17.
- No Svelte removal.
- No deploy workflow change.
- No design-redirection pass.
- No replacement of the Svelte oracle with `DESIGN.md`.
- No app-code changes in this planning pass.
- No treating existing React golden/offline tests as parity proof.

## Intentional React Non-Carry-Over

These are explicit React product exclusions. Child plans must not reintroduce them while restoring parity:

- React must not carry Tafsir reading mode, inline Tafsir preview, or full-screen Tafsir sheet behavior. Reader data may retain source identifiers only if needed for asset compatibility or future routing decisions, but no React reader UI should expose Tafsir study/reading modes.
- React Settings must not use the Svelte live verse preview or Mushaf page preview. Settings should use operational controls, source rows, summaries, and persistence proof without preview panes.
- React onboarding/source-choice UI is retired for the current MVP. Legacy
  `#/onboarding` hashes should route through the launch/default-asset-reset path
  without presenting Riwayah, Translation, Tafsir, or Mushaf choices.

Where these exclusions differ from Svelte, the React plan must record the difference as an intentional non-carry-over, not an accepted parity gap.

## React Architecture Guardrails

Parity work must be React-shaped, not a line-by-line Svelte port.

- Route components are containers: they parse route params, select providers/hooks, choose loading/error/ready branches, and pass props to product components.
- Data reads, writes, browser effects, Cache Storage, service-worker messages, and IndexedDB access live in typed loaders, storage facades, hooks, or providers. Product components must not call `fetch`, `caches`, `indexedDB`, or service-worker APIs directly.
- Durable UI state uses reducers, discriminated unions, or small providers with explicit states. Avoid scattered `useEffect`/`useState` chains inside route files for multi-step flows.
- Presentational components receive props and callbacks only. They do not own persistence, route normalization, or async request lifecycles.
- Every UI child plan must inspect `src-react/design-system/registry/component-registry.json`, compose approved primitives from `src-react/components/ui`, and update the registry/style-map when ownership changes.

Expected React boundaries include, where relevant:

- `useLaunchRestore`
- `useOnboardingFlow`
- `useReaderCorpus` / `useReaderSurah`
- `useReaderSettings`
- `useVerseInteractionReducer`
- `useReaderPositionSync`
- `useMushafPageAsset`
- `useSettingsForm`
- `useAssetIndexes`
- `useOfflineAssetState`
- `useWirdPlan`

Equivalent names are fine if the implementing plan documents the chosen boundary. The requirement is the separation of route containers, data hooks, reducers/providers, and presentational components.

## React Styling Guardrails

`src/styles/**` is a visual and responsive oracle only. React code must not import, copy, or depend on Svelte CSS partials, Svelte `.qa-*` styling classes, or global Svelte selectors. Implement visual parity by translating the accepted Svelte state into `src-react/design-system/**` semantic tokens, recipes, component variants, and `qar:` Tailwind utilities inside owned React design-system/product components.

New global React CSS is limited to `src-react/design-system/index.css` and `src-react/design-system/tokens/**`. Route, page, and product components must not add unscoped global selectors.

Every UI child plan must use only `qar:` prefixed Tailwind utilities backed by React semantic tokens from `src-react/design-system/tokens/**`. Class literals must resolve to `--qa-react-*` semantic tokens through `tailwind-theme.css`.

Forbidden in React feature/product code:

- built-in Tailwind palette utilities
- raw hex, rgb, hsl, or named color literals
- inline design styles
- primitive `--qar-*` token consumption outside token files
- unapproved arbitrary values
- one-off shadows, radii, motion, spacing, or z-index values

If parity requires a value not represented by existing React tokens, add or rename a semantic token, map it through Tailwind, update registry token namespaces, update docs/stories, and run `pnpm run check:react:design`.

Before changing visible component styling, define or update the owned component style API: variants, state props, density props, slot ownership, stable dimensions, and allowed `className` escape hatches. Use `class-variance-authority` for new style variants where it matches existing React UI conventions. Route files must not compose raw Tailwind layout for product states; they pass typed state into product components and recipes.

Overlay implementations must use owned `Sheet`/`Dialog` APIs. If parity requires side drawer, bottom sheet, destructive confirmation, or route-restoring settings shell styling, extend the owned overlay component variants and registry entries first. Feature components may fill typed slots; they must not build custom overlay containers or focus traps.

When a child plan changes React UI component styling, variants, token namespaces, page recipes, or stories, it must update the component registry and affected stories in the same change. Stories must cover relevant default, loading, error, empty, long-text, focus-visible, reduced-motion, mobile/tablet/desktop, and light/sepia/dark states.

UI parity fixtures must include token-resolved styling proof for light, sepia, dark, and Svelte-equivalent night mode `off`, `on`, and `auto` where the surface can render under those states. Required surfaces are reader verse, Mushaf, drawer, settings, read-only asset rows, launch splash, and Daily Wird where present. Assertions should locate elements by roles/names, then inspect computed styles or CSS variables for semantic-token resolution of canvas, surface, text, muted text, border, focus, accent, selection, danger, and reader-specific states.

Every changed visible React component must prove mobile, tablet, and desktop behavior against the Svelte oracle or an explicit intentional non-carry-over note. Required viewports are `320x568`, `375x812`, `768x1024`, and `1280x900` unless the child plan documents why a viewport is impossible or irrelevant. Proof must include no horizontal overflow, no sticky/header/control overlap, no text clipping, minimum touch target sizing, stable dimensions across loading/error/ready states, and expected focus visibility.

## Data And Async Contract

React data and offline work must use shared typed boundaries:

- Dataset, index, page, search, settings, and offline reads go through reusable typed loaders plus React hooks/providers.
- Shared async state uses explicit `idle`, `loading`, `ready`, `unavailable`, `error`, and, when useful, `aborted` states.
- Loader cache keys include every identity that can affect the resource: route, riwayah, text style, Mushaf edition, translation, theme-affecting render dimensions where applicable, source id, and cache/index version.
- All loaders accept `AbortSignal`; hooks abort in-flight work when route/settings/asset identity changes.
- State commits are guarded by request id or equivalent last-request-wins logic.
- Abort is not treated as a user-visible data failure.
- Every React dataset/index/manifest/page/search URL is built by an approved path helper, validated as same-origin `/dataset/**`, and checked against the relevant manifest or index membership before fetch or cache insertion.
- Tests must reject absolute external URLs, path traversal, stale index entries, and manifest/index mismatches.
- The current MVP active text, translation, and Mushaf identities come from the
  default reader asset profile and are not user-switchable. Missing default
  assets must fail visibly or fail validation. Future promoted optional assets
  can use install/verify-before-activate after the multiple-profile contract is
  restored.

## UI Interaction Contract

Each UI child plan owns responsive and accessibility checks for its surface:

- Keyboard traversal and activation.
- Focus trap, focus return, Escape, and outside-close for sheets/dialogs/drawers.
- Body scroll lock where overlays cover the viewport.
- Route changes that close overlays or restore prior routes.
- Touch target checks for visible controls on the relevant route.
- Mobile, tablet, and desktop behavior for every changed visible component.

Selector policy for parity tests:

- Prefer roles, accessible names, route URLs, and dataset-derived content.
- Use `data-testid` only for cross-framework semantic anchors that cannot be expressed accessibly.
- Do not use CSS class or DOM-shape selectors as parity proof.

## Audit Issue Conversion

| Audit issue | Recovery area | Acceptance criterion |
| --- | --- | --- |
| `RPA-001` | Launch/default asset reset | Clean React production-target launch applies or recognizes the MVP default asset contract and opens/restores valid Svelte-equivalent reader surfaces without source-choice onboarding. |
| `RPA-002` | Reader corpus | React reader renders real dataset-backed Surah content, translations, metadata-compatible states, and verse interactions; no production hardcoded preview fallback is rendered. |
| `RPA-003` | Mushaf | React loads real edition-aware Mushaf SVG assets from `/dataset/mushaf-pages/{riwayah}/{mushafEditionId}/...`; placeholder SVG is absent from production-target builds. |
| `RPA-004` | Navigation/bookmarks | React drawer, Surah/Juz lists, and bookmarks read real data and stores; seeded bookmarks affect rendered output. |
| `RPA-005` | Settings/assets | React settings persist reader comfort controls through shared settings contracts, restore routes like Svelte, and render read-only default asset inventory rows from the default profile plus real dataset/index availability. |
| `RPA-006` | Search | Product decides whether current Svelte `#/search` not-found behavior remains the contract or search is deliberately promoted; React must align with that decision. |
| `RPA-007` | Retired onboarding | React legacy onboarding routes no longer present setup choices; they redirect through the launch/default-asset-reset path. |
| `RPA-008` | Daily Wird | React Daily Wird reads/writes real `settings.wirdPlan` continuity state and proves no-plan, create/edit, active progress, continue, and reload behavior. |
| `RPA-009` | About/product copy | React About copies Svelte mission, attribution, install affordance state, version, and clear-data behavior while removing unsupported React preview claims. |
| `RPA-010` | PWA/offline | React offline tests fail on dataset request failures and prove cached dataset-backed rendering, not fallback preview rendering. |
| `RPA-011` | Test harness | False-passing React golden/offline tests are replaced with Svelte-vs-React parity assertions, network/console failure guards, and seed effects that must change output. |
| `RPA-012` | Responsive chrome/a11y | React responsive chrome, control sizes, focus behavior, and touch targets match Svelte basics except intentional non-carry-over UI differences. |

## Dependency Order

1. Plan 00 repairs the parity harness and test gates. It must land first because the current tests encode false positives.
2. Plan 01 restores launch/default-asset-reset behavior and retires
   source-choice onboarding. It unblocks clean-context workflow proof for every
   later surface.
3. Plans 02 and 03 restore reader corpus and Mushaf asset loading. These are P0 data/render blockers and unblock navigation, settings, offline, and final gates.
4. Plan 04 restores navigation, Surah/Juz/bookmark behavior after reader route/data contracts are real.
5. Plan 05 restores settings and asset management after reader/Mushaf asset contracts exist.
6. Plan 06 restores Daily Wird after reader continuity and drawer entry points are real.
7. Plan 07 resolves the search route contract. The default recovery-path decision is to align React with current Svelte not-found behavior. If search is promoted instead, split that promotion into a separate pre-09 child plan after Plans 02 and 05; Plan 09 validates promoted search but is not a prerequisite for the promotion.
8. Plan 08 restores About, clear-data, PWA install affordance, and product copy.
9. Plan 09 performs production-target PWA/offline parity and the final blocker gate. It depends on Plans 00 through 08.

## Child Plans

Shared handoff log:

- `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`

Every child-plan executor must read the shared handoff log with `.agents/skills/child-plan-handover/SKILL.md` before app-code work. If the log records completed work, divergence, blockers, dependency intake, or validation evidence that changes a child plan, update the child plan first and record the reconciliation in the same log.

- `docs/superpowers/plans/2026-05-24-react-production-parity-fix-00-harness-and-false-positive-gates.md`
- `docs/superpowers/plans/2026-05-24-react-production-parity-fix-01-launch-and-onboarding.md`
- `docs/superpowers/plans/2026-05-24-react-production-parity-fix-02-reader-corpus-and-verse-interactions.md`
- `docs/superpowers/plans/2026-05-24-react-production-parity-fix-03-mushaf-real-assets.md`
- `docs/superpowers/plans/2026-05-24-react-production-parity-fix-04-navigation-surah-juz-bookmarks.md`
- `docs/superpowers/plans/2026-05-24-react-production-parity-fix-05-settings-and-asset-management.md`
- `docs/superpowers/plans/2026-05-24-react-production-parity-fix-06-daily-wird-continuity.md`
- `docs/superpowers/plans/2026-05-24-react-production-parity-fix-07-search-route-contract.md`
- `docs/superpowers/plans/2026-05-24-react-production-parity-fix-08-about-clear-data-pwa-copy.md`
- `docs/superpowers/plans/2026-05-24-react-production-parity-fix-09-production-pwa-offline-final-gate.md`

## Global Test Strategy

Plan 00 must make the React test suite fail for the current broken production-target state before later plans fix behavior.

Required harness properties:

- Build both Svelte and React before parity comparison.
- Serve Svelte and React production previews on separate fixed ports.
- Commands must build first, then run Playwright. The Playwright config/scripts must either own those builds or fail fast when the expected build artifacts are missing or stale.
- React preview tests must assert a production deploy-target marker from the served app. A React dev build or non-production target must fail the suite.
- Use distinct `baseURL`s, build output directories, strict ports, CI `reuseExistingServer: false`, and per-target browser contexts.
- Clear IndexedDB, Cache Storage, local/session storage, and service workers per target before clean-context tests.
- Clear service workers and caches before and after target runs so no stale preview or cross-run state can pass a test.
- Seed React and Svelte with equivalent IndexedDB state through shared e2e helpers, and assert the shared storage schema version before seeding.
- Prove each seed changes rendered output compared with a no-seed baseline.
- Asset-cache seeds must use real URL/body/status entries and be verified through offline reload.
- Fail on page errors, console errors, failed requests, failed HTTP responses, and missing expected dataset requests according to a per-route expected request manifest.
- Per-route request manifests must name required URLs, optional URLs, allowed aborts, expected statuses, and rendered content that must be derived from fetched JSON/SVG rather than hardcoded fallback.
- Compare Svelte and React workflows for each relevant route instead of checking only React landmarks.
- Keep accepted differences explicit and limited to the intentional non-carry-over items in this spec.
- Include mobile, tablet, and desktop viewports where Svelte behavior differs: `320x568`, `375x812`, `768x1024`, and `1280x900`.
- Use a bounded `RPA-012` control matrix for responsive/a11y proof: drawer opener, reader controls, settings controls, asset rows, navigation rows, Mushaf controls, and known mobile chrome.

Required command shape after Plan 00:

```bash
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden
pnpm run test:e2e:react:offline
```

Child plans may add stable scripts only when needed and must update `docs/tech-stack.md` in the same change.

## Production-Target Verification Contract

Every implementation child plan must include:

- First-run failing tests against the current broken React state.
- A test-first checkpoint: write or adjust only the targeted test, run it against the current broken React production preview, capture the failing assertion class, and only then edit application code.
- React production-target build verification with `VITE_QURANATLAS_DEPLOY_TARGET=production`.
- Svelte-vs-React Playwright comparison for the owned workflow.
- `pnpm run check` when types, lint, Svelte, or styles can be affected.
- `pnpm run docs:check` and `git diff --check` for docs/context updates.
- Final `pnpm run validate:react` only when the plan changes shared React gates or broad React behavior.
- For any plan that modifies `src-react/**/*.tsx`, React stories, recipes, component registry entries, or React UI tests, run `pnpm run check:react`, `pnpm run check:react-registry`, and `pnpm run check:react-ui-patterns`.
- If a plan touches Mushaf rendering, build output, app-shell public assets, or asset-pack paths, also run `pnpm run check:react-mushaf-assets`.
- If a plan changes React product components, UI primitives, page recipes, or Storybook stories, update story states and run `pnpm run build:storybook:react` plus `pnpm run test:storybook:react`.
- When the changed surface has visual proof ownership in `docs/context/style-map.md`, run `pnpm run visual:react` or document why the existing visual target does not cover the changed surface.

Plan 09 owns the final broad gate and must run the complete production-target comparison.

## Documentation Rules

- Update owning surface dossiers when implementation changes behavior, ownership, reach, tests, or invariants.
- Update `docs/context/style-map.md` when React proof ownership, visual references, or route proof ownership changes.
- Update `docs/tech-stack.md` when package scripts, dev tooling, pinned versions, or CI gates change.
- Do not hand-edit auto-generated fences. Run `pnpm run docs` if generated context must change.
- Do not leave progress logs, temporary codenames, dates, or commit SHAs in current-state docs.

## Final Acceptance

This recovery program is complete only when:

- Current `RPA-001` through `RPA-012` failures are closed or replaced by explicit intentional non-carry-over entries from this spec.
- React production-target preview renders dataset-backed reader and Mushaf workflows without preview fallback.
- React clean launch/default-asset reset, legacy onboarding hash handling,
  navigation, settings/assets, Daily Wird, About, clear-data, and offline
  behavior are proven against Svelte or explicit non-carry-over rules.
- Search route behavior is decided and implemented consistently.
- React parity tests fail on the specific classes of false positives exposed by the audit.
- React remains proof-only and no production flip has occurred.
