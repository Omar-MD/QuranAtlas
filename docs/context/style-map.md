# UI Style Map

## Purpose

This map is the quickest route from a visible UI element to its owning source, CSS partial, reference, and proof.

## How To Use This Map

Start with the surface dossier, confirm the source component, then edit the owning CSS partial and run the listed proofs.

## Component Ownership

| Surface | Component | Source | Style partial | Visual reference | Unit tests | E2E tests |
| --- | --- | --- | --- | --- | --- | --- |
| `read` | AmbientDock | `src/read/AmbientDock.svelte` | `src/styles/surfaces/read/ambient-dock.css` | Not applicable: no committed single-component reference yet | `tests/unit/read/AmbientDock.test.ts` | `tests/e2e/read/chrome.spec.js` |
| `read` | AmbientPill | `src/read/AmbientPill.svelte` | `src/styles/surfaces/read/ambient-pill.css` | Not applicable: no committed single-component reference yet | `tests/unit/core/app.test.js` | `tests/e2e/read/chrome.spec.js` |
| `read` | MarginHeader | `src/read/MarginHeader.svelte` | `src/styles/surfaces/read/margin-header.css` | `docs/ui-references/read/margin-header/verse.mobile.light.png`, `docs/ui-references/read/margin-header/mushaf.mobile.light.png` | `tests/unit/read/MarginHeader-toggle.test.ts` | `tests/e2e/read/chrome.spec.js` |
| `read` | SurahProgress | `src/read/SurahProgress.svelte` | `src/styles/surfaces/read/surah-progress.css` | Not applicable: no committed single-component reference yet | `tests/unit/read/SurahHeader.test.ts` | `tests/e2e/read/chrome.spec.js` |
| `read` | Verse row | `src/read/Verse.svelte` | `src/styles/surfaces/read/verse.css` | `docs/ui-references/read/verse-row/default.mobile.light.png`, `docs/ui-references/read/verse-row/tafsir-open.mobile.light.png` | `tests/unit/read/Verse.test.ts` | `tests/e2e/read/chrome.spec.js`, `tests/e2e/read/text-sources.spec.js` |
| `read` | Mushaf page | `src/read/mushaf/MushafPage.svelte` | `src/styles/surfaces/read/mushaf.css` | `docs/ui-references/read/mushaf-page/ready.mobile.light.png`, `docs/ui-references/read/mushaf-page/ready.tablet-portrait.light.png` | `tests/unit/read/mushaf/reader.test.ts` | `tests/e2e/read/chrome.spec.js` |
| `navigate` | Nav drawer shell/header | `src/navigate/NavDrawer.svelte` | `src/styles/surfaces/navigate/drawer-shell.css` | `docs/ui-references/navigate/nav-drawer-header/read.mobile.light.png` | `tests/unit/navigate/drawer.test.ts` | `tests/e2e/navigate/drawer.spec.js` |
| `configure` | SettingsShell | `src/configure/settings/SettingsShell.svelte` | `src/styles/surfaces/configure/settings-shell.css` | `docs/ui-references/configure/settings-shell/verse.mobile.light.png`, `docs/ui-references/configure/settings-shell/mushaf.mobile.light.png` | `tests/unit/configure/panel.test.ts` | `tests/e2e/configure/settings.spec.js` |
| `configure` | VerseSettings | `src/configure/settings/VerseSettings.svelte` | `src/styles/surfaces/configure/settings-shell.css` | `docs/ui-references/configure/settings-shell/verse.mobile.light.png` | `tests/unit/configure/panel.test.ts` | `tests/e2e/configure/settings.spec.js` |
| `configure` | MushafSettings | `src/configure/settings/MushafSettings.svelte` | `src/styles/surfaces/configure/settings-shell.css` | `docs/ui-references/configure/settings-shell/mushaf.mobile.light.png` | `tests/unit/configure/panel.test.ts` | `tests/e2e/configure/settings.spec.js` |
| `configure` | ThemeNightControls | `src/configure/settings/ThemeNightControls.svelte` | `src/styles/surfaces/configure/settings-shell.css` | `docs/ui-references/configure/theme-night-controls/default.mobile.light.png` | `tests/unit/configure/night-mode.test.ts` | `tests/e2e/configure/settings.spec.js` |
| `configure` | NestedAssetPicker | `src/configure/settings/NestedAssetPicker.svelte` | `src/styles/surfaces/configure/settings-shell.css` | Not applicable: nested picker has no committed standalone reference yet | `tests/unit/configure/panel.test.ts` | `tests/e2e/configure/settings.spec.js` |
| `configure` | AssetManagement | `src/configure/assets/AssetManagement.svelte` | `src/styles/surfaces/configure/asset-management.css` | `docs/ui-references/configure/asset-management/route.mobile.light.png`, `docs/ui-references/configure/asset-management/route.desktop.light.png` | `tests/unit/configure/panel.test.ts` | `tests/e2e/configure/settings.spec.js` |
| `onboard` | Onboarding riwayah selector | `src/onboard/Onboarding.svelte` | `src/styles/surfaces/onboard/shell.css` | `docs/ui-references/onboard/riwayah-selector/default.mobile.light.png`, `docs/ui-references/onboard/riwayah-selector/unavailable.mobile.light.png` | Not applicable: e2e-only flow coverage | `tests/e2e/onboard/first-run.spec.js` |
| `infra` | QuotaBanner | `src/core/quota-banner.svelte` | `src/styles/surfaces/overlays/quota-banner.css` | Not applicable: overlay has no committed component reference yet | Not applicable: durable proof is browser-only today | `tests/e2e/infra/offline.spec.js` |
| `infra` | UpdateBanner | `src/core/UpdateBanner.svelte` | `src/styles/surfaces/overlays/update-banner.css` | Not applicable: overlay has no committed component reference yet | `tests/unit/infra/safety/sync.test.js` | `tests/e2e/infra/offline.spec.js` |
| `configure` | NightShift | `src/App.svelte` | `src/styles/surfaces/overlays/night-shift.css` | Not applicable: overlay has no committed component reference yet | `tests/unit/configure/night-mode.test.ts` | `tests/e2e/configure/settings.spec.js` |
