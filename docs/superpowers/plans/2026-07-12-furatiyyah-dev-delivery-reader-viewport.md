# Furatiyyah Dev Delivery And Mushaf Viewport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the reviewed Furatiyyah Qaloon Mushaf edition a durable part of the deployed `dev` app, remediate the quality defects introduced by the first implementation, and make Single + Fit page fully viewport-contained without scroll.

**Architecture:** Publish one immutable checksum-pinned GitHub Release archive containing only the normalized Furatiyyah WebPs. Trusted `dev` pushes restore and validate that archive, build the two-edition Mushaf profile, run the real private E2E lane, and deploy the same artifact; PR, `staging`, `main`, and normal local builds remain baseline. Runtime changes stay inside existing Reader, onboarding, settings, and dataset boundaries.

**Tech Stack:** Node.js ESM scripts, GitHub Releases and Actions cache, Poppler/WebP tools, React 19, TypeScript, Dexie/IndexedDB, Vite PWA/Workbox, Vitest, Playwright, Cloudflare Pages, and `gh`/Wrangler for release and deployment verification.

## Global Constraints

- Approved design: `docs/superpowers/specs/2026-07-12-furatiyyah-dev-delivery-reader-viewport-design.md`.
- Parent design: `docs/superpowers/specs/2026-07-12-qaloun-private-pdf-edition-design.md`.
- Parent implementation: `docs/superpowers/plans/2026-07-12-qaloun-private-pdf-edition.md`.
- No shared handoff log is named by the parent plan; the two designs, both implementation plans, Git history, and task commits are the coordination record.
- Keep the source PDF out of Git, GitHub Releases, `public/`, and `dist/`.
- Publish only the reviewed normalized WebPs and `import.json` in one immutable release asset.
- Do not add R2, Pages Functions, Git LFS, another CDN, or a routine edition switcher.
- The user explicitly authorizes public noncommercial deployment of the derived pages; record that authorization without claiming a general source license.
- `dev` push artifacts contain quran.ws plus `qalun-furatiyyah-2023-v1`; PR, `staging`, `main`, and normal local artifacts remain quran.ws-only.
- A private profile must fail before output mutation when either edition or its passed media gate is unavailable.
- Existing profiles stay on quran.ws. Edition changes continue to require About > Clear All Data.
- Single + Fit page has no document or stage scroll; Fit width, focused framing, and Scroll mode scroll inside the stage only.
- Extend existing tests. Browser geometry and scroll assertions stay in `tests/e2e/read/mushaf-responsive.spec.ts`.
- Update current-state docs with each behavior cluster and regenerate fences only with `pnpm run docs`.
- Stage only listed paths and preserve unrelated worktree changes.

---

### Task 1: Harden The Private Import And Normalized Contract

**Files:**
- Modify: `scripts/data/mushaf-pages/private-pdf.mjs`
- Modify: `scripts/data/mushaf-pages/build.mjs`
- Modify: `scripts/data/sources/catalog.mjs`
- Modify: `data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/media.json`
- Modify: `tests/unit/scripts/mushaf-pages.test.js`
- Modify: `tests/unit/scripts/source-catalog.test.js`
- Modify: `docs/tech-stack.md`
- Modify: `docs/context/source-data-flow.md`

**Interfaces:**
- Produces `CURRENT_PRIVATE_EMISSION_CONTRACT_VERSION` and current-only normalized metadata.
- Produces `parsePdfCropBox(pdfInfoText)` and exact tool-version provenance.
- Produces `validatePassedPrivateMediaGate(mediaPolicy)` for import/build/check consumers.

- [ ] **Step 1: Add focused failing coverage for the audit findings**

Extend the existing script suites with cases that reject:

```js
expect(() => parsePdfCropBox('Page size: 612 x 792 pts\nCropBox: 0 0 512.545 652.654\n'))
  .not.toThrow()
expect(() => validatePassedPrivateMediaGate({ gate: 'pending-runtime' }))
  .toThrow(/passed media gate/i)
expect(() => validateLegacyMetadata({ contractDigest: 'a'.repeat(64) }))
  .toThrow(/legacy normalized contract/i)
```

Add a source-catalog case where `gate: "passed"` lacks required runtime evidence and expect validation failure.

- [ ] **Step 2: Run the focused tests and confirm the new cases fail**

Run:

```bash
pnpm exec vitest run tests/unit/scripts/mushaf-pages.test.js tests/unit/scripts/source-catalog.test.js --project=node
```

Expected: only the new CropBox, gate, current-contract, or runtime-evidence assertions fail.

- [ ] **Step 3: Implement current-only provenance validation**

Implement these boundaries in `private-pdf.mjs`:

```js
export const CURRENT_PRIVATE_EMISSION_CONTRACT_VERSION = 2

export function parsePdfCropBox(text) {
  const match = /^CropBox:\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/m.exec(text)
  if (!match) throw new Error('Pinned private PDF CropBox is unavailable')
  const [, x1, y1, x2, y2] = match.map(Number)
  return { height: y2 - y1, width: x2 - x1, x: x1, y: y1 }
}

export function validatePassedPrivateMediaGate(media) {
  if (media.gate !== 'passed' || !media.runtimeEvidence) {
    throw new Error('Private Mushaf release requires a passed media gate with runtime evidence')
  }
  return media.runtimeEvidence
}
```

Record the exact output of `pdftocairo -v`, `cwebp -version`, and `webpinfo -version` in normalized provenance. Remove acceptance of an unpinned arbitrary 64-hex legacy digest; the local normalized directory will be regenerated before release.

- [ ] **Step 4: Enforce the passed gate in catalog and importer validation**

Require the committed runtime evidence fields already measured by the parent plan: byte limits, ready medians/ratio, long-task result, private browser counts, ten-turn result, sustained-scroll result, and `physicalDevices` array. Keep this evidence outside byte-affecting emission identity.

- [ ] **Step 5: Run focused verification**

```bash
pnpm run docs
pnpm exec vitest run tests/unit/scripts/mushaf-pages.test.js tests/unit/scripts/source-catalog.test.js --project=node
pnpm run docs:check
git diff --check
```

Expected: all commands pass.

- [ ] **Step 6: Commit the import hardening**

```bash
git add scripts/data/mushaf-pages/private-pdf.mjs scripts/data/sources/catalog.mjs data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/media.json tests/unit/scripts/mushaf-pages.test.js tests/unit/scripts/source-catalog.test.js docs/tech-stack.md docs/context/source-data-flow.md .docs-derive-manifest.json docs/context/module-graph.md docs/context/feature-map.md
git commit -m "fix: harden private Mushaf provenance"
```

---

### Task 2: Make Private Build And Check Semantics Fail Closed

**Files:**
- Modify: `scripts/data/mushaf-pages/build.mjs`
- Modify: `scripts/data/cli.mjs`
- Modify: `tests/unit/scripts/mushaf-pages.test.js`
- Modify: `tests/unit/react-packs/check-react-mushaf-indexes.test.mjs`
- Modify: `docs/context/source-data-flow.md`
- Modify: `docs/context/surfaces/infra.md`

**Interfaces:**
- `editionIdsForProfile('private', catalog)` remains the selected-set source.
- Produces `resolveRequiredEditionIds(profile, explicitIds)`.
- Produces read-only exact-output comparison for `--check`.

- [ ] **Step 1: Add private-profile and check-mode regression coverage**

Add cases proving:

```js
expect(resolveRequiredEditionIds('private', [])).toEqual([
  'qalun-quran-ws-v1',
  'qalun-furatiyyah-2023-v1',
])
```

Run the private profile against a missing private normalized root and assert non-zero failure without changing a seeded output/index. Seed stale edition membership, a corrupt index, a stale dataset manifest, and an extra page file; assert `--profile=private --check` rejects each without writes.

- [ ] **Step 2: Run the focused suite and confirm the new cases fail**

```bash
pnpm exec vitest run tests/unit/scripts/mushaf-pages.test.js tests/unit/react-packs/check-react-mushaf-indexes.test.mjs --project=node
```

- [ ] **Step 3: Make selected private editions inherently required**

Implement:

```js
export function resolveRequiredEditionIds(profile, explicitIds = []) {
  const required = new Set(explicitIds)
  if (profile === 'private') {
    required.add('qalun-quran-ws-v1')
    required.add('qalun-furatiyyah-2023-v1')
  }
  return [...required]
}
```

Resolve and validate every selected/required edition before pruning, output writes, index writes, or dataset-manifest writes.

- [ ] **Step 4: Make check mode compare the complete expected artifact**

Refactor descriptor construction so write and check modes share one pure expected model. Check mode compares exact selected directories/files, edition manifests, shared asset index, legacy default aliases, and dataset manifest membership without calling a write or prune function.

- [ ] **Step 5: Run focused verification and commit**

```bash
pnpm run docs
pnpm exec vitest run tests/unit/scripts/mushaf-pages.test.js tests/unit/react-packs/check-react-mushaf-indexes.test.mjs --project=node
pnpm run check:mushaf-assets
pnpm run docs:check
git diff --check
git add scripts/data/mushaf-pages/build.mjs scripts/data/cli.mjs tests/unit/scripts/mushaf-pages.test.js tests/unit/react-packs/check-react-mushaf-indexes.test.mjs docs/context/source-data-flow.md docs/context/surfaces/infra.md .docs-derive-manifest.json docs/context/module-graph.md docs/context/feature-map.md
git commit -m "fix: require complete private Mushaf builds"
```

---

### Task 3: Separate Transient Edition Availability From Missing Editions

**Files:**
- Modify: `src/launch/mushaf-edition-setup.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/app/routes/onboarding/onboarding-flow.ts`
- Modify: `src/app/routes/onboarding/OnboardingRoute.tsx`
- Modify: `tests/unit/react-continuity/continuity-wave3.test.ts`
- Modify: `tests/unit/react-shell/App.test.tsx`
- Modify: `tests/unit/react-navigate/onboarding-flow.test.ts`
- Modify: `tests/e2e/onboard/react-golden.spec.ts`
- Modify: `docs/context/surfaces/onboard.md`
- Modify: `docs/context/architecture.md`

**Interfaces:**
- Extends `MushafEditionSetupState` with `{ status: 'availability-error'; mushafEditionId?: string }`.
- Produces retryable onboarding persistence state.

- [ ] **Step 1: Add classification and persistence-failure coverage**

Assert completed selection plus fetch rejection, timeout/non-2xx, or invalid JSON yields `availability-error`; a valid parsed index omitting the edition yields `missing`. Add a component test where `writeMushafEditionSelection` rejects once, displays an accessible error, succeeds on Retry, and resumes the preserved deep link.

- [ ] **Step 2: Implement the typed availability result**

Use this exact state addition:

```ts
| { status: 'availability-error'; mushafEditionId?: string }
```

Only return `missing` from a successfully loaded, validated index. Keep the stored edition untouched on `availability-error`.

- [ ] **Step 3: Add accessible Retry behavior**

Render a polite error status and owned `Button` labelled `Retry edition availability`. For setup transaction failure, retain the selected option and render `Retry Mushaf setup`; disable only during the active attempt.

- [ ] **Step 4: Run focused verification and commit**

```bash
pnpm run docs
pnpm run test:react -- tests/unit/react-continuity/continuity-wave3.test.ts tests/unit/react-shell/App.test.tsx tests/unit/react-navigate/onboarding-flow.test.ts
pnpm run check
pnpm run docs:check
git diff --check
git add src/launch/mushaf-edition-setup.ts src/app/App.tsx src/app/routes/onboarding/onboarding-flow.ts src/app/routes/onboarding/OnboardingRoute.tsx tests/unit/react-continuity/continuity-wave3.test.ts tests/unit/react-shell/App.test.tsx tests/unit/react-navigate/onboarding-flow.test.ts tests/e2e/onboard/react-golden.spec.ts docs/context/surfaces/onboard.md docs/context/architecture.md .docs-derive-manifest.json docs/context/module-graph.md docs/context/feature-map.md
git commit -m "fix: make Mushaf setup recovery retryable"
```

---

### Task 4: Consolidate V1/V2 Loading And Expose Requested-Page Failure

**Files:**
- Modify: `src/packs/mushaf-page-asset.ts`
- Modify: `src/app/routes/read/useMushafPageWindow.ts`
- Modify: `src/app/routes/read/MushafRoute.tsx`
- Modify: `src/components/reader/ReaderAssetGate.tsx`
- Modify: `tests/unit/react-packs/mushaf-paths.test.ts`
- Modify: `tests/unit/react-read/mushaf-page-window.test.tsx`
- Modify: `tests/unit/react-read/reader-wave3.test.tsx`
- Modify: `tests/e2e/read/react-golden.spec.ts`
- Modify: `docs/context/surfaces/read.md`
- Modify: `docs/context/data-model.md`

**Interfaces:**
- Produces `loadPreparedMushafPage(options): Promise<PreparedMushafPage>` as the only V1/V2 preparation entry.
- Produces a requested-page failure view model with `requestedPage`, `visiblePage`, `message`, `retry`, and `cancel` behavior.

- [ ] **Step 1: Add loader and user-visible failure coverage**

Prove one index/manifest context discriminates V1 and V2 without matching exception text. Add route coverage where page 42 stays visible while requested page 43 fails: the shell/counter stays on 42, a live message names 43, Retry calls page 43 again, and Cancel restores `#/m/42`.

- [ ] **Step 2: Replace the error-message V1-to-V2 transition**

Make `loadPreparedMushafPage` inspect the validated manifest version and return:

```ts
type PreparedMushafPage =
  | { kind: 'inline-svg'; assetUrl: string; resolved: MushafResolvedPage }
  | PreparedExternalMushafPage
```

Pass a shared loaded profile/index/manifest context into the five-page window so entries do not refetch it independently.

- [ ] **Step 3: Add truthful requested-page recovery UI**

Keep the old ready page mounted. Render an accessible status outside hidden neighbor cells with `Retry page N` and `Stay on page M` buttons. Derive reader label, page counter, bookmark target, and mode bridge from the visible page until destination commit.

- [ ] **Step 4: Repair the inert asset recovery action**

Give `ReaderAssetGate` an explicit `onManageAssets` callback and render Manage assets only when supplied. Route it through the owned settings/assets opener; otherwise omit the button.

- [ ] **Step 5: Run focused verification and commit**

```bash
pnpm run docs
pnpm run test:react -- tests/unit/react-packs/mushaf-paths.test.ts tests/unit/react-read/mushaf-page-window.test.tsx tests/unit/react-read/reader-wave3.test.tsx
pnpm run check
pnpm run docs:check
git diff --check
git add src/packs/mushaf-page-asset.ts src/app/routes/read/useMushafPageWindow.ts src/app/routes/read/MushafRoute.tsx src/components/reader/ReaderAssetGate.tsx tests/unit/react-packs/mushaf-paths.test.ts tests/unit/react-read/mushaf-page-window.test.tsx tests/unit/react-read/reader-wave3.test.tsx tests/e2e/read/react-golden.spec.ts docs/context/surfaces/read.md docs/context/data-model.md .docs-derive-manifest.json docs/context/module-graph.md docs/context/feature-map.md
git commit -m "refactor: unify Mushaf page loading"
```

---

### Task 5: Make Mushaf Preference Writes Honest

**Files:**
- Modify: `src/components/settings/useSettingsForm.ts`
- Modify: `src/app/routes/settings/SettingsRoute.tsx`
- Modify: `src/components/settings/MushafSettings.tsx`
- Modify: `tests/unit/react-shell/settings-route.test.tsx`
- Modify: `docs/context/surfaces/configure.md`

**Interfaces:**
- Produces retryable preference-write status for `mushafPageFraming` without changing the storage schema.

- [ ] **Step 1: Add failed-write and retry coverage**

Mock a framing persistence rejection. Assert visible `Could not save Mushaf page framing`, preserved last persisted value, and a `Retry saving Mushaf framing` action that succeeds on the next call.

- [ ] **Step 2: Implement scoped write state**

Track only the new framing write as `idle | saving | error`. Do not add a generic form framework. On failure, restore the persisted value and retain the attempted value as the retry payload.

- [ ] **Step 3: Run focused verification and commit**

```bash
pnpm run docs
pnpm run test:react -- tests/unit/react-shell/settings-route.test.tsx
pnpm run check
pnpm run docs:check
git diff --check
git add src/components/settings/useSettingsForm.ts src/app/routes/settings/SettingsRoute.tsx src/components/settings/MushafSettings.tsx tests/unit/react-shell/settings-route.test.tsx docs/context/surfaces/configure.md .docs-derive-manifest.json docs/context/module-graph.md docs/context/feature-map.md
git commit -m "fix: report Mushaf framing save failures"
```

---

### Task 6: Lock Single Fit Page To The Dynamic Viewport

**Files:**
- Modify: `src/design-system/index.css`
- Modify: `src/components/reader/ReaderPageShell.tsx`
- Modify: `src/components/reader/MushafPageViewer.tsx`
- Modify: `tests/e2e/read/mushaf-responsive.spec.ts`
- Modify: `docs/context/surfaces/read.md`
- Modify: `docs/context/style-map.md` only if ownership text changes

**Interfaces:**
- Mushaf shell owns `100dvh` and clips document overflow.
- Stage owns scrolling only for Fit width, focused framing, or Scroll mode.

- [ ] **Step 1: Add browser regression coverage**

Extend `mushaf-responsive.spec.ts` at `390x844`, `768x1024`, `1280x900`, and compact landscape with explicit Fit-page opt-out. Assert:

```ts
expect(metrics.documentScrollHeight).toBe(metrics.documentClientHeight)
expect(metrics.stageScrollHeight).toBe(metrics.stageClientHeight)
expect(metrics.stageScrollTop).toBe(0)
```

Send wheel, vertical touch/pointer input, PageDown, and ArrowDown; assert no document/stage movement. Then perform the existing horizontal flick and assert exactly one route/page transition. Separately assert Fit width and Scroll move only the stage while document scroll remains zero.

- [ ] **Step 2: Run the owning spec and confirm the new viewport case fails where supported**

```bash
PLAYWRIGHT_SKIP_BUILD=1 pnpm exec playwright test tests/e2e/read/mushaf-responsive.spec.ts --project=chromium --grep "Fit page owns no scroll" --reporter=line
```

Expected: the new scroll-owner assertion or mobile-dynamic viewport contract fails before the CSS correction.

- [ ] **Step 3: Make the Mushaf shell the dynamic-viewport owner**

Apply the equivalent of:

```css
.qar-react-reader-shell[data-reader-mode='mushaf'] {
  height: 100dvh;
  min-height: 100dvh;
  padding-top: 0;
  overflow: hidden;
}

.qar-react-reader-shell[data-reader-mode='mushaf'] > .qar-react-mushaf-page-surface {
  height: 100%;
  min-height: 0;
}

[data-mushaf-layout-mode='single'][data-mushaf-fit-width='false'] .qar-react-mushaf-page-stage {
  overflow: hidden;
  overscroll-behavior: none;
  touch-action: none;
}

[data-mushaf-layout-mode='single'][data-mushaf-fit-width='true'] .qar-react-mushaf-page-stage,
[data-mushaf-layout-mode='scroll'] .qar-react-mushaf-page-stage {
  overflow-y: auto;
  overscroll-behavior-y: contain;
  touch-action: pan-y;
}
```

Remove the generic `qar:min-h-screen` behavior from Mushaf mode if its `100vh` rule can win over the dynamic height. Keep Verse mode document scrolling unchanged.

- [ ] **Step 4: Keep semantics aligned with the scroll owner**

Single + Fit page has no scroll-region name, role, tab stop, or keyboard scroll handling. Fit width and Scroll keep `Scrollable Mushaf pages`, focusability, and stage keyboard scrolling.

- [ ] **Step 5: Run responsive proof and commit**

```bash
pnpm run docs
PLAYWRIGHT_SKIP_BUILD=1 pnpm exec playwright test tests/e2e/read/mushaf-responsive.spec.ts --project=chromium --reporter=line
pnpm run check
pnpm run docs:check
git diff --check
git add src/design-system/index.css src/components/reader/ReaderPageShell.tsx src/components/reader/MushafPageViewer.tsx tests/e2e/read/mushaf-responsive.spec.ts docs/context/surfaces/read.md docs/context/style-map.md .docs-derive-manifest.json docs/context/module-graph.md docs/context/feature-map.md
git commit -m "fix: contain Fit page in the viewport"
```

---

### Task 7: Regenerate And Publish The Immutable Furatiyyah Input

**Files:**
- Create: `data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/distribution.json`
- Modify: `data/catalog/mushaf-assets.json`
- Modify: `data/catalog/licenses.json`
- Modify: `scripts/data/sources/catalog.mjs`
- Modify: `tests/unit/scripts/source-catalog.test.js`
- Modify: `docs/product-info.md`
- Modify: `docs/context/source-data-flow.md`
- Modify: `docs/tech-stack.md`
- Local ignored input: `data/normalized/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/**`
- Scratch release asset: `.scratch/releases/qalun-furatiyyah-2023-v1-normalized-v1.tar`

**Interfaces:**
- Produces the real committed `MushafEditionDistribution` descriptor.
- Produces release tag `mushaf-qalun-furatiyyah-2023-v1` and its exact archive asset.

- [ ] **Step 1: Preserve the old ignored normalized directory and reimport current metadata**

Move the unreleased legacy directory under `.scratch/`, then run the pinned importer against the approved PDF path:

```bash
mkdir -p .scratch/qalun-legacy-normalized
mv data/normalized/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1 .scratch/qalun-legacy-normalized/
pnpm run data -- mushaf-pages import --edition=qalun-furatiyyah-2023-v1 --pdf="/Users/omarduadu/Desktop/Noor-Book.com  مصحف رواية قالون عن نافع طبعة جديدة.pdf"
```

Expected: 604 logical pages, 1,208 WebPs, and current emission-contract/tool provenance.

- [ ] **Step 2: Build and verify the private profile locally**

```bash
pnpm run data -- mushaf-pages build --profile=private
pnpm run data -- mushaf-pages build --profile=private --check
```

Expected: both editions appear in the runtime index and check mode is clean.

- [ ] **Step 3: Create the deterministic USTAR archive and calculate its contract**

```bash
mkdir -p .scratch/releases
COPYFILE_DISABLE=1 tar --format=ustar --uid=0 --gid=0 --numeric-owner --mtime='UTC 2026-01-01' -cf .scratch/releases/qalun-furatiyyah-2023-v1-normalized-v1.tar -C data/normalized/mushaf-pages/qaloon qalun-furatiyyah-2023-v1
shasum -a 256 .scratch/releases/qalun-furatiyyah-2023-v1-normalized-v1.tar
wc -c .scratch/releases/qalun-furatiyyah-2023-v1-normalized-v1.tar
```

Use the measured values plus the regenerated `import.json` digests in `distribution.json`; do not insert symbolic values.

- [ ] **Step 4: Record public deployment authorization and distribution contract**

Keep the original source restrictions, add a distinct user-authorization license/provenance record for the derived public deployment, set the asset to the deliberately shipped dev/private profile, and require `distribution.json` from catalog validation.

- [ ] **Step 5: Test, document, and commit the descriptor**

```bash
pnpm run docs
pnpm exec vitest run tests/unit/scripts/source-catalog.test.js tests/unit/scripts/mushaf-pages.test.js --project=node
pnpm run data -- check
pnpm run docs:check
git diff --check
git add data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/distribution.json data/catalog/mushaf-assets.json data/catalog/licenses.json scripts/data/sources/catalog.mjs tests/unit/scripts/source-catalog.test.js docs/product-info.md docs/context/source-data-flow.md docs/tech-stack.md .docs-derive-manifest.json docs/context/module-graph.md docs/context/feature-map.md
git commit -m "data: authorize Furatiyyah dev distribution"
```

- [ ] **Step 6: Publish and verify the immutable release asset**

```bash
gh release create mushaf-qalun-furatiyyah-2023-v1 .scratch/releases/qalun-furatiyyah-2023-v1-normalized-v1.tar --repo Omar-MD/QuranAtlas --target HEAD --title "Furatiyyah Qaloon Mushaf v1" --notes "User-authorized derived WebP input for QuranAtlas dev deployments; source PDF excluded."
gh release verify-asset mushaf-qalun-furatiyyah-2023-v1 .scratch/releases/qalun-furatiyyah-2023-v1-normalized-v1.tar --repo Omar-MD/QuranAtlas
```

Expected: release and asset exist, and verification succeeds.

---

### Task 8: Add Safe Archive Restore And Lean Dev CI

**Files:**
- Create: `scripts/data/mushaf-pages/release-archive.mjs`
- Modify: `scripts/data/cli.mjs`
- Modify: `tests/unit/scripts/mushaf-pages.test.js`
- Modify: `.github/workflows/ci.yml`
- Modify: `scripts/ci/affected.mjs`
- Modify: `tests/unit/scripts/ci-affected.test.mjs`
- Modify: `docs/context/surfaces/infra.md`
- Modify: `docs/context/source-data-flow.md`
- Modify: `docs/tech-stack.md`

**Interfaces:**
- Produces `inspectPrivateMushafTar(buffer, distribution)`.
- Produces `restorePrivateMushafReleaseArchive({ archivePath, normalizedRoot, runCommand })`.
- Adds `pnpm run data -- mushaf-pages restore-release --archive=/absolute/path`.

- [ ] **Step 1: Add archive-security and atomicity coverage**

Cover correct archive, wrong bytes/SHA, traversal, absolute path, symlink, hardlink, duplicate entry, extra root/file, missing rendition, corrupt WebP, existing exact output, and failed staging validation preserving prior output.

- [ ] **Step 2: Implement a focused USTAR inspector and atomic restore**

Read 512-byte USTAR headers directly. Accept only regular files and directories under the exact edition root; reject all other type flags before invoking `tar -xf` into staging. Verify archive byte count/SHA first and normalized/media contracts after extraction, then atomically promote.

- [ ] **Step 3: Add branch-selective CI behavior**

For trusted `push` runs where `github.ref_name == 'dev'`:

- cache the normalized edition with the complete archive SHA as the only key and no restore prefix;
- on miss, download the exact release tag/asset with `gh release download` and call `restore-release`;
- always run private normalized check after cache/download;
- ensure quran.ws normalized pages;
- build `mushaf-pages --profile=private` before `ci:build`;
- set `QURANATLAS_PRIVATE_MUSHAF=1` for the production-preview E2E job;
- upload `build-output` with `compression-level: 0`.

PR, `staging`, and `main` conditions retain baseline behavior. Deploy workflow remains unchanged and consumes the tested artifact.

- [ ] **Step 4: Add branch-policy tests**

Extend affected/CI tests to prove dev push selects private, dev PR/staging/main select baseline, the private build is prebuilt before `ci:build`, and private E2E is enabled only for the deployable dev lane.

- [ ] **Step 5: Run focused verification and commit**

```bash
pnpm run docs
pnpm exec vitest run tests/unit/scripts/mushaf-pages.test.js tests/unit/scripts/ci-affected.test.mjs --project=node
pnpm run check
pnpm run docs:check
git diff --check
git add scripts/data/mushaf-pages/release-archive.mjs scripts/data/cli.mjs tests/unit/scripts/mushaf-pages.test.js .github/workflows/ci.yml scripts/ci/affected.mjs tests/unit/scripts/ci-affected.test.mjs docs/context/surfaces/infra.md docs/context/source-data-flow.md docs/tech-stack.md .docs-derive-manifest.json docs/context/module-graph.md docs/context/feature-map.md
git commit -m "ci: deploy private Mushaf on dev"
```

---

### Task 9: Prove The Complete Private Production Artifact Locally

**Files:**
- Modify: `tests/e2e/fixtures/react-golden-routes.ts`
- Modify: `tests/e2e/fixtures/react-offline.ts`
- Modify: `tests/e2e/onboard/react-golden.spec.ts`
- Modify: `tests/e2e/read/mushaf-responsive.spec.ts`
- Modify: `tests/e2e/read/react-golden.spec.ts`
- Modify: `tests/e2e/infra/react-offline.spec.ts`
- Modify: `docs/context/implemented.md`
- Modify: `docs/context/roadmap.md`
- Modify: `docs/product-info.md`

**Interfaces:**
- Produces a `dist/` artifact identical in shape to the trusted dev CI artifact.

- [ ] **Step 1: Build the final private artifact without a baseline prune**

```bash
pnpm run data -- build --skip=mushaf-pages
pnpm run data -- mushaf-pages build --profile=private
QURANATLAS_DATASET_RELEVANT=0 pnpm run ci:build
```

- [ ] **Step 2: Verify artifact membership and descriptors**

Assert `dist/dataset/indexes/mushaf-assets.json` contains exactly both Qaloon edition ids. Verify pages 1, 304, and 604 for both WebP widths exist and match manifest/index byte counts and SHA-256 values.

- [ ] **Step 3: Run the private production-preview journeys**

```bash
QURANATLAS_PRIVATE_MUSHAF=1 PLAYWRIGHT_USE_PREVIEW=1 PLAYWRIGHT_INCLUDE_OFFLINE=1 pnpm exec playwright test tests/e2e/onboard/react-golden.spec.ts tests/e2e/read/mushaf-responsive.spec.ts tests/e2e/read/react-golden.spec.ts tests/e2e/infra/react-offline.spec.ts --project=chromium --reporter=line
```

Expected: no private test is skipped except cases explicitly unsupported by the browser environment; onboarding, WebP decode, framing, retry, offline, Single/Fit-page, and Scroll journeys pass.

- [ ] **Step 4: Run final repository gates and commit final docs/tests**

```bash
pnpm run docs
pnpm run data -- check
pnpm run check
pnpm run validate
pnpm run docs:check
git diff --check
git status --short
```

Commit only real remaining test/doc changes:

```bash
git add tests/e2e/fixtures/react-golden-routes.ts tests/e2e/fixtures/react-offline.ts tests/e2e/onboard/react-golden.spec.ts tests/e2e/read/mushaf-responsive.spec.ts tests/e2e/read/react-golden.spec.ts tests/e2e/infra/react-offline.spec.ts docs/context/implemented.md docs/context/roadmap.md docs/product-info.md .docs-derive-manifest.json docs/context/module-graph.md docs/context/feature-map.md
git commit -m "test: prove deployed Furatiyyah reader"
```

---

### Task 10: Push, Monitor, And Verify The Live Dev App

**Files:**
- No source files unless remote verification exposes a defect.

**Interfaces:**
- Consumes the successful local commits and release asset.
- Produces authoritative GitHub CI, Cloudflare deployment, and live-browser evidence.

- [ ] **Step 1: Review the final commit range and push `dev`**

```bash
git status --short --branch
git log --oneline origin/dev..HEAD
git diff --check origin/dev..HEAD
git push origin dev
```

- [ ] **Step 2: Monitor CI to completion**

Find the pushed SHA's CI run, then watch it:

```bash
PUSHED_SHA=$(git rev-parse HEAD)
CI_RUN_ID=$(gh run list --workflow CI --commit "$PUSHED_SHA" --limit 1 --json databaseId --jq '.[0].databaseId')
test -n "$CI_RUN_ID"
gh run watch "$CI_RUN_ID" --exit-status
```

Confirm the private restore/build steps ran, private E2E was not skipped, and the uploaded artifact contains both editions. If CI fails, diagnose, fix, recommit, repush, and repeat until green.

- [ ] **Step 3: Monitor Cloudflare deployment to completion**

Find the workflow-run-triggered Deploy run for the same SHA and watch it:

```bash
DEPLOY_RUN_ID=$(gh run list --workflow Deploy --limit 20 --json databaseId,headSha --jq ".[] | select(.headSha == \"$PUSHED_SHA\") | .databaseId" | head -n 1)
test -n "$DEPLOY_RUN_ID"
gh run watch "$DEPLOY_RUN_ID" --exit-status
```

Confirm Wrangler reports the `dev` alias and exact pushed SHA.

- [ ] **Step 4: Verify live data and media**

Using the authenticated in-app browser or Chrome session, fetch the live dev availability index. Confirm exact Qaloon edition ids, then request Furatiyyah manifest and pages 1, 304, and 604 at both widths; compare response sizes and SHA-256 values with the live descriptors.

- [ ] **Step 5: Verify live onboarding and Reader behavior**

In an isolated authenticated browser profile, clear QuranAtlas app data, reload the live dev app, confirm the `Mushaf edition` selector offers `Qalun Quran.ws` and `Qalun Furatiyyah 2023`, select Furatiyyah, and open a representative page. Confirm:

- a Furatiyyah page image is visible and nonblank;
- Single + Fit page has no document or stage scroll;
- one horizontal swipe changes exactly one page;
- Fit width scrolls inside the stage while document scroll stays zero.

- [ ] **Step 6: Completion audit**

Map every acceptance criterion from the approved design to local command output, release metadata, CI job evidence, deploy evidence, live index/media responses, and live browser behavior. Do not mark the goal complete while any criterion lacks direct evidence.
