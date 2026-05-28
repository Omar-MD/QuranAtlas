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
| `read` | Verse row | `src/read/Verse.svelte` | `src/styles/surfaces/read/verse.css` | `docs/ui-references/read/verse-row/default.mobile.light.png` | `tests/unit/read/Verse.test.ts` | `tests/e2e/read/chrome.spec.js`, `tests/e2e/read/text-sources.spec.js` |
| `read` | Mushaf page | `src/read/mushaf/MushafPage.svelte` | `src/styles/surfaces/read/mushaf.css` | `docs/ui-references/read/mushaf-page/ready.mobile.light.png`, `docs/ui-references/read/mushaf-page/ready.tablet-portrait.light.png` | `tests/unit/read/mushaf/reader.test.ts` | `tests/e2e/read/chrome.spec.js` |
| `navigate` | Nav drawer shell/header | `src/navigate/NavDrawer.svelte` | `src/styles/surfaces/navigate/drawer-shell.css` | `docs/ui-references/navigate/nav-drawer-header/read.mobile.light.png` | `tests/unit/navigate/drawer.test.ts` | `tests/e2e/navigate/drawer.spec.js` |
| `configure` | SettingsShell | `src/configure/settings/SettingsShell.svelte` | `src/styles/surfaces/configure/settings-shell.css` | `docs/ui-references/configure/settings-shell/verse.mobile.light.png`, `docs/ui-references/configure/settings-shell/mushaf.mobile.light.png` | `tests/unit/configure/panel.test.ts` | `tests/e2e/configure/settings.spec.js` |
| `configure` | VerseSettings | `src/configure/settings/VerseSettings.svelte` | `src/styles/surfaces/configure/settings-shell.css` | `docs/ui-references/configure/settings-shell/verse.mobile.light.png` | `tests/unit/configure/panel.test.ts` | `tests/e2e/configure/settings.spec.js` |
| `configure` | MushafSettings | `src/configure/settings/MushafSettings.svelte` | `src/styles/surfaces/configure/settings-shell.css` | `docs/ui-references/configure/settings-shell/mushaf.mobile.light.png` | `tests/unit/configure/panel.test.ts` | `tests/e2e/configure/settings.spec.js` |
| `configure` | ThemeNightControls | `src/configure/settings/ThemeNightControls.svelte` | `src/styles/surfaces/configure/settings-shell.css` | `docs/ui-references/configure/theme-night-controls/default.mobile.light.png` | `tests/unit/configure/night-mode.test.ts` | `tests/e2e/configure/settings.spec.js` |
| `configure` | NestedAssetPicker | `src/configure/settings/NestedAssetPicker.svelte` | `src/styles/surfaces/configure/settings-shell.css` | Future multiple-profile work; not mounted in current MVP | `tests/unit/configure/panel.test.ts` | `tests/e2e/configure/settings.spec.js` |
| `configure` | AssetManagement | `src/configure/assets/AssetManagement.svelte` | `src/styles/surfaces/configure/asset-management.css` | `docs/ui-references/configure/asset-management/route.mobile.light.png`, `docs/ui-references/configure/asset-management/route.desktop.light.png` | `tests/unit/configure/panel.test.ts` | `tests/e2e/configure/settings.spec.js` |
| `onboard` | Launch splash / retired onboarding route | `src/onboard/Onboarding.svelte`, `src/launch/LaunchSplash.svelte` | `src/styles/surfaces/onboard/shell.css` | Not applicable: launch state is covered by e2e proof | Not applicable: e2e-only flow coverage | `tests/e2e/onboard/first-run.spec.js` |
| `infra` | QuotaBanner | `src/core/quota-banner.svelte` | `src/styles/surfaces/overlays/quota-banner.css` | Not applicable: overlay has no committed component reference yet | Not applicable: durable proof is browser-only today | `tests/e2e/infra/offline.spec.js` |
| `infra` | UpdateBanner | `src/core/UpdateBanner.svelte` | `src/styles/surfaces/overlays/update-banner.css` | Not applicable: overlay has no committed component reference yet | `tests/unit/infra/safety/sync.test.js` | `tests/e2e/infra/offline.spec.js` |
| `configure` | NightShift | `src/App.svelte` | `src/styles/surfaces/overlays/night-shift.css` | Not applicable: overlay has no committed component reference yet | `tests/unit/configure/night-mode.test.ts` | `tests/e2e/configure/settings.spec.js` |

## React Dual-Build Preview Ownership

React preview product components use React semantic tokens, Tailwind utilities,
and owned component classes from `src-react/design-system/**`; they do not use
Svelte CSS partials. The active visual reference for the current Wave 09-14
pass is the accepted current Svelte UI state named by the matching surface row
above.

For React production-parity fix plans, each UI implementation pass must name
exactly one active reference source per component, state, and viewport. Where
React intentionally excludes Svelte UI, such as future Tafsir UI or source
picker panes, the active reference must be an explicit
intentional non-carry-over note plus the nearest Svelte layout constraint, not
the excluded Svelte component state.

When a React parity fix changes component styling, expand the relevant React
ownership row or add a component-level row with the registry id, style API /
recipe / component variants, Storybook story, visual reference or accepted
Svelte state, unit/component tests, and browser proof. React style ownership is
through recipes, variants, owned component classes, tokens, and stories; Svelte
CSS partials are never React edit targets.

| Surface | React component | Source | Registry / story | Unit tests | Browser proof |
| --- | --- | --- | --- | --- | --- |
| `read` | ReaderChrome mobile margin header | `src-react/components/reader/ReaderChrome.tsx`, `src-react/components/reader/ReaderPageShell.tsx` | `src-react/design-system/registry/component-registry.json`, `src-react/design-system/index.css` | `tests/unit/react-read/reader-wave3.test.tsx` | `tests/e2e/navigate/react-golden.spec.ts` |
| `read` | Reader route, verse row, Mushaf page, Daily Wird card | `src-react/app/routes/read/**`, `src-react/components/reader/**` | `src-react/design-system/registry/component-registry.json`, `src-react/components/reader/reader.stories.tsx`, `src-react/components/navigation/wird/wird.stories.tsx` | `tests/unit/react-read/reader-wave3.test.tsx`, `tests/unit/react-packs/**`, `tests/unit/react-wird/wird-wave3.test.tsx` | `tests/e2e/read/react-golden.spec.ts`, `tests/e2e/react-shell/wave3.spec.ts`, `tests/e2e/react-visual/shell.spec.ts` |
| `read` | MushafPageViewer | `src-react/components/reader/MushafPageViewer.tsx`, `src-react/app/routes/read/MushafRoute.tsx`, `src-react/packs/mushaf-page-asset.ts` | `mushaf-page-viewer`, `src-react/components/reader/reader.stories.tsx` | `tests/unit/react-read/reader-wave3.test.tsx`, `tests/unit/react-packs/**` | `tests/e2e/read/react-golden.spec.ts` |
| `read` | ReaderVerseSurface | `src-react/components/reader/ReaderVerseSurface.tsx` | `reader-verse-surface`, `src-react/components/reader/reader.stories.tsx` | `tests/unit/react-read/reader-wave3.test.tsx` | `tests/e2e/read/react-golden.spec.ts` |
| `navigate` | Drawer, Surah/Juz/bookmark lists | `src-react/components/navigation/**`, `src-react/app/routes/navigation/**`, `src-react/continuity/bookmarks/**`, `src-react/data/juz-index.ts` | `nav-drawer`, `surah-list`, `juz-list`, `bookmarks-list`, `src-react/components/navigation/navigation.stories.tsx` | `tests/unit/react-navigate/navigation-wave3.test.tsx`, `tests/unit/react-continuity/continuity-wave3.test.ts` | `tests/e2e/navigate/react-golden.spec.ts`, `tests/e2e/react-shell/wave3.spec.ts` |
| `configure` | Settings, read-only asset management, launch splash | `src-react/components/settings/**`, `src-react/components/offline/**`, `src-react/components/launch/**`, `src-react/app/routes/settings/**`, `src-react/app/routes/onboarding/**` | `src-react/design-system/registry/component-registry.json`, `src-react/components/settings/settings.stories.tsx`, `src-react/components/offline/offline-assets.stories.tsx` | `tests/unit/react-navigate/navigation-wave3.test.tsx` | `tests/e2e/configure/react-golden.spec.ts`, `tests/e2e/onboard/react-golden.spec.ts`, `tests/e2e/infra/react-offline.spec.ts`, `tests/e2e/react-shell/wave3.spec.ts` |
| `search` | Search page, box, index gate, results | `src-react/search/**`, `src-react/components/search/**`, `src-react/app/routes/search/**` | `src-react/design-system/registry/component-registry.json`, `src-react/components/search/search.stories.tsx` | `tests/unit/react-search/search-wave3.test.ts` | `tests/e2e/read/react-golden.spec.ts`, `tests/e2e/react-shell/wave3.spec.ts` |
