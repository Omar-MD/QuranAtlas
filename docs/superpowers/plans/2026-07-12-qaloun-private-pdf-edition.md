# Private Qaloun PDF Mushaf Edition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the pinned Furatiyyah Qaloun PDF as a clear, responsive private-build Mushaf edition while keeping the current quran.ws edition unchanged and allowing exactly one edition choice during first or cleared setup.

**Architecture:** Convert the local PDF at build time into reviewed, edition-scoped WebP assets; the browser never parses the PDF. Reuse the existing canonical Qaloon verse/page map only after a 604-page wording review, keep quran.ws on manifest V1, add one external-image V2 branch for the private edition, and preserve the existing five-entry reader window with bounded image decode. A separate setup marker selects one edition without changing the destructive MVP asset-contract marker or the bookmark schema.

**Tech Stack:** Node.js ESM data scripts, Poppler (`pdfinfo`, `pdftocairo`), WebP tools (`cwebp`, `webpinfo`), React 19, TypeScript, Dexie/IndexedDB, Vite PWA/Workbox, owned Radix UI wrappers, Tailwind v4 semantic styles, Vitest, Playwright, and a recorded physical-mobile verification lane.

## Global Constraints

- Approved design: `docs/superpowers/specs/2026-07-12-qaloun-private-pdf-edition-design.md`.
- Source PDF SHA-256: `4454431b2662bc10060cc9335ba13baabe1f18a6762c492d41ccf11a4083012f`.
- PDF pages 5 through 608 map to logical Mushaf pages 1 through 604; all other PDF pages are excluded.
- Keep `qalun-quran-ws-v1` and its existing page bodies/manifest behavior unchanged.
- The standard build selects quran.ws only; the private page build selects quran.ws plus `qalun-furatiyyah-2023-v1`.
- The PDF and derived page bodies remain ignored local inputs. Do not commit the PDF or place it under `public/` or `dist/`.
- No PDF.js, runtime PDF rendering, OCR, arbitrary PDF import, generic edition picker, second verse map, edition-aware bookmark schema, routine switching, partial reset, pinch zoom, free panning, crop editor, dark private-page variant, or full-Mushaf offline installer.
- A true wording/page-boundary mismatch stops this plan and requires a separate mapping design.
- A frame that cannot be proven to preserve all Qur'an content stops the private build.
- The private runtime has one external-image branch and one selected media policy. Do not retain production SVG and WebP strategies after the media gate.
- `MVP_ASSET_CONTRACT_ID` stays `mvp-default-assets-qaloon-bridges-v1`.
- Switching editions continues to require About > Clear All Data. Page bookmarks are not migrated between editions.
- Full page is the emitted asset's unit rectangle and has zero outer whitespace. Text focus removes the complete side lane and never removes Qur'an content.
- Framing is bounded from 0 through 1. Value 0 honors the stored fit mode; every positive value intentionally enters Fit width with native vertical reachability.
- Direct Radix imports remain inside `src/components/ui/**`; use the owned `SegmentedControl`, `Slider`, `Select`, and existing Settings components.
- QuranAtlas `AGENTS.md` overrides generic test-first guidance: do not enforce TDD. Each behavior task still lands durable tests in its own commit.
- Unit tests assert data, state, callbacks, labels, persistence, and routes. Real layout, paint, decode, scrolling, service workers, and performance stay in Playwright or the physical-device lane.
- Each task stages only its listed paths and preserves unrelated worktree changes.

---

## Handover Reconciliation

- Design commit: `bfdd98ff`.
- Expert-review correction commit: `e94f43b3`.
- The expert red-team pass found no remaining architectural contradiction or material scope creep and marked the corrected design implementation-ready.
- Existing quran.ws normalized and generated page-body directories are ignored. Catalogs, scripts, runtime contracts, tests, and current-state docs remain committed.
- Preliminary local measurements already reject SVG for the selected media policy: logical page 1 is `4,619,152` bytes as Poppler SVG and therefore exceeds the complete 4 MiB requested-plus-preview budget by itself. The measured 300-DPI WebP sample is `860,656` bytes at width 2,136; its 1,280-wide preview is `408,138` bytes. Typical sampled WebP pages are smaller. Task 2 runs the preliminary asset, clarity, decode, memory-estimate, and physical-device check and records `pending-runtime`; Task 8 runs the integrated latency, retained-window, Scroll, page-turn, and final physical-device acceptance gate.
- The implementation plan provisionally fixes the private output policy at preview width 1,280 and full width 2,136, both quality 88 and method 6, only after Task 2 passes. If Task 8 disproves that policy, stop and revise the design rather than silently changing this plan.
- Baseline branch is `dev`. Default CI must remain independent of the private PDF.

## File And Interface Map

### New committed source and runtime modules

- `data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/source.json`
  - Pinned local-PDF provenance and import contract.
- `data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/page-start-review.json`
  - 604 manually reviewed page-start compatibility rows bound to the PDF, Qaloon source, and alias digests.
- `data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/framing.json`
  - 604 reviewed source Full/Text rectangles and side-lane positions.
- `data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/media.json`
  - The single accepted WebP rendition policy and recorded gate results.
- `scripts/data/mushaf-pages/private-pdf.mjs`
  - Pinned PDF inspection, staged CropBox rendering, reviewed Full crop, WebP emission, validation, and immutable promotion.
- `src/components/reader/mushaf-page-framing.ts`
  - Pure frame clamping, interpolation, aspect ratio, and image placement.
- `src/launch/mushaf-edition-setup.ts`
  - Setup classification, existing-user migration, atomic selection writes, and current-index availability checks.

### Existing ownership boundaries

- `scripts/data/mushaf-pages/{import,build}.mjs`
  - Dispatch source-specific import and build selected edition sets.
- `data/catalog/mushaf-assets.json` and `scripts/data/sources/catalog.mjs`
  - Declare and validate quran.ws plus the private local-PDF edition without weakening quran.ws provenance checks.
- `src/packs/{mushaf-paths,mushaf-index,mushaf-page-asset}.ts`
  - Validate manifest V1/V2, edition-relative media descriptors, index agreement, and external-image preparation.
- `src/app/routes/read/useMushafPageWindow.ts`
  - Retain five logical entries while preparing only current and immediate-preview media.
- `src/components/reader/MushafPageViewer.tsx` and `src/app/routes/read/MushafRoute.tsx`
  - Render either inline quran.ws SVG or decoded external WebP through the same reader/navigation contract.
- `src/components/settings/**` and `src/storage/settings-writer.ts`
  - Persist and expose private-edition framing without changing quran.ws settings behavior.
- `src/continuity/launch-restore.ts`, `src/app/routes/onboarding/**`, and `src/app/App.tsx`
  - Route fresh/cleared private installs through one-time edition setup while preserving existing installs and deep links.
- `vite.config.js`
  - Give only the mutable Mushaf availability index a NetworkFirst route before the generic dataset CacheFirst route.

---

### Task 1: Commit The Source, Compatibility, And Framing Evidence

**Files:**
- Create: `data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/source.json`
- Create: `data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/page-start-review.json`
- Create: `data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/framing.json`

**Interfaces:**
- Produces the immutable source identity consumed by Tasks 2 through 4.
- Produces 604 review rows. These are evidence only; runtime mapping continues to derive from `data/normalized/quran/riwayat/qaloon.json`.
- Produces source rectangles normalized to the PDF CropBox. Task 3 converts `sourceTextFrame` into emitted-Full-asset coordinates.

- [ ] **Step 1: Reconfirm the pinned source before review**

Run:

```bash
PDF="/Users/omarduadu/Desktop/Noor-Book.com  مصحف رواية قالون عن نافع طبعة جديدة.pdf"
shasum -a 256 "$PDF"
pdfinfo -box "$PDF"
```

Expected: the checksum equals the global constraint, `Pages: 630`, and the CropBox is `512.545 x 652.654 pt`. Stop on any difference.

- [ ] **Step 2: Write the source contract**

Create `source.json` with this exact shape and values:

```json
{
  "version": 1,
  "mushafEditionId": "qalun-furatiyyah-2023-v1",
  "label": "Qalun Furatiyyah 2023",
  "sourceKind": "local-pdf",
  "expectedFilename": "Noor-Book.com  مصحف رواية قالون عن نافع طبعة جديدة.pdf",
  "sha256": "4454431b2662bc10060cc9335ba13baabe1f18a6762c492d41ccf11a4083012f",
  "documentPageCount": 630,
  "readerPdfPageStart": 5,
  "readerPdfPageEnd": 608,
  "logicalPageCount": 604,
  "cropBoxPoints": { "width": 512.545, "height": 652.654 },
  "editionStatement": "Fourth edition, 2023",
  "distribution": "private-build-only"
}
```

- [ ] **Step 3: Produce and review the 604 page-start rows**

Render PDF pages 5 through 608 into `.scratch/qaloun-page-start-review/`. For each logical page, compare the first visible Qur'an wording against the first reference derived from `data/normalized/quran/riwayat/qaloon.json`. Translate printed markers through `public/dataset/translations/_verse-aliases.json`; do not compare printed numbers directly.

The final committed file uses this shape and contains exactly pages 1 through 604 in order:

```json
{
  "version": 1,
  "mushafEditionId": "qalun-furatiyyah-2023-v1",
  "sourcePdfSha256": "4454431b2662bc10060cc9335ba13baabe1f18a6762c492d41ccf11a4083012f",
  "pageMapSource": "data/normalized/quran/riwayat/qaloon.json",
  "pageMapSha256": "18465c40ebeec40a92eb98745c9b89796ac6e31f6e93988883dfb6602faaea95",
  "verseAliasSource": "public/dataset/translations/_verse-aliases.json",
  "verseAliasSha256": "1df390b3cd73ba69502062a4fcab9d062a01b24cebda39c629bb4e50974bd450",
  "pageStartReviews": [
    {
      "page": 1,
      "sourcePdfPage": 5,
      "canonicalFirstVerse": { "surah": 1, "verse": 1 },
      "result": "wording-match"
    }
  ]
}
```

The one-row array above demonstrates the row contract; the committed file is valid only with all 604 reviewed rows. Retain the printed `2:49`/canonical `2:48`, printed `18:98`/canonical `18:94`, and printed `19:12`/canonical `19:11` cases in the review notes or fixtures. Stop this plan if any visible wording differs.

- [ ] **Step 4: Produce and review all Full/Text rectangles**

Create `framing.json` with exactly 604 ordered rows:

```json
{
  "version": 1,
  "mushafEditionId": "qalun-furatiyyah-2023-v1",
  "coordinateSpace": "pdf-crop-box-normalized",
  "pages": [
    {
      "page": 1,
      "sourcePdfPage": 5,
      "sourceFullFrame": { "x": 0, "y": 0, "width": 1, "height": 1 },
      "sourceTextFrame": { "x": 0, "y": 0, "width": 0.84, "height": 1 },
      "sideLane": "right"
    }
  ]
}
```

The example shows the shape, not a value to copy to other pages. Record each page's measured rectangles and lane. Generate Full/Text contact sheets under `.scratch/qaloun-frame-review/`; automated geometry can reject invalid bounds, but a human review must confirm zero outer whitespace, the complete Full side lane, and no clipped Qur'an content in Text focus. Special pages remain explicit rows.

- [ ] **Step 5: Check the committed evidence files and commit**

Run:

```bash
jq -e '.pageStartReviews | length == 604' data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/page-start-review.json
jq -e '.pages | length == 604' data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/framing.json
git diff --check
```

Expected: both `jq` expressions return `true`; the diff check is clean.

```bash
git add data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1
git commit -m "data: pin private Qaloun source evidence"
```

---

### Task 2: Record The Provisional WebP Policy

**Files:**
- Create: `data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/media.json`

**Interfaces:**
- Produces the only private media policy used by Tasks 3 through 6.
- Does not add a production runtime or committed one-off benchmark script.
- Records preliminary asset/clarity evidence only. Task 8 owns the final production-reader and physical-device acceptance gate.

- [ ] **Step 1: Render the approved representative set in scratch**

Use 12 to 20 pages covering pages 1, 2, and 604; dense text; Surah starts; colored marks; populated and empty side lanes; both lane sides; and special layouts. Render the CropBox at 300 DPI, crop to each reviewed `sourceFullFrame`, then emit the two proposed WebPs:

```bash
pdftocairo -f 5 -l 5 -cropbox -png -singlefile -r 300 "$PDF" .scratch/qaloun-media-spike/page-001
cwebp -q 88 -m 6 -resize 2136 0 .scratch/qaloun-media-spike/page-001.png -o .scratch/qaloun-media-spike/page-001-2136.webp
cwebp -q 88 -m 6 -resize 1280 0 .scratch/qaloun-media-spike/page-001.png -o .scratch/qaloun-media-spike/page-001-1280.webp
webpinfo .scratch/qaloun-media-spike/page-001-2136.webp
```

Apply `cwebp -crop x y width height` before `-resize` when the reviewed Full frame is smaller than the CropBox.

- [ ] **Step 2: Apply the budgets that a pre-runtime harness can prove**

Use an uncommitted `.scratch/qaloun-media-spike/` harness at `390x844` DPR 3, `844x390` DPR 2, `768x1024` DPR 2, and `1440x900` DPR 1. Record asset clarity, Full/Text crops, encoded bytes, actual dimensions, standalone load/decode, and theoretical decoded memory. The proposed current-plus-two-preview combination must remain below 4 MiB transferred and 64 MiB decoded. Discard the harness after recording evidence. Do not claim page-turn, retained-window, Scroll, service-worker, or quran.ws-relative runtime results before Tasks 5 through 7 exist.

- [ ] **Step 3: Run a preliminary physical-mobile clarity/decode check**

Record device model, OS, browser, static-page clarity, and image load/decode for at least one intended private target device. If both iOS and Android are targets, run one representative device per class. Task 8 repeats the physical lane against the integrated reader for ten turns and sustained Scroll.

- [ ] **Step 4: Commit the provisional policy only if preliminary evidence passes**

Create `media.json`:

```json
{
  "version": 1,
  "mushafEditionId": "qalun-furatiyyah-2023-v1",
  "kind": "external-image",
  "mimeType": "image/webp",
  "renderDpi": 300,
  "encoder": { "command": "cwebp", "quality": 88, "method": 6 },
  "renditions": [
    { "role": "preview", "width": 1280 },
    { "role": "full", "width": 2136 }
  ],
  "gate": "pending-runtime",
  "preliminaryEvidence": {
    "svgPage1Bytes": 4619152,
    "webpPage1FullBytes": 860656,
    "webpPage1PreviewBytes": 408138,
    "maxTransferredBytes": 4194304,
    "maxDecodedBytes": 67108864,
    "physicalDevices": []
  }
}
```

Populate `physicalDevices` with the actual model, OS, browser, and preliminary result before commit. If preliminary WebP evidence fails, stop. Do not implement SVG as a second private branch or relax the budget. `gate: "pending-runtime"` prevents the private edition from being considered release-ready until Task 8 replaces it with measured integrated results and `gate: "passed"`.

```bash
git add data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/media.json
git commit -m "data: record private Qaloun media policy"
```

---

### Task 3: Add Catalog Validation And Atomic Private Import

**Files:**
- Modify: `data/catalog/authorities.json`
- Modify: `data/catalog/licenses.json`
- Modify: `data/catalog/mushaf-assets.json`
- Modify: `scripts/data/sources/catalog.mjs`
- Modify: `scripts/data/mushaf-pages/import.mjs`
- Create: `scripts/data/mushaf-pages/private-pdf.mjs`
- Modify: `scripts/data/cli.mjs`
- Modify: `tests/unit/scripts/source-catalog.test.js`
- Modify: `tests/unit/scripts/mushaf-pages.test.js`
- Modify: `docs/context/source-data-flow.md`
- Modify: `docs/tech-stack.md`
- Generated if changed: `.docs-derive-manifest.json`, `docs/context/module-graph.md`, `docs/context/feature-map.md`

**Interfaces:**
- Produces `loadPrivateMushafEditionContract(editionId)`.
- Produces `importPrivatePdfEdition({ editionId, pdfPath, runCommand })`.
- Produces ignored normalized output at `data/normalized/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/**`.
- Preserves the existing quran.ws network import path.

- [ ] **Step 1: Add restricted private-source provenance without claiming redistribution rights**

Add authority `private-local-pdf` and restricted license `private-local-pdf-restricted`. Add the Furatiyyah asset to `mushaf-assets.json` with `visibility: "internal"`, `shipped: false`, `sourceKind: "local-pdf"`, and references to the four edition files. Keep quran.ws as the only default.

Use these catalog identities:

```json
{
  "authority": { "id": "private-local-pdf", "label": "Private local PDF" },
  "license": {
    "id": "private-local-pdf-restricted",
    "label": "Private local PDF; redistribution not approved",
    "status": "restricted"
  },
  "asset": {
    "riwayah": "qaloon",
    "mushafEditionId": "qalun-furatiyyah-2023-v1",
    "label": "Qalun Furatiyyah 2023",
    "tradition": "qalun",
    "providerId": "private-local-pdf",
    "licenseId": "private-local-pdf-restricted",
    "visibility": "internal",
    "shipped": false,
    "sourceKind": "local-pdf",
    "pageCount": 604,
    "sourceContractPath": "mushaf-editions/qalun-furatiyyah-2023-v1/source.json",
    "pageStartReviewPath": "mushaf-editions/qalun-furatiyyah-2023-v1/page-start-review.json",
    "framingPath": "mushaf-editions/qalun-furatiyyah-2023-v1/framing.json",
    "mediaPolicyPath": "mushaf-editions/qalun-furatiyyah-2023-v1/media.json"
  }
}
```

Add `sourceKind: "quran-ws"` to the existing quran.ws asset so validation does not infer provenance from provider ids.

The source validator must retain the current exact quran.ws provider/license/sourceSlug checks for `sourceKind: "quran-ws"` and separately require the private provider, restricted license, pinned edition files, 604 pages, and `internal` visibility for `sourceKind: "local-pdf"`.

- [ ] **Step 2: Implement the focused private importer**

Give `private-pdf.mjs` this public boundary (shown as declarations; the module supplies the implementations):

```ts
type CommandRunner = (command: string, args: readonly string[]) => Promise<{
  status: number
  stderr: string
  stdout: string
}>

type PrivateMushafEditionContract = {
  source: Record<string, unknown>
  pageStartReviews: ReadonlyArray<{
    page: number
    sourcePdfPage: number
    canonicalFirstVerse: { surah: number; verse: number }
    result: 'wording-match'
  }>
  framingPages: ReadonlyArray<{
    page: number
    sourcePdfPage: number
    sourceFullFrame: { x: number; y: number; width: number; height: number }
    sourceTextFrame: { x: number; y: number; width: number; height: number }
    sideLane: 'left' | 'right' | 'none'
  }>
  mediaPolicy: {
    kind: 'external-image'
    mimeType: 'image/webp'
    renderDpi: 300
    renditions: readonly [{ role: 'preview'; width: 1280 }, { role: 'full'; width: 2136 }]
  }
}

declare function loadPrivateMushafEditionContract(
  editionId: 'qalun-furatiyyah-2023-v1',
): Promise<PrivateMushafEditionContract>

declare function importPrivatePdfEdition(options: {
  editionId: 'qalun-furatiyyah-2023-v1'
  pdfPath: string
  runCommand?: CommandRunner
}): Promise<{ status: 'current' | 'promoted'; normalizedDir: string }>
```

The implementation must:

1. hash the PDF before output mutation;
2. inspect page count and CropBox with `pdfinfo -box`;
3. create a new sibling stage directory beneath `data/normalized/mushaf-pages/qaloon/`;
4. render exactly PDF pages 5 through 608 with `pdftocairo -cropbox -png -r 300`;
5. crop each PNG to its reviewed Full rectangle and run `cwebp` for widths 1,280 and 2,136;
6. calculate runtime `textFrame` relative to emitted Full bounds;
7. validate 604 paired WebPs with `webpinfo`, hashes, dimensions, byte counts, and complete metadata;
8. promote only into an absent immutable edition directory;
9. return current output without mutation when the existing normalized digest is identical;
10. fail and retain the previous normalized directory when any page or command fails.

Do not overwrite different bytes at the same edition id; require a new version id.

- [ ] **Step 3: Route the private CLI explicitly**

`import.mjs` keeps the existing quran.ws command and dispatches the private path only when both `--edition` and `--pdf` are present:

```bash
pnpm run data -- mushaf-pages import \
  --edition=qalun-furatiyyah-2023-v1 \
  --pdf="/Users/omarduadu/Desktop/Noor-Book.com  مصحف رواية قالون عن نافع طبعة جديدة.pdf"
```

Update the CLI usage string. Do not accept arbitrary edition ids or unpinned PDFs.

Also move new quran.ws imports to the edition-scoped normalized path `data/normalized/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/`. When the ignored legacy `data/normalized/mushaf-pages/qaloon/pages/` directory is complete and safe, stage from those existing SVGs instead of downloading them again; promote the complete edition directory and leave the legacy ignored directory untouched. Task 4 reads quran.ws from the edition-scoped path, so both normalized inputs include edition identity.

- [ ] **Step 4: Add durable contract and staging tests**

Extend the existing Node suites to cover:

- exact source/catalog digests and source-kind-specific provenance;
- wrong PDF digest, page count, CropBox, and range rejection;
- exactly 604 review/frame rows and the three printed/canonical fixtures;
- invalid rectangle, alias/source digest, missing row, unsafe path, and incomplete media rejection;
- a command failure at page N leaving a pre-existing normalized directory byte-identical;
- a complete staged directory promoting once and refusing changed bytes at the same id.

Inject `runCommand` and temporary roots; do not invoke Poppler or WebP binaries from unit tests.

- [ ] **Step 5: Run focused validation and commit**

Update source-data flow with the pinned local-PDF/staging boundary and tech stack with the required Poppler/WebP commands. Run `pnpm run docs` before verification; never edit generated fences.

```bash
pnpm run docs
pnpm exec vitest run tests/unit/scripts/source-catalog.test.js tests/unit/scripts/mushaf-pages.test.js --project=node
pnpm run data -- check
pnpm run check
pnpm run docs:check
```

Expected: all focused tests, source/data checks, and static checks pass.

```bash
git add data/catalog/authorities.json data/catalog/licenses.json data/catalog/mushaf-assets.json scripts/data/sources/catalog.mjs scripts/data/mushaf-pages/import.mjs scripts/data/mushaf-pages/private-pdf.mjs scripts/data/cli.mjs tests/unit/scripts/source-catalog.test.js tests/unit/scripts/mushaf-pages.test.js docs/context/source-data-flow.md docs/tech-stack.md .docs-derive-manifest.json docs/context/module-graph.md docs/context/feature-map.md
git commit -m "feat: import pinned private Qaloun pages"
```

---

### Task 4: Build Explicit Edition Sets And Manifest V2

**Files:**
- Modify: `scripts/data/mushaf-pages/build.mjs`
- Modify: `scripts/data/cli.mjs`
- Modify: `scripts/ci/affected.mjs`
- Modify: `scripts/check-react-mushaf-assets.mjs`
- Modify: `scripts/check-react-mushaf-indexes.mjs`
- Modify: `.github/workflows/ci.yml`
- Modify: `tests/unit/scripts/mushaf-pages.test.js`
- Modify: `tests/unit/scripts/ci-affected.test.mjs`
- Modify: `tests/unit/react-packs/check-react-mushaf-assets.test.mjs`
- Modify: `tests/unit/react-packs/check-react-mushaf-indexes.test.mjs`
- Modify: `docs/context/source-data-flow.md`
- Modify: `docs/context/data-model.md`
- Modify: `docs/context/surfaces/infra.md`
- Generated if changed: `.docs-derive-manifest.json`, `docs/context/module-graph.md`, `docs/context/feature-map.md`

**Interfaces:**
- Produces `editionIdsForProfile(profile, assetCatalog)`.
- Produces V1 quran.ws and V2 external-image manifests in the same asset index.
- Produces authoritative once-per-riwayah pruning.

- [ ] **Step 1: Replace default-edition iteration with explicit edition sets**

Implement this profile contract:

```js
export function editionIdsForProfile(profile, catalog) {
  if (profile === 'baseline' || profile === 'full') return [catalog.defaults.qaloon]
  if (profile === 'private') return [catalog.defaults.qaloon, 'qalun-furatiyyah-2023-v1']
  if (profile === 'catalog') return []
  throw new Error(`Unsupported Mushaf page profile: ${profile}`)
}
```

Build every selected edition first, then prune once with the complete selected set. The standard set removes stale private output/index membership; the private set preserves both siblings. Only the default quran.ws edition writes the legacy riwayah-level manifest/pages.

- [ ] **Step 2: Emit the private V2 contract**

Keep existing quran.ws manifest V1 generation unchanged. Emit private pages with:

```ts
type MushafExternalImageSource = {
  assetPath: string
  bytes: number
  sha256: string
  width: number
  height: number
  mimeType: 'image/webp'
}

type MushafPageFraming = {
  textFrame: { x: number; y: number; width: number; height: number }
  sideLane: 'left' | 'right' | 'none'
}

type MushafManifestPageV2 = {
  page: number
  firstVerse: { surah: number; verse: number }
  framing: MushafPageFraming
  media: {
    kind: 'external-image'
    fallback: MushafExternalImageSource
    sources: MushafExternalImageSource[]
  }
}
```

Each `MushafExternalImageSource` has edition-relative `assetPath`, `bytes`, `sha256`, `width`, `height`, and `mimeType: "image/webp"`. `fallback` is the 2,136-wide source; `sources` contains both widths. Reuse the existing derived `firstVerse` and top-level `verseToPage`; do not duplicate `lastVerse` or `sourcePdfPage` at runtime.

The output digest includes only byte-affecting policy fields (`kind`, MIME, render DPI, encoder settings, and rendition widths). Preliminary/final gate evidence is provenance and must not invalidate identical emitted bytes when Task 8 changes `pending-runtime` to `passed`.

- [ ] **Step 3: Emit matching asset-index integrity**

For private files, the asset index records absolute `/dataset/**` URLs plus the same digest, byte count, dimensions, and MIME type declared by the edition manifest. Builder hashing owns byte integrity. Runtime will compare descriptors; it will not refetch and hash image blobs.

- [ ] **Step 4: Add pruning, manifest, and unchanged-quran.ws tests**

Use temporary output roots to prove:

- private selection preserves both editions;
- a subsequent baseline selection removes private output and index membership;
- pruning one edition cannot remove a selected sibling;
- private V2 has 604 valid pages and paired WebP descriptors;
- every transformed Text rectangle is contained by the emitted unit Full frame;
- invalid digest, dimensions, MIME, path, frame, or incomplete rendition fails;
- quran.ws V1 output remains byte-identical when the private edition is added.

Update affected-file tests so the new catalog directory and private importer select the Mushaf page/data lanes without forcing the private input in default CI.

Add `--require-edition=<id>` parsing alongside `--require-riwayah`. It must fail unless every required edition belongs to the selected profile and has complete normalized input. Default CI never passes the private requirement.

Update the quran.ws CI cache path from `data/normalized/mushaf-pages/qaloon/pages` to `data/normalized/mushaf-pages/qaloon/qalun-quran-ws-v1/pages` and bump its cache key version. Do not add the private ignored input to default CI.

- [ ] **Step 5: Run the standard and private build checks**

Update source-data flow, data model, and Infra with explicit edition sets, manifest V2, standard/private pruning, ignored private inputs, and the edition-scoped quran.ws CI cache. Run `pnpm run docs` to regenerate owned fences.

```bash
pnpm run docs
pnpm exec vitest run tests/unit/scripts/mushaf-pages.test.js tests/unit/scripts/ci-affected.test.mjs --project=node
pnpm run test:react -- tests/unit/react-packs/check-react-mushaf-assets.test.mjs tests/unit/react-packs/check-react-mushaf-indexes.test.mjs
pnpm run data -- mushaf-pages build --profile=baseline --require-riwayah=qaloon
pnpm run data -- mushaf-pages build --profile=private --require-edition=qalun-furatiyyah-2023-v1
pnpm run check
pnpm run docs:check
```

Expected: baseline and private indexes contain exactly their selected editions, and quran.ws bytes do not change.

```bash
git add scripts/data/mushaf-pages/build.mjs scripts/data/cli.mjs scripts/ci/affected.mjs scripts/check-react-mushaf-assets.mjs scripts/check-react-mushaf-indexes.mjs .github/workflows/ci.yml tests/unit/scripts/mushaf-pages.test.js tests/unit/scripts/ci-affected.test.mjs tests/unit/react-packs/check-react-mushaf-assets.test.mjs tests/unit/react-packs/check-react-mushaf-indexes.test.mjs docs/context/source-data-flow.md docs/context/data-model.md docs/context/surfaces/infra.md .docs-derive-manifest.json docs/context/module-graph.md docs/context/feature-map.md
git commit -m "feat: build selected Mushaf editions"
```

---

### Task 5: Add Validated External-Media Contracts

**Files:**
- Modify: `src/packs/mushaf-paths.ts`
- Modify: `src/packs/mushaf-index.ts`
- Modify: `src/packs/mushaf-page-asset.ts`
- Modify: `tests/unit/react-packs/mushaf-paths.test.ts`
- Modify: `tests/unit/react-read/reader-wave3.test.tsx`
- Modify: `docs/context/data-model.md`
- Generated if changed: `.docs-derive-manifest.json`, `docs/context/module-graph.md`, `docs/context/feature-map.md`

**Interfaces:**
- Produces a manifest V1/V2 discriminated union.
- Produces `resolveMushafEditionAssetUrl(identity, assetPath)`.
- Produces `loadPreparedExternalMushafPage(options)` as a new V2-only boundary.
- Produces `prepareExternalMushafImage(source, signal, imageFactory)`.
- Keeps the current V1 `loadMushafPageAsset`, inline-SVG sanitizer, ready-state type, page window, route, and viewer intact until Task 6 switches the whole reader atomically.

- [ ] **Step 1: Add edition-relative external media validation**

`resolveMushafEditionAssetUrl` accepts only `pages/NNN-WIDTH.webp` declared by the active manifest, rejects traversal/absolute/protocol paths, and resolves beneath `/dataset/mushaf-pages/{riwayah}/{editionId}/`. Keep the existing quran.ws `.svg` path helpers valid.

- [ ] **Step 2: Add a V1/V2 loader union**

Add a prepared V2 descriptor without changing the current route-facing ready type yet:

```ts
type PreparedExternalMushafPage = {
  kind: 'external-image'
  preview: MushafExternalImageSource
  full: MushafExternalImageSource
  page: number
  pageCount: number
  firstVerse: { surah: number; verse: number }
  lastVerse: { surah: number; verse: number }
  framing: MushafPageFraming
}
```

V1 continues to fetch, sanitize, and inline the SVG exactly as before through the unchanged `loadMushafManifest` and `loadMushafPageAsset` signatures. The new `loadPreparedExternalMushafPage` parses V2, validates manifest/index equality, derives `lastVerse` from `verseToPage`, and returns the prepared descriptor. `prepareExternalMushafImage` accepts one selected source, creates an `Image`, waits for load plus `decode()`, and reports success/abort/failure. Task 6 owns when current versus preview preparation occurs and replaces the route-facing loader contract only when every consumer changes in the same commit.

- [ ] **Step 3: Keep source selection pure and deterministic**

Add a pure selector:

```ts
type MushafPageLoadPurpose = 'current' | 'preview'

declare function selectExternalMushafSource(
  page: PreparedExternalMushafPage,
  purpose: MushafPageLoadPurpose,
): MushafExternalImageSource
```

`current` returns the 2,136 source and `preview` returns the 1,280 source. It does not inspect layout or silently choose an undeclared rendition.

- [ ] **Step 4: Add focused state and path tests**

Inject `imageFactory`. Prove V1 unchanged, V2 safe resolution, descriptor/index mismatch rejection, exact current/preview selection, and load/decode/abort results. Do not mount the V2 reader or emulate real image layout/decode in jsdom in this task.

- [ ] **Step 5: Run the reader loader gates and commit**

Update the data model with the validated V2 descriptor/preparation boundary while making clear that Task 6 owns mounted reader behavior. Run generated docs before verification.

```bash
pnpm run docs
pnpm run test:react -- tests/unit/react-packs/mushaf-paths.test.ts tests/unit/react-read/reader-wave3.test.tsx
pnpm run check
pnpm run docs:check
```

```bash
git add src/packs/mushaf-paths.ts src/packs/mushaf-index.ts src/packs/mushaf-page-asset.ts tests/unit/react-packs/mushaf-paths.test.ts tests/unit/react-read/reader-wave3.test.tsx docs/context/data-model.md .docs-derive-manifest.json docs/context/module-graph.md docs/context/feature-map.md
git commit -m "feat: validate private Mushaf media"
```

---

### Task 6: Render Reviewed Frames And Persist The Focus Value

**Files:**
- Create: `src/components/reader/mushaf-page-framing.ts`
- Modify: `src/packs/mushaf-index.ts`
- Modify: `src/packs/mushaf-page-asset.ts`
- Modify: `src/app/routes/read/useMushafPageWindow.ts`
- Modify: `src/components/reader/MushafPageViewer.tsx`
- Modify: `src/app/routes/read/MushafRoute.tsx`
- Modify: `src/components/settings/MushafSettings.tsx`
- Modify: `src/components/settings/useSettingsForm.ts`
- Modify: `src/app/routes/settings/SettingsRoute.tsx`
- Modify: `src/storage/settings-writer.ts`
- Modify: `src/storage/types.ts`
- Modify: `src/design-system/index.css`
- Modify: `tests/unit/react-read/reader-wave3.test.tsx`
- Modify: `tests/unit/react-read/mushaf-page-window.test.tsx`
- Modify: `tests/unit/react-shell/settings-route.test.tsx`
- Modify: `tests/unit/react-storage/db-schema.test.ts`
- Modify: `docs/context/surfaces/read.md`
- Modify: `docs/context/surfaces/configure.md`
- Modify: `docs/context/data-model.md`
- Generated if changed: `.docs-derive-manifest.json`, `docs/context/module-graph.md`, `docs/context/feature-map.md`

**Interfaces:**
- Produces `clampMushafPageFraming`, `interpolateMushafPageFrame`, and `mushafImagePlacement`.
- Produces the route-facing inline-SVG/external-image ready-state union and bounded current/preview/descriptor page-window behavior.
- Adds stored setting `mushafPageFraming: number`, default 0.
- Shows framing controls only when the active index/manifest declares reviewed framing.

- [ ] **Step 1: Implement pure framing math**

Use the unit Full rectangle and the page's reviewed Text rectangle:

```ts
export type NormalizedRect = { x: number; y: number; width: number; height: number }

export function interpolateMushafPageFrame(textFrame: NormalizedRect, value: number): NormalizedRect {
  const t = Math.min(1, Math.max(0, value))
  return {
    x: textFrame.x * t,
    y: textFrame.y * t,
    width: 1 + ((textFrame.width - 1) * t),
    height: 1 + ((textFrame.height - 1) * t),
  }
}
```

`mushafImagePlacement` derives container aspect ratio and absolute image width/height/offset from the selected source dimensions and interpolated frame. Reject invalid values and fall open to the unit Full frame.

- [ ] **Step 2: Switch the loader, page window, route, and viewer together**

Introduce the final ready-state union:

```ts
type MushafReadyMedia =
  | { kind: 'inline-svg'; inlineSvg: ReactInlineMushafSvg }
  | { kind: 'external-image'; source: MushafExternalImageSource }

type MushafReadyPageAssetState = {
  status: 'ready'
  media: MushafReadyMedia
  resolved: MushafResolvedPage
}

type PreparedMushafPage =
  | { kind: 'inline-svg'; assetUrl: string; resolved: MushafResolvedPage }
  | PreparedExternalMushafPage

type MushafPageWindowEntry =
  | { page: number; status: 'loading' }
  | { page: number; prepared: PreparedMushafPage; status: 'descriptor' }
  | { page: number; status: 'error' | 'unavailable' }
  | { asset: MushafReadyPageAssetState; page: number; status: 'ready' }
```

In the same change, replace the SVG-specific `viewBox`/`viewBoxText` fields on shared `MushafResolvedPage` with `displaySize: { width: number; height: number }` plus optional reviewed framing. V1 derives `displaySize` from the sanitized SVG viewBox; V2 derives it from the selected image descriptor. Keep V1's source viewBox comparison inside the V1 loader rather than exposing it as shared page metadata.

Extend the page window with `current`, `preview`, and `descriptor` purposes. Requested page is current; immediate previous/next are preview; positions two away retain validated `descriptor` entries and remain non-navigable. Promotion replaces descriptor with preview/current loading and then ready only after successful load/decode. Scroll mode promotes dominant and near-visible entries. Retain ready entries across overlapping navigation, cancel stale profile generations, and keep the old visible page on load/decode/abort/stale failures.

- [ ] **Step 3: Render V1 and V2 through the same page cell**

Keep `dangerouslySetInnerHTML` only for the existing sanitized V1 branch. Render V2 as a non-draggable `<img>` inside an overflow-hidden frame with its existing accessible page name. The emitted full image owns zero outer whitespace. Frame value changes reuse the same source and never add horizontal stage scrolling.

Effective Fit width is:

```ts
const effectiveFitWidth = hasValidFraming && framingValue > 0
  ? true
  : storedFitWidth
```

Preserve scroll clamping, page anchoring, Single/Scroll behavior, gestures, bookmarks, counters, routes, and vertical reachability.

- [ ] **Step 4: Persist and expose the bounded controls**

Add `mushafPageFraming` to `ReactReaderPreferences`, key lists, readers, writers, and preference events. Clamp invalid stored values to 0. Extend `MushafSettings` with:

- two owned preset `Button`s, `Full page` (0) and `Text focus` (1), with honest pressed state only at their exact endpoints;
- owned `Slider` labelled `Qur'an text size`, min 0, max 100, step 1;
- a derived percentage from interpolated frame width.

Use the index only to locate the active manifest. Add a manifest-backed capability loader that validates V2 plus valid framing on every page before returning `hasValidFraming: true`; do not infer framing from index membership or hardcode the edition id. quran.ws retains its current two Page layout controls only, and stale/corrupt framing values cannot force it into Fit width.

- [ ] **Step 5: Add durable component, loading, and persistence coverage**

Prove pure left/right interpolation, clamping, invalid-frame Full fallback, requested-first priority, descriptor-only outer entries, decode-gated previews, failure/stale survival, V1/V2 accessible rendering, setting callbacks, persistence, private-only control visibility, and quran.ws unchanged labels. Keep geometry, overflow, and scroll reachability out of Vitest.

- [ ] **Step 6: Run UI/static gates and commit**

Update Read, Configure, and the data model with mounted external images, descriptor/preview/current readiness, private-only framing, the new preference, and unchanged quran.ws behavior. Regenerate docs before verification.

```bash
pnpm run docs
pnpm run test:react -- tests/unit/react-read/mushaf-page-window.test.tsx tests/unit/react-read/reader-wave3.test.tsx tests/unit/react-shell/settings-route.test.tsx tests/unit/react-storage/db-schema.test.ts
pnpm run check
pnpm run docs:check
```

```bash
git add src/components/reader/mushaf-page-framing.ts src/packs/mushaf-index.ts src/packs/mushaf-page-asset.ts src/app/routes/read/useMushafPageWindow.ts src/components/reader/MushafPageViewer.tsx src/app/routes/read/MushafRoute.tsx src/components/settings/MushafSettings.tsx src/components/settings/useSettingsForm.ts src/app/routes/settings/SettingsRoute.tsx src/storage/settings-writer.ts src/storage/types.ts src/design-system/index.css tests/unit/react-read/mushaf-page-window.test.tsx tests/unit/react-read/reader-wave3.test.tsx tests/unit/react-shell/settings-route.test.tsx tests/unit/react-storage/db-schema.test.ts docs/context/surfaces/read.md docs/context/surfaces/configure.md docs/context/data-model.md .docs-derive-manifest.json docs/context/module-graph.md docs/context/feature-map.md
git commit -m "feat: add reviewed Mushaf page framing"
```

---

### Task 7: Add One-Time Edition Setup And A Fresh Availability Index

**Files:**
- Create: `src/launch/mushaf-edition-setup.ts`
- Modify: `src/launch/asset-contract-reset.ts`
- Modify: `src/continuity/launch-restore.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/app/routes/onboarding/onboarding-flow.ts`
- Modify: `src/app/routes/onboarding/OnboardingRoute.tsx`
- Modify: `src/storage/native-reader-store.ts`
- Modify: `src/storage/settings-writer.ts`
- Modify: `src/storage/types.ts`
- Modify: `vite.config.js`
- Modify: `tests/unit/react-continuity/continuity-wave3.test.ts`
- Modify: `tests/unit/react-shell/App.test.tsx`
- Modify: `tests/unit/react-navigate/onboarding-flow.test.ts`
- Modify: `tests/unit/react-storage/db-schema.test.ts`
- Modify: `tests/unit/react-offline/search-pack-lifecycle.test.ts`
- Modify: `tests/e2e/onboard/react-golden.spec.ts`
- Modify: `tests/e2e/infra/react-offline.spec.ts`
- Modify: `docs/context/surfaces/onboard.md`
- Modify: `docs/context/surfaces/infra.md`
- Modify: `docs/context/architecture.md`
- Modify: `docs/context/data-model.md`
- Modify: `docs/context/implemented.md`
- Modify: `docs/context/future.md`
- Modify: `docs/context/roadmap.md`
- Modify: `docs/context/glossary.md`
- Modify: `docs/product-info.md`
- Generated if changed: `.docs-derive-manifest.json`, `docs/context/module-graph.md`, `docs/context/feature-map.md`

**Interfaces:**
- Produces `MUSHAF_EDITION_SETUP_VERSION = 1`.
- Produces `resolveMushafEditionSetup()` with `complete`, `choose`, and `missing` outcomes.
- Produces atomic `writeMushafEditionSelection(editionId)`.
- Preserves the requested deep link until setup completes.

- [ ] **Step 1: Separate setup classification from the destructive asset contract**

Do not change `MVP_ASSET_CONTRACT_ID`. At launch, read whether the valid marker existed before `ensureReactMvpAssetContractReset()` can write defaults. Then classify:

```ts
type MushafEditionSetupState =
  | { status: 'complete'; mushafEditionId: string }
  | { status: 'choose'; editions: MushafEditionOption[] }
  | { status: 'missing'; mushafEditionId: string }
```

- valid pre-existing contract and no setup marker: atomically write quran.ws plus setup version 1, preserving every other store/record;
- absent pre-existing contract and no setup marker: load the current index and enter setup;
- present but invalid pre-existing contract: retain the existing compatibility reset, then enter the same setup-required state as fresh/cleared storage because the reset has removed incompatible bookmarks/settings;
- completed marker plus indexed selected edition: continue;
- completed marker plus missing edition: render the missing-edition state and expose navigation to About/Clear All Data, without reopening selection over old bookmarks.

Use one IndexedDB readwrite transaction for `mushafEditionId` and `mushafEditionSetupVersion`. No schema version bump is needed for settings keys.

- [ ] **Step 2: Implement the edition-only setup screen**

`OnboardingRoute` loads the current Mushaf index. One available compatible edition auto-selects. Two editions show an owned `Select` labelled `Mushaf edition` and one clear Continue command. It does not show riwayah, translation, theme, storage, import, or routine switching controls. After the atomic write, resume the original deep link; default to `#/s/1` only when none existed.

- [ ] **Step 3: Make the mutable availability index NetworkFirst**

Export a narrow Workbox route before the generic dataset route:

```js
export const mushafIndexRuntimeCaching = {
  urlPattern: ({ url }) => url.pathname === '/dataset/indexes/mushaf-assets.json',
  handler: 'NetworkFirst',
  options: {
    cacheName: 'quran-atlas-runtime-mushaf-index-v1',
    networkTimeoutSeconds: 3,
    cacheableResponse: { statuses: [0, 200] },
    expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 },
  },
}
```

Exclude that exact pathname from `datasetRuntimeCaching.urlPattern`. Offline may use the cached index; an online response must replace stale private availability.

- [ ] **Step 4: Prove migration, setup, and service-worker behavior**

Unit tests prove existing settings/bookmarks/continuity survive migration, fresh/cleared/invalid-reset state chooses, one edition auto-selects, two editions require one choice, selection writes atomically, deep links resume, and a missing completed edition cannot reopen selection. The focused runtime-cache test proves the exact Mushaf index matcher is NetworkFirst and excluded from generic CacheFirst. Browser tests prove a stale cached private index is replaced online and cached fallback still supports an offline launch.

- [ ] **Step 5: Run focused and release-sensitive gates**

Update Onboard, Infra, architecture, data model, product scope, glossary, implemented/future/roadmap, and Product Info with the current one-time setup, migration, clear-all switching, missing-edition state, and NetworkFirst availability-index behavior. Regenerate docs before running `validate`.

```bash
pnpm run docs
pnpm run test:react -- tests/unit/react-continuity/continuity-wave3.test.ts tests/unit/react-shell/App.test.tsx tests/unit/react-navigate/onboarding-flow.test.ts tests/unit/react-storage/db-schema.test.ts tests/unit/react-offline/search-pack-lifecycle.test.ts
pnpm run check
pnpm run validate
pnpm run docs:check
```

Expected: migration preserves existing user data; production preview service-worker tests pass.

```bash
git add src/launch/mushaf-edition-setup.ts src/launch/asset-contract-reset.ts src/continuity/launch-restore.ts src/app/App.tsx src/app/routes/onboarding/onboarding-flow.ts src/app/routes/onboarding/OnboardingRoute.tsx src/storage/native-reader-store.ts src/storage/settings-writer.ts src/storage/types.ts vite.config.js tests/unit/react-continuity/continuity-wave3.test.ts tests/unit/react-shell/App.test.tsx tests/unit/react-navigate/onboarding-flow.test.ts tests/unit/react-storage/db-schema.test.ts tests/unit/react-offline/search-pack-lifecycle.test.ts tests/e2e/onboard/react-golden.spec.ts tests/e2e/infra/react-offline.spec.ts docs/context/surfaces/onboard.md docs/context/surfaces/infra.md docs/context/architecture.md docs/context/data-model.md docs/context/implemented.md docs/context/future.md docs/context/roadmap.md docs/context/glossary.md docs/product-info.md .docs-derive-manifest.json docs/context/module-graph.md docs/context/feature-map.md
git commit -m "feat: add one-time Mushaf edition setup"
```

---

### Task 8: Prove The Private Reader And Update Current-State Docs

**Files:**
- Modify: `data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/media.json`
- Modify: `tests/e2e/fixtures/react-golden-routes.ts`
- Modify: `tests/e2e/fixtures/react-offline.ts`
- Modify: `tests/e2e/onboard/react-golden.spec.ts`
- Modify: `tests/e2e/read/mushaf-responsive.spec.ts`
- Modify: `tests/e2e/read/react-golden.spec.ts`
- Modify: `tests/e2e/infra/react-offline.spec.ts`
- Modify: `docs/context/surfaces/read.md`
- Modify: `docs/context/surfaces/onboard.md`
- Modify: `docs/context/surfaces/configure.md`
- Modify: `docs/context/surfaces/infra.md`
- Modify: `docs/context/architecture.md`
- Modify: `docs/context/data-model.md`
- Modify: `docs/context/source-data-flow.md`
- Modify: `docs/context/implemented.md`
- Modify: `docs/context/future.md`
- Modify: `docs/context/roadmap.md`
- Modify: `docs/context/glossary.md`
- Modify: `docs/product-info.md`
- Modify: `docs/tech-stack.md`
- Generated if changed: `.docs-derive-manifest.json`, `docs/context/module-graph.md`, `docs/context/feature-map.md`

**Interfaces:**
- Produces focused private-build browser proof without duplicating the quran.ws gesture suite.
- Produces current-state documentation for source, setup, framing, caching, and private build commands.

- [ ] **Step 1: Add private-build fixture gating**

Gate private-only cases behind an explicit environment flag such as `QURANATLAS_PRIVATE_MUSHAF=1`. Default CI continues to run quran.ws tests without requiring the PDF. Private fixtures seed or clear setup state through existing typed browser helpers rather than ad hoc IndexedDB code inside specs.

- [ ] **Step 2: Add the focused private reader journey**

Extend existing specs to prove:

- fresh private setup and retained deep link;
- pages 1, representative middle pages, lane-left, lane-right, empty-lane, special layout, and page 604 render nonblank;
- Full page has zero outer whitespace and shows the complete lane;
- Text focus removes the complete lane and preserves every Qur'an edge;
- intermediate framing enlarges content without horizontal overflow;
- all selected content is vertically reachable in portrait and compact landscape;
- one representative Single turn and Scroll journey preserve routes, counters, bookmarks, and dominant-page anchoring;
- failed/aborted decode never commits a blank page and remains retryable;
- only current and immediate previews request media;
- an exact cached rendition revisits offline, while an unfetched/unseen asset fails clearly;
- quran.ws responsive/golden journeys remain unchanged.

Use screenshots, visible roles/names, real scroll reachability, URL state, requests, and nonblank pixel checks. Do not duplicate the complete gesture/keyboard matrix.

- [ ] **Step 3: Build and run the private production-preview lane**

```bash
pnpm run data -- build --skip=mushaf-pages
pnpm run data -- mushaf-pages import --edition=qalun-furatiyyah-2023-v1 --pdf="/Users/omarduadu/Desktop/Noor-Book.com  مصحف رواية قالون عن نافع طبعة جديدة.pdf"
pnpm run data -- mushaf-pages build --profile=private --require-edition=qalun-furatiyyah-2023-v1
QURANATLAS_DATASET_RELEVANT=0 pnpm run ci:build
QURANATLAS_PRIVATE_MUSHAF=1 PLAYWRIGHT_USE_PREVIEW=1 PLAYWRIGHT_INCLUDE_OFFLINE=1 pnpm exec playwright test tests/e2e/onboard/react-golden.spec.ts tests/e2e/read/mushaf-responsive.spec.ts tests/e2e/read/react-golden.spec.ts tests/e2e/infra/react-offline.spec.ts --reporter=line
```

Expected: all private setup, layout, loading, navigation, and offline cases pass against the built `dist/`.

- [ ] **Step 4: Complete the final runtime and physical-device media gate**

Use the integrated production reader results to record actual maximum transferred bytes, decoded-memory estimate, median private ready time, quran.ws ready-time ratio, maximum attributable long task, ten-turn result, and sustained-Scroll result. Serve the same production artifact to the recorded target device and repeat clarity, load/decode, ten turns, portrait/landscape framing, and sustained Scroll checks.

Only after every automated and physical result passes, replace `gate: "pending-runtime"` with `gate: "passed"` in `media.json` and add a `runtimeEvidence` object containing those measured numeric/boolean values plus physical device model, OS, and browser. Stop release on any clipped Qur'an content, incomplete lane, blank committed page, unreadable marks, or responsiveness budget failure.

- [ ] **Step 5: Reconcile cross-cutting documentation and generated fences**

Confirm the scoped docs landed with Tasks 3 through 7, then reconcile their final cross-cutting wording with the measured private reader: two private-build Qaloon editions, one active selection, clear-all switching, setup migration, `mushafPageFraming`, WebP import/build commands, page-map compatibility, private-input/CI limitations, NetworkFirst index behavior, exact fetched-rendition offline behavior, and the WebP/Poppler toolchain. Keep future/deferred features out of current behavior. Then run:

```bash
pnpm run docs
pnpm run docs:check
```

- [ ] **Step 6: Restore baseline generated output and run final gates**

The private page bodies remain ignored, but tracked indexes/manifests must finish in the standard profile:

```bash
pnpm run data -- mushaf-pages build --profile=baseline --require-riwayah=qaloon
pnpm run data -- check
pnpm run check
pnpm run validate
pnpm run docs:check
git diff --check
git status --short
```

Expected: all gates pass; tracked runtime output is standard quran.ws-only; private source media remains outside Git.

- [ ] **Step 7: Commit browser proof and docs**

```bash
git add data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/media.json tests/e2e/fixtures/react-golden-routes.ts tests/e2e/fixtures/react-offline.ts tests/e2e/onboard/react-golden.spec.ts tests/e2e/read/mushaf-responsive.spec.ts tests/e2e/read/react-golden.spec.ts tests/e2e/infra/react-offline.spec.ts docs/context/surfaces/read.md docs/context/surfaces/onboard.md docs/context/surfaces/configure.md docs/context/surfaces/infra.md docs/context/architecture.md docs/context/data-model.md docs/context/source-data-flow.md docs/context/implemented.md docs/context/future.md docs/context/roadmap.md docs/context/glossary.md docs/product-info.md docs/tech-stack.md .docs-derive-manifest.json docs/context/module-graph.md docs/context/feature-map.md
git commit -m "test: prove private Qaloun Mushaf reader"
```

---

## Final Scope Audit

- The only new product choice is Mushaf edition selection during fresh/cleared setup.
- The only new runtime media behavior is validated external WebP beside existing inline quran.ws SVG.
- The only new page control is reviewed Full/Text framing plus its bounded slider.
- Bookmarks, routes, navigation rules, Daily Wird mapping, and quran.ws reader behavior remain shared.
- The private PDF, review sheets, benchmark output, and page bodies remain local/ignored.
- Any request for routine switching, edition-specific bookmarks, OCR, arbitrary import, PDF.js, new verse mapping, free zoom/pan, or full offline installation is a separate design, not an extension of this plan.
