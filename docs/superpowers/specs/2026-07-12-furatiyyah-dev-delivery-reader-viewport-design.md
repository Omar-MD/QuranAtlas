# Furatiyyah Dev Delivery And Mushaf Viewport Design

## Purpose

This specification completes the existing Furatiyyah Mushaf work by making the reviewed `qalun-furatiyyah-2023-v1` edition available in the deployed `dev` app, hardening the implementation boundaries introduced by the first attempt, and restoring a strict viewport contract for Single + Fit page reading.

It extends the approved private-edition design and implementation plan without adding a new product surface. Edition selection remains a one-time fresh or cleared setup choice. Existing profiles remain on quran.ws, and switching editions still requires About > Clear All Data.

## Current Failure

The application code supports the second edition, and the complete normalized Furatiyyah WebP input exists locally, but the deployed artifact cannot expose it:

- the normalized WebPs are ignored and never reach GitHub Actions;
- CI always builds the baseline quran.ws-only Mushaf profile;
- the deployed availability index therefore contains only `qalun-quran-ws-v1`;
- every private browser journey is skipped in the default CI lane.

The prior implementation also permits a requested private build to omit its defining edition, treats transient index failures as permanent edition removal, relies on a brittle error-message transition between V1 and V2 media loaders, and leaves several recovery and persistence failures without useful UI.

Single + Fit page has a separate viewport defect. The page stage itself declares hidden vertical overflow, but the outer Mushaf reader still inherits a `100vh` minimum. On mobile browsers, `100vh` may exceed the visible `100dvh` while browser chrome is present, creating document scroll and native vertical movement around an otherwise fitted page. That movement competes with swipe navigation.

## Scope

### In scope

- A lean, immutable delivery source for the normalized Furatiyyah WebPs.
- A trusted `dev` CI lane that restores, validates, builds, tests, and deploys both editions.
- Baseline-only PR, `staging`, and `main` behavior.
- Fail-closed private-profile and release-media validation.
- Targeted quality fixes in the data/build, launch/onboarding, page-loading, recovery, and persistence code introduced or materially affected by the prior edition work.
- A dynamic-viewport Mushaf shell with no document or page-stage scroll in Single + Fit page.
- Real production-preview and live-deployment proof.

### Out of scope

- Cloudflare R2, Pages Functions, a new CDN, or another runtime storage service.
- Git LFS or committing hundreds of megabytes of generated WebPs to Git history.
- A routine Mushaf edition switcher.
- Bookmark migration between editions.
- Full-Mushaf offline installation UI or precaching every private page.
- Changing quran.ws page bytes or its manifest V1 contract.
- Pinch zoom, free panning, or document-level Mushaf scrolling.

## Distribution Authorization

The repository records the edition's source facts and restricted source-file provenance accurately. The user has explicitly authorized public, noncommercial deployment of the derived Furatiyyah page assets in QuranAtlas and accepts responsibility for that distribution decision. The catalog must record this user authorization directly; it must not infer a general license grant from noncommercial use or rewrite the source facts.

The source PDF remains excluded from Git, release assets, browser output, and `dist/`. Only reviewed derived WebPs and their normalized metadata are published.

## Lean Delivery Architecture

### Canonical release asset

Publish exactly one immutable GitHub Release asset for the edition version:

```text
tag: mushaf-qalun-furatiyyah-2023-v1
asset: qalun-furatiyyah-2023-v1-normalized-v1.tar
```

The archive contains one top-level `qalun-furatiyyah-2023-v1/` directory with `import.json` and the 1,208 reviewed WebP renditions. It does not contain the PDF, catalog files, runtime indexes, generated manifests, scripts, or unrelated dataset assets.

GitHub Releases is the canonical transport store; Actions cache is only an optimization. No workflow resolves `latest`, a mutable branch artifact, or an expiring workflow artifact.

### Committed delivery descriptor

Add a small catalog-adjacent descriptor:

```ts
type MushafEditionDistribution = {
  version: 1
  mushafEditionId: 'qalun-furatiyyah-2023-v1'
  authorization: 'user-authorized-public-noncommercial-deployment'
  repository: 'Omar-MD/QuranAtlas'
  releaseTag: 'mushaf-qalun-furatiyyah-2023-v1'
  assetName: 'qalun-furatiyyah-2023-v1-normalized-v1.tar'
  archiveBytes: number
  archiveSha256: string
  normalizedContentDigest: string
  normalizedContractDigest: string
  fileCount: 1209
}
```

The descriptor is the only committed pointer from CI to the release. Its archive digest protects transport and cache restoration; the normalized contract and page digests protect extracted content.

### Restore boundary

One focused restore module owns release-archive validation and normalized promotion. It:

1. reads and validates the committed descriptor;
2. verifies exact archive byte count and SHA-256 before extraction;
3. lists entries and rejects absolute paths, `..` traversal, links, devices, duplicate paths, unexpected roots, and unexpected files;
4. extracts into a new sibling staging directory;
5. verifies exact file count, normalized identity, contract digest, content digest, every page/rendition descriptor, and genuine WebP structure/dimensions;
6. atomically promotes only a complete edition directory;
7. treats an exact current directory as reusable and rejects changed bytes at the immutable edition id.

The restore module accepts a local archive path. Downloading remains a small workflow step using the pinned release tag and asset name, so the data module does not depend on the GitHub CLI or network behavior.

## CI And Deployment Flow

The existing build-once/deploy-once chain remains authoritative.

### Trusted `dev` push

1. Checkout the pushed commit.
2. Restore the exact-key normalized cache when present.
3. On cache miss, download the pinned release asset and run the restore boundary.
4. Revalidate restored content even after a cache hit.
5. Ensure the existing quran.ws normalized pages are present.
6. Build Mushaf pages directly with `--profile=private`; the profile itself requires both editions.
7. Run the normal non-Mushaf dataset/build path with Mushaf pages marked prebuilt so it cannot prune the private output.
8. Set `QURANATLAS_PRIVATE_MUSHAF=1` for production-preview E2E.
9. Upload the single tested `dist/` artifact without recompressing already-compressed page media.
10. Deploy that exact artifact through the existing Cloudflare Pages workflow.

The private archive is downloaded only on a cache miss. The cache uses the immutable archive SHA as its complete key and has no restore prefix. Untrusted PR workflows neither populate nor depend on it.

### Other builds

- Pull requests use baseline quran.ws-only data and tests.
- `staging` and `main` pushes remain baseline unless a later approved promotion changes their product contract.
- Local `pnpm run build` remains baseline.
- The private release lane uses the focused Mushaf command; it does not send `profile=private` through unrelated text, Search, knowledge, or package builders.

## Data And Build Quality

### Fail-closed private profile

`--profile=private` means exactly quran.ws plus Furatiyyah. Missing, incomplete, stale, unapproved, or media-gate-incomplete Furatiyyah input fails before pruning or index writes. An extra `--require-edition` flag may strengthen diagnostics but cannot be required for correctness.

### Release gate and provenance

- `media.gate` must equal `passed` for private build/check/release restore.
- Runtime evidence must satisfy the committed schema independently from byte-affecting emission identity.
- The accepted archive SHA and normalized digests are committed.
- Arbitrary 64-character legacy contract digests are not accepted.
- The normalized input published for this release uses the current emission contract. The unreleased legacy local metadata is regenerated before publication.
- Exact Poppler and libwebp versions used for the published normalized archive are recorded as provenance.
- CropBox validation parses the actual CropBox, not the generic page-size summary.

### Complete check mode

Private check mode derives the same expected edition descriptors as write mode and verifies:

- both selected editions are present;
- manifest and asset-index equality;
- exact selected output membership with no stale edition or page files;
- dataset manifest profile/membership;
- every normalized and emitted media descriptor;
- the release distribution descriptor and passed media gate.

Check mode performs no writes.

## Runtime Quality

### Availability states

Edition setup distinguishes:

```ts
type MushafEditionSetupState =
  | { status: 'complete'; mushafEditionId: string }
  | { status: 'choose'; editions: MushafEditionOption[] }
  | { status: 'missing'; mushafEditionId: string }
  | { status: 'availability-error'; mushafEditionId?: string }
```

`missing` is returned only after a successfully fetched and validated current index omits a completed selection. Network failure, timeout, non-2xx response, invalid JSON, and offline cold-cache failure produce `availability-error`, preserve stored selection, and offer Retry without recommending destructive clearing.

### Setup persistence

Automatic one-edition selection and explicit Continue handle transaction failure. The setup screen keeps the intended choice, shows an accessible retryable error, and never emits an unhandled promise rejection. A successful retry resumes the preserved deep link.

### Unified media loading

One prepared-page loader fetches and validates the active index/manifest, discriminates V1 inline SVG versus V2 external image, and returns typed results. It does not discover V2 by matching a V1 loader error string. The five-page window reuses the active profile/index/manifest rather than refetching them for each entry.

### Requested-page failure

When navigation requests an unavailable or failed destination while an old page remains mounted:

- the old page remains visible and usable;
- the shell label and counter stay truthful about the visible page;
- an accessible live error names the requested page;
- Retry requests the destination again;
- Cancel or Back restores the visible page URL without losing the current page;
- the failure is not hidden inside an `aria-hidden` neighbor cell.

### Recovery controls and preference writes

- Every visible recovery button performs its labelled action; the inert Manage assets button is wired to the owned asset/settings route or removed.
- Furatiyyah framing persistence reports failure and restores or retries the last persisted value rather than silently presenting an unsaved choice.

## Mushaf Viewport And Scroll Contract

The Mushaf reader, not the document, owns viewport geometry.

| Navigation | Page fit | Scroll owner | Required behavior |
| --- | --- | --- | --- |
| Single | Fit page / Full page | none | The complete page fits inside the visible dynamic viewport. Document and stage scroll ranges are zero. Vertical touch movement does not move or rubber-band the page; horizontal swipe remains available. |
| Single | Fit width | page stage | The stage scrolls vertically only when the rendered page exceeds available height. The document stays fixed. |
| Single | Focused framing value greater than zero | page stage | Effective Fit width remains active; all selected content is vertically reachable inside the stage. |
| Scroll | Fit page or Fit width | page stage | The retained page stack scrolls inside the stage and synchronizes the dominant page. The document stays fixed. |

The Mushaf `ReaderPageShell` uses the dynamic viewport, not the legacy large viewport:

- `height` and `min-height` resolve to `100dvh` for Mushaf mode;
- outer overflow is clipped so browser/document scrolling cannot compete with gestures;
- the Mushaf surface consumes the shell height rather than introducing its own document minimum;
- Single + Fit page uses hidden stage overflow and a non-scroll touch contract;
- Fit width and Scroll restore `overflow-y: auto`, `touch-action: pan-y`, bounded overscroll, and keyboard scrolling;
- page sizing remains constrained by both available width and chrome-aware height;
- safe-area, browser-chrome, orientation, and resize changes recompute the available rectangle without leaving stale scroll offsets.

Single + Fit page is not exposed as a scrollable region and is not keyboard-scrollable. Fit width and Scroll remain named, focusable scroll regions.

## Error Handling

- Missing release asset or cache: fail `dev` CI before building.
- Archive byte/digest mismatch: delete staging, fail, and do not reuse or populate cache.
- Unsafe archive entry: fail before extraction.
- Invalid normalized or WebP media: fail before public output mutation.
- Private profile missing either edition: fail before pruning/index mutation.
- Transient runtime index failure: preserve selection and show Retry.
- Authoritative current index omission: show missing-edition recovery and Clear All Data guidance.
- Setup or preference write failure: keep user intent visible and offer Retry.
- Requested-page failure: keep the current page, announce the failed destination, and offer Retry/Cancel.

## Verification

### Focused unit and script coverage

- Distribution descriptor validation.
- Archive byte/digest, traversal, absolute path, link, duplicate, extra/missing entry, corrupt WebP, and atomic-promotion behavior.
- Private profile missing input fails without pruning or index mutation.
- Pending/invalid media gate fails private build/check.
- Current normalized contract is required; arbitrary legacy hex is rejected.
- CropBox and tool-version provenance parsing.
- Complete check-mode index/manifest/membership comparison.
- Availability error versus authoritative missing classification.
- Setup write failure followed by successful retry.
- Unified V1/V2 prepared-page loading without error-text dispatch.
- Requested-page failure state, Retry, Cancel, visible-page truth, and recovery action callbacks.
- Framing write failure and retry/rollback behavior.

### Browser coverage

- Fresh/cleared private `dev` artifact offers both editions.
- Furatiyyah pages 1, representative middle pages, and 604 decode and render nonblank.
- Private framing, navigation, retry, and exact cached-rendition offline behavior pass.
- Single + Fit page has `document.scrollHeight === document.clientHeight`, stage `scrollHeight === clientHeight`, no vertical movement after touch/wheel/keyboard input, and a working horizontal swipe at mobile, tablet, desktop, and compact-landscape opt-out sizes.
- Fit width and Scroll retain vertical stage reachability while document scroll remains zero.
- quran.ws behavior remains unchanged outside the viewport correction.

### Release and live proof

Completion requires all of the following:

1. The release asset exists at the exact pinned tag/name and matches the committed SHA-256.
2. `pnpm run data -- check`, focused tests, `pnpm run check`, `pnpm run validate`, `pnpm run docs:check`, and `git diff --check` pass.
3. The pushed `dev` CI run executes rather than skips the private browser lane and succeeds.
4. Cloudflare deploys the exact successful CI artifact.
5. The live `dev` Mushaf availability index contains exactly `qalun-quran-ws-v1` and `qalun-furatiyyah-2023-v1` for Qaloon.
6. Live sample WebPs exist and match their indexed descriptors.
7. In an authenticated fresh/cleared browser profile, live onboarding offers both edition labels, selection opens Furatiyyah, and a representative page renders.
8. Live Single + Fit page has no document/stage scroll and still completes a horizontal page swipe.

## Documentation Impact

Update current-state documentation for:

- public noncommercial user-authorized derived-asset distribution while retaining source-PDF provenance;
- immutable GitHub Release input and branch-specific build profiles;
- exact dev/private versus staging/main/baseline behavior;
- fail-closed private build/check semantics;
- real private CI coverage;
- transient availability and persistence recovery;
- unified V1/V2 loading;
- document-fixed Mushaf viewport and mode-specific stage scrolling;
- the release archive and byte-affecting tool versions.

Generated documentation fences remain owned by `pnpm run docs`.

## Acceptance Criteria

- The deployed `dev` app offers both Qaloon Mushaf editions after fresh/cleared setup.
- The Furatiyyah edition opens and renders reviewed WebP pages from the deployed artifact.
- Every future trusted `dev` push restores the pinned edition input efficiently and cannot silently downgrade to baseline.
- PR, `staging`, and `main` behavior remains baseline and lean.
- No source PDF, R2 service, Pages Function, Git LFS dependency, or generated WebP Git history is added.
- The private CI lane is real, required, and consumes the same artifact Cloudflare deploys.
- The scoped data/build and runtime quality defects identified in this specification are covered and corrected.
- Single + Fit page is fully contained in the visible dynamic viewport, has no document or stage scroll, and preserves swipe navigation.
- Fit width, focused framing, and Scroll mode retain vertical reachability inside the stage only.
- Full repository validation, remote CI, Cloudflare deployment, live index/media, live onboarding, and live Reader behavior all pass.
