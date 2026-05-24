# React Tech Stack Refactor 08 - Offline Storage And Asset Pack Architecture Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Refined by child spec:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-08a-mushaf-install-on-demand-asset-strategy-spec.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-01-react-app-shell-and-dual-build-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-07-component-registry-agent-rules-spec.md`

## Purpose

Define the React storage, service-worker, and asset-pack architecture before
reader, settings, search, or source-selection parity starts. React must preserve
the existing QuranAtlas IndexedDB, route, dataset, and cache contracts during
the dual-build period while giving the future app a clear offline asset model.

## Current Docs Used

Context7 was used for the Dexie implementation-sensitive parts of this spec.

- Command:
  `npx ctx7@latest library Dexie "How should Dexie open and use an existing IndexedDB database schema without unsafe migrations during a dual-app React and Svelte period, while preserving store names, keys, indexes, and version compatibility?"`
- Selected library id: `/websites/dexie`
- Command:
  `npx ctx7@latest docs /websites/dexie "How should Dexie open and use an existing IndexedDB database schema without unsafe migrations during a dual-app React and Svelte period, while preserving store names, keys, indexes, and version compatibility?"`
- Current-doc facts used:
  - Dexie opens a database by constructing `new Dexie(<name>)`.
  - Dexie declares schema through `db.version(<number>).stores({...})`.
  - `db.open()` resolves when the database is ready.
  - Dexie documents migration of existing IndexedDB databases into Dexie usage.

Current Workbox, vite-plugin-pwa, Cache Storage, and OPFS API details are not
locked by this spec. If the implementation plan writes exact service-worker
registration code, Workbox strategies, VitePWA config, Cache Storage helper
code, or OPFS APIs, fetch those current docs through Context7 first.

## Scope

In scope:

- Define React access to the existing `quran-atlas` IndexedDB v7 contract.
- Define React Dexie schema declarations that mirror current store names,
  key paths, indexes, and record shapes without bumping DB version during
  dual-build.
- Define one-writer-per-store/key ownership for React modules.
- Define Cache Storage usage for same-origin `/dataset/**`, app-shell, fonts,
  icons, text, Mushaf pages, source packs, and search/index packs.
- Define OPFS as unavailable unless a later child spec proves a non-URL binary
  or index access need.
- Define pack status vocabulary and install-before-activate lifecycle.
- Define service-worker scope/cache isolation from the shipped Svelte app.
- Define offline UI state contracts that registered React components must use.
- Define dataset/source verification gates for any changed data or release
  behavior.
- Define generic asset-pack lifecycle primitives that child spec 08A narrows for
  React Mushaf page packs.

Out of scope:

- Implementing reader, settings, search, or source UI parity.
- Bumping `quran-atlas` DB version.
- Migrating Svelte stores to new shapes.
- Fetching `data/**`, catalog, normalized, taxonomy, or quran.ws files at
  runtime.
- Pre-caching all reader assets during service-worker install.
- Introducing OPFS for ordinary same-origin URL-addressed dataset assets.

## Required Reads

- `AGENTS.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/context/surfaces/infra.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/read.md`
- `docs/tech-stack.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- Parent master spec
- Child specs `00`, `01`, and `07`

## Allowed Files And Directories

Allowed create:

- `src-react/storage/**`
- `src-react/offline/**`
- `src-react/data/**`
- `src-react/packs/**` if the React app keeps Reader First pack policy under
  the React tree during dual-build
- Unit tests under `tests/unit/**`
- E2E tests under `tests/e2e/infra/**` only for browser-only service-worker,
  cache, or offline proof

Allowed modify:

- React service-worker or VitePWA config, scoped only to React build output.
- React package scripts and dependencies.
- `docs/tech-stack.md` for new tools, scripts, pinned versions, or CI gates.
- `docs/context/architecture.md`, `docs/context/data-model.md`, and
  `docs/context/source-data-flow.md` if React storage architecture changes repo
  current state.
- `docs/context/surfaces/infra.md` if ownership or offline behavior changes.

Forbidden modify:

- Svelte DB migrations or store shape unless a separate approved migration spec
  owns the change.
- Existing Svelte service-worker scope, cache names, or deploy artifact.
- Current `pnpm run build -> dist/` behavior.
- `public/dataset/**` unless the change is explicitly a dataset/source-pack
  contract change and runs the data verification gate.

## IndexedDB Contract

React must use the existing database:

- DB name: `quran-atlas`.
- Current version: `7`.
- Active stores: `settings`, `activationState`, `datasetMeta`, `bookmarks`.
- Removed-scope stores are not revived.
- Store shapes, indexes, and writers are owned by `docs/context/data-model.md`
  and the owning surface dossiers.

During dual-build, React may open the existing DB with Dexie only by declaring a
schema compatible with version `7`. React must not run an upgrade that blocks or
breaks the shipped Svelte app. Any schema change requires a separate migration
spec, updates to data-model docs, generated context, unit tests, cross-tab tests,
and a rollback path.

Settings key ownership must remain one writer per key. The active recitation
bundle remains atomic: `settings.riwayah`, `settings.quranTextStyleId`, and
`settings.mushafEditionId` change together through the owning settings writer.

## Asset-Pack Lifecycle

React must use this pack status vocabulary:

```ts
type PackStatus =
  | "not-installed"
  | "queued"
  | "installing"
  | "installed"
  | "verifying"
  | "verified"
  | "active"
  | "incomplete"
  | "incompatible"
  | "stale"
  | "failed"
  | "update-available"
  | "storage-full"
  | "unavailable-offline";
```

Install, verify, and activate are separate phases. Cache presence is not
activation. User-facing copy may use "download" where clearer, but internal
state must preserve install, verify, activate, stale, unavailable, and failure
distinctions.

Activation rules:

- Qalun is the baseline product riwayah; runtime keys and paths use `qaloon`.
- Hafs and Warsh activate only after compatible text and Mushaf assets verify.
- Translation and tafsir packs are source packs and may not render baseline
  content under an unavailable selected label.
- Search/index packs follow install-before-activate and must expose unavailable
  states when missing or offline.
- Deleting an active optional asset must be refused until the user switches to a
  compatible verified asset.

## Runtime Dataset Boundary

React runtime may fetch only same-origin `/dataset/**` files. It must never
fetch:

- `data/**`;
- `data/catalog/**`;
- `data/normalized/**`;
- `data/taxonomy/**`;
- upstream providers such as quran.ws.

Build-time validation remains the integrity gate. The runtime trust boundary is
manifest membership plus build-time structural validation plus local install
verification, not ad hoc remote checks.

## Cache And Service-Worker Contract

The React service worker must remain isolated during dual-build:

- separate output directory from Svelte (`dist-react/`);
- separate scope from the shipped service worker;
- separate app-shell cache names;
- separate runtime cache prefixes where collision is possible;
- no deploy workflow consumes React output before cutover.

Cache Storage remains the default for same-origin URL-addressed assets:

- app shell, icons, and fonts through React app-shell strategy;
- Quran text, translations, tafsir, knowledge, Mushaf pages, and search/index
  files through manifest or concrete asset indexes;
- page caches partitioned by riwayah and Mushaf edition where needed.

OPFS is allowed only when a later child spec proves that a non-URL binary or
index artifact needs file-like access that Cache Storage cannot provide.

## Deliverables

- React storage architecture modules or docs.
- Dexie schema mirror for the existing IDB contract, if implementation reaches
  storage code.
- Pack status types and lifecycle helpers.
- Cache planning helpers for same-origin asset indexes.
- React service-worker isolation plan or implementation.
- Offline UI state contract for registered components.
- Unit tests for pack state transitions and DB compatibility.
- Browser/e2e proof for service-worker or Cache Storage behavior when needed.
- Updated data/source docs if dataset contracts change.

## Acceptance Criteria

- React does not bump the `quran-atlas` DB version during dual-build.
- React can read/write only through declared store/key ownership.
- Svelte can still open and use the DB after React code has run.
- React service-worker scope and cache names do not collide with Svelte.
- Asset install does not activate a pack as a side effect.
- Missing, stale, incomplete, incompatible, failed, storage-full, and
  unavailable-offline states are explicit.
- Runtime fetches stay under `/dataset/**`.

## Verification

Run targeted tests added by implementation, plus:

```bash
pnpm run docs:check
git diff --check
```

If storage, service-worker, app runtime, package scripts, or build tooling
changes, also run:

```bash
pnpm run check
pnpm run build:react
```

If source catalogs, dataset builders, `public/dataset/**`, asset-pack manifests,
source-data flow, or release dataset behavior changes, run the relevant data
gate, for example:

```bash
pnpm run data -- check
```

Expected result:

- React storage tests pass.
- Existing Svelte DB/offline tests still pass when touched.
- React build remains isolated.
- Docs and data checks are clean for the changed surface.

## Rollback And Failure Handling

- If Dexie schema declarations trigger an upgrade or block Svelte DB access,
  remove React storage writes until a migration spec exists.
- If Cache Storage cannot support a planned asset class, write an OPFS decision
  appendix before adding OPFS code.
- If service-worker cache names collide with Svelte, stop and rename the React
  cache/scope before implementing dependent UI.
- If dataset checks fail, fix source-data contracts before React UI consumes the
  new state.

## Handoff

Child specs `09` through `14` must consume these pack, DB, cache, and runtime
boundary contracts. Child spec `08A Mushaf Install-On-Demand Asset Strategy`
must be treated as the controlling refinement for React Mushaf page packs. Child
spec `11 Search And Index Parity` must extend this architecture for search/index
packs before search UI can activate indexes.
