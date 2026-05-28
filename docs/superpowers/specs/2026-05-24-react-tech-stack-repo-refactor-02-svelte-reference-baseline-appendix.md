# React Tech Stack Refactor 02 - Svelte Reference Baseline Appendix

> Superseded current-state note: `docs/superpowers/specs/2026-05-28-mvp-default-assets-reset-design.md` replaces the old onboarding/source-choice baseline with the MVP default reader asset profile: Qaloon text/font, Qaloon Mushaf, and Bridges translation. Older baseline rows for tafsir-open, optional-pack install states, or first-run source setup are historical context only.

## Status

This appendix freezes the current Svelte app as the React parity reference. It
does not change shipped behavior. React may differ only when a row explicitly
marks the difference as accepted v1 product-promise parity.

## Dataset Profile

- Default local proof profile: `pnpm run build`, which chains `pnpm run data -- build`.
- Baseline riwayah product name: Qalun.
- Runtime riwayah id/path: `qaloon`.
- Translation profile: existing committed baseline dataset, including Bridges where available.
- Mushaf pages: use locally available committed/generated Qalun (`qaloon`) page assets; missing optional packs are represented as unavailable/install states.

## Reference Source Rules

- Committed docs/ui-references images and notes are component visual-intent references where present.
- Playwright owns app-level route, layout, keyboard, reload, offline, and accessibility proof.
- Transient files under `test-output/**` are review artifacts only.
- Provider snapshots, when later selected, are regression evidence only and do not replace this baseline.

## Route-State Fixture Matrix

| Fixture id | Route | Seed state | Viewports | Themes / modes | Proof owner | Accepted difference |
| --- | --- | --- | --- | --- | --- | --- |
| `launch-fresh-onboarding` | empty hash | fresh browser before onboarding | 375x812, 320x568 | light, reduced motion | `tests/e2e/onboard/first-run.spec.js` | none |
| `launch-restore-reader` | empty hash | onboarded, `settings.lastSurface` launchable reader route | 375x812, 1280x900 | light, dark | `tests/e2e/onboard/session-restore.spec.js`; `tests/e2e/read/chrome.spec.js` | none |
| `reader-surah-start` | `#/s/1` | onboarded Qalun (`qaloon`) baseline reader | 375x812, 768x1024, 1280x900 | light, sepia, dark | `tests/e2e/read/chrome.spec.js`; `docs/ui-references/read/verse-row/default.mobile.light.png` | none |
| `reader-ayah-deeplink` | `#/s/2/255` | onboarded, verse reader with translation visible | 375x812, 1280x900 | light, night off/on | `tests/e2e/read/chrome.spec.js`; `tests/e2e/read/text-sources.spec.js` | none |
| `reader-tafsir-open` | `#/s/1` | onboarded, tafsir preview or sheet open | 375x812, 768x1024 | light, dark | `docs/ui-references/read/verse-row/tafsir-open.mobile.light.png`; `tests/e2e/read/chrome.spec.js` | none |
| `mushaf-ready` | `#/m/1` | onboarded, Qalun page assets usable | 375x812, 768x1024, 1280x900 | light, sepia, dark | `docs/ui-references/read/mushaf-page/ready.mobile.light.png`; `docs/ui-references/read/mushaf-page/ready.tablet-portrait.light.png`; `tests/e2e/read/chrome.spec.js` | none |
| `mushaf-missing-pack` | `#/m/1` | optional pack selected or requested but unavailable | 375x812, 1280x900 | light, dark | `tests/e2e/read/chrome.spec.js`; Manual baseline note: Mushaf missing-pack state uses active optional-riwayah unavailable prompt until a narrower helper owns the state | none |
| `surah-directory` | `#/surahs` | onboarded baseline | 375x812, 1280x900 | light, sepia | `tests/e2e/navigate/surahs.spec.js`; `tests/e2e/navigate/drawer.spec.js` | none |
| `bookmarks-empty` | `#/bookmarks` | onboarded, empty bookmarks store | 375x812, 1280x900 | light, dark | `tests/e2e/navigate/drawer.spec.js` | none |
| `bookmarks-populated` | `#/bookmarks` | onboarded, riwayah-scoped bookmark rows seeded with `seedBookmarks` | 375x812, 1280x900 | light, dark | `tests/e2e/navigate/drawer.spec.js`; `tests/e2e/fixtures/idb.js` | none |
| `settings-over-reader` | `#/settings` | last launchable surface is verse reader | 375x812, 768x1024, 1280x900 | light, sepia, dark, night auto | `docs/ui-references/configure/settings-shell/verse.mobile.light.png`; `tests/e2e/configure/settings.spec.js`; `tests/e2e/configure/night-mode.spec.js` | none |
| `assets-not-installed` | `#/assets` | onboarded, optional packs not installed | 375x812, 1280x900 | light, dark | `docs/ui-references/configure/asset-management/route.mobile.light.png`; `docs/ui-references/configure/asset-management/route.desktop.light.png`; `tests/e2e/configure/settings.spec.js` | none |
| `assets-install-failed` | `#/assets` | onboarded, failed optional pack row | 375x812, 1280x900 | light, dark | Manual baseline note: Asset failed row state is represented by Asset Management row error/status behavior until a durable failed-download helper exists | none |
| `about-current` | `#/about` | onboarded baseline | 375x812, 1280x900 | light, dark | `tests/e2e/configure/about.spec.js` | none |
| `offline-shell` | current route under preview | app shell available offline | 1280x900 | light | `tests/e2e/infra/offline.spec.js`; `tests/e2e/infra/service-worker.spec.js` | none |
| `quota-banner` | current route | storage warning/quota banner state | 375x812, 1280x900 | light, dark | `tests/e2e/infra/offline.spec.js` | none |
| `daily-wird-default` | current Daily Wird drawer entry point | no plan/default state | 375x812, 1280x900 | light, dark | `tests/unit/read/wird/DailyWirdCard.test.ts`; Manual baseline note: Daily Wird default route entry is drawer-owned until a standalone browser route exists | none |
| `daily-wird-active` | current Daily Wird drawer entry point | active plan/in-progress state | 375x812, 1280x900 | light, dark | `tests/unit/read/wird/WirdDetail.test.ts`; `tests/unit/read/wird/progress.test.ts`; Manual baseline note: Daily Wird active route entry is drawer-owned until a standalone browser route exists | none |

## Seeded Storage Policy

- Use Playwright `storageState: 'tests/e2e/.auth/onboarded.json'` for ordinary onboarded baseline routes.
- Opt out with empty storage only for onboarding, first-run, service-worker, cross-tab, or empty-browser bootstrap proof.
- Prefer existing fixture helpers under tests/e2e/fixtures for IndexedDB setup.
- Add narrow helpers only for missing state families such as populated bookmarks, optional pack stale/unavailable rows, Daily Wird state, or quota warning state.
- Do not inline broad IndexedDB teardown inside specs. Add or reuse a single-store helper instead.

## Viewport And Theme Coverage

- Required viewports: `320x568`, `375x812`, `768x1024`, `1280x900`, plus mobile landscape for reader chrome/sheet overlap.
- Required themes: light, sepia, dark.
- Night recitation mode states: off, on, auto over reader, settings shell, drawer, and Mushaf proof.
- Reduced motion: cover motion-sensitive flows and story/e2e proofs where animation can affect layout.

## Accepted Product Differences

Initial accepted differences: none.

Any later accepted difference must include:

| Difference | Fixture ids | Reason | Approver / source | Date recorded |
| --- | --- | --- | --- | --- |

## Reference Update Policy

- Svelte reference changes during the React rebuild must land in the same change as the behavior/UI update.
- A changed route-state fixture must update this appendix and its proof owner path.
- A changed committed UI reference must update the adjacent intent note under docs/ui-references.
- React parity work must not accept a mismatch by editing this appendix unless the change is an explicit v1 product-promise difference.
- Generated or transient screenshots under `test-output/**` are never committed as the only source of truth.
