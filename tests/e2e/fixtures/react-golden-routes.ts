export type GoldenTheme = 'light' | 'sepia' | 'dark'
export type NightMode = 'off' | 'on' | 'auto'
export type GoldenViewportId =
  | 'phone-small'
  | 'phone-standard'
  | 'tablet-portrait'
  | 'phone-landscape'
  | 'desktop'
  | 'desktop-wide'

export type GoldenFixture = {
  id: string
  route: string
  seed: string
  viewports: GoldenViewportId[]
  themes: GoldenTheme[]
  nightModes?: NightMode[]
  proofOwners: string[]
  assertions: string[]
  acceptedDifference: 'none' | string
}

export const GOLDEN_VIEWPORTS: Record<GoldenViewportId, { width: number; height: number }> = {
  'phone-small': { width: 320, height: 568 },
  'phone-standard': { width: 375, height: 812 },
  'tablet-portrait': { width: 768, height: 1024 },
  'phone-landscape': { width: 812, height: 375 },
  desktop: { width: 1280, height: 900 },
  'desktop-wide': { width: 1440, height: 960 },
}

export const GOLDEN_FIXTURES: GoldenFixture[] = [
  {
    id: 'launch-fresh-onboarding',
    route: '#/onboarding',
    seed: 'fresh-browser',
    viewports: ['phone-small', 'phone-standard'],
    themes: ['light'],
    proofOwners: ['tests/e2e/onboard/react-golden.spec.ts'],
    assertions: ['first-run route mounts', 'no horizontal overflow', 'axe clean'],
    acceptedDifference: 'none',
  },
  {
    id: 'launch-restore-reader',
    route: '',
    seed: 'onboarded-last-surface-reader',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/navigate/react-golden.spec.ts'],
    assertions: ['empty hash resolves to launchable reader route', 'settings route is excluded from restore'],
    acceptedDifference: 'none',
  },
  {
    id: 'reader-surah-start',
    route: '#/s/1',
    seed: 'onboarded-qaloon-baseline',
    viewports: ['phone-small', 'phone-standard', 'tablet-portrait', 'desktop'],
    themes: ['light', 'sepia', 'dark'],
    nightModes: ['off', 'on', 'auto'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts', 'docs/ui-references/read/verse-row/default.mobile.light.png'],
    assertions: ['verse rows render Qalun baseline', 'translation lane follows active settings', 'reader chrome does not overlap text'],
    acceptedDifference: 'none',
  },
  {
    id: 'reader-ayah-deeplink',
    route: '#/s/2/255',
    seed: 'onboarded-translation-visible',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts'],
    assertions: ['ayah target is visible', 'focusable controls keep names', 'saved current position remains valid'],
    acceptedDifference: 'none',
  },
  {
    id: 'mushaf-ready',
    route: '#/m/1',
    seed: 'onboarded-qaloon-page-pack-verified',
    viewports: ['phone-standard', 'tablet-portrait', 'desktop'],
    themes: ['light', 'sepia', 'dark'],
    nightModes: ['off', 'on', 'auto'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts', 'docs/ui-references/read/mushaf-page/ready.mobile.light.png'],
    assertions: ['Mushaf page renders unframed', 'page chip and view mode controls work', 'jump input restores focus'],
    acceptedDifference: 'none',
  },
  {
    id: 'surah-directory',
    route: '#/surahs',
    seed: 'onboarded-qaloon-baseline',
    viewports: ['phone-standard', 'tablet-portrait', 'desktop'],
    themes: ['light', 'sepia', 'dark'],
    proofOwners: ['tests/e2e/navigate/react-golden.spec.ts'],
    assertions: ['Surah rows render', 'keyboard can open a Surah row', 'current reader route updates after selection'],
    acceptedDifference: 'none',
  },
  {
    id: 'bookmarks-populated',
    route: '#/bookmarks',
    seed: 'onboarded-bookmarks-populated',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/navigate/react-golden.spec.ts'],
    assertions: ['riwayah-scoped bookmarks state renders', 'empty and populated labels are accessible'],
    acceptedDifference: 'none',
  },
  {
    id: 'settings-over-reader',
    route: '#/settings',
    seed: 'onboarded-last-surface-reader',
    viewports: ['phone-standard', 'tablet-portrait', 'desktop'],
    themes: ['light', 'sepia', 'dark'],
    nightModes: ['off', 'on', 'auto'],
    proofOwners: ['tests/e2e/configure/react-golden.spec.ts', 'docs/ui-references/configure/settings-shell/verse.mobile.light.png'],
    assertions: ['settings route renders', 'source controls are keyboard reachable', 'no horizontal overflow'],
    acceptedDifference: 'none',
  },
  {
    id: 'assets-state-matrix',
    route: '#/assets',
    seed: 'asset-pack-not-installed-installed-installing-failed',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/configure/react-golden.spec.ts'],
    assertions: ['installed, missing, and installing rows render', 'status/progress labels are named', 'touch targets meet minimum size'],
    acceptedDifference: 'none',
  },
  {
    id: 'about-page',
    route: '#/about',
    seed: 'onboarded-qaloon-baseline',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'sepia', 'dark'],
    proofOwners: ['tests/e2e/configure/react-golden.spec.ts'],
    assertions: ['About content renders without removed-scope product claims', 'no horizontal overflow'],
    acceptedDifference: 'none',
  },
  {
    id: 'search-results',
    route: '#/search?q=mercy',
    seed: 'onboarded-search-index-verified',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts'],
    assertions: ['query route mounts search', 'keyboard moves through search input', 'offline-ready index state is explicit'],
    acceptedDifference: 'none',
  },
  {
    id: 'search-index-unavailable',
    route: '#/search',
    seed: 'onboarded-search-index-unavailable',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts'],
    assertions: ['index state is explicit', 'no silent fallback claim is shown'],
    acceptedDifference: 'none',
  },
  {
    id: 'daily-wird-no-plan',
    route: '#/s/1',
    seed: 'onboarded-wird-no-plan',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts', 'tests/e2e/navigate/react-golden.spec.ts'],
    assertions: ['no-plan prompt is reader-adjacent', 'keyboard can start a plan flow', 'status copy does not claim progress before setup'],
    acceptedDifference: 'none',
  },
  {
    id: 'daily-wird-active',
    route: '#/s/1',
    seed: 'onboarded-wird-plan-active',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts'],
    assertions: ['reader route exposes Daily Wird state', 'drawer entry reflects active plan', 'progress status is announced'],
    acceptedDifference: 'none',
  },
  {
    id: 'offline-shell-installed-assets',
    route: '#/s/1',
    seed: 'onboarded-offline-installed-assets',
    viewports: ['desktop'],
    themes: ['light'],
    proofOwners: ['tests/e2e/infra/react-offline.spec.ts'],
    assertions: ['React app shell loads offline from preview build', 'installed text route renders', 'uninstalled optional packs show unavailable-offline state'],
    acceptedDifference: 'none',
  },
]
