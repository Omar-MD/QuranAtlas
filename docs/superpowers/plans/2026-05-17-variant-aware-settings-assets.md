# Variant-Aware Settings Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace riwayah-as-package settings with variant-aware Quran text and Mushaf asset management, mode-aware reader settings, and a dedicated `#/assets` route.

**Architecture:** Build the new asset contracts first, then move runtime resolution and install/status/delete behavior onto those contracts, then replace the settings/navigation UI. The UI work must use `quranatlas-ui-workflow` and the committed `docs/ui-references/configure/*` component references as the visual source of truth.

**Tech Stack:** Svelte 5 runes, TypeScript, Vite, Vitest, Playwright, QuranAtlas dataset builders, Cache Storage, service-worker route definitions.

---

## Required Context

Read these before implementing:

- Specs: `docs/superpowers/specs/2026-05-17-variant-aware-settings-assets-design.md` and `docs/superpowers/specs/2026-05-17-variant-aware-settings-assets-ui-plan.md`.
- Dossiers: `docs/context/surfaces/configure.md`, `docs/context/surfaces/read.md`, `docs/context/surfaces/navigate.md`, `docs/context/surfaces/infra.md`.
- Cross-cutting docs: `docs/context/source-data-flow.md`, `docs/context/data-model.md`, `docs/context/architecture.md`, `docs/tech-stack.md`.
- Test rules before test edits: `tests/unit/AGENTS.md` and `tests/e2e/AGENTS.md`.
- UI references and notes: every file in `docs/ui-references/configure/` whose basename starts with `settings-shell`, `verse-preview`, `mushaf-preview`, `verse-settings-rows`, `theme-night-controls`, `settings-sidebar`, `asset-row-states`, `asset-table-states`, or `asset-status-live-region`.

## File Structure

Create:

- data/catalog/quran-text-assets.json - build-time source of truth for text-style variants per riwayah.
- data/catalog/mushaf-assets.json - build-time source of truth for Mushaf edition variants per riwayah.
- src/packs/asset-types.ts - shared runtime types, defaults, labels, and status/state constants.
- src/packs/text-assets.ts - runtime loader, validator, status, install, set-active, and delete helpers for Quran text styles.
- src/packs/mushaf-assets.ts - runtime loader, validator, status, install, set-active, and delete helpers for Mushaf editions.
- src/configure/assets/asset-view-model.ts - single adapter from packs/data/infra status into the UI state matrix.
- src/configure/assets/AssetManagement.svelte - `#/assets` route component.
- src/configure/settings/SettingsShell.svelte - labelled dialog/sidebar shell shared by Verse and Mushaf settings.
- src/configure/settings/VerseSettings.svelte - Verse Settings content.
- src/configure/settings/MushafSettings.svelte - Mushaf Settings content.
- src/configure/settings/ThemeNightControls.svelte - shared Theme and Night Mode controls used by both settings modes.
- src/configure/settings/NestedAssetPicker.svelte - reusable picker for riwayah, text-style, translation, tafsir, and Mushaf edition choices.
- src/configure/variant-bundle.ts - atomic sole writer for active `riwayah`, `quranTextStyleId`, and `mushafEditionId` bundle changes.
- src/configure/quran-text-style.ts - text-style API that validates and delegates active writes through the variant bundle writer.
- src/configure/mushaf-edition.ts - Mushaf-edition API that validates and delegates active writes through the variant bundle writer.
- src/styles/surfaces/assets.css - `#/assets` route styling.

Modify:

- `scripts/data/text/build.mjs` - emit `/dataset/quran-text/{riwayah}/{textStyleId}/{surah}.json` and `indexes/text-assets.json`.
- `scripts/data/mushaf-pages/build.mjs` - emit `/dataset/mushaf-pages/{riwayah}/{mushafEditionId}/manifest.json` and `pages/{NNN}.svg`.
- `scripts/data/riwayah-packages/build.mjs` - demote `indexes/riwayah-packages.json` to compatibility facade based on the new indexes.
- `scripts/data/manifest/inventory.mjs` - include new text and edition paths in `manifest.json`.
- `src/core/constants.ts` - add new dataset index path constants and asset events.
- `src/core/settings.svelte.ts` - add `quranTextStyleId`, `mushafEditionId`, and three-state `nightMode`.
- `src/configure/night-mode.ts` - migrate boolean night mode to `'off' | 'on' | 'auto'`.
- `src/configure/riwayah.ts` - make riwayah switching atomic across riwayah, text style, and Mushaf edition.
- `src/configure/panel-bridge.ts` and `src/configure/Panel.svelte` - open the correct mode-aware panel and eventually reduce `Panel.svelte` to the bridge host.
- `src/read/MarginHeader.svelte` - pass reader mode to the settings bridge.
- `src/read/AmbientDock.svelte` - remove Search, add Settings entry or More-menu path.
- `src/app-bootstrap.ts` - register `#/assets`, route direct `#/settings` to the current mode-aware panel, remove Command Sheet boot wiring, and keep launch restore safe.
- `src/continuity/last-surface.ts` and `src/continuity/launch-targets.ts` - reject `#/assets` from persistence and restore.
- `src/data/dataset.ts`, `src/data/mushaf-pages.ts`, and `src/packs/mushaf-pages.ts` - resolve assets by `(riwayah, quranTextStyleId)` and `(riwayah, mushafEditionId)`.
- `src/data/offline.ts` and `src/infra/sw/route-defs.ts` - install/status/delete/verify by concrete asset URLs and new cache names.
- `src/navigate/global-shortcuts.ts`, `src/navigate/CommandSheet.svelte`, `src/navigate/command-sheet-bridge.ts`, `src/navigate/state-command-sheet.svelte.ts`, `src/navigate/search-contract.ts`, `src/App.svelte` - remove Command Sheet and current Search promises.
- `src/styles/index.css`, `src/styles/surfaces/settings.css`, `src/styles/surfaces/nav.css` - wire assets styles and redesigned settings/dock styling.
- Context docs listed above - update in the same behavior changes; run `pnpm run docs` when generated inventories change.

Extend tests:

- Unit: `tests/unit/scripts/build-dataset.test.js`, `tests/unit/scripts/mushaf-pages.test.js`, `tests/unit/data/dataset.test.js`, `tests/unit/data/mushaf-pages.test.ts`, `tests/unit/data/offline.test.js`, `tests/unit/packs/riwayah.test.ts`, `tests/unit/packs/mushaf-pages.test.ts`, `tests/unit/configure/night-mode.test.ts`, `tests/unit/configure/panel.test.ts`, `tests/unit/configure/state.test.ts`, `tests/unit/configure/state-last-surface.test.ts`, `tests/unit/continuity/launch-targets.test.ts`, `tests/unit/read/AmbientDock.test.ts`, `tests/unit/read/MarginHeader-toggle.test.ts`, `tests/unit/navigate/drawer.test.ts`, `tests/unit/navigate/reader-actions.test.js`, `tests/unit/infra/sw/route-defs.test.ts`.
- E2E: `tests/e2e/configure/settings.spec.js`, `tests/e2e/read/chrome.spec.js`, `tests/e2e/navigate/drawer.spec.js`, `tests/e2e/infra/offline.spec.js`.

## Per-Task Commit Rules

Every implementation task below commits only after its local proof passes.

- If the task changes source files, routes, events, tests, or surface dossiers, run `pnpm run docs` before the task commit so generated inventories are current.
- Every task commit runs `pnpm run docs:check` and `git diff --check`.
- Do not hand-edit generated context fences. If generated context changes, commit the generated changes with the behavior that caused them.
- Task 11 is final integration verification, not a catch-up docs task. It commits only if final verification generates or reveals a docs-only correction.

---

### Task 1: Add Asset Catalog Contracts

**Files:**
- Create: data/catalog/quran-text-assets.json
- Create: data/catalog/mushaf-assets.json
- Modify: `data/catalog/authorities.json`
- Modify: `data/catalog/licenses.json`
- Modify: `docs/context/source-data-flow.md`
- Modify: `docs/context/data-model.md`
- Test: `tests/unit/scripts/build-dataset.test.js`
- Test: `tests/unit/scripts/mushaf-pages.test.js`

- [ ] **Step 1: Write failing catalog tests**

Add assertions that the text asset catalog exposes a baseline Qalun Uthmani style and that the Mushaf asset catalog exposes a baseline Qalun quran.ws edition.

```js
expect(textCatalog.defaults.qaloon).toBe('uthmani-kfgqpc-v1')
expect(textCatalog.assets).toContainEqual(expect.objectContaining({
  riwayah: 'qaloon',
  textStyleId: 'uthmani-kfgqpc-v1',
  visibility: 'baseline',
  shipped: true,
}))
for (const asset of textCatalog.assets) {
  expect(asset.textStyleId).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*-v\d+$/)
  expect(asset.outputPathTemplate).toBe(`quran-text/${asset.riwayah}/${asset.textStyleId}/{surah}.json`)
  expect(['kfgqpc']).toContain(asset.providerId)
  expect(asset.licenseId).toBeTruthy()
}
for (const [riwayah, textStyleId] of Object.entries(textCatalog.defaults)) {
  expect(textCatalog.assets.some((asset) => asset.riwayah === riwayah && asset.textStyleId === textStyleId)).toBe(true)
}
expect(mushafCatalog.defaults.qaloon).toBe('qalun-quran-ws-v1')
expect(mushafCatalog.assets).toContainEqual(expect.objectContaining({
  riwayah: 'qaloon',
  mushafEditionId: 'qalun-quran-ws-v1',
  visibility: 'baseline',
  shipped: true,
}))
for (const asset of mushafCatalog.assets) {
  expect(asset.mushafEditionId).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*-v\d+$/)
  expect(asset.pageCount).toBe(604)
  expect(asset.providerId).toBe('quran-ws')
  expect(asset.licenseId).toBe('quran-ws-free-use')
}
for (const [riwayah, mushafEditionId] of Object.entries(mushafCatalog.defaults)) {
  expect(mushafCatalog.assets.some((asset) => asset.riwayah === riwayah && asset.mushafEditionId === mushafEditionId)).toBe(true)
}
```

- [ ] **Step 2: Run the focused failing tests**

Run: `pnpm vitest run tests/unit/scripts/build-dataset.test.js tests/unit/scripts/mushaf-pages.test.js`

Expected: FAIL because data/catalog/quran-text-assets.json and data/catalog/mushaf-assets.json do not exist.

- [ ] **Step 3: Add the text catalog**

Create data/catalog/quran-text-assets.json:

```json
{
  "version": 1,
  "defaults": {
    "qaloon": "uthmani-kfgqpc-v1",
    "hafs": "uthmani-kfgqpc-v1",
    "warsh": "uthmani-kfgqpc-v1"
  },
  "assets": [
    {
      "riwayah": "qaloon",
      "textStyleId": "uthmani-kfgqpc-v1",
      "label": "Uthmani KFGQPC",
      "scriptFamily": "uthmani",
      "providerId": "kfgqpc",
      "licenseId": "kfgqpc-quran-text",
      "visibility": "baseline",
      "shipped": true,
      "outputPathTemplate": "quran-text/qaloon/uthmani-kfgqpc-v1/{surah}.json",
      "provenance": { "source": "KFGQPC Qalun v10" }
    },
    {
      "riwayah": "hafs",
      "textStyleId": "uthmani-kfgqpc-v1",
      "label": "Uthmani KFGQPC",
      "scriptFamily": "uthmani",
      "providerId": "kfgqpc",
      "licenseId": "kfgqpc-quran-text",
      "visibility": "optional",
      "shipped": false,
      "outputPathTemplate": "quran-text/hafs/uthmani-kfgqpc-v1/{surah}.json",
      "provenance": { "source": "KFGQPC Hafs v18" }
    },
    {
      "riwayah": "warsh",
      "textStyleId": "uthmani-kfgqpc-v1",
      "label": "Uthmani KFGQPC",
      "scriptFamily": "uthmani",
      "providerId": "kfgqpc",
      "licenseId": "kfgqpc-quran-text",
      "visibility": "optional",
      "shipped": false,
      "outputPathTemplate": "quran-text/warsh/uthmani-kfgqpc-v1/{surah}.json",
      "provenance": { "source": "KFGQPC Warsh v10" }
    }
  ]
}
```

- [ ] **Step 4: Add the Mushaf catalog**

Create data/catalog/mushaf-assets.json:

```json
{
  "version": 1,
  "defaults": {
    "qaloon": "qalun-quran-ws-v1",
    "hafs": "hafs-quran-ws-v1",
    "warsh": "warsh-quran-ws-v1"
  },
  "assets": [
    {
      "riwayah": "qaloon",
      "mushafEditionId": "qalun-quran-ws-v1",
      "label": "Qalun Quran.ws",
      "tradition": "qalun",
      "providerId": "quran-ws",
      "licenseId": "quran-ws-free-use",
      "visibility": "baseline",
      "shipped": true,
      "sourceSlug": "qalun",
      "pageCount": 604,
      "provenance": { "source": "quran.ws page PDFs" }
    },
    {
      "riwayah": "hafs",
      "mushafEditionId": "hafs-quran-ws-v1",
      "label": "Hafs Quran.ws",
      "tradition": "hafs",
      "providerId": "quran-ws",
      "licenseId": "quran-ws-free-use",
      "visibility": "optional",
      "shipped": false,
      "sourceSlug": "hafs",
      "pageCount": 604,
      "provenance": { "source": "quran.ws page PDFs" }
    },
    {
      "riwayah": "warsh",
      "mushafEditionId": "warsh-quran-ws-v1",
      "label": "Warsh Quran.ws",
      "tradition": "warsh",
      "providerId": "quran-ws",
      "licenseId": "quran-ws-free-use",
      "visibility": "optional",
      "shipped": false,
      "sourceSlug": "warsh",
      "pageCount": 604,
      "provenance": { "source": "quran.ws page PDFs" }
    }
  ]
}
```

- [ ] **Step 5: Run the catalog tests**

Run: `pnpm vitest run tests/unit/scripts/build-dataset.test.js tests/unit/scripts/mushaf-pages.test.js`

Expected: PASS for the new catalog assertions.

- [ ] **Step 6: Wire catalog validation into data check**

Extend `scripts/data/source-catalog.mjs` or the existing catalog validation helper so `pnpm run data -- check` fails when:

- a default points at a missing asset;
- a slug is unstable or duplicated within its riwayah;
- provider/license IDs are absent from `data/catalog/authorities.json` or `data/catalog/licenses.json`;
- text output templates do not match `quran-text/{riwayah}/{textStyleId}/{surah}.json`;
- Mushaf page count or quran.ws source identity drifts from the catalog.

- [ ] **Step 7: Run the catalog gate**

Run: `pnpm run data -- check`

Expected: PASS after the new catalogs are accepted by the same data-validation boundary as existing source catalogs.

- [ ] **Step 8: Commit**

```bash
pnpm run docs
pnpm run docs:check
pnpm run check
git diff --check
git add data/catalog/quran-text-assets.json data/catalog/mushaf-assets.json data/catalog/authorities.json data/catalog/licenses.json scripts/data/source-catalog.mjs tests/unit/scripts/build-dataset.test.js tests/unit/scripts/mushaf-pages.test.js docs/context/source-data-flow.md docs/context/data-model.md docs/context
git commit -m "feat(data): add variant asset catalogs"
```

### Task 2: Emit New Text And Mushaf Asset Indexes

**Files:**
- Modify: `scripts/data/text/build.mjs`
- Modify: `scripts/data/mushaf-pages/build.mjs`
- Modify: `scripts/data/manifest/inventory.mjs`
- Modify: `scripts/data/riwayah-packages/build.mjs`
- Modify: `src/core/constants.ts`
- Test: `tests/unit/scripts/build-dataset.test.js`
- Test: `tests/unit/scripts/mushaf-pages.test.js`
- Test: `tests/unit/data/riwayah-packages.test.ts`
- Test: `tests/unit/infra/sw/route-defs.test.ts`

- [ ] **Step 1: Write failing index tests**

Assert the data build emits both new indexes and that URLs are same-origin under the new paths:

```js
const textAssets = readJson('public/dataset/indexes/text-assets.json')
expect(textAssets).toMatchObject({
  version: 1,
  defaults: { qaloon: 'uthmani-kfgqpc-v1' },
})
const qaloonText = textAssets.assets.find((asset) => asset.riwayah === 'qaloon' && asset.textStyleId === 'uthmani-kfgqpc-v1')
expect(qaloonText).toMatchObject({
  riwayah: 'qaloon',
  textStyleId: 'uthmani-kfgqpc-v1',
  ayahCount: 6214,
  outputPathTemplate: 'quran-text/qaloon/uthmani-kfgqpc-v1/{surah}.json',
})
expect(qaloonText.files).toHaveLength(114)
expect(qaloonText.files.reduce((sum, file) => sum + file.bytes, 0)).toBe(qaloonText.totalBytes)
expect(qaloonText.files[0].url).toBe('/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json')

const mushafAssets = readJson('public/dataset/indexes/mushaf-assets.json')
expect(mushafAssets.defaults.qaloon).toBe('qalun-quran-ws-v1')
const qaloonMushaf = mushafAssets.assets.find((asset) => asset.riwayah === 'qaloon' && asset.mushafEditionId === 'qalun-quran-ws-v1')
expect(qaloonMushaf.manifestUrl).toBe('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json')
expect(qaloonMushaf.files).toHaveLength(605)
expect(qaloonMushaf.files.reduce((sum, file) => sum + file.bytes, 0)).toBe(qaloonMushaf.totalBytes)

const manifest = readJson('public/dataset/manifest.json')
expect(manifest.files.some((file) => file.path === 'indexes/text-assets.json')).toBe(true)
expect(manifest.files.some((file) => file.path === 'indexes/mushaf-assets.json')).toBe(true)
expect(manifest.files.some((file) => file.path === 'quran-text/qaloon/uthmani-kfgqpc-v1/001.json')).toBe(true)
```

- [ ] **Step 2: Run the focused failing tests**

Run: `pnpm vitest run tests/unit/scripts/build-dataset.test.js tests/unit/scripts/mushaf-pages.test.js tests/unit/data/riwayah-packages.test.ts tests/unit/infra/sw/route-defs.test.ts`

Expected: FAIL because the indexes and routes still use `riwayat/{riwayah}` and `mushaf-pages/{riwayah}`.

- [ ] **Step 3: Emit text assets beside the compatibility text output**

In `scripts/data/text/build.mjs`, keep the old `riwayat/{riwayah}/{NNN}.json` output during migration and also write:

```js
const QURAN_TEXT_DIR = join(DATASET_DIR, 'quran-text')

async function writeTextStyleSplits({ riwayah, textStyleId, perSurah }) {
  const outDir = join(QURAN_TEXT_DIR, riwayah, textStyleId)
  await mkdir(outDir, { recursive: true })
  const files = []
  let totalBytes = 0
  for (const [surah, payload] of Object.entries(perSurah)) {
    const path = join(outDir, `${surah}.json`)
    await writeFile(path, JSON.stringify(payload), 'utf8')
    const bytes = (await stat(path)).size
    files.push({ url: `/dataset/quran-text/${riwayah}/${textStyleId}/${surah}.json`, bytes })
    totalBytes += bytes
  }
  return { files, totalBytes }
}
```

- [ ] **Step 4: Write `indexes/text-assets.json`**

Still in `scripts/data/text/build.mjs`, load data/catalog/quran-text-assets.json, populate `files`, `totalBytes`, and `ayahCount`, then write:

```js
await writeFile(
  join(INDEXES_DIR, 'text-assets.json'),
  JSON.stringify({ version: 1, defaults: textCatalog.defaults, assets: resolvedTextAssets }, null, 2) + '\n',
  'utf8',
)
```

- [ ] **Step 5: Emit edition-aware Mushaf paths**

In `scripts/data/mushaf-pages/build.mjs`, write editions under:

```js
const outDir = join(OUT_ROOT, riwayah, mushafEditionId)
```

and add manifest fields:

```js
{
  version: 1,
  riwayah,
  mushafEditionId,
  editionLabel,
  editionVersion: 'v1',
  sourceSlug,
  pageCount,
  attribution,
  verseToPage,
  pages
}
```

During migration, also keep writing the legacy files at `mushaf-pages/{riwayah}/manifest.json` and `mushaf-pages/{riwayah}/pages/{NNN}.svg` until Task 5 switches every runtime consumer. The compatibility `riwayah-packages.json` facade must point only at files that exist for old consumers.

- [ ] **Step 6: Write `indexes/mushaf-assets.json`**

After page output, write:

```js
await writeJson(join(DATASET_DIR, 'indexes', 'mushaf-assets.json'), {
  version: 1,
  defaults: mushafCatalog.defaults,
  assets: resolvedMushafAssets,
})
```

Each resolved asset has `manifestUrl`, `files`, `totalBytes`, `pageCount`, and `provenance`.

- [ ] **Step 7: Update manifest inventory and route definitions**

In `scripts/data/manifest/inventory.mjs`, classify:

- `quran-text/**` as lane `text`, category `text-riwayah`;
- `indexes/text-assets.json` and `indexes/mushaf-assets.json` as lane `text`, category `text-index`;
- `mushaf-pages/{riwayah}/{mushafEditionId}/**` as lane `pages`, category `pages`.

In `src/infra/sw/route-defs.ts`, include the new indexes in the `text-index` route:

```ts
url.pathname === '/dataset/indexes/text-assets.json' ||
url.pathname === '/dataset/indexes/mushaf-assets.json'
```

Make cache expiration coherent for every route sharing `CACHE_DATASET`. Either use one safe `maxEntries` value across `text-riwayah`, `text-translation`, `text-tafsir`, `text-index`, `text-core`, and `text-knowledge`, split the categories into separate cache names, or remove `maxEntries` for the shared dataset cache. Add a route-def invariant test that fails when one cache name is reused with contradictory expiration caps.

In `src/infra/sw/route-defs.ts`, update matches:

```ts
match: ({ url }) => /^\/dataset\/quran-text\/[^/]+\/[^/]+\/\d{3}\.json$/.test(url.pathname)
```

and:

```ts
match: ({ url }) => /^\/dataset\/mushaf-pages\/[^/]+\/[^/]+\/.+$/.test(url.pathname)
```

Derive the page cache name as:

```ts
const pagesKeyFromUrl = (url: URL): string => {
  const parts = url.pathname.split('/')
  return `${parts[3] || 'unknown'}-${parts[4] || 'unknown'}`
}
```

with cache name `qa-pages-${pagesKeyFromUrl(url)}-v1`.

- [ ] **Step 8: Preserve legacy route compatibility during migration**

Until old package consumers are removed, keep explicit legacy support for `/dataset/mushaf-pages/{riwayah}/manifest.json` and `/dataset/mushaf-pages/{riwayah}/pages/{NNN}.svg`. Add the legacy matcher before the new generic pages matcher or make `pagesKeyFromUrl()` reject `manifest.json` as an edition segment.

Add tests proving:

```ts
expect(cacheNameFor(new URL('/dataset/mushaf-pages/qaloon/manifest.json', origin))).toBe('qa-pages-qaloon-v1')
expect(cacheNameFor(new URL('/dataset/mushaf-pages/qaloon/pages/001.svg', origin))).toBe('qa-pages-qaloon-v1')
expect(cacheNameFor(new URL('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json', origin))).toBe('qa-pages-qaloon-qalun-quran-ws-v1-v1')
```

- [ ] **Step 9: Demote `riwayah-packages.json`**

In `scripts/data/riwayah-packages/build.mjs`, build the facade from `text-assets.json` and `mushaf-assets.json` so old consumers still see complete packages while new logic uses the new indexes.

- [ ] **Step 10: Run data and route tests**

Run: `pnpm vitest run tests/unit/scripts/build-dataset.test.js tests/unit/scripts/mushaf-pages.test.js tests/unit/data/riwayah-packages.test.ts tests/unit/infra/sw/route-defs.test.ts`

Expected: PASS.

- [ ] **Step 11: Run generated dataset gates**

Run: `pnpm run data -- build`

Expected: public/dataset/indexes/text-assets.json, public/dataset/indexes/mushaf-assets.json, `public/dataset/indexes/riwayah-packages.json`, and `public/dataset/manifest.json` are regenerated and internally consistent.

Run: `pnpm run data -- check`

Expected: PASS.

Inspect and stage the generated index/manifest/facade files together with the builder changes.

- [ ] **Step 12: Commit**

```bash
pnpm run docs
pnpm run docs:check
pnpm run check
git diff --check
git add scripts/data/text/build.mjs scripts/data/mushaf-pages/build.mjs scripts/data/manifest/inventory.mjs scripts/data/riwayah-packages/build.mjs src/core/constants.ts src/infra/sw/route-defs.ts tests/unit/scripts/build-dataset.test.js tests/unit/scripts/mushaf-pages.test.js tests/unit/data/riwayah-packages.test.ts tests/unit/infra/sw/route-defs.test.ts public/dataset
git commit -m "feat(data): emit variant asset indexes"
```

### Task 3: Add Runtime Asset Types And Validators

**Files:**
- Create: src/packs/asset-types.ts
- Create: src/packs/text-assets.ts
- Create: src/packs/mushaf-assets.ts
- Modify: `src/core/constants.ts`
- Test: `tests/unit/packs/riwayah.test.ts`
- Test: `tests/unit/packs/mushaf-pages.test.ts`

- [ ] **Step 1: Write failing runtime validator tests**

Add tests for same-origin URLs, required defaults, incompatible riwayah/style pairs, and manifest edition mismatch.

```ts
await expect(loadTextAssetIndex()).resolves.toMatchObject({
  defaults: { qaloon: 'uthmani-kfgqpc-v1' },
})
await expect(getTextAsset('qaloon', 'uthmani-kfgqpc-v1')).resolves.toMatchObject({
  riwayah: 'qaloon',
  textStyleId: 'uthmani-kfgqpc-v1',
})
await expect(getMushafAsset('qaloon', 'qalun-quran-ws-v1')).resolves.toMatchObject({
  riwayah: 'qaloon',
  mushafEditionId: 'qalun-quran-ws-v1',
})
```

- [ ] **Step 2: Run the failing tests**

Run: `pnpm vitest run tests/unit/packs/riwayah.test.ts tests/unit/packs/mushaf-pages.test.ts`

Expected: FAIL because the new modules do not exist.

- [ ] **Step 3: Add shared asset types**

Create src/packs/asset-types.ts:

```ts
import type { Riwayah } from './riwayah'

export const DEFAULT_TEXT_STYLE_ID = 'uthmani-kfgqpc-v1' as const
export const DEFAULT_MUSHAF_EDITION_ID = 'qalun-quran-ws-v1' as const

export type AssetVisibility = 'baseline' | 'optional'
export type AssetStatusKind =
  | 'shipped'
  | 'installable'
  | 'cached'
  | 'installed'
  | 'incomplete'
  | 'incompatible'
  | 'unavailable'
  | 'installing'

export type TextAsset = {
  riwayah: Riwayah
  textStyleId: string
  label: string
  scriptFamily: string
  providerId: string
  licenseId: string
  visibility: AssetVisibility
  shipped: boolean
  files: Array<{ url: string; bytes: number }>
  totalBytes: number
  ayahCount: number
  outputPathTemplate: string
  provenance: Record<string, unknown>
}

export type MushafAsset = {
  riwayah: Riwayah
  mushafEditionId: string
  label: string
  tradition: string
  providerId: string
  licenseId: string
  visibility: AssetVisibility
  shipped: boolean
  manifestUrl: string
  files: Array<{ url: string; bytes: number }>
  totalBytes: number
  pageCount: number
  provenance: Record<string, unknown>
}
```

- [ ] **Step 4: Add route-derived cache verification primitives**

In src/packs/text-assets.ts or a shared helper, add verification that checks every concrete asset URL through `cacheNameFor(new URL(url, location.origin))`, matching both absolute and path cache keys:

```ts
async function cacheHasIndexedUrl(url: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false
  const absolute = new URL(url, location.origin)
  const cacheName = cacheNameFor(absolute)
  if (!cacheName) return false
  const cache = await caches.open(cacheName)
  return Boolean((await cache.match(absolute.href)) || (await cache.match(url)))
}
```

The verifier must not count old `qa-pages-{riwayah}-v1` caches as verified for edition-aware Mushaf assets.

- [ ] **Step 5: Add text asset loader**

Create src/packs/text-assets.ts with strict validation and cache fallback from `CACHE_DATASET`. The validator must reject URLs not starting with `/dataset/quran-text/`.

- [ ] **Step 6: Add Mushaf asset loader**

Create src/packs/mushaf-assets.ts with strict validation and cache fallback. The validator must reject manifests whose `riwayah` or `mushafEditionId` does not match the requested asset.

- [ ] **Step 7: Add verified usability helpers before settings migration**

Expose these before any settings writer or reader loader uses them:

```ts
export async function defaultTextStyleForRiwayah(riwayah: Riwayah): Promise<string>
export async function defaultMushafEditionForRiwayah(riwayah: Riwayah): Promise<string>
export async function canUseTextAsset(riwayah: Riwayah, textStyleId: string): Promise<boolean>
export async function canUseMushafAsset(riwayah: Riwayah, mushafEditionId: string): Promise<boolean>
export async function getTextAssetStatus(riwayah: Riwayah, textStyleId: string): Promise<AssetStatusKind>
export async function getMushafAssetStatus(riwayah: Riwayah, mushafEditionId: string): Promise<AssetStatusKind>
```

Add negative tests for same-origin rejection, default asset missing, bad slug IDs, file count mismatch, `totalBytes` mismatch, path/template mismatch, partial cache, old-cache-only state, and Mushaf manifest identity mismatch.

- [ ] **Step 8: Run validator tests**

Run: `pnpm vitest run tests/unit/packs/riwayah.test.ts tests/unit/packs/mushaf-pages.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
pnpm run docs
pnpm run docs:check
git diff --check
git add src/packs/asset-types.ts src/packs/text-assets.ts src/packs/mushaf-assets.ts src/core/constants.ts tests/unit/packs/riwayah.test.ts tests/unit/packs/mushaf-pages.test.ts
git commit -m "feat(packs): add variant asset loaders"
```

### Task 4: Add Settings Keys And Migration

**Files:**
- Modify: `src/core/settings.svelte.ts`
- Create: src/configure/variant-bundle.ts
- Create: src/configure/quran-text-style.ts
- Create: src/configure/mushaf-edition.ts
- Modify: `src/configure/night-mode.ts`
- Modify: `src/configure/riwayah.ts`
- Modify: `src/app-bootstrap.ts`
- Modify: `docs/context/surfaces/configure.md`
- Modify: `docs/context/data-model.md`
- Test: `tests/unit/configure/state.test.ts`
- Test: `tests/unit/configure/night-mode.test.ts`
- Test: `tests/unit/configure/riwayah.test.ts`
- Test: `tests/unit/infra/safety/sync.test.js`

- [ ] **Step 1: Write failing settings migration tests**

Assert boot defaults:

```ts
expect(settings.quranTextStyleId).toBe('uthmani-kfgqpc-v1')
expect(settings.mushafEditionId).toBe('qalun-quran-ws-v1')
expect(settings.nightMode).toBe('off')
```

Assert legacy `nightMode: true` normalizes to `'on'`, `false` to `'off'`, and missing asset settings normalize to defaults compatible with the active riwayah. Add a transaction-failure test that forces the second active-axis write to fail and asserts `settings`, IDB, `<html data-riwayah>`, `SETTINGS_RIWAYAH_CHANGED`, and cross-tab broadcast remain unchanged.

- [ ] **Step 2: Run failing settings tests**

Run: `pnpm vitest run tests/unit/configure/state.test.ts tests/unit/configure/night-mode.test.ts tests/unit/configure/riwayah.test.ts`

Expected: FAIL because the keys and night-mode shape are still old.

- [ ] **Step 3: Update settings state**

In `src/core/settings.svelte.ts`, add:

```ts
export type NightMode = 'off' | 'on' | 'auto'

export const settings = $state({
  theme: 'auto' as Theme,
  riwayah: 'qaloon' as Riwayah,
  fontSize: 'md' as FontSize,
  translationId: 'bridges' as TranslationId,
  tafsirId: 'muyassar' as TafsirId,
  translationVisible: true,
  lineSpacing: 'md' as ReadingStep,
  wordSpacing: 'md' as ReadingStep,
  readerMargin: 'md' as ReadingStep,
  verseSpacing: 'md' as ReadingStep,
  mushafViewMode: 'auto' as MushafViewMode,
  quranTextStyleId: 'uthmani-kfgqpc-v1',
  mushafEditionId: 'qalun-quran-ws-v1',
  nightMode: 'off' as NightMode,
  surahHeaderHidden: false,
  currentPosition: null as GlobalPosition,
  wirdPlan: null as WirdPlan | null,
  offlineCategories: { ...DEFAULT_OFFLINE_CATEGORIES } as OfflineCategoriesState,
})
```

- [ ] **Step 4: Add atomic active variant bundle writer**

Create src/configure/variant-bundle.ts as the only module that writes the active `riwayah`, `quranTextStyleId`, and `mushafEditionId` bundle. Use one IDB readwrite transaction or add a small DB helper that commits all three settings records together before mutating runtime state.

```ts
export type ActiveVariantBundle = {
  riwayah: Riwayah
  quranTextStyleId: string
  mushafEditionId: string
}

export async function setActiveVariantBundle(next: ActiveVariantBundle): Promise<boolean> {
  if (!(await canUseTextAsset(next.riwayah, next.quranTextStyleId))) return false
  if (!(await canUseMushafAsset(next.riwayah, next.mushafEditionId))) return false
  const previous = snapshotActiveVariantBundle()
  await putSettingsBundleAtomically([
    { key: 'riwayah', value: next.riwayah },
    { key: 'quranTextStyleId', value: next.quranTextStyleId },
    { key: 'mushafEditionId', value: next.mushafEditionId },
  ])
  Object.assign(settings, next)
  applyRiwayah(next.riwayah)
  if (previous.riwayah !== next.riwayah) {
    emit(Events.SETTINGS_RIWAYAH_CHANGED, { from: previous.riwayah, to: next.riwayah })
    broadcastRiwayahChange(next.riwayah)
  }
  return true
}
```

The helper must not emit, broadcast, set DOM attributes, or mutate the Svelte state until the transaction succeeds.

Update the settings-change event/cross-tab payload in `src/core/constants.ts` and `src/infra/safety/sync.ts` so other tabs can apply all three active axes together. Keep a riwayah-only compatibility payload only when all existing listeners have been updated in the same task.

Add failing tests in `tests/unit/infra/safety/sync.test.js` for bundled settings payload broadcast/receive, invalid payload rejection, legacy riwayah-only compatibility when retained, and no broadcast when the atomic bundle transaction fails.

- [ ] **Step 5: Add axis APIs that delegate to the bundle writer**

Create src/configure/quran-text-style.ts with `initQuranTextStyle()`, `setQuranTextStyleId(id)`, and `loadQuranTextStyleId()`. Create src/configure/mushaf-edition.ts with matching edition functions. Both modules validate compatibility with current `settings.riwayah` and verified usability, then call `setActiveVariantBundle()` with the unchanged sibling axes instead of writing IDB directly.

- [ ] **Step 6: Migrate night mode**

Update `src/configure/night-mode.ts`:

```ts
function normalizeNightMode(value: unknown): NightMode {
  if (value === true) return 'on'
  if (value === false || value == null) return 'off'
  if (value === 'off' || value === 'on' || value === 'auto') return value
  return 'off'
}
```

`toggleNightMode()` cycles `off -> on -> off` for the existing keyboard shortcut. The settings UI owns selecting `auto`.

- [ ] **Step 7: Make riwayah switching atomic**

In `src/configure/riwayah.ts`, replace single-key switching with a default-bundle lookup and delegated write:

```ts
export async function setRiwayah(next: Riwayah): Promise<boolean> {
  const textStyleId = await defaultTextStyleForRiwayah(next)
  const mushafEditionId = await defaultMushafEditionForRiwayah(next)
  return setActiveVariantBundle({ riwayah: next, quranTextStyleId: textStyleId, mushafEditionId })
}
```

- [ ] **Step 8: Initialize the active bundle during boot**

In `src/app-bootstrap.ts`, normalize/load the full active bundle before reader route dispatch and before applying the DOM riwayah state. Do not run `initRiwayah()` in isolation before the two variant axes; a mismatched saved bundle must normalize as one unit.

- [ ] **Step 9: Run settings tests**

Run: `pnpm vitest run tests/unit/configure/state.test.ts tests/unit/configure/night-mode.test.ts tests/unit/configure/riwayah.test.ts tests/unit/infra/safety/sync.test.js`

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
pnpm run docs
pnpm run docs:check
pnpm run check
git diff --check
git add src/core/settings.svelte.ts src/configure/variant-bundle.ts src/configure/quran-text-style.ts src/configure/mushaf-edition.ts src/configure/night-mode.ts src/configure/riwayah.ts src/app-bootstrap.ts src/core/constants.ts src/infra/safety/sync.ts tests/unit/configure/state.test.ts tests/unit/configure/night-mode.test.ts tests/unit/configure/riwayah.test.ts tests/unit/infra/safety/sync.test.js docs/context/surfaces/configure.md docs/context/data-model.md docs/context
git commit -m "feat(configure): add variant settings migration"
```

### Task 5: Switch Runtime Resolution To Variant Axes

**Files:**
- Modify: `src/data/dataset.ts`
- Modify: `src/data/mushaf-pages.ts`
- Modify: `src/packs/mushaf-pages.ts`
- Modify: `src/read/mushaf/types.ts`
- Modify: `src/read/mushaf/mode-switch.ts`
- Modify: `src/read/mushaf/MushafReader.svelte`
- Modify: `src/read/Reader.svelte`
- Modify: `docs/context/surfaces/read.md`
- Test: `tests/unit/data/dataset.test.js`
- Test: `tests/unit/data/mushaf-pages.test.ts`
- Test: `tests/unit/read/mushaf/reader.test.ts`

- [ ] **Step 1: Write failing resolution tests**

Assert verse mode fetches:

```ts
expect(fetch).toHaveBeenCalledWith('/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json', expect.anything())
```

Assert Mushaf mode fetches:

```ts
expect(fetch).toHaveBeenCalledWith('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json')
```

Assert a manifest with matching `riwayah` but mismatched `mushafEditionId` rejects.

- [ ] **Step 2: Run failing resolution tests**

Run: `pnpm vitest run tests/unit/data/dataset.test.js tests/unit/data/mushaf-pages.test.ts tests/unit/read/mushaf/reader.test.ts`

Expected: FAIL because loaders still use old paths.

- [ ] **Step 3: Update text resolution**

In `src/data/dataset.ts`, load `settings.quranTextStyleId` and build:

```ts
const url = `${DATASET_BASE}/quran-text/${riwayah}/${quranTextStyleId}/${padded}.json`
```

Use `getTextAsset(riwayah, quranTextStyleId)` before fetch; throw `RiwayahPackUnavailableError` if missing, incompatible, incomplete, or unverified.

- [ ] **Step 4: Update Mushaf resolution**

`src/data/mushaf-pages.ts` is a re-export today; update the real loader/validator in `src/packs/mushaf-pages.ts` or replace it with src/packs/mushaf-assets.ts and keep the re-export stable. Pass `mushafEditionId` into manifest loading and page resolution:

```ts
function manifestUrl(riwayah: Riwayah, mushafEditionId: string): string {
  return `${BASE}/${riwayah}/${mushafEditionId}/manifest.json`
}
```

The manifest validator checks `raw.riwayah === expectedRiwayah` and `raw.mushafEditionId === expectedMushafEditionId`.

Update every Mushaf resolver call site to pass or read `settings.mushafEditionId`, including `src/read/mushaf/mode-switch.ts`, `getMushafPackAvailability`, `pageForVerse`, and `loadMushafManifest`.

- [ ] **Step 5: Update reader error copy and install prompts**

Keep prompts anchored to the active missing asset. Do not render Qalun text/pages under a non-Qalun selected label.

- [ ] **Step 6: Run resolution tests**

Run: `pnpm vitest run tests/unit/data/dataset.test.js tests/unit/data/mushaf-pages.test.ts tests/unit/read/mushaf/reader.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
pnpm run docs
pnpm run docs:check
pnpm run check
git diff --check
git add src/data/dataset.ts src/data/mushaf-pages.ts src/packs/mushaf-pages.ts src/read/mushaf/types.ts src/read/mushaf/mode-switch.ts src/read/mushaf/MushafReader.svelte src/read/Reader.svelte tests/unit/data/dataset.test.js tests/unit/data/mushaf-pages.test.ts tests/unit/read/mushaf/reader.test.ts docs/context/surfaces/read.md docs/context
git commit -m "feat(read): resolve Quran assets by active variants"
```

### Task 6: Implement Asset Status And Operations

**Files:**
- Modify: `src/data/offline.ts`
- Modify: src/packs/text-assets.ts
- Modify: src/packs/mushaf-assets.ts
- Create: src/configure/assets/asset-view-model.ts
- Modify: `src/infra/sw/route-defs.ts`
- Modify: `docs/context/surfaces/infra.md`
- Test: `tests/unit/data/offline.test.js`
- Test: `tests/unit/infra/offline/offline-selector.test.ts`
- Test: `tests/unit/infra/sw/route-defs.test.ts`

- [ ] **Step 1: Write failing operation tests**

Cover the required state matrix:

```ts
expect(rowFor(activeOptionalAsset)).toMatchObject({
  status: 'installed',
  primaryAction: 'Active',
  deleteDisabledReason: 'Switch to another compatible asset before deleting.',
})
expect(rowFor(uninstalledCompatibleAsset)).toMatchObject({
  status: 'installable',
  primaryAction: 'Install',
})
expect(rowFor(installedCompatibleAsset)).toMatchObject({
  status: 'installed',
  primaryAction: 'Set Active',
})
expect(rowFor(shippedBaselineAsset)).toMatchObject({
  status: 'shipped',
  primaryAction: 'Set Active',
  disabledReason: 'Included with app',
})
expect(rowFor(oldCacheOnlyAsset)).toMatchObject({
  status: 'incomplete',
  primaryAction: 'Reinstall',
})
expect(rowFor(incompatibleAsset)).toMatchObject({
  status: 'incompatible',
  primaryAction: null,
  disabledReason: expect.stringContaining('Requires active riwayah:'),
})
expect(rowFor(installingAsset)).toMatchObject({
  status: 'installing',
  primaryAction: 'Installing...',
  progressText: '3 of 114',
})
```

- [ ] **Step 2: Run failing operation tests**

Run: `pnpm vitest run tests/unit/data/offline.test.js tests/unit/infra/offline/offline-selector.test.ts tests/unit/infra/sw/route-defs.test.ts`

Expected: FAIL because row view models and concrete asset operations do not exist.

- [ ] **Step 3: Add concrete install helpers**

In `src/data/offline.ts`, add:

```ts
export async function installTextAsset(riwayah: Riwayah, textStyleId: string): Promise<boolean>
export async function installMushafAsset(riwayah: Riwayah, mushafEditionId: string): Promise<boolean>
export async function removeTextAsset(riwayah: Riwayah, textStyleId: string): Promise<void>
export async function removeMushafAsset(riwayah: Riwayah, mushafEditionId: string): Promise<void>
```

Install writes concrete `files[].url` into their route-derived caches, emits progress, and verifies every file after write. Install does not change active settings.

`removeTextAsset()` and `removeMushafAsset()` must reject active optional assets at the operation layer, not only in the row view model. Deleting an active optional text style or Mushaf edition leaves IDB, Svelte settings, DOM riwayah, and Cache Storage unchanged and returns or throws the exact reason `Switch to another compatible asset before deleting.` Remove legacy auto-switch-before-delete behavior from this path.

- [ ] **Step 4: Remove activation from all install paths**

Rewrite existing/facade `startRiwayahPackageInstall()` so it caches and verifies only. It must not call `completeRiwayahInstall()` if that function persists `settings.riwayah`, must not emit `SETTINGS_RIWAYAH_CHANGED`, and must not write `riwayah`, `quranTextStyleId`, or `mushafEditionId`.

Add tests:

```ts
await startRiwayahPackageInstall('hafs')
expect(await get('settings', 'riwayah')).toEqual({ key: 'riwayah', value: 'qaloon' })
expect(settings.riwayah).toBe('qaloon')
expect(emit).not.toHaveBeenCalledWith(Events.SETTINGS_RIWAYAH_CHANGED, expect.anything())
```

- [ ] **Step 5: Add Set Active helpers**

In src/packs/text-assets.ts and src/packs/mushaf-assets.ts, expose:

```ts
export async function canUseTextAsset(riwayah: Riwayah, textStyleId: string): Promise<boolean>
export async function canUseMushafAsset(riwayah: Riwayah, mushafEditionId: string): Promise<boolean>
```

Use these from the axis APIs in src/configure/quran-text-style.ts and src/configure/mushaf-edition.ts. Set Active calls must go through `setActiveVariantBundle()` when they can affect more than one active axis.

- [ ] **Step 6: Add row view model adapter**

Create src/configure/assets/asset-view-model.ts:

```ts
export const ACTIVE_DELETE_DISABLED_REASON = 'Switch to another compatible asset before deleting.'

export type AssetRowView = {
  id: string
  group: 'quran-text' | 'mushaf' | 'translation' | 'tafsir'
  label: string
  status: AssetStatusKind
  active: boolean
  compatible: boolean
  primaryAction: 'Install' | 'Retry' | 'Reinstall' | 'Set Active' | 'Active' | 'Installing...' | null
  secondaryAction: 'Delete' | 'Cancel' | null
  disabledReason: string | null
  deleteDisabledReason: string | null
  progressText: string | null
}
```

All UI rows consume this adapter and never infer installed state from `offlineCategories`, legacy cache names, or old package status.

- [ ] **Step 7: Run operation tests**

Run: `pnpm vitest run tests/unit/data/offline.test.js tests/unit/infra/offline/offline-selector.test.ts tests/unit/infra/sw/route-defs.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
pnpm run docs
pnpm run docs:check
pnpm run check
git diff --check
git add src/data/offline.ts src/packs/text-assets.ts src/packs/mushaf-assets.ts src/configure/assets/asset-view-model.ts src/infra/sw/route-defs.ts tests/unit/data/offline.test.js tests/unit/infra/offline/offline-selector.test.ts tests/unit/infra/sw/route-defs.test.ts docs/context/surfaces/infra.md
git commit -m "feat(assets): add variant asset operations"
```

### Task 7: Build Mode-Aware Settings Components

**Files:**
- Create: src/configure/settings/SettingsShell.svelte
- Create: src/configure/settings/VerseSettings.svelte
- Create: src/configure/settings/MushafSettings.svelte
- Create: src/configure/settings/ThemeNightControls.svelte
- Create: src/configure/settings/NestedAssetPicker.svelte
- Modify: `src/configure/Panel.svelte`
- Modify: `src/configure/panel-bridge.ts`
- Modify: `src/app-bootstrap.ts`
- Modify: `src/read/MarginHeader.svelte`
- Modify: `src/styles/surfaces/settings.css`
- Modify: `docs/context/surfaces/configure.md`
- Test: `tests/unit/configure/panel.test.ts`
- Test: `tests/unit/read/MarginHeader-toggle.test.ts`

- [ ] **Step 1: Use UI workflow before implementation**

Use `quranatlas-ui-workflow`. Identify:

- Surface: `configure`.
- Components: settings shell, Verse preview, Mushaf preview, settings rows, Theme/Night controls, desktop sidebar.
- States: Verse mode, Mushaf mode, nested picker open, installing, unavailable, disabled active delete, light/sepia/dark/night.
- Viewports: `390x844`, `320x568`, `768x1024`, `1280x800`.
- References: `settings-shell.mobile`, `verse-preview.mobile`, `mushaf-preview.mobile`, `verse-settings-rows.mobile`, `theme-night-controls.mobile`, `settings-sidebar.desktop`.

- [ ] **Step 2: Write failing component tests**

Assert:

```ts
expect(screen.getByRole('dialog', { name: 'Verse Settings' })).toBeInTheDocument()
expect(screen.getByText('Quran Text Style')).toBeInTheDocument()
expect(screen.queryByText('Mushaf edition')).not.toBeInTheDocument()
expect(screen.getByRole('button', { name: 'Manage Assets' })).toBeInTheDocument()
```

and:

```ts
expect(screen.getByRole('dialog', { name: 'Mushaf Settings' })).toBeInTheDocument()
expect(screen.getByText('Mushaf Edition')).toBeInTheDocument()
expect(screen.queryByText('Font Size')).not.toBeInTheDocument()
expect(screen.queryByText('Reset')).not.toBeInTheDocument()
expect(screen.queryByText('Storage')).not.toBeInTheDocument()
expect(screen.queryByText('Recitation')).not.toBeInTheDocument()
```

- [ ] **Step 3: Run failing component tests**

Run: `pnpm vitest run tests/unit/configure/panel.test.ts tests/unit/read/MarginHeader-toggle.test.ts`

Expected: FAIL because only the all-purpose settings sheet exists.

- [ ] **Step 4: Extend the panel bridge**

In `src/configure/panel-bridge.ts`:

```ts
export type SettingsMode = 'verse' | 'mushaf'

export interface PanelOverlayAPI extends BaseOverlayAPI {
  open(mode?: SettingsMode): void
  close(): void
  isOpen(): boolean
}

export const openSettingsSheet = (mode?: SettingsMode): void => panelBridge.api.open(mode)
```

- [ ] **Step 5: Pass mode from reader gear**

In `src/read/MarginHeader.svelte`, call:

```ts
openSettingsSheet(onMushafRoute ? 'mushaf' : 'verse')
```

- [ ] **Step 6: Create shared shell, then prove it before content work**

`SettingsShell.svelte` owns labelled dialog/sidebar semantics, focus trap, Escape handling, restored focus, safe-area header, footer Theme/Night controls, and Manage Assets navigation.

```svelte
<section
  role="dialog"
  aria-modal="true"
  aria-labelledby="qa-settings-title"
  class:qa-settings-shell--sidebar={desktop}
>
  <header class="qa-settings-shell-head">
    <h2 id="qa-settings-title">{title}</h2>
    <p>{subtitle}</p>
    <button type="button" aria-label="Close settings" onclick={close}>×</button>
  </header>
  <slot />
  <footer class="qa-settings-shell-foot">
    <ThemeNightControls />
    <button type="button" onclick={goAssets}>Manage Assets</button>
  </footer>
</section>
```

After this shell step, capture proof with Playwright MCP or CLI at `390x844`, `768x1024`, and `1280x800`. Check focus trap, Escape close, restored focus, no horizontal overflow, no header/action overlap, and right-sidebar desktop shape against `settings-shell.mobile` and `settings-sidebar.desktop`. Also run `page.emulateMedia({ reducedMotion: 'reduce' })` and verify essential state does not depend on animation completion.

- [ ] **Step 7: Create shared Theme/Night controls**

Create src/configure/settings/ThemeNightControls.svelte with Light, Sepia, Dark, Auto theme choices and Off, On, Auto Night Mode choices. Tests must cover pressed/current semantics, keyboard focus, screen-reader labels, and parity in both Verse and Mushaf panels.

After this step, re-render both panels and compare against `theme-night-controls.mobile` in light, sepia, dark, and Night overlay states before proceeding.

- [ ] **Step 8: Create Verse Settings**

Include exact inventory: Font Size, Reading Flow, Active Riwayah, Quran Text Style, Translation Source, Show Translation, Tafsir Source, Manage Assets. Do not include Mushaf Edition.

After this step, capture Verse Settings screenshots at `390x844`, `320x568`, `768x1024`, and `1280x800`; compare to `verse-preview.mobile`, `verse-settings-rows.mobile`, and `settings-sidebar.desktop`. Fix visual or DOM mismatches before continuing.

- [ ] **Step 9: Create Mushaf Settings**

Include unframed Mushaf preview, Active Riwayah, Mushaf Edition, Theme/Night, and Manage Assets. Keep Auto/Page/Width in `src/read/mushaf/MushafControls.svelte`.

After this step, capture Mushaf Settings screenshots at the same four viewports; compare to `mushaf-preview.mobile` and `settings-sidebar.desktop`. Verify Verse typography controls are absent.

- [ ] **Step 10: Implement nested picker behavior**

Escape closes picker first. Second Escape closes settings. Picker rows expose install/status affordances from `asset-view-model.ts`.

After this step, capture picker-open proof for compatible, incompatible, installing, unavailable, and active-delete-disabled rows. Verify disabled descriptions use `aria-describedby`.

Manage Assets must close with focus restoration suppressed, for example `close({ restoreFocus: false })`, then the `#/assets` route focuses its page heading or Back control on mount. Do not restore focus to the reader gear or desktop Settings opener immediately before navigation.

- [ ] **Step 11: Update desktop `#/settings` behavior**

In `src/app-bootstrap.ts`, update `#/settings` so desktop opens the redesigned right sidebar, infers mode from the current route or last reader route, restores/replaces back to the reader route, and never shows the old centered modal. Add tests that `#/settings` from `#/m/10` opens Mushaf Settings and from `#/s/2` opens Verse Settings.

- [ ] **Step 12: Run component tests**

Run: `pnpm vitest run tests/unit/configure/panel.test.ts tests/unit/read/MarginHeader-toggle.test.ts`

Expected: PASS.

- [ ] **Step 13: Commit**

```bash
pnpm run docs
pnpm run docs:check
pnpm run check
git diff --check
git add src/configure/settings src/configure/Panel.svelte src/configure/panel-bridge.ts src/app-bootstrap.ts src/read/MarginHeader.svelte src/styles/surfaces/settings.css tests/unit/configure/panel.test.ts tests/unit/read/MarginHeader-toggle.test.ts docs/context/surfaces/configure.md docs/context
git commit -m "feat(configure): add mode-aware settings panels"
```

### Task 8: Build The Asset Management Route

**Files:**
- Create: src/configure/assets/AssetManagement.svelte
- Modify: `src/app-bootstrap.ts`
- Modify: `src/continuity/last-surface.ts`
- Modify: `src/continuity/launch-targets.ts`
- Modify: `src/styles/index.css`
- Create: src/styles/surfaces/assets.css
- Modify: `docs/context/surfaces/configure.md`
- Modify: `docs/context/architecture.md`
- Test: `tests/unit/configure/state-last-surface.test.ts`
- Test: `tests/unit/continuity/launch-targets.test.ts`
- Test: `tests/unit/configure/panel.test.ts`

- [ ] **Step 1: Use UI workflow before implementation**

Use `quranatlas-ui-workflow` with references `asset-management.mobile`, `asset-management.desktop`, `asset-row-states.mobile`, `asset-table-states.desktop`, and `asset-status-live-region.mobile`.

- [ ] **Step 2: Write failing route tests**

Assert:

```ts
await persistLastSurface('#/assets')
expect(await get('settings', 'lastSurface')).toBeUndefined()
await expect(resolveLaunchableTarget('#/assets', 'qaloon')).resolves.toBeNull()
```

Assert Manage Assets closes the panel and navigates to `#/assets`. Add unit or component tests for direct-entry behavior:

```ts
render(AssetManagement, { historyCanGoBack: false })
expect(screen.getByRole('link', { name: 'Back to Reader' })).toHaveAttribute('href', '#/s/1')
```

Add route/history tests proving Manage Assets from a reader route pushes `#/assets`, browser Back returns to that reader route, reload does not persist assets as `lastSurface`, and Back does not loop between `#/assets` and `#/settings`.

Add focus tests proving Manage Assets suppresses settings-opener focus restoration and the `#/assets` heading or Back control receives focus on mount.

- [ ] **Step 3: Run failing route tests**

Run: `pnpm vitest run tests/unit/configure/state-last-surface.test.ts tests/unit/continuity/launch-targets.test.ts tests/unit/configure/panel.test.ts`

Expected: FAIL because `#/assets` is not registered or excluded.

- [ ] **Step 4: Register the route**

In `src/app-bootstrap.ts`:

```ts
router.register('#/assets', async () => (await import('./configure/assets/AssetManagement.svelte')).default)
```

- [ ] **Step 5: Move storage/install CTAs to assets**

Update `src/core/quota-banner.svelte`, reader missing-asset prompts, and Mushaf missing-asset prompts so storage and missing-asset recovery route to `#/assets` or open the relevant asset picker with a clear fallback. Add route tests for the quota banner CTA and reader/Mushaf missing-asset prompts.

- [ ] **Step 6: Exclude route from persistence and restore**

In `src/continuity/last-surface.ts`:

```ts
const SKIP_PERSIST_PREFIXES = ['#/onboarding', '#/settings', '#/assets']
```

Keep `#/assets` out of `STATIC_LAUNCHABLE_ROUTES` in `src/continuity/launch-targets.ts`.

- [ ] **Step 7: Implement mobile route**

`AssetManagement.svelte` mobile layout:

- Sticky compact header with Back and optional reload/verify.
- Active variant summary.
- Polite status live region.
- Sections: Quran Text Styles, Mushaf Editions, Translations, Tafsir.
- Rows from `asset-view-model.ts`.

After the mobile route shell and first row state are implemented, capture `390x844`, `320x568`, and `768x1024` proof before adding desktop tables. Compare against `asset-management.mobile`, `asset-row-states.mobile`, and `asset-status-live-region.mobile`; verify no horizontal overflow, 44px touch targets, visible disabled reason text, live-region node placement, and reduced-motion behavior with `page.emulateMedia({ reducedMotion: 'reduce' })`.

- [ ] **Step 8: Implement desktop route**

Desktop layout is two-pane operational UI: left summary/navigation, right grouped tables. Do not nest cards inside cards.

After desktop tables are implemented, capture `1440x900` proof and compare to `asset-management.desktop` and `asset-table-states.desktop`. Verify table actions do not wrap incoherently at `1280x800`.

- [ ] **Step 9: Add route styles**

Import src/styles/surfaces/assets.css in `src/styles/index.css`. Use QuranAtlas tokens, 8px or smaller radius, 44px touch targets, no decorative blobs or marketing hero treatment.

- [ ] **Step 10: Run route tests**

Run: `pnpm vitest run tests/unit/configure/state-last-surface.test.ts tests/unit/continuity/launch-targets.test.ts tests/unit/configure/panel.test.ts`

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
pnpm run docs
pnpm run docs:check
pnpm run check
git diff --check
git add src/configure/assets/AssetManagement.svelte src/app-bootstrap.ts src/continuity/last-surface.ts src/continuity/launch-targets.ts src/core/quota-banner.svelte src/read/Reader.svelte src/read/mushaf/MushafReader.svelte src/styles/index.css src/styles/surfaces/assets.css tests/unit/configure/state-last-surface.test.ts tests/unit/continuity/launch-targets.test.ts tests/unit/configure/panel.test.ts docs/context/surfaces/configure.md docs/context/architecture.md docs/context
git commit -m "feat(configure): add asset management route"
```

### Task 9: Remove Command Sheet And Current Search Entry

**Files:**
- Modify: `src/App.svelte`
- Modify: `src/app-bootstrap.ts`
- Modify: `src/read/AmbientDock.svelte`
- Modify: `src/read/AmbientPill.svelte`
- Modify: `src/onboard/screens.ts`
- Modify: `src/navigate/global-shortcuts.ts`
- Modify: `src/navigate/NavDrawer.svelte`
- Delete: `src/navigate/CommandSheet.svelte`
- Delete: `src/navigate/command-sheet-bridge.ts`
- Delete: `src/navigate/state-command-sheet.svelte.ts`
- Delete: `src/navigate/search-contract.ts`
- Modify: `src/navigate/shortcuts-sheet.js`
- Modify: `docs/product-info.md`
- Modify: `docs/context/implemented.md`
- Modify: `docs/context/feature-map.md`
- Modify: `docs/context/architecture.md`
- Modify: `docs/context/surfaces/infra.md`
- Modify: `docs/context/surfaces/onboard.md`
- Modify: `docs/context/surfaces/navigate.md`
- Modify: `docs/context/surfaces/read.md`
- Test: `tests/unit/navigate/command-sheet.test.ts`
- Test: `tests/unit/navigate/state-command-sheet.test.ts`
- Test: `tests/unit/read/AmbientDock.test.ts`
- Test: `tests/e2e/navigate/command-sheet.spec.js`

- [ ] **Step 1: Write removal tests**

Replace old Command Sheet assertions with absence assertions:

```ts
expect(screen.queryByLabelText('Search')).not.toBeInTheDocument()
expect(() => initGlobalShortcuts()).not.toThrow()
expect(screen.queryByText('⌘K')).not.toBeInTheDocument()
expect(screen.queryByText('Command sheet')).not.toBeInTheDocument()
```

E2E should no longer expect `Cmd/Ctrl+K`, `/`, or Search rail to open command/search UI.

- [ ] **Step 2: Inventory all command/search callsites**

Before deleting files, run:

```bash
rg -n "CommandSheet|commandSheet|command-sheet|openCommandSheet|closeCommandSheet|state-command-sheet|search-contract|Cmd\\+K|⌘K|Ctrl\\+K|quick.?jump|open command|qa-cmd|cmd-sheet|cmd-results|cmd-foot|#/settings|Search over|Search verses|Preferences|Command sheet|Search" src tests docs .agents
```

Every hit must be removed, rewritten to non-command behavior, or retained only when it is clearly future-only roadmap text outside current UI promises. Include `src/read/AmbientPill.svelte`, `src/onboard/screens.ts`, `src/styles/surfaces/nav.css`, `tests/e2e/fixtures/chrome.js`, `tests/e2e/infra/offline.spec.js`, `tests/e2e/navigate/surahs.spec.js`, `docs/product-info.md`, and shortcut docs in the review.

- [ ] **Step 3: Run failing navigation tests**

Run: `pnpm vitest run tests/unit/read/AmbientDock.test.ts tests/unit/navigate/reader-actions.test.js`

Expected: FAIL while Search and command shortcuts still exist.

- [ ] **Step 4: Remove lazy mount**

In `src/App.svelte`, remove command sheet imports, state slots, bridge mounter, dynamic import effect, and `{#if CommandSheetComp}` block.

- [ ] **Step 5: Remove keyboard shortcuts**

In `src/navigate/global-shortcuts.ts`, remove `Cmd/Ctrl+K`, `/`, command-sheet open/close gating, and `g p`. Keep `?`, `g h`, `g s`, `g a`, and reader hotkeys that do not depend on Command Sheet.

- [ ] **Step 6: Remove AmbientDock Search**

In `src/read/AmbientDock.svelte`, change tab type to:

```ts
type Tab = { id: 'verse' | 'mushaf' | 'settings'; label: string; matches: (h: string) => boolean }
```

Settings opens `openSettingsSheet(reader.readerMode === 'mushaf' ? 'mushaf' : 'verse')`.

- [ ] **Step 7: Remove AmbientPill command affordance**

In `src/read/AmbientPill.svelte`, remove `openCommandSheet`, click/keyboard command opening, and the `⌘K` hint. Keep the ambient pill as read-position feedback only.

- [ ] **Step 8: Delete command files, CSS, and replace tests**

Delete the command component, bridge, state module, search contract, and `.qa-cmd-*` CSS from `src/styles/surfaces/nav.css`. Replace command tests with absence/no-op tests for `Cmd/Ctrl+K`, `/`, `g p`, Search rail affordances, command docs copy, and retained direct shortcuts such as `g h`, `g s`, `g a`, `?`, and reader hotkeys.

- [ ] **Step 9: Run navigation tests**

Run: `pnpm vitest run tests/unit/read/AmbientDock.test.ts tests/unit/read/state-ambient.test.ts tests/unit/navigate/reader-actions.test.js tests/unit/navigate/drawer.test.ts tests/unit/core/reader-first-import-guards.test.ts`

Run: `pnpm playwright test tests/e2e/navigate/drawer.spec.js tests/e2e/navigate/surahs.spec.js tests/e2e/read/chrome.spec.js --project=chromium --reporter=line`

Run the post-removal inventory again:

```bash
rg -n "CommandSheet|commandSheet|command-sheet|openCommandSheet|closeCommandSheet|state-command-sheet|search-contract|Cmd\\+K|⌘K|Ctrl\\+K|quick.?jump|open command|qa-cmd|cmd-sheet|cmd-results|cmd-foot|Search over|Search verses|Command sheet" src tests docs .agents
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
pnpm run docs
pnpm run docs:check
pnpm run check
git diff --check
git add -A src/App.svelte src/app-bootstrap.ts src/read/AmbientDock.svelte src/read/AmbientPill.svelte src/onboard/screens.ts src/navigate src/styles/surfaces/nav.css docs/product-info.md docs/context tests/unit tests/e2e
git commit -m "feat(navigate): remove command sheet search entry"
```

### Task 10: Add Browser Proof And Durable E2E Coverage

**Files:**
- Modify: `tests/e2e/configure/settings.spec.js`
- Modify: `tests/e2e/read/chrome.spec.js`
- Modify: `tests/e2e/navigate/drawer.spec.js`
- Modify: `tests/e2e/infra/offline.spec.js`
- Modify: `docs/context/surfaces/configure.md`
- Modify: `docs/context/surfaces/read.md`
- Modify: `docs/context/surfaces/navigate.md`
- Modify: `docs/context/surfaces/infra.md`

- [ ] **Step 1: Use e2e placement rules**

Read `tests/e2e/AGENTS.md`. Only keep browser-only assertions in E2E: layout, focus trap, restored focus, route/history behavior, live region nodes, Cache Storage/service-worker behavior, and no-overflow measurements.

- [ ] **Step 2: Add settings E2E coverage**

Extend `tests/e2e/configure/settings.spec.js`:

```js
await page.setViewportSize({ width: 390, height: 844 })
await page.goto('/#/s/1')
await page.getByLabel('Open settings').click()
await expect(page.getByRole('dialog', { name: 'Verse Settings' })).toBeVisible()
await expect(page.getByRole('button', { name: 'Manage Assets' })).toBeVisible()
await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
```

Also cover Mushaf mode, Escape order for nested picker, and restored focus to the opener.

- [ ] **Step 3: Add assets route E2E coverage**

Cover `#/assets` at `390x844`, `320x568`, `768x1024`, and `1440x900`. Assert page heading, section landmarks, live region, row actions, disabled reason copy, and no horizontal overflow.

Also cover direct entry and history:

```js
await page.goto('/#/assets')
await expect(page.getByRole('link', { name: 'Back to Reader' })).toHaveAttribute('href', '#/s/1')
await page.goto('/#/s/1')
await page.getByLabel('Open settings').click()
await expect(page.getByRole('dialog', { name: 'Verse Settings' })).toBeVisible()
await page.getByRole('button', { name: 'Manage Assets' }).click()
await expect(page.getByRole('dialog', { name: 'Verse Settings' })).toBeHidden()
await expect(page).toHaveURL(/#\/assets$/)
await expect.poll(() => page.evaluate(() => document.activeElement?.matches('h1, [data-testid="assets-back"]'))).toBe(true)
await page.goBack()
await expect(page).toHaveURL(/#\/s\/1$/)
```

- [ ] **Step 4: Add offline/service-worker asset coverage**

Extend `tests/e2e/infra/offline.spec.js` under `@offline` for install-only behavior, Set Active after verification, active delete blocking, and old-cache incomplete state.

- [ ] **Step 5: Capture development screenshots**

Run with Playwright MCP or Playwright CLI:

```bash
pnpm playwright test tests/e2e/configure/settings.spec.js --project=chromium --reporter=line
pnpm playwright test tests/e2e/read/chrome.spec.js --project=chromium --reporter=line
```

Screenshot states:

- Verse Settings and Mushaf Settings at `390x844`, `320x568`, `768x1024`, `1280x800`.
- `#/assets` at `390x844`, `320x568`, `768x1024`, `1440x900`.
- Light, sepia, dark, and Night overlay placement.
- Reduced motion for Verse Settings, Mushaf Settings, nested picker, and `#/assets` using `page.emulateMedia({ reducedMotion: 'reduce' })`.

- [ ] **Step 6: Run every modified E2E spec**

Run:

```bash
pnpm playwright test tests/e2e/configure/settings.spec.js tests/e2e/read/chrome.spec.js tests/e2e/navigate/drawer.spec.js --project=chromium --reporter=line
PLAYWRIGHT_INCLUDE_OFFLINE=1 PLAYWRIGHT_USE_PREVIEW=1 pnpm playwright test tests/e2e/infra/offline.spec.js --project="Offline (Preview)" --reporter=line
```

- [ ] **Step 7: Commit**

```bash
pnpm run docs
pnpm run docs:check
git diff --check
git add tests/e2e/configure/settings.spec.js tests/e2e/read/chrome.spec.js tests/e2e/navigate/drawer.spec.js tests/e2e/infra/offline.spec.js docs/context/surfaces/configure.md docs/context/surfaces/read.md docs/context/surfaces/navigate.md docs/context/surfaces/infra.md
git commit -m "test(e2e): cover variant settings and assets"
```

### Task 11: Regenerate Context Docs And Run Final Gates

**Files:**
- Modify: `docs/context/**`
- Modify: `docs/tech-stack.md` only if scripts, tooling, pinned versions, or CI gates changed.

- [ ] **Step 1: Confirm context docs are already regenerated**

Run: `pnpm run docs:check`

Expected: generated inventories and event indexes are already current. If this fails, run `pnpm run docs`, inspect the generated changes, and commit them only with the behavior task that caused the drift or as a docs-only correction if the drift is discovered at final verification.

- [ ] **Step 2: Run data verification**

Run: `pnpm run data -- check`

Expected: source catalog, baseline text, knowledge, Mushaf page checks, and package facade checks pass.

- [ ] **Step 3: Run static checks**

Run: `pnpm run check`

Expected: ESLint, Stylelint, token checks, at-layer checks, no Svelte style blocks, and `svelte-check` pass.

- [ ] **Step 4: Run unit tests**

Run: `pnpm run test`

Expected: all Vitest suites pass.

- [ ] **Step 5: Run targeted E2E**

Run:

```bash
pnpm playwright test tests/e2e/configure/settings.spec.js tests/e2e/read/chrome.spec.js tests/e2e/navigate/drawer.spec.js --project=chromium --reporter=line
PLAYWRIGHT_INCLUDE_OFFLINE=1 PLAYWRIGHT_USE_PREVIEW=1 pnpm playwright test tests/e2e/infra/offline.spec.js --project="Offline (Preview)" --reporter=line
```

Expected: all targeted browser specs pass.

- [ ] **Step 6: Run final validation**

Run: `pnpm run validate`

Expected: check, feature-state guard, unit tests, data build, Vite build, chunk check, and docs check pass.

- [ ] **Step 7: Commit only if final gates changed docs or generated data**

```bash
git add docs/context docs/tech-stack.md public/dataset
git commit -m "docs: update variant asset context"
```

Skip this commit when `git status --short` is clean after verification.

---

## UI Acceptance Checklist

- Verse Settings and Mushaf Settings share the same shell, row rhythm, status chips, footer controls, focus behavior, and Manage Assets treatment.
- Verse Settings exact inventory: Font Size, Reading Flow, Active Riwayah, Quran Text Style, Translation Source, Show Translation, Tafsir Source, Manage Assets.
- Mushaf Settings exact inventory: preview, Active Riwayah, Mushaf Edition, Theme/Night, Manage Assets.
- Theme and Night controls are visible in the footer band on normal mobile heights and reachable after one body scroll on short screens.
- `Night Mode` is Off, On, Auto; keyboard `n` remains coherent.
- `#/assets` excludes launch restore and shows Back to Reader on direct entry.
- Install never changes active settings.
- Set Active appears only after verified usability.
- Delete is blocked for active optional assets with exact reason: `Switch to another compatible asset before deleting.`
- Generated Arabic/Quran text in reference images is ignored; real QuranAtlas rendering is used.
- No Command Sheet, Search rail entry, `Cmd/Ctrl+K`, `/`, `g p`, or command/search promise remains in current docs or UI.

## Verification Summary

Smallest proving gates by change cluster:

- Data/index changes: `pnpm run data -- check`, focused script tests, and `pnpm run docs:check`.
- Runtime settings/assets: focused unit tests plus `pnpm run check`.
- UI layout/settings/assets: component tests, Playwright screenshots/proof, and targeted E2E.
- Navigation cleanup: focused navigate/read tests plus docs regeneration.
- Final integration: `pnpm run validate`.
