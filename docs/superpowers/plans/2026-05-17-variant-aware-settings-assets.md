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
- src/configure/settings/NestedAssetPicker.svelte - reusable picker for riwayah, text-style, translation, tafsir, and Mushaf edition choices.
- src/configure/quran-text-style.ts - sole writer for `settings.quranTextStyleId`.
- src/configure/mushaf-edition.ts - sole writer for `settings.mushafEditionId`.
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
- `src/data/dataset.ts` and `src/data/mushaf-pages.ts` - resolve assets by `(riwayah, quranTextStyleId)` and `(riwayah, mushafEditionId)`.
- `src/data/offline.ts` and `src/infra/sw/route-defs.ts` - install/status/delete/verify by concrete asset URLs and new cache names.
- `src/navigate/global-shortcuts.ts`, `src/navigate/CommandSheet.svelte`, `src/navigate/command-sheet-bridge.ts`, `src/navigate/state-command-sheet.svelte.ts`, `src/navigate/search-contract.ts`, `src/App.svelte` - remove Command Sheet and current Search promises.
- `src/styles/index.css`, `src/styles/surfaces/settings.css`, `src/styles/surfaces/nav.css` - wire assets styles and redesigned settings/dock styling.
- Context docs listed above - update in the same behavior changes; run `pnpm run docs` when generated inventories change.

Extend tests:

- Unit: `tests/unit/scripts/build-dataset.test.js`, `tests/unit/scripts/mushaf-pages.test.js`, `tests/unit/data/dataset.test.js`, `tests/unit/data/mushaf-pages.test.ts`, `tests/unit/data/offline.test.js`, `tests/unit/packs/riwayah.test.ts`, `tests/unit/packs/mushaf-pages.test.ts`, `tests/unit/configure/night-mode.test.ts`, `tests/unit/configure/panel.test.ts`, `tests/unit/configure/state.test.ts`, `tests/unit/configure/state-last-surface.test.ts`, `tests/unit/continuity/launch-targets.test.ts`, `tests/unit/read/AmbientDock.test.ts`, `tests/unit/read/MarginHeader-toggle.test.ts`, `tests/unit/navigate/drawer.test.ts`, `tests/unit/navigate/reader-actions.test.js`, `tests/unit/infra/sw/route-defs.test.ts`.
- E2E: `tests/e2e/configure/settings.spec.js`, `tests/e2e/read/chrome.spec.js`, `tests/e2e/navigate/drawer.spec.js`, `tests/e2e/infra/offline.spec.js`.

---

### Task 1: Add Asset Catalog Contracts

**Files:**
- Create: data/catalog/quran-text-assets.json
- Create: data/catalog/mushaf-assets.json
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
expect(mushafCatalog.defaults.qaloon).toBe('qalun-quran-ws-v1')
expect(mushafCatalog.assets).toContainEqual(expect.objectContaining({
  riwayah: 'qaloon',
  mushafEditionId: 'qalun-quran-ws-v1',
  visibility: 'baseline',
  shipped: true,
}))
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

- [ ] **Step 6: Commit**

```bash
git add data/catalog/quran-text-assets.json data/catalog/mushaf-assets.json tests/unit/scripts/build-dataset.test.js tests/unit/scripts/mushaf-pages.test.js docs/context/source-data-flow.md docs/context/data-model.md
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
expect(textAssets.assets[0]).toMatchObject({
  riwayah: 'qaloon',
  textStyleId: 'uthmani-kfgqpc-v1',
  ayahCount: 6214,
  outputPathTemplate: 'quran-text/qaloon/uthmani-kfgqpc-v1/{surah}.json',
})
expect(textAssets.assets[0].files[0].url).toBe('/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json')

const mushafAssets = readJson('public/dataset/indexes/mushaf-assets.json')
expect(mushafAssets.defaults.qaloon).toBe('qalun-quran-ws-v1')
expect(mushafAssets.assets[0].manifestUrl).toBe('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json')
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

- [ ] **Step 7: Update route definitions**

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

- [ ] **Step 8: Demote `riwayah-packages.json`**

In `scripts/data/riwayah-packages/build.mjs`, build the facade from `text-assets.json` and `mushaf-assets.json` so old consumers still see complete packages while new logic uses the new indexes.

- [ ] **Step 9: Run data and route tests**

Run: `pnpm vitest run tests/unit/scripts/build-dataset.test.js tests/unit/scripts/mushaf-pages.test.js tests/unit/data/riwayah-packages.test.ts tests/unit/infra/sw/route-defs.test.ts`

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
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

- [ ] **Step 4: Add text asset loader**

Create src/packs/text-assets.ts with strict validation and cache fallback from `CACHE_DATASET`. The validator must reject URLs not starting with `/dataset/quran-text/`.

- [ ] **Step 5: Add Mushaf asset loader**

Create src/packs/mushaf-assets.ts with strict validation and cache fallback. The validator must reject manifests whose `riwayah` or `mushafEditionId` does not match the requested asset.

- [ ] **Step 6: Run validator tests**

Run: `pnpm vitest run tests/unit/packs/riwayah.test.ts tests/unit/packs/mushaf-pages.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/packs/asset-types.ts src/packs/text-assets.ts src/packs/mushaf-assets.ts src/core/constants.ts tests/unit/packs/riwayah.test.ts tests/unit/packs/mushaf-pages.test.ts
git commit -m "feat(packs): add variant asset loaders"
```

### Task 4: Add Settings Keys And Migration

**Files:**
- Modify: `src/core/settings.svelte.ts`
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

- [ ] **Step 1: Write failing settings migration tests**

Assert boot defaults:

```ts
expect(settings.quranTextStyleId).toBe('uthmani-kfgqpc-v1')
expect(settings.mushafEditionId).toBe('qalun-quran-ws-v1')
expect(settings.nightMode).toBe('off')
```

Assert legacy `nightMode: true` normalizes to `'on'`, `false` to `'off'`, and missing asset settings normalize to defaults compatible with the active riwayah.

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

- [ ] **Step 4: Add sole writers**

Create src/configure/quran-text-style.ts with `initQuranTextStyle()`, `setQuranTextStyleId(id)`, and `loadQuranTextStyleId()`. Create src/configure/mushaf-edition.ts with matching edition functions. Both modules validate compatibility with current `settings.riwayah` and verified usability before writing IDB.

- [ ] **Step 5: Migrate night mode**

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

- [ ] **Step 6: Make riwayah switching atomic**

In `src/configure/riwayah.ts`, replace single-key switching with:

```ts
export async function setRiwayah(next: Riwayah): Promise<boolean> {
  const textStyleId = await defaultTextStyleForRiwayah(next)
  const mushafEditionId = await defaultMushafEditionForRiwayah(next)
  if (!(await canUseTextAsset(next, textStyleId))) return false
  if (!(await canUseMushafAsset(next, mushafEditionId))) return false
  const previous = await loadRiwayah()
  await put('settings', { key: 'riwayah', value: next })
  await put('settings', { key: 'quranTextStyleId', value: textStyleId })
  await put('settings', { key: 'mushafEditionId', value: mushafEditionId })
  Object.assign(settings, { riwayah: next, quranTextStyleId: textStyleId, mushafEditionId })
  applyRiwayah(next)
  if (previous !== next) emit(Events.SETTINGS_RIWAYAH_CHANGED, { from: previous, to: next })
  return true
}
```

- [ ] **Step 7: Initialize new settings during boot**

In `src/app-bootstrap.ts`, run `initQuranTextStyle()` and `initMushafEdition()` after `initRiwayah()` and before reader routes dispatch.

- [ ] **Step 8: Run settings tests**

Run: `pnpm vitest run tests/unit/configure/state.test.ts tests/unit/configure/night-mode.test.ts tests/unit/configure/riwayah.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/core/settings.svelte.ts src/configure/quran-text-style.ts src/configure/mushaf-edition.ts src/configure/night-mode.ts src/configure/riwayah.ts src/app-bootstrap.ts tests/unit/configure/state.test.ts tests/unit/configure/night-mode.test.ts tests/unit/configure/riwayah.test.ts docs/context/surfaces/configure.md docs/context/data-model.md
git commit -m "feat(configure): add variant settings migration"
```

### Task 5: Switch Runtime Resolution To Variant Axes

**Files:**
- Modify: `src/data/dataset.ts`
- Modify: `src/data/mushaf-pages.ts`
- Modify: `src/read/mushaf/types.ts`
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

In `src/data/mushaf-pages.ts`, pass `mushafEditionId` into manifest loading and page resolution:

```ts
function manifestUrl(riwayah: Riwayah, mushafEditionId: string): string {
  return `${BASE}/${riwayah}/${mushafEditionId}/manifest.json`
}
```

The manifest validator checks `raw.riwayah === expectedRiwayah` and `raw.mushafEditionId === expectedMushafEditionId`.

- [ ] **Step 5: Update reader error copy and install prompts**

Keep prompts anchored to the active missing asset. Do not render Qalun text/pages under a non-Qalun selected label.

- [ ] **Step 6: Run resolution tests**

Run: `pnpm vitest run tests/unit/data/dataset.test.js tests/unit/data/mushaf-pages.test.ts tests/unit/read/mushaf/reader.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/dataset.ts src/data/mushaf-pages.ts src/read/mushaf/types.ts src/read/mushaf/MushafReader.svelte src/read/Reader.svelte tests/unit/data/dataset.test.js tests/unit/data/mushaf-pages.test.ts tests/unit/read/mushaf/reader.test.ts docs/context/surfaces/read.md
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
  status: 'unavailable',
  primaryAction: 'Install',
})
expect(rowFor(installedCompatibleAsset)).toMatchObject({
  status: 'installed',
  primaryAction: 'Set Active',
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

- [ ] **Step 4: Add Set Active helpers**

In src/packs/text-assets.ts and src/packs/mushaf-assets.ts, expose:

```ts
export async function canUseTextAsset(riwayah: Riwayah, textStyleId: string): Promise<boolean>
export async function canUseMushafAsset(riwayah: Riwayah, mushafEditionId: string): Promise<boolean>
```

Use these from the sole writers in src/configure/quran-text-style.ts and src/configure/mushaf-edition.ts.

- [ ] **Step 5: Add row view model adapter**

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
  primaryAction: 'Install' | 'Retry' | 'Reinstall' | 'Set Active' | 'Active' | 'Installing...'
  secondaryAction: 'Delete' | 'Cancel' | null
  disabledReason: string | null
  deleteDisabledReason: string | null
  progressText: string | null
}
```

All UI rows consume this adapter and never infer installed state from `offlineCategories`, legacy cache names, or old package status.

- [ ] **Step 6: Run operation tests**

Run: `pnpm vitest run tests/unit/data/offline.test.js tests/unit/infra/offline/offline-selector.test.ts tests/unit/infra/sw/route-defs.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/offline.ts src/packs/text-assets.ts src/packs/mushaf-assets.ts src/configure/assets/asset-view-model.ts src/infra/sw/route-defs.ts tests/unit/data/offline.test.js tests/unit/infra/offline/offline-selector.test.ts tests/unit/infra/sw/route-defs.test.ts docs/context/surfaces/infra.md
git commit -m "feat(assets): add variant asset operations"
```

### Task 7: Build Mode-Aware Settings Components

**Files:**
- Create: src/configure/settings/SettingsShell.svelte
- Create: src/configure/settings/VerseSettings.svelte
- Create: src/configure/settings/MushafSettings.svelte
- Create: src/configure/settings/NestedAssetPicker.svelte
- Modify: `src/configure/Panel.svelte`
- Modify: `src/configure/panel-bridge.ts`
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

- [ ] **Step 6: Create shared shell**

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

- [ ] **Step 7: Create Verse Settings**

Include exact inventory: Font Size, Reading Flow, Active Riwayah, Quran Text Style, Translation Source, Show Translation, Tafsir Source, Manage Assets. Do not include Mushaf Edition.

- [ ] **Step 8: Create Mushaf Settings**

Include unframed Mushaf preview, Active Riwayah, Mushaf Edition, Theme/Night, and Manage Assets. Keep Auto/Page/Width in `src/read/mushaf/MushafControls.svelte`.

- [ ] **Step 9: Implement nested picker behavior**

Escape closes picker first. Second Escape closes settings. Picker rows expose install/status affordances from `asset-view-model.ts`.

- [ ] **Step 10: Run component tests**

Run: `pnpm vitest run tests/unit/configure/panel.test.ts tests/unit/read/MarginHeader-toggle.test.ts`

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/configure/settings src/configure/Panel.svelte src/configure/panel-bridge.ts src/read/MarginHeader.svelte src/styles/surfaces/settings.css tests/unit/configure/panel.test.ts tests/unit/read/MarginHeader-toggle.test.ts docs/context/surfaces/configure.md
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

Assert Manage Assets closes the panel and navigates to `#/assets`.

- [ ] **Step 3: Run failing route tests**

Run: `pnpm vitest run tests/unit/configure/state-last-surface.test.ts tests/unit/continuity/launch-targets.test.ts tests/unit/configure/panel.test.ts`

Expected: FAIL because `#/assets` is not registered or excluded.

- [ ] **Step 4: Register the route**

In `src/app-bootstrap.ts`:

```ts
router.register('#/assets', async () => (await import('./configure/assets/AssetManagement.svelte')).default)
```

- [ ] **Step 5: Exclude route from persistence and restore**

In `src/continuity/last-surface.ts`:

```ts
const SKIP_PERSIST_PREFIXES = ['#/onboarding', '#/settings', '#/assets']
```

Keep `#/assets` out of `STATIC_LAUNCHABLE_ROUTES` in `src/continuity/launch-targets.ts`.

- [ ] **Step 6: Implement mobile route**

`AssetManagement.svelte` mobile layout:

- Sticky compact header with Back and optional reload/verify.
- Active variant summary.
- Polite status live region.
- Sections: Quran Text Styles, Mushaf Editions, Translations, Tafsir.
- Rows from `asset-view-model.ts`.

- [ ] **Step 7: Implement desktop route**

Desktop layout is two-pane operational UI: left summary/navigation, right grouped tables. Do not nest cards inside cards.

- [ ] **Step 8: Add route styles**

Import src/styles/surfaces/assets.css in `src/styles/index.css`. Use QuranAtlas tokens, 8px or smaller radius, 44px touch targets, no decorative blobs or marketing hero treatment.

- [ ] **Step 9: Run route tests**

Run: `pnpm vitest run tests/unit/configure/state-last-surface.test.ts tests/unit/continuity/launch-targets.test.ts tests/unit/configure/panel.test.ts`

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/configure/assets/AssetManagement.svelte src/app-bootstrap.ts src/continuity/last-surface.ts src/continuity/launch-targets.ts src/styles/index.css src/styles/surfaces/assets.css tests/unit/configure/state-last-surface.test.ts tests/unit/continuity/launch-targets.test.ts tests/unit/configure/panel.test.ts docs/context/surfaces/configure.md docs/context/architecture.md
git commit -m "feat(configure): add asset management route"
```

### Task 9: Remove Command Sheet And Current Search Entry

**Files:**
- Modify: `src/App.svelte`
- Modify: `src/app-bootstrap.ts`
- Modify: `src/read/AmbientDock.svelte`
- Modify: `src/navigate/global-shortcuts.ts`
- Modify: `src/navigate/NavDrawer.svelte`
- Delete: `src/navigate/CommandSheet.svelte`
- Delete: `src/navigate/command-sheet-bridge.ts`
- Delete: `src/navigate/state-command-sheet.svelte.ts`
- Delete: `src/navigate/search-contract.ts`
- Modify: `src/navigate/shortcuts-sheet.js`
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
```

E2E should no longer expect `Cmd/Ctrl+K`, `/`, or Search rail to open command/search UI.

- [ ] **Step 2: Run failing navigation tests**

Run: `pnpm vitest run tests/unit/read/AmbientDock.test.ts tests/unit/navigate/reader-actions.test.js`

Expected: FAIL while Search and command shortcuts still exist.

- [ ] **Step 3: Remove lazy mount**

In `src/App.svelte`, remove command sheet imports, state slots, bridge mounter, dynamic import effect, and `{#if CommandSheetComp}` block.

- [ ] **Step 4: Remove keyboard shortcuts**

In `src/navigate/global-shortcuts.ts`, remove `Cmd/Ctrl+K`, `/`, command-sheet open/close gating, and `g p`. Keep `?`, `g h`, `g s`, `g a`, and reader hotkeys that do not depend on Command Sheet.

- [ ] **Step 5: Remove AmbientDock Search**

In `src/read/AmbientDock.svelte`, change tab type to:

```ts
type Tab = { id: 'verse' | 'mushaf' | 'settings'; label: string; matches: (h: string) => boolean }
```

Settings opens `openSettingsSheet(reader.readerMode === 'mushaf' ? 'mushaf' : 'verse')`.

- [ ] **Step 6: Delete command files and tests**

Delete the command component, bridge, state module, and search contract. Delete or rewrite command-specific tests so they no longer assert removed product scope.

- [ ] **Step 7: Run navigation tests**

Run: `pnpm vitest run tests/unit/read/AmbientDock.test.ts tests/unit/navigate/reader-actions.test.js tests/unit/navigate/drawer.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A src/App.svelte src/app-bootstrap.ts src/read/AmbientDock.svelte src/navigate docs/context/surfaces/navigate.md docs/context/surfaces/read.md tests/unit tests/e2e/navigate
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
await expect(page.locator('body')).not.toHaveJSProperty('scrollWidth', await page.evaluate(() => document.body.clientWidth))
```

Also cover Mushaf mode, Escape order for nested picker, and restored focus to the opener.

- [ ] **Step 3: Add assets route E2E coverage**

Cover `#/assets` at `390x844`, `320x568`, `768x1024`, and `1440x900`. Assert page heading, section landmarks, live region, row actions, disabled reason copy, and no horizontal overflow.

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

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/configure/settings.spec.js tests/e2e/read/chrome.spec.js tests/e2e/navigate/drawer.spec.js tests/e2e/infra/offline.spec.js docs/context/surfaces/configure.md docs/context/surfaces/read.md docs/context/surfaces/navigate.md docs/context/surfaces/infra.md
git commit -m "test(e2e): cover variant settings and assets"
```

### Task 11: Regenerate Context Docs And Run Final Gates

**Files:**
- Modify: `docs/context/**`
- Modify: `docs/tech-stack.md` only if scripts, tooling, pinned versions, or CI gates changed.

- [ ] **Step 1: Regenerate context docs**

Run: `pnpm run docs`

Expected: generated inventories and event indexes update without errors.

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

- [ ] **Step 7: Commit**

```bash
git add docs/context docs/tech-stack.md public/dataset
git commit -m "docs: update variant asset context"
```

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
