# Knowledge Offline Manifest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Knowledge Lane shards into the verified dataset manifest and offline Text cache plan without changing reader boot or adding a new storage row.

**Architecture:** Treat Knowledge Lane assets as a text-adjacent route class named `text-knowledge`. The Settings selector keeps the current four top-level rows (`text`, `audio`, `pages`, `search`), while `sumBytesForCategory(manifest, 'text')` expands to include text core, riwayah, translation, tafsir, indexes, and knowledge shards. The reader continues to load knowledge lazily and tolerate missing files.

**Tech Stack:** Svelte 5, TypeScript, Vitest, Playwright `@offline`, Workbox route definitions, Node data builders.

---

## Progress Assessment

Current commit: `f2091a5 Add reader knowledge lane seam`.

Completed:

- `src/data/knowledge-dataset.ts` contract is covered for caching, cache clearing, invalid shape fallback, and missing passage shards.
- `src/read/Reader.svelte` lazy-loads ayah knowledge and passages after base text render.
- `src/read/Verse.svelte` renders optional theme chips and one passage summary line.
- `docs/context/surfaces/read.md` documents lazy optional knowledge behavior.
- `pnpm validate` passed at the end of the reader slice.

Remaining for the next phase:

- `src/infra/sw/route-defs.ts` has no route category for `/dataset/knowledge/**`.
- `scripts/data/build-dataset.mjs` still excludes `knowledge/**` from `public/dataset/manifest.json`.
- `src/infra/offline/offline-selector.svelte` still describes Text as only Qaloon + Saheeh + Muyassar.
- `tests/e2e/infra/offline.spec.js` still asserts the old `offlineCategories.text.hafs` shape even though the app persists `text.riwayat.qaloon`, `text.translations.saheeh`, and `text.tafsir.muyassar`.
- `docs/context/architecture.md` and `docs/context/data-model.md` still describe knowledge as temporarily outside manifest/offline integration.

Decision:

- Fold knowledge into the existing Text offline row via a new `text-knowledge` route class.
- Do not add `settings.offlineCategories.knowledge` or a fifth Settings row in this phase.
- Keep `CACHE_DATASET` as the cache name for knowledge files so existing verified-manifest caching and purge behavior apply.

## File Structure

- Modify `src/infra/sw/route-defs.ts`: add `text-knowledge` to `TextCategory`, `TEXT_ROUTE_CATEGORIES`, and `ROUTE_DEFS`.
- Modify `tests/unit/infra/sw/route-defs.test.ts`: lock route classification and text byte summing for knowledge files.
- Modify `scripts/data/build-dataset.mjs`: remove the `knowledge/**` manifest exclusion by extracting and testing a manifest helper.
- Modify `tests/unit/scripts/build-dataset.test.js`: add a focused manifest-helper test for knowledge files.
- Modify `tests/unit/data/offline.test.js`: prove `getCategoryManifest('text')` includes knowledge URLs when the manifest lists them.
- Modify `src/infra/offline/offline-selector.svelte`: update Text row copy to include knowledge context; keep state shape unchanged.
- Modify `tests/unit/infra/offline/offline-selector.test.ts`: keep four rows, update expected text label/copy, and keep Apply behavior source-aware.
- Modify `tests/e2e/infra/offline.spec.js`: update the persisted offline category assertion to source-aware state and add offline knowledge visibility proof.
- Modify `docs/context/surfaces/infra.md`: document `text-knowledge` as part of the Text offline row.
- Modify `docs/context/surfaces/configure.md`: document the Text row as Qaloon + Saheeh + Muyassar + Knowledge context.
- Modify `docs/context/architecture.md`: remove the statement that knowledge is intentionally excluded from the manifest.
- Modify `docs/context/data-model.md`: remove the Phase 01 manifest carve-out and document knowledge manifest inclusion.
- Modify `docs/context/source-data-flow.md`: update runtime/offline flow language so the manifest includes knowledge artifacts.
- Generated: `public/dataset/manifest.json` and `public/dataset/provenance.json` after `pnpm run data -- build`.
- Generated: `.docs-derive-manifest.json`, `docs/context/events.md`, `docs/context/module-graph.md`, and `docs/context/feature-map.md` only if `pnpm run docs` updates them.

## Task 1: Classify Knowledge Routes As Text-Adjacent

**Files:**

- Modify: `tests/unit/infra/sw/route-defs.test.ts`
- Modify: `src/infra/sw/route-defs.ts`

- [ ] **Step 1: Write failing route tests**

In `tests/unit/infra/sw/route-defs.test.ts`, add `text-knowledge` to the category allowlist:

```ts
expect([
  'text-core',
  'text-riwayah',
  'text-translation',
  'text-tafsir',
  'text-index',
  'text-knowledge',
  'audio',
  'pages',
  'search',
  null,
]).toContain(def.category)
```

In the `text routes are source-aware...` test, add:

```ts
expect(categoryFor(u('/dataset/knowledge/ayah/002.json'))).toBe('text-knowledge')
expect(categoryFor(u('/dataset/knowledge/passages/002.json'))).toBe('text-knowledge')
expect(categoryFor(u('/dataset/knowledge/indexes/theme-to-ayah.json'))).toBe('text-knowledge')
```

In the `manifest` fixture inside `describe('sumBytesForCategory')`, add knowledge entries:

```ts
files: {
  'riwayat/hafs/001.json': 'sha-a',
  'translations/saheeh/001.json': 'sha-b',
  'surahs.json': 'sha-c',
  'tafsir/muyassar/001.json': 'sha-g',
  'indexes/sources.json': 'sha-h',
  'knowledge/ayah/001.json': 'sha-i',
  'knowledge/passages/001.json': 'sha-j',
  'knowledge/indexes/theme-to-ayah.json': 'sha-k',
  'audio/alafasy/001.mp3': 'sha-d',
  'mushaf-pages/hafs/p001.png': 'sha-e',
  'search-index.json': 'sha-f',
},
fileSizes: {
  'riwayat/hafs/001.json': 1500,
  'translations/saheeh/001.json': 1400,
  'surahs.json': 800,
  'tafsir/muyassar/001.json': 700,
  'indexes/sources.json': 200,
  'knowledge/ayah/001.json': 900,
  'knowledge/passages/001.json': 600,
  'knowledge/indexes/theme-to-ayah.json': 300,
  'audio/alafasy/001.mp3': 50_000_000,
  'mushaf-pages/hafs/p001.png': 80_000,
  'search-index.json': 1_000_000,
},
```

Update the text byte expectation:

```ts
['text', 1500 + 1400 + 800 + 700 + 200 + 900 + 600 + 300],
```

Add knowledge URLs to the text URL assertion:

```ts
expect(urls).toEqual(expect.arrayContaining([
  '/dataset/riwayat/hafs/001.json',
  '/dataset/translations/saheeh/001.json',
  '/dataset/tafsir/muyassar/001.json',
  '/dataset/indexes/sources.json',
  '/dataset/surahs.json',
  '/dataset/knowledge/ayah/001.json',
  '/dataset/knowledge/passages/001.json',
  '/dataset/knowledge/indexes/theme-to-ayah.json',
]))
```

- [ ] **Step 2: Run tests and verify they fail for the missing route**

Run:

```bash
pnpm test -- tests/unit/infra/sw/route-defs.test.ts
```

Expected: fail with `expected null to be 'text-knowledge'` and the text byte total short by `1800`.

- [ ] **Step 3: Implement `text-knowledge` route classification**

In `src/infra/sw/route-defs.ts`, change the text category type:

```ts
export type TextCategory =
  | 'text-core'
  | 'text-riwayah'
  | 'text-translation'
  | 'text-tafsir'
  | 'text-index'
  | 'text-knowledge'
```

Add the new route category to `TEXT_ROUTE_CATEGORIES`:

```ts
export const TEXT_ROUTE_CATEGORIES: readonly TextCategory[] = [
  'text-core',
  'text-riwayah',
  'text-translation',
  'text-tafsir',
  'text-index',
  'text-knowledge',
] as const
```

Add a route definition after `text-core` and before `audio-mp3`:

```ts
{
  name: 'text-knowledge',
  match: ({ url }) =>
    /^\/dataset\/knowledge\/(?:ayah|passages)\/\d{3}\.json$/.test(url.pathname) ||
    /^\/dataset\/knowledge\/indexes\/[^/]+\.json$/.test(url.pathname),
  strategy: 'NetworkFirst',
  cacheName: CACHE_DATASET,
  maxEntries: 260,
  maxAgeDays: 365,
  category: 'text-knowledge',
},
```

- [ ] **Step 4: Run route tests again**

Run:

```bash
pnpm test -- tests/unit/infra/sw/route-defs.test.ts
```

Expected: all tests in `tests/unit/infra/sw/route-defs.test.ts` pass.

## Task 2: Remove The Manifest Carve-Out With A Tested Helper

**Files:**

- Modify: `tests/unit/scripts/build-dataset.test.js`
- Modify: `scripts/data/build-dataset.mjs`

- [ ] **Step 1: Write a failing manifest helper test**

In `tests/unit/scripts/build-dataset.test.js`, extend imports:

```js
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  splitRiwayah,
  computeSurahsMeta,
  AYAT_COUNTS,
  buildTranslationSplits,
  buildManifestPayload,
} from '../../../scripts/data/build-dataset.mjs'
```

Add this test at the end of the file:

```js
describe('buildManifestPayload', () => {
  it('includes knowledge files in manifest hashes and byte sizes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-manifest-'))
    const provenance = {
      packageVersion: 'test',
      profile: 'baseline',
      builtAt: '2026-05-03T00:00:00.000Z',
      corpus: {},
      riwayat: [],
      translations: [],
      tafsir: [],
      fonts: {},
    }

    try {
      await mkdir(join(root, 'knowledge', 'ayah'), { recursive: true })
      await mkdir(join(root, 'knowledge', 'passages'), { recursive: true })
      await mkdir(join(root, 'knowledge', 'indexes'), { recursive: true })
      await mkdir(join(root, 'riwayat'), { recursive: true })
      await mkdir(join(root, 'translations'), { recursive: true })
      await writeFile(join(root, 'knowledge', 'ayah', '001.json'), '{"surah":1,"ayahs":[]}', 'utf8')
      await writeFile(join(root, 'knowledge', 'passages', '001.json'), '{"surah":1,"passages":[]}', 'utf8')
      await writeFile(join(root, 'knowledge', 'indexes', 'theme-to-ayah.json'), '{"guidance":["1:6"]}', 'utf8')
      await writeFile(join(root, 'provenance.json'), JSON.stringify(provenance), 'utf8')
      await writeFile(join(root, 'manifest.json'), '{"old":true}', 'utf8')
      await writeFile(join(root, 'riwayat', 'source.json'), '{"buildOnly":true}', 'utf8')
      await writeFile(join(root, 'translations', 'source.json'), '{"buildOnly":true}', 'utf8')

      const manifest = await buildManifestPayload({
        datasetDir: root,
        riwayatDir: join(root, 'riwayat'),
        translationsDir: join(root, 'translations'),
        provenance,
        packageVersion: 'test',
        profileName: 'baseline',
      })

      expect(manifest.files).toHaveProperty('knowledge/ayah/001.json')
      expect(manifest.files).toHaveProperty('knowledge/passages/001.json')
      expect(manifest.files).toHaveProperty('knowledge/indexes/theme-to-ayah.json')
      expect(manifest.fileSizes['knowledge/ayah/001.json']).toBeGreaterThan(0)
      expect(manifest.files).not.toHaveProperty('manifest.json')
      expect(manifest.files).not.toHaveProperty('riwayat/source.json')
      expect(manifest.files).not.toHaveProperty('translations/source.json')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
```

- [ ] **Step 2: Run the script unit test and verify it fails**

Run:

```bash
pnpm test -- tests/unit/scripts/build-dataset.test.js
```

Expected: fail with `buildManifestPayload` not exported.

- [ ] **Step 3: Extract and use `buildManifestPayload`**

In `scripts/data/build-dataset.mjs`, add this exported helper after `listFiles()`:

```js
export async function buildManifestPayload({
  datasetDir = DATASET_DIR,
  riwayatDir = RIWAYAT_DIR,
  translationsDir = TRANSLATIONS_DIR,
  provenance,
  packageVersion = PACKAGE_VERSION,
  profileName,
}) {
  const allFiles = await listFiles(datasetDir)
  const files = {}
  const fileSizes = {}

  for (const f of allFiles) {
    if (f.endsWith('manifest.json')) { continue }
    if (dirname(f) === riwayatDir) { continue }
    if (dirname(f) === translationsDir) { continue }
    const rel = relative(datasetDir, f).replace(/\\/g, '/')
    if (rel === 'provenance.json') {
      const stable = JSON.stringify({ ...provenance, builtAt: '' })
      files[rel] = createHash('sha256').update(stable).digest('hex')
      fileSizes[rel] = Buffer.byteLength(stable, 'utf8')
    } else {
      files[rel] = await sha256(f)
      fileSizes[rel] = (await stat(f)).size
    }
  }

  return {
    packageVersion,
    profile: profileName,
    builtAt: provenance.builtAt,
    files,
    fileSizes,
  }
}
```

Replace the inline manifest loop in `main()` with:

```js
const manifest = await buildManifestPayload({
  provenance,
  profileName: profile.name,
})
await writeFile(join(DATASET_DIR, 'manifest.json'), JSON.stringify(manifest), 'utf8')
```

Remove the comment and condition that skips `rel.startsWith('knowledge/')`.

- [ ] **Step 4: Run the script unit test again**

Run:

```bash
pnpm test -- tests/unit/scripts/build-dataset.test.js
```

Expected: all tests in `tests/unit/scripts/build-dataset.test.js` pass.

## Task 3: Update Offline Runtime And Storage Selector Expectations

**Files:**

- Modify: `tests/unit/data/offline.test.js`
- Modify: `src/infra/offline/offline-selector.svelte`
- Modify: `tests/unit/infra/offline/offline-selector.test.ts`
- Modify: `tests/e2e/infra/offline.spec.js`

- [ ] **Step 1: Write a failing `getCategoryManifest('text')` test**

In `tests/unit/data/offline.test.js`, update the manifest mock:

```js
files: {
  'riwayat/hafs/001.json': 'abc',
  'riwayat/hafs/002.json': 'def',
  'surahs.json': 'ghi',
  'knowledge/ayah/001.json': 'jkl',
  'knowledge/passages/001.json': 'mno',
},
fileSizes: {
  'riwayat/hafs/001.json': 1500,
  'riwayat/hafs/002.json': 1400,
  'surahs.json': 800,
  'knowledge/ayah/001.json': 900,
  'knowledge/passages/001.json': 600,
},
```

Add this test inside `describe('download state machine')`:

```js
it('includes knowledge shards in the text category manifest plan', async () => {
  const { getCategoryManifest } = await import('../../../src/data/offline.js')
  const plan = await getCategoryManifest('text')

  expect(plan.urls).toEqual(expect.arrayContaining([
    '/dataset/knowledge/ayah/001.json',
    '/dataset/knowledge/passages/001.json',
  ]))
  expect(plan.totalBytes).toBe(1500 + 1400 + 800 + 900 + 600)
})
```

- [ ] **Step 2: Run the data offline unit test**

Run:

```bash
pnpm test -- tests/unit/data/offline.test.js
```

Expected: fail before Task 1 implementation is present; pass after Task 1 is complete.

- [ ] **Step 3: Update Text row copy without changing state shape**

In `src/infra/offline/offline-selector.svelte`, change the Text row to:

```ts
{ cat: 'text', label: 'Text · baseline corpus', short: 'Text', sub: 'Qālūn + Saheeh + Muyassar + Knowledge context', gatedAt: null },
```

Leave `isCategoryChecked`, `setCategoryChecked`, and `isCategoryCheckedIn` unchanged so persisted settings remain source-aware and do not gain a separate knowledge key.

- [ ] **Step 4: Update offline selector component tests**

In `tests/unit/infra/offline/offline-selector.test.ts`, update the `getCategoryManifest` mock:

```ts
getCategoryManifest: vi.fn(async (cat: string) => {
  if (cat === 'text') {
    return {
      urls: [
        '/dataset/riwayat/qaloon/001.json',
        '/dataset/translations/saheeh/001.json',
        '/dataset/tafsir/muyassar/001.json',
        '/dataset/knowledge/ayah/001.json',
      ],
      totalBytes: 1_800_000,
    }
  }
  return { urls: [], totalBytes: 0 }
}),
```

Add this test:

```ts
it('describes the Text row as including knowledge context without adding a fifth row', async () => {
  render(OfflineSelector)
  await flush()
  expect(document.querySelectorAll('.qa-storage-row')).toHaveLength(4)
  expect(document.querySelector('[data-testid="storage-row-text"]')?.textContent).toContain('Knowledge context')
})
```

- [ ] **Step 5: Run offline selector tests**

Run:

```bash
pnpm test -- tests/unit/infra/offline/offline-selector.test.ts
```

Expected: all tests in `tests/unit/infra/offline/offline-selector.test.ts` pass.

- [ ] **Step 6: Update offline e2e source-aware assertion and add offline knowledge proof**

In `tests/e2e/infra/offline.spec.js`, replace the final persisted assertions in H2:

```js
expect(persisted).toBeTruthy()
expect(persisted.text).toBeDefined()
expect(persisted.text.riwayat.qaloon).toBe(true)
expect(persisted.text.translations.saheeh).toBe(true)
expect(persisted.text.tafsir.muyassar).toBe(true)
```

In H1, after `await waitForReader(page)` inside the offline reload block, add:

```js
await expect(page.locator('[data-knowledge-lane]').first()).toBeVisible({ timeout: 10_000 })
await expect(page.locator('.qa-verse-theme').filter({ hasText: 'guidance' }).first()).toBeVisible({ timeout: 10_000 })
```

This proves a knowledge shard loaded online through the service worker route can be used after reload while the browser is offline.

## Task 4: Update Context Docs

**Files:**

- Modify: `docs/context/surfaces/infra.md`
- Modify: `docs/context/surfaces/configure.md`
- Modify: `docs/context/architecture.md`
- Modify: `docs/context/data-model.md`
- Modify: `docs/context/source-data-flow.md`

- [ ] **Step 1: Update `infra` dossier**

In `docs/context/surfaces/infra.md`, update the per-asset-class behavior paragraph to include:

```md
Knowledge Lane files under `/dataset/knowledge/**` route as `text-knowledge`, share `CACHE_DATASET`, and are included in the existing Text offline row. The top-level selector category remains `text`; `text-knowledge` is an internal route class used for byte summing, service-worker matching, and cache cleanup.
```

- [ ] **Step 2: Update `configure` dossier**

In `docs/context/surfaces/configure.md`, replace the Text row description:

```md
The Text row represents the baseline reader source set: Qaloon Arabic, Saheeh International translation, Tafsir Muyassar data, and shipped Knowledge Lane context. The selector writes this as source-aware state under `settings.offlineCategories.text.{riwayat,translations,tafsir}`; knowledge has no separate persisted toggle in this phase because it is bundled into the Text download plan when present in `manifest.json`.
```

Update the invariant:

```md
- **Text offline opt-in remains source-aware under one compact UI row.** The visible Text checkbox maps to the baseline Qaloon + Saheeh + Muyassar set and also caches `text-knowledge` manifest entries when they exist. Optional text bodies must still be added through `indexes/sources.json` / manifest plumbing before they can affect byte estimates or download plans.
```

- [ ] **Step 3: Update `architecture` dataset paragraph**

In `docs/context/architecture.md`, replace the knowledge carve-out sentence with:

```md
Phase 01 adds a separate knowledge lane builder (`scripts/data/build-knowledge-dataset.mjs`) that emits `public/dataset/knowledge/**` shards consumed by `src/data/knowledge-dataset.ts`; those shards are included in `manifest.json` and route through the `text-knowledge` offline class while remaining optional at reader runtime.
```

- [ ] **Step 4: Update `data-model` knowledge sections**

In `docs/context/data-model.md`, remove:

```md
- **Phase 01 manifest carve-out:** `scripts/data/build-dataset.mjs` excludes `knowledge/**` from `manifest.json` hashing until offline/update integration is implemented for the knowledge lane.
```

Replace it with:

```md
- **Manifest/offline integration:** `knowledge/**` files are included in `manifest.json` hashes and byte sizes. Service-worker routing classifies them as `text-knowledge`, which folds into the top-level Text offline selector category while keeping reader text rendering independent from knowledge availability.
```

- [ ] **Step 5: Update `source-data-flow` runtime/offline text**

In `docs/context/source-data-flow.md`, add this to the Build Outputs or Runtime Consumption section:

```md
`public/dataset/knowledge/**` is manifest-tracked with the rest of the runtime dataset. Offline planning treats it as `text-knowledge`, a text-adjacent route class included in the Text selector row.
```

- [ ] **Step 6: Regenerate docs**

Run:

```bash
pnpm run docs
pnpm run docs:check
```

Expected: both commands pass. Commit generated context updates that result from `pnpm run docs`.

## Task 5: Regenerate Dataset Manifest And Verify Offline Build

**Files:**

- Generated modify: `public/dataset/manifest.json`
- Generated modify: `public/dataset/provenance.json`

- [ ] **Step 1: Regenerate the dataset**

Run:

```bash
pnpm run data -- build
```

Expected output includes:

```text
[build-knowledge-dataset] wrote themes=11 passages=6 taggedAyahs=28
```

- [ ] **Step 2: Confirm manifest includes knowledge files**

Run:

```bash
node -e "const m=require('./public/dataset/manifest.json'); const keys=Object.keys(m.files).filter(k=>k.startsWith('knowledge/')); console.log(keys.length); console.log(keys.slice(0,5).join('\n'))"
```

Expected:

```text
231
knowledge/ayah/001.json
knowledge/ayah/002.json
knowledge/ayah/003.json
knowledge/ayah/004.json
knowledge/ayah/005.json
```

- [ ] **Step 3: Confirm knowledge byte sizes exist**

Run:

```bash
node -e "const m=require('./public/dataset/manifest.json'); const keys=Object.keys(m.fileSizes).filter(k=>k.startsWith('knowledge/')); console.log(keys.length); console.log(keys.every(k=>m.fileSizes[k] > 0))"
```

Expected:

```text
231
true
```

## Task 6: Run Targeted Verification

**Files:**

- No edits in this task.

- [ ] **Step 1: Run unit tests for route classification**

Run:

```bash
pnpm test -- tests/unit/infra/sw/route-defs.test.ts
```

Expected: pass.

- [ ] **Step 2: Run unit tests for manifest helper**

Run:

```bash
pnpm test -- tests/unit/scripts/build-dataset.test.js
```

Expected: pass.

- [ ] **Step 3: Run unit tests for offline runtime**

Run:

```bash
pnpm test -- tests/unit/data/offline.test.js
```

Expected: pass.

- [ ] **Step 4: Run unit tests for offline selector**

Run:

```bash
pnpm test -- tests/unit/infra/offline/offline-selector.test.ts
```

Expected: pass.

- [ ] **Step 5: Run docs checks**

Run:

```bash
pnpm run docs
pnpm run docs:check
```

Expected: both pass.

- [ ] **Step 6: Run offline Playwright journey under preview build**

Run:

```bash
PLAYWRIGHT_INCLUDE_OFFLINE=1 pnpm playwright test tests/e2e/infra/offline.spec.js --project="Offline (Preview)" --reporter=line
```

Expected: H1 and H2 pass in the `Offline (Preview)` project.

- [ ] **Step 7: Run service-worker integration checks**

Run:

```bash
PLAYWRIGHT_INCLUDE_OFFLINE=1 pnpm playwright test tests/e2e/infra/service-worker.spec.js --project="Offline (Preview)" --reporter=line
```

Expected: all service-worker integration tests pass.

- [ ] **Step 8: Run the full validation gate**

Run:

```bash
pnpm validate
```

Expected: pass. If `pnpm validate` regenerates `public/dataset/manifest.json` and `public/dataset/provenance.json`, keep those generated changes because this phase intentionally changes manifest membership.

## Task 7: Commit The Offline/Manifest Phase

**Files:**

- Stage all files changed by Tasks 1-6.

- [ ] **Step 1: Review diff scope**

Run:

```bash
git status --short
git diff --stat
```

Expected changed file set:

```text
docs/context/architecture.md
docs/context/data-model.md
docs/context/source-data-flow.md
docs/context/surfaces/configure.md
docs/context/surfaces/infra.md
public/dataset/manifest.json
public/dataset/provenance.json
scripts/data/build-dataset.mjs
src/infra/sw/route-defs.ts
src/infra/offline/offline-selector.svelte
tests/e2e/infra/offline.spec.js
tests/unit/data/offline.test.js
tests/unit/infra/offline/offline-selector.test.ts
tests/unit/scripts/build-dataset.test.js
tests/unit/infra/sw/route-defs.test.ts
```

Also include any `.docs-derive-manifest.json` or generated context inventory files produced by `pnpm run docs`.

- [ ] **Step 2: Stage changes**

Run:

```bash
git add .docs-derive-manifest.json docs/context/architecture.md docs/context/data-model.md docs/context/source-data-flow.md docs/context/surfaces/configure.md docs/context/surfaces/infra.md docs/context/events.md docs/context/feature-map.md docs/context/module-graph.md public/dataset/manifest.json public/dataset/provenance.json scripts/data/build-dataset.mjs src/infra/sw/route-defs.ts src/infra/offline/offline-selector.svelte tests/e2e/infra/offline.spec.js tests/unit/data/offline.test.js tests/unit/infra/offline/offline-selector.test.ts tests/unit/scripts/build-dataset.test.js tests/unit/infra/sw/route-defs.test.ts
```

- [ ] **Step 3: Commit**

Run:

```bash
git commit -m "Add knowledge assets to offline manifest"
```

Expected: one commit after `f2091a5` containing only the offline/manifest phase.

## Self-Review

Spec coverage:

- Knowledge route classification is covered by Task 1.
- Manifest carve-out removal is covered by Task 2 and Task 5.
- Offline byte summing is covered by Task 1 and Task 3.
- Selector behavior is covered by Task 3.
- Required docs are covered by Task 4.
- Preview-build service-worker verification is covered by Task 6.

Placeholder scan:

- The plan has no `TBD`, `TODO`, or unspecified implementation steps.
- Every code-changing task includes concrete code snippets and exact commands.

Type consistency:

- New internal route category is consistently named `text-knowledge`.
- Top-level selector category remains `text`.
- Persisted settings shape remains `settings.offlineCategories.text.{riwayat,translations,tafsir}`.
