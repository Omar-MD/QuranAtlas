# React Tech Stack Refactor 08A - Mushaf Install-On-Demand Asset Strategy Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Refines child spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-08-offline-storage-asset-pack-architecture-spec.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-01-react-app-shell-and-dual-build-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-08-offline-storage-asset-pack-architecture-spec.md`

## Purpose

Define the React-only strategy for Mushaf page asset handling. The React app
must not ship Mushaf page SVG bodies in its default app artifact, must not
support legacy Mushaf page paths, and must install verified Mushaf page packs on
demand through a service-worker-owned asset installer.

This spec supersedes any assumption that Qalun page bodies are part of the app
shell, default React dataset, or baseline deployment artifact. It does not
authorize Svelte app implementation work. The existing Svelte app remains a
behavioral reference until React parity and cutover, but this asset strategy is
for `src-react` and React build outputs only.

## Current Docs Used

Context7 was used for implementation-sensitive Workbox and vite-plugin-pwa
direction during the design discussion for this spec.

- Command:
  `npx ctx7@latest library Workbox "What is the recommended Workbox pattern for a Vite PWA using injectManifest, app-shell precaching, runtime caching, and on-demand offline asset packs with Cache Storage and quota handling?"`
- Selected library id: `/googlechrome/workbox`
- Command:
  `npx ctx7@latest docs /googlechrome/workbox "What is the recommended Workbox pattern for a Vite PWA using injectManifest, app-shell precaching, runtime caching, and on-demand offline asset packs with Cache Storage and quota handling?"`
- Current-doc facts used:
  - Workbox supports production service workers that precache an app shell with
    `precacheAndRoute(self.__WB_MANIFEST)`.
  - `injectManifest` supports a custom service worker with an injected precache
    manifest.
  - Runtime routes can use Workbox strategies such as `CacheFirst`,
    `NetworkFirst`, and `StaleWhileRevalidate`.
  - Workbox cache plugins include cacheability, expiration, and quota-related
    behavior.
- Command:
  `npx ctx7@latest library "vite-plugin-pwa" "How does vite-plugin-pwa injectManifest configure a custom service worker, app-shell precache, and dev service worker testing in Vite?"`
- Selected library id: `/vite-pwa/vite-plugin-pwa`
- Command:
  `npx ctx7@latest docs /vite-pwa/vite-plugin-pwa "How does vite-plugin-pwa injectManifest configure a custom service worker, app-shell precache, and dev service worker testing in Vite?"`
- Current-doc facts used:
  - vite-plugin-pwa `injectManifest` compiles a custom service worker and
    injects the precache manifest.
  - dev service-worker behavior can be enabled for local testing.

Exact React service-worker code, VitePWA configuration, or Workbox strategy
options still require fresh Context7 verification at implementation time if the
implementation changes API-level details.

## Required Reads

- `AGENTS.md`
- `docs/context/repo-structure.md`
- `docs/product-info.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/infra.md`
- `docs/tech-stack.md`
- `package.json`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- Parent master spec
- Child specs `00`, `01`, and `08`

## Scope

In scope:

- React Mushaf page asset architecture under the React refactor track.
- React-only build, dev, preview, service-worker, cache, and offline UX
  requirements for Mushaf page packs.
- Dataset and asset-pack contract requirements that React consumes.
- Removal of legacy Mushaf page path support from the React contract.
- React app-shell public asset strategy needed to keep Mushaf page bodies out of
  `dist-react/`.
- Verification gates that prove the React app artifact stays small and does not
  include Mushaf page bodies.

Out of scope:

- Refactoring the existing Svelte app.
- Changing the existing Svelte service worker, cache names, asset UI, or offline
  flow.
- Preserving compatibility with old Mushaf page paths in React.
- Treating Svelte-era shipped Mushaf assets as React app-shell assets.
- Fetching upstream providers or build-only `data/**` paths at runtime.

## Allowed Files And Directories

Allowed create:

- React Mushaf asset-pack contracts under `src-react/packs/**`,
  `src-react/offline/**`, `src-react/storage/**`, or equivalent paths from child
  spec `01`.
- React service-worker installer protocol files under the React build tree.
- React fixture indexes and tiny fixture packs for unit/e2e proof.
- Durable React asset checks under `scripts/`.
- Unit tests under `tests/unit/**`.
- Browser proof under `tests/e2e/read/**`, `tests/e2e/configure/**`, and
  `tests/e2e/infra/**`.
- Asset-pack pipeline docs or planning appendices under `docs/superpowers/specs/`.

Allowed modify:

- React Vite/VitePWA/service-worker config only for the React build path.
- React package scripts, including `check:react-mushaf-assets`.
- Dataset builders, manifest inventory, and source-data docs only when the
  change is explicitly an asset-pack contract change and runs the data gate.
- `docs/tech-stack.md`, `docs/context/source-data-flow.md`,
  `docs/context/data-model.md`, `docs/context/surfaces/read.md`, and
  `docs/context/surfaces/configure.md` when React asset contracts change current
  docs. Current-state docs must keep Svelte legacy compatibility accurate until
  a later removal/migration spec deletes it.

Forbidden modify:

- Existing Svelte app behavior, service-worker routes, cache names, or deploy
  artifact.
- Shared Svelte legacy Mushaf compatibility routes or generated compatibility
  outputs unless a separate data migration/removal spec owns the deletion.
- Hand-editing generated `public/dataset/**`.
- Production deploy routing before child spec `17`.

## Diagnosis From Current Reference Implementation

The current app is useful as a warning, not as a pattern to carry forward.

Observed problems that React must avoid:

- Page SVG bodies can be duplicated between edition-aware and legacy paths.
- The dataset manifest can include hundreds of megabytes of page assets in the
  same default flow used by ordinary app work.
- Large asset installation logic is split between window-side Cache Storage
  loops and service-worker message handlers.
- Legacy route and cache support keeps obsolete paths alive.
- Cache presence, shipped status, verified status, and active selection are too
  easy to blur.
- Development and validation can become coupled to asset count and asset size.

React must use the current app only as a parity and failure-mode reference. It
must not port the fragmented installer model.

## Proven Pattern

React must use the standard PWA split:

```text
App shell precache
  HTML, JS, CSS, core icons, essential fonts, tiny boot metadata

Runtime cache
  Recently opened same-origin dataset URLs, useful online and opportunistic

User-triggered asset-pack install
  Versioned, byte-planned, manifest-verified reader packs written by the service
  worker into Cache Storage
```

Mushaf pages belong only to the third category for offline readiness. A page may
be fetched while online for normal reading, and a runtime route may cache that
response opportunistically, but opportunistic cache presence must never mark a
Mushaf pack installed, verified, or active-offline.

## Artifact And Shipping Model

React has two separate deliverables:

- The React app artifact, for `dist-react/` during dual-build.
- The React asset-pack artifact set, published same-origin for install on
  demand.

React production after cutover keeps the same split:

- app shell artifact, deployed as the app entry;
- asset-pack publish root, deployed under same-origin `/dataset/**`.

CI/deploy specs must upload, download, validate, and publish both artifact
classes. Keeping `dist/` as the app deploy path is acceptable only if the
asset-pack publish root is also deployed to the same origin.

React Vite config must not use the repository `public/` directory as an
unfiltered public directory. If it did, current `public/dataset/mushaf-pages/**`
would be copied into `dist-react/`. The React build must use a React-scoped
public directory or an explicit allowlist copy step for shell assets and tiny
indexes.

The React app artifact must include:

- app shell files;
- core icons and manifest files needed to launch the PWA;
- essential fonts approved by the React design-system specs;
- small boot metadata and generated asset indexes needed to show available pack
  choices and compute install plans.

The React app artifact must not include:

- Mushaf page SVG bodies;
- legacy Mushaf page directories;
- generated compatibility copies of Mushaf pages;
- old cache manifest files used only by the Svelte implementation;
- any reader asset body whose size grows linearly with the number of Mushaf
  pages.

Mushaf page bodies must be generated, validated, and published through a
separate asset-pack pipeline. They are still same-origin at runtime, but they are
not part of the React app shell or default React build artifact. Asset-pack
growth must not slow ordinary React dev server startup, hot reload, typecheck,
Storybook, or app-shell build.

## Mushaf URL Contract

React supports only edition-aware Mushaf paths:

```text
/dataset/mushaf-pages/{riwayah}/{mushafEditionId}/manifest.json
/dataset/mushaf-pages/{riwayah}/{mushafEditionId}/pages/{page}.svg
```

Product prose may say Qalun, but runtime ids and paths must keep using the
existing `qaloon` id from the master spec. React must not create separate Qalun
and `qaloon` packs.

React must reject and never generate, route, cache, install, or document legacy
paths:

```text
/dataset/mushaf-pages/{riwayah}/manifest.json
/dataset/mushaf-pages/{riwayah}/pages/{page}.svg
```

The React build and data checks must fail if a React-only asset index, install
plan, route table, or service-worker route includes a legacy Mushaf page URL.
Shared Svelte-era legacy routes and compatibility dataset outputs remain allowed
until a separate data migration/removal spec owns their deletion.

Cache names must also be edition-aware. React page-pack caches must include a
React-specific prefix, riwayah id, Mushaf edition id, and pack version. Cache
names that omit the edition id are invalid for React.

## Asset Index Contract

React consumes generated asset indexes, not directory scans at runtime.

The Mushaf asset index must provide enough information to plan and verify a pack
without discovering page files by walking the filesystem during normal dev:

- stable pack id;
- riwayah id;
- Mushaf edition id;
- human label;
- manifest URL;
- page count;
- total bytes;
- pack version or content version;
- provenance;
- list of same-origin page URLs or a compact deterministic page URL template
  plus verified page range;
- integrity data where available;
- delivery mode: `on-demand-pack`;
- availability state for the current environment.

React must not use a `shipped` flag to mean that Mushaf pages are bundled with
the app. For Mushaf page packs, availability and installation are separate:

- availability means the same-origin pack artifact can be requested when online;
- installation means the service worker has cached and verified the pack locally;
- activation means the owning settings writer has selected a verified pack for
  reader use.

## React Service-Worker Installer

The React service worker owns large asset writes to Cache Storage.

The window may:

- read generated indexes;
- compute an install plan;
- show storage estimates;
- request install, resume, cancel, verify, purge, or repair;
- receive progress events;
- persist only validator-compatible install metadata through the approved React
  storage layer, or derive status from Cache Storage and generated indexes until
  a migration spec creates a durable per-pack store.

The window must not:

- loop over Mushaf page URLs and write them directly to Cache Storage;
- mark a pack verified because cache keys happen to exist;
- activate a pack before the service worker install and local verification
  phases complete.

The installer protocol must support:

- install request with pack id, manifest URL, expected version, expected byte
  count, and URL membership;
- progress events with completed file count and bytes;
- cancellation;
- retry and resume for incomplete packs;
- quota preflight where browser APIs allow it;
- mid-install quota failure handling;
- verification before verified/usable state is persisted;
- deletion of incomplete staged entries after failed installs where possible;
- purge of stale React pack caches when indexes remove or replace a pack.

Cache Storage does not provide a true rename-commit primitive. Therefore React's
atomicity guarantee is state-based: a pack is not usable until verification
records a complete, version-matching install. Partial cache contents are
`incomplete`, never installed or active.

## Pack Lifecycle

React must use the canonical status vocabulary from child spec 08:

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

Required lifecycle:

```text
not-installed
  -> queued
  -> installing
  -> installed
  -> verifying
  -> verified
  -> active
```

Failure states must be explicit:

- `storage-full` for quota failure;
- `unavailable-offline` when a required remote pack is not installed and the
  app is offline;
- `incomplete` when an install was interrupted or partially cached;
- `stale` or `update-available` when the local version differs from the index;
- `incompatible` when text, riwayah, or Mushaf edition constraints do not match;
- `failed` for unrecoverable fetch, manifest, integrity, or verification errors.

Deleting an active Mushaf pack must be blocked until the user switches to a
compatible verified pack or intentionally changes reader settings to a state
that does not require that pack.

## Reader Behavior

The React Mushaf reader must not silently fall back to another riwayah, another
edition, a legacy path, or an opportunistic runtime cache when the active pack is
missing.

When the active Mushaf page pack is not verified:

- online and available: show an install action for the exact required pack;
- offline and not installed: show `unavailable-offline` with switch or manage
  assets actions when valid alternatives exist;
- incomplete: show resume, repair, or remove actions;
- stale or update-available: allow continued use only if the installed version is
  still compatible with the active dataset contract; otherwise block with update
  or switch actions.

The reader fetch path remains normal same-origin URL loading. Offline
reliability comes from verified Cache Storage installation, not special
in-component fetch hacks.

## Development Flow

Ordinary React development must not scale with Mushaf page count.

Requirements:

- React dev server startup must not enumerate all Mushaf page SVGs.
- React app-shell builds must not copy Mushaf page SVG bodies into `dist-react/`.
- Unit tests must use generated indexes, compact fixtures, or mocked pack
  manifests.
- Browser/offline tests must use a tiny fixture Mushaf pack unless explicitly
  running a release asset-pack gate.
- Storybook must render pack states from typed fixtures, not large real packs.
- The release asset-pack pipeline may validate the full pack set, but it must be
  an explicit gate separate from ordinary app development.

React local development may expose full asset packs only when a developer
explicitly points the app or preview server at an asset-pack root. Without that
root, installable packs may appear as unavailable in dev, but the app shell and
state-machine development must still work.

## Testing Requirements

Unit coverage must prove:

- React Mushaf path validators accept only edition-aware paths.
- Legacy Mushaf paths are rejected.
- Install plans are generated from indexes without filesystem scans.
- Pack lifecycle transitions preserve install, verify, and activate separation.
- Cache names include React prefix, riwayah, Mushaf edition, and version.
- Svelte-era `shipped` semantics are not used for React Mushaf page packs.

Service-worker tests must prove:

- large pack writes are initiated through the React service worker protocol;
- interrupted installs become `incomplete`;
- quota failures become `storage-full`;
- stale cache cleanup never deletes unrelated Svelte caches;
- runtime cache hits do not mark packs installed.

Browser/e2e proof must cover:

- app shell works without Mushaf page bodies in the React artifact;
- asset management shows an installable Mushaf pack from the index;
- a tiny fixture pack can be installed, verified, activated, and used offline;
- offline reader blocks uninstalled packs with the correct state;
- legacy page URLs do not succeed through React routes or install plans.

Build verification must assert that React output contains no Mushaf page SVG
bodies. Release asset-pack verification must assert that published pack indexes,
manifests, byte counts, and page files agree.

## Rollout Order

Implementation must proceed in this order:

1. Define React path, cache-name, pack-index, and status contracts.
2. Add build/static checks that prevent React from accepting legacy Mushaf page
   paths.
3. Add React fixture indexes and tiny test packs for development and e2e proof.
4. Implement the React service-worker installer protocol.
5. Implement React storage records for pack install and verification metadata.
6. Implement React asset management and reader gates against the typed status
   model.
7. Add release asset-pack generation and validation gates.
8. Only at cutover, make production deploy consume the React app artifact and
   same-origin asset-pack artifact set.

The Svelte app is not updated as part of this rollout.

## Deliverables

- React Mushaf path, cache-name, pack-index, and status contracts.
- React app-shell public asset strategy proving Mushaf SVG bodies are not copied
  into `dist-react/`.
- React service-worker installer protocol with install, resume, cancel, verify,
  purge, quota, and stale-cache behavior.
- Fixture asset indexes and tiny fixture packs for unit/e2e proof.
- Durable `check:react-mushaf-assets` or equivalent script that rejects legacy
  React Mushaf paths and page SVG bodies in the React app artifact.
- Release asset-pack validation gate for edition-aware manifests, byte counts,
  page files, and same-origin URLs.
- Updated source-data, data-model, read/configure/infra, tech-stack, and
  cutover docs where React asset-pack current behavior changes.

## Acceptance Criteria

- The React app artifact contains zero Mushaf page SVG bodies.
- React Mushaf page offline readiness is install-on-demand only.
- React supports no legacy Mushaf page path or cache contract.
- React large asset installation is service-worker-owned.
- React app dev, test, Storybook, and app-shell build time do not grow with
  Mushaf page count.
- Verified install state, active settings, and opportunistic runtime cache
  presence remain separate.
- Same-origin `/dataset/**` remains the only runtime asset boundary.
- Svelte service-worker scope, cache names, runtime code, and deploy artifact are
  untouched by this spec.
- Any docs that mention legacy Mushaf page paths distinguish current Svelte
  compatibility from React's edition-aware-only contract.

## Verification

Spec-only changes must run:

```bash
pnpm run docs:check
git diff --check
```

Implementation touching React service-worker, build tooling, package scripts, or
runtime code must also run the React gates defined by the parent specs.

Implementation touching React Mushaf paths, install plans, app output, or asset
checks must run the concrete asset gate introduced by this spec, for example:

```bash
pnpm run check:react-mushaf-assets
```

Implementation touching generated asset indexes, asset-pack manifests,
source-data flow, or release dataset behavior must run the relevant data gate,
for example:

```bash
pnpm run data -- check
```

Implementation touching release page packs must also run:

```bash
pnpm run data -- mushaf-pages build --profile=baseline --require-riwayah=qaloon
```

Before any cutover or release packaging change, a gate must prove that
`dist-react/` contains no Mushaf page SVG bodies and that published asset packs
contain only currently supported edition-aware paths.

## Rollback And Failure Handling

- If the React build copies Mushaf page bodies into `dist-react/`, stop and fix
  the React public asset strategy before adding reader UI.
- If legacy-path rejection also blocks current Svelte compatibility outputs,
  scope the check to React-only indexes/routes/install plans.
- If persistent pack metadata cannot fit the existing v7 validators, derive it
  from Cache Storage/indexes or create a separate DB migration spec; do not
  widen existing stores inside this spec.
- If the service-worker installer cannot make partial installs distinguishable,
  keep packs in `incomplete` or `failed` state and block activation.
- If same-origin asset-pack deployment cannot be proven, child specs `16` and
  `17` must not approve or execute cutover.

## Handoff

Child spec 09 must build the React Mushaf reader against this contract. Child
spec 10 must expose source and storage settings through the same pack lifecycle.
Child spec 16 must include this artifact split in cutover readiness. Child spec
18 may remove Svelte asset code only after production has flipped and the
post-flip cleanup gate approves removal.
