# Style Map

React UI development is owned through `src/design-system/**`, approved primitives in `src/components/ui/**`, and surface components in `src/components/**`.

## Component Ownership

| Surface | Component | Source | Style Source | Proof Surface |
| --- | --- | --- | --- | --- |
| read | Reader route | `src/app/routes/read/ReaderRoute.tsx` | `src/design-system/index.css`, reader components | `tests/e2e/read/react-golden.spec.ts` |
| read | Verse reader surface | `src/components/reader/ReaderVerseSurface.tsx` | `src/design-system/index.css` | `tests/unit/react-read/**`, reader stories |
| read | Verse row | `src/components/reader/VerseBlock.tsx` | `src/design-system/index.css` | `tests/unit/react-read/**`, `tests/e2e/read/react-golden.spec.ts` |
| read | Mushaf route | `src/app/routes/read/MushafRoute.tsx` | `src/design-system/index.css` | `tests/e2e/read/react-golden.spec.ts` |
| read | Mushaf page viewer | `src/components/reader/MushafPageViewer.tsx` | `src/design-system/index.css` | `tests/unit/react-read/**`, visual specs |
| navigate | Nav drawer | `src/components/navigation/NavDrawer.tsx` | `src/design-system/index.css` | `tests/e2e/navigate/react-golden.spec.ts` |
| navigate | Surah/Juz/Hizb lists | `src/components/navigation/{SurahList,JuzList,HizbList}.tsx` | `src/design-system/index.css` | navigation stories and golden specs |
| navigate | Bookmarks list | `src/components/navigation/BookmarksList.tsx` | `src/design-system/index.css` | `tests/unit/react-navigate/**` |
| configure | Settings shell | `src/components/settings/SettingsShell.tsx` | `src/design-system/index.css` | `tests/e2e/configure/react-golden.spec.ts` |
| configure | Verse settings | `src/components/settings/VerseSettings.tsx` | `src/design-system/index.css` | settings stories and unit tests |
| configure | Mushaf settings | `src/components/settings/MushafSettings.tsx` | `src/design-system/index.css` | settings stories and unit tests |
| configure | About route | `src/app/routes/settings/AboutRoute.tsx` | `src/design-system/index.css` | configure golden specs |
| onboard | Launch/onboarding | `src/components/launch/LaunchSplash.tsx`, `src/app/routes/onboarding/OnboardingRoute.tsx` | `src/design-system/index.css` | onboarding golden specs |
| infra | Offline/update affordances | `src/offline/**`, app shell states | `src/design-system/index.css` | `tests/e2e/infra/react-offline.spec.ts` |
| search | Search route and Phase 1 lexical Search components | `src/app/routes/search/**`, `src/components/search/**`, `src/search/**`, `src/search-worker/**`, `src/offline/search/**` | `src/design-system/index.css` | `src/components/search/search.stories.tsx`, `tests/unit/react-search/**`, and `tests/e2e/search/*.spec.ts` |

## Design-System Rules

- Direct Radix imports are allowed only under `src/components/ui/**`.
- Feature code imports owned UI primitives from `src/components/ui`.
- `src/design-system/registry/component-registry.json` must reference real exports, stories, and tests for registered components.
- `qar:` Tailwind utilities are allowed when they map to semantic tokens.
- Hardcoded colors, radii, shadows, and motion are rejected unless the design check has an explicit local allowance.
- Retired legacy class selectors are forbidden in React source.
- UI work that changes visual behavior must update the owning dossier and registry/docs when ownership changes.

## Reference Workflow

`DESIGN.md` is the product style guide. For creative or directional visual work, create a committed component reference image and adjacent intent note under `docs/ui-references/<surface>/<component>/`. For narrow polish that preserves the accepted direction, name the existing rendered state used as the active reference.

Visual completion requires browser proof for relevant mobile, tablet, and desktop states. Playwright screenshots are regression evidence; committed `docs/ui-references/**` files are the visual-intent source of truth.
