# Variant-Aware Settings And Asset Management Revamp

## Summary

Retire the current all-purpose Settings sheet and replace it with mode-aware
reader settings plus a dedicated `#/assets` Asset Management page. The asset
model changes from `riwayah = package` to compatible axes: active riwayah,
active Quran text-style variant, and active Mushaf-edition variant. Command
Sheet removal is included, with Search removed from current visible navigation
unless a separate Search route is later specified.

## Concrete Asset Contracts

Persisted active settings:

- `riwayah`: default `qaloon`.
- `quranTextStyleId`: default `uthmani-kfgqpc-v1`.
- `mushafEditionId`: default `qalun-quran-ws-v1`.

New index `/dataset/indexes/text-assets.json`:

- Shape: `{ version: 1, defaults: { [riwayah]: textStyleId }, assets: TextAsset[] }`.
- `TextAsset`: `{ riwayah, textStyleId, label, scriptFamily, providerId, licenseId, visibility: 'baseline' | 'optional', shipped: boolean, files: [{ url, bytes }], totalBytes, ayahCount, outputPathTemplate, provenance }`.
- Validation: IDs are stable slugs; files are same-origin `/dataset/quran-text/**`; file count and ayah counts match the riwayah; text style preserves ayah keys/counts for its riwayah.

New index `/dataset/indexes/mushaf-assets.json`:

- Shape: `{ version: 1, defaults: { [riwayah]: mushafEditionId }, assets: MushafAsset[] }`.
- `MushafAsset`: `{ riwayah, mushafEditionId, label, tradition, providerId, licenseId, visibility, shipped, manifestUrl, files: [{ url, bytes }], totalBytes, pageCount, provenance }`.
- Validation: IDs are stable slugs; manifest/files are same-origin `/dataset/mushaf-pages/{riwayah}/{mushafEditionId}/**`; page count and manifest identity match the index.

New paths/cache names:

- Quran text: `/dataset/quran-text/{riwayah}/{textStyleId}/{surah}.json`.
- Mushaf pages: `/dataset/mushaf-pages/{riwayah}/{mushafEditionId}/manifest.json` and `/pages/{NNN}.svg`.
- Mushaf page cache: `qa-pages-{riwayah}-{mushafEditionId}-v1`.

Mushaf manifests add `mushafEditionId`, `editionLabel`, `editionVersion`, and
`sourceSlug`; the loader rejects any manifest whose riwayah or edition does not
match the requested/indexed asset.

`indexes/riwayah-packages.json` is demoted to a temporary compatibility facade
only during migration. New install/status logic reads `text-assets.json` and
`mushaf-assets.json`.

## Runtime And Migration

Verse resolves text by `(riwayah, quranTextStyleId)`.

Mushaf resolves pages by `(riwayah, mushafEditionId)`.

Atomic riwayah switching rule: `setRiwayah(next)` switches to `next` only if
compatible default text-style and Mushaf-edition assets for `next` are shipped
or verified installed. On success it updates all three active axes together. On
failure it leaves all active settings unchanged and returns a visible
unavailable/install state.

Setting `quranTextStyleId` or `mushafEditionId` independently requires
compatibility with current `riwayah` and shipped/verified usability.

Install, verify, set active, and delete are separate operations:

- Install never changes active settings.
- Set Active appears only after verified usability.
- Delete is disabled for active optional assets until another compatible verified asset is active.

Status labels:

- `Shipped`: baseline/manifest-available asset usable without optional install.
- `Cached`: verified Cache Storage presence.
- `Installed`: verified optional local availability.
- `Unavailable`, `Incomplete`, `Incompatible`: explicit degraded states.

Boot normalization:

- Missing `quranTextStyleId` becomes `uthmani-kfgqpc-v1`.
- Missing `mushafEditionId` becomes `qalun-quran-ws-v1` for `qaloon`, or the default compatible edition for the active riwayah when available.
- Old `offlineCategories` may preserve user intent but never proves installed state.
- Existing cache state is verified by checking concrete new-index files.

Old cache behavior:

- Old `/dataset/riwayat/{riwayah}/**` and `qa-pages-{riwayah}-v1` caches are not considered verified for new variant assets.
- They may be deleted by stale-cache cleanup after the new route/cache prefixes ship.
- If a user was offline with only old optional caches, optional assets show `Incomplete` and require reinstall; baseline shipped assets remain usable.

## UI And Navigation

Reader gear opens mode-aware settings:

- Mobile/tablet: existing gear remains the entry.
- Desktop: add a Settings item to `AmbientDock` or its More menu; this is the required desktop entry after Command Sheet removal.

Verse Settings panel:

- Verse typography/reading flow, translation visibility/source, tafsir source, active riwayah/text-style, compact Theme/Night, Manage Assets.

Mushaf Settings panel:

- Active riwayah/Mushaf edition, compact Theme/Night, Manage Assets.
- Keep Mushaf view mode in pinned Mushaf chrome only unless intentionally duplicated with live sync.

Gear behavior:

- Single tap opens current mode panel.
- Double-tap theme cycling may remain; if removed, Theme/Night controls must be visible without scrolling in both panels.
- Closing restores focus to the opener.

`#/assets`:

- Real route, excluded from `lastSurface` and launch restore.
- Manage Assets closes the panel and navigates to `#/assets`.
- Back returns to previous route when history exists.
- Direct load/reload with no previous reader route shows a Back to Reader CTA to `#/s/1`.

Asset Management groups:

- Quran Text Styles.
- Mushaf Editions.
- Translations.
- Tafsir.
- Baseline/search/index cards only for real v1 cacheable assets.

Command Sheet removal:

- Delete component, bridge, lazy mount, `Cmd/Ctrl+K`, `/`, `g p`, command docs/tests.
- Remove desktop rail Search entry and all command-style search/quick-jump promises from current docs.
- Keep direct reader/navigation shortcuts that do not depend on Command Sheet only if explicitly tested and documented.

## Accessibility

- Panels are labelled dialogs with focus trap, Escape/backdrop dismissal, nested picker focus handling, and restored focus.
- Asset route has page heading, section landmarks, keyboard-operable actions, and visible disabled-action reasons.
- Install progress/errors use `aria-live`.
- Touch targets are at least 44px.
- Reduced motion disables nonessential panel/card animation.

## Implementation Sequence

- Emit new indexes alongside old ones first; keep old consumers working during migration.
- Update builders, validators, manifest inventory, route-defs, cache cleanup prefixes, and offline planners for variant paths.
- Add settings normalization and variant-aware resolver/status helpers.
- Switch Verse and Mushaf runtime resolution to new axes.
- Build Verse Settings, Mushaf Settings, and `#/assets`.
- Remove Command Sheet and Search/quick-jump docs in the final cleanup phase.
- Regenerate docs/inventories and update `source-data-flow`, `data-model`, `configure`, `read`, `navigate`, `infra`, and product docs.

## Test Plan

- Unit tests for index schemas, variant IDs/defaults, compatibility, settings normalization, atomic riwayah switching, cache verification, old-cache upgrade behavior, install-only behavior, Set Active, and active-delete blocking.
- Reader/Mushaf tests for variant path resolution, incompatible asset refusal, and edition-aware manifest rejection.
- Component tests for both panels and Asset Management grouped cards.
- Route tests for `#/assets` skip-persistence, direct-entry fallback, and Back behavior.
- E2E only where browser proof is needed: gear opens correct mode panel, `#/assets` a11y, and `@offline` old-cache/new-cache install/delete behavior.
- Final verification: `pnpm run data -- build`, `pnpm run docs`, `pnpm run docs:check`, and `pnpm run validate`.

