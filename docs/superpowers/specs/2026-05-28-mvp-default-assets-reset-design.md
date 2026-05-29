# MVP Default Assets Reset Design

## Purpose

QuranAtlas MVP now has one supported reader asset profile across the repo:
Qaloon text and font, Qaloon Mushaf, and Bridges translation. There is no
current user-facing choice of riwayah, translation, tafsir, or Mushaf edition.
The old settings and asset-management parity plan is superseded by this product
reset.

This design keeps the app future-ready by introducing one typed default asset
profile as the source of truth, rather than preserving dormant optional-asset
UI or scattered constants.

## Decisions

- Scope applies to both Svelte and React code paths.
- Remove non-MVP asset product scope instead of hiding it.
- Supported assets are:
  - Qaloon Quran text and required Qaloon font.
  - Qaloon Mushaf pages and manifest as the only supported Mushaf pack.
  - Bridges translation.
- Unsupported current-MVP assets are removed from product/data/runtime surfaces:
  Hafs, Warsh, optional translations, tafsir, and alternate Mushaf editions.
- No tafsir UI, tafsir preview, tafsir sheet, tafsir source picker, or tafsir
  asset row remains in the MVP.
- Existing local QuranAtlas data is silently cleared once for this MVP contract
  change. The reset discards old bookmarks, settings, cached packs, install
  state, and saved positions instead of migrating unsupported historical state.
- The app shows a simple launch splash on every cold start, then opens the
  reader automatically.
- The asset-management page is informational only.

## Architecture

Add a small typed runtime asset profile, for example
`defaultReaderAssets`, that describes the active MVP profile:

```ts
type ReaderAssetProfile = {
  id: string
  label: string
  riwayah: 'qaloon'
  quranTextStyleId: string
  quranFontId: string
  mushafEditionId: string
  translationId: 'bridges'
  tafsirId: null
}
```

The exact module names can be chosen during implementation, but the contract is
that launch, reader loading, settings, asset inventory, dataset validation, and
future switching consume the same profile. The profile has one entry now. A
future multi-asset release can add more profiles and a default selector without
reintroducing ad hoc constants.

Route components remain containers. Data reads, writes, cache checks, and
launch reset logic stay in typed helpers or hooks. Product components receive
profile-backed row models and callbacks only.

## Repo Cleanup

Cleanup is part of the MVP feature, not a follow-up. Implementation should
delete or prune current-product references to:

- Hafs and Warsh runtime/source selection.
- Optional translations besides Bridges.
- Tafsir catalogs, generated outputs, runtime loaders, UI, tests, and docs
  where they describe current behavior.
- Alternate Mushaf edition selection.
- Install, delete, verify, set-active, and switch controls for optional packs.
- Old onboarding source-choice screens and route gating logic.

Catalogs, generated public dataset indexes, tests, and docs should expose only
the MVP default profile as current behavior. Future support belongs in the
profile contract and roadmap/future docs, not in inactive runtime code.

## Launch And Reset

There is no onboarding wizard. A cold app launch shows a simple, elegant splash
with QuranAtlas identity and a brief loading/entry state. It offers no choices.

Launch then:

1. Checks whether the local database/cache reset marker matches this MVP asset
   contract.
2. If not, silently clears QuranAtlas active IndexedDB stores and matching
   Cache Storage entries, records the new reset marker, and proceeds. Launch
   reset avoids whole-database deletion so another open tab cannot block app
   startup; the explicit Clear All Data flow still owns full database deletion.
3. Applies or assumes the default asset profile.
4. Restores the last valid reader surface when available after reset logic;
   otherwise routes to `#/s/1`.

The splash appears on every cold start. It is not an onboarding surface and
does not own settings.

`#/onboarding` should no longer present setup choices. It can redirect through
the same splash/launch path so legacy links see the current launch experience
instead of a retired setup screen.

## Settings UX

Settings keep only preferences that make sense for a single-profile MVP:

- Theme and night mode.
- Reader typography controls.
- Translation visibility for the Bridges line as a reader comfort preference.
- Mushaf display preferences such as view mode, if still owned by the reader.

Settings remove:

- Riwayah picker.
- Quran text-style picker.
- Translation source picker.
- Tafsir source picker.
- Mushaf edition picker.
- Manage/install optional pack workflows inside settings.

## Asset Management UX

The asset-management page becomes a read-only inventory page. It lists the
installed/default MVP assets with grouped rows:

- Qaloon Text + Font.
- Qaloon Mushaf.
- Bridges Translation.

Rows may show default/installed status and basic provenance or size when the
remaining indexes provide it. Rows do not show install, delete, verify,
set-active, switch, retry, or clear-cache actions.

The row model should stay profile-backed and grouped so future multiple assets
can be added by expanding the profile/index model rather than redesigning the
page.

## Data Contract

Runtime dataset outputs and indexes should stop advertising unsupported current
assets. The remaining dataset should be coherent for the default profile:

- Qaloon text paths and legacy `qaloon` runtime key compatibility where needed.
- Qaloon font availability.
- Bridges translation paths and provenance.
- Qaloon Mushaf page manifest and pages.
- No tafsir runtime pack or selectable tafsir metadata.

Unsupported generated runtime files should be removed from committed outputs or
excluded from generated indexes as part of the implementation. They must not
remain visible to runtime selectors, product docs, or parity tests.

## Testing

Tests should prove the new MVP contract rather than the superseded optional-pack
contract.

Unit coverage:

- Default asset profile shape and consumers.
- One-time silent reset marker behavior.
- Default launch/settings initialization.
- Removed source selectors.
- Asset inventory row model with the three default groups and no actions.
- Dataset/index pruning so unsupported assets are not exposed as current
  selectable assets.

E2E coverage:

- Cold launch shows the splash, then enters the reader automatically.
- `#/onboarding` no longer presents setup choices.
- Seeded old unsupported local data is silently cleared.
- `#/assets` lists only Qaloon Text + Font, Qaloon Mushaf, and Bridges
  Translation.
- `#/assets` has no install/delete/verify/set-active/switch action buttons.
- Reader routes render Qaloon text and Bridges translation with no tafsir UI.

Verification should broaden because this is repo-wide:

- Data/catalog checks or build profile that proves the pruned dataset contract.
- Targeted unit tests for launch, storage, assets, settings, and reader defaults.
- Svelte and React checks/builds affected by the dual-build period.
- Targeted E2E for launch, reader, and asset inventory.
- `pnpm run docs:check` and `git diff --check` for documentation integrity.

## Documentation

Current-state docs must be updated with implementation:

- `docs/product-info.md`
- `docs/context/implemented.md`
- `docs/context/roadmap.md`
- `docs/context/future.md` if future multi-asset support is preserved as a
  future direction
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/context/feature-map.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/infra.md`
- React parity plan/spec docs that currently instruct agents to restore old
  optional-pack settings and asset workflows

Docs should describe the single default asset profile as current behavior.
Future multi-asset support should be framed as future work through the profile
contract, not as present hidden capability.

## Acceptance Criteria

- Repo-wide current behavior supports only Qaloon text/font, Qaloon Mushaf, and
  Bridges translation.
- No current UI presents choices for riwayah, translation source, tafsir source,
  or Mushaf edition.
- No tafsir product UI remains in MVP routes.
- Cold launch always shows the splash and then enters/restores the reader.
- Old local app data is silently reset once under the new MVP contract.
- Asset Management is read-only and lists only the three default asset groups.
- The default asset profile is the single source of truth for current asset
  identity and is structured for future multiple profiles.
- Tests and docs assert the new MVP contract and no longer require the old Plan
  05 optional-pack parity behavior.
