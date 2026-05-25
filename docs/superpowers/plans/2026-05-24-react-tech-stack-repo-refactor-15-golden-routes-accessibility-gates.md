# React Tech Stack Refactor 15 - Golden Routes And Accessibility Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete React app-level parity proof through golden routes, accessibility, keyboard/focus, responsive, offline/service-worker, visual regression, and Svelte-reference difference resolution.

**Architecture:** Extend the React-specific Playwright and visual-regression proof layer created by Waves 01, 02, 05, and 08A, while keeping Svelte as the shipped reference and leaving production deploy routing untouched. Golden proof is expressed as named route-state fixtures that reuse Wave 02 Svelte baseline rows, Wave 09-14 React surfaces, and Wave 05 visual-regression policy.

**Tech Stack:** React, TypeScript, Playwright, @axe-core/playwright, selected Wave 05 visual-regression provider, Vite preview React build, Workbox/service-worker proof, pnpm scripts, Markdown docs.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- `DESIGN.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/context/style-map.md`
- `docs/context/feature-map.md`
- `docs/context/implemented.md`
- `docs/context/roadmap.md`
- `docs/context/open-issues.md`
- `docs/product-info.md`
- `docs/tech-stack.md`
- `docs/ui-references/README.md`
- `tests/e2e/AGENTS.md`
- `package.json`
- `playwright.react.config.js`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-15-golden-routes-accessibility-gates-spec.md`
- Wave plans `02`, `05`, `08A`, and `09` through `14`

## Dependency Gates

Do not begin implementation until these prior waves are merged and verified:

- Wave `02` Svelte reference baseline appendix exists and names route-state fixtures.
- Wave `05` visual-regression provider decision is complete and no temporary local-only exception remains for cutover readiness.
- Wave `08A` proves React app-shell artifact contains no Mushaf page SVG bodies and no legacy page paths.
- Waves `09`, `10`, `11`, `12`, `13`, and `14` implement React reader, navigation/settings/onboarding, search, curated metadata, continuity/bookmarks, and Daily Wird parity.

## File Structure

Create:

- `tests/e2e/fixtures/react-golden-routes.ts` - named React route-state fixtures, seed-state definitions, viewport/theme matrix, and accepted-difference metadata.
- `tests/e2e/fixtures/react-a11y.ts` - React axe scan helpers, touch-target checks, focus-order assertions, and status/live-region helpers.
- `tests/e2e/fixtures/react-offline.ts` - React preview/service-worker/offline helpers that do not target Svelte projects.
- `tests/e2e/read/react-golden.spec.ts` - reader, Mushaf, Daily Wird, search, and route-level golden proof that belongs to read-facing app routes.
- `tests/e2e/configure/react-golden.spec.ts` - settings, assets, source-picker, storage, and about golden proof.
- `tests/e2e/navigate/react-golden.spec.ts` - drawer, Surah/Juz, bookmarks, shortcut, and launch-restore navigation proof.
- `tests/e2e/onboard/react-golden.spec.ts` - onboarding first-run and inner-screen proof.
- `tests/e2e/infra/react-offline.spec.ts` - React service-worker, offline, update, and app-shell proof.
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-15-golden-routes-accessibility-gates-appendix.md` - durable parity difference log and gate evidence index.

Modify:

- `package.json` - add or tighten React proof scripts only if Wave 15 needs new stable command names.
- `playwright.react.config.js` - add React golden/a11y/offline projects or project metadata.
- Wave 05 visual-regression config files - only according to the selected provider policy.
- `docs/tech-stack.md` - document changed scripts, Playwright projects, visual command names, and CI gate placement.
- `docs/context/style-map.md`, surface dossiers, `docs/product-info.md`, `docs/context/implemented.md`, and repo-local skills only when proof ownership or current behavior changes.

Do not modify:

- Production entry, production deploy artifact routing, or `.github/workflows/deploy.yml`.
- Svelte source, Svelte package dependencies, or Svelte-reference baseline files except to append accepted differences through the Wave 02/15 policy.
- `public/dataset/**`, `data/**`, source catalogs, or generated dataset files.
- Committed `docs/ui-references/**` images unless a visual direction reference legitimately changes; provider screenshots do not replace these references.

## Task 1: Preflight And Proof Inventory

**Files:**
- Read: files listed in Required Context
- Read: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-appendix.md`
- Read: Wave 05 visual-regression decision artifact created by plan `05`

- [ ] **Step 1: Confirm branch state and ownership**

Run:

```bash
git status --short --branch
```

Expected: note dirty files and untracked work from other agents. Do not revert or overwrite unrelated files.

- [ ] **Step 2: Confirm dependency plan artifacts exist**

Run:

```bash
test -f docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-appendix.md
test -f playwright.react.config.js
test -f docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-selection.md
```

Expected: all commands exit `0`. If a file is absent, stop and finish the missing dependency wave first.

- [ ] **Step 3: Confirm React proof commands are present**

Run:

```bash
node -e "const p=require('./package.json'); for (const s of ['build:react','preview:react','test:e2e:react','validate:react']) { if (!p.scripts?.[s]) { console.error('missing script '+s); process.exit(1); } }"
```

Expected: exits `0`. If `validate:react` does not exist yet, add it in the task that wires the gate and update `docs/tech-stack.md` in the same commit.

- [ ] **Step 4: Recheck Playwright docs only if API details are uncertain**

Run outside Codex's default sandbox only if implementation changes installed Playwright major version or fixture APIs are unclear:

```bash
npx ctx7@latest library Playwright "How should Playwright test React app routes, screenshots, accessibility scans, storage state, service workers, offline mode, keyboard focus journeys, and multiple viewports for a Vite PWA?"
npx ctx7@latest docs /websites/playwright_dev "How should Playwright test React app routes, screenshots, accessibility scans, storage state, service workers, offline mode, keyboard focus journeys, and multiple viewports for a Vite PWA?"
```

Expected: record any API-affecting facts in the Wave 15 appendix. If Context7 quota-blocks, stop Playwright API changes and ask the user to run `npx ctx7@latest login` or provide `CONTEXT7_API_KEY`.

## Task 2: Golden Route Fixture Matrix

**Files:**
- Create: `tests/e2e/fixtures/react-golden-routes.ts`
- Modify: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-15-golden-routes-accessibility-gates-appendix.md`

- [ ] **Step 1: Write fixture module**

Create `tests/e2e/fixtures/react-golden-routes.ts` with this structure:

```ts
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
    route: '',
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
    assertions: ['empty hash restores last launchable reader route', 'settings route is excluded from restore'],
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
    assertions: ['Mushaf page renders unframed', 'page chip and Auto/Fit page/Fit width controls work', 'jump input restores focus', 'edge swipe is suppressed while jump input is active'],
    acceptedDifference: 'none',
  },
  {
    id: 'surah-directory',
    route: '#/surahs',
    seed: 'onboarded-qaloon-baseline',
    viewports: ['phone-standard', 'tablet-portrait', 'desktop'],
    themes: ['light', 'sepia', 'dark'],
    proofOwners: ['tests/e2e/navigate/react-golden.spec.ts'],
    assertions: ['Surah rows render with QuranAtlas source labels', 'keyboard can open a Surah row', 'current reader route updates after selection'],
    acceptedDifference: 'none',
  },
  {
    id: 'bookmarks-populated',
    route: '#/bookmarks',
    seed: 'onboarded-bookmarks-populated',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/navigate/react-golden.spec.ts'],
    assertions: ['riwayah-scoped bookmarks render', 'bookmark activation routes to the saved ayah', 'empty and populated labels are accessible'],
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
    assertions: ['sheet/dialog traps focus', 'close restores focus to opener', 'nested source picker is keyboard reachable'],
    acceptedDifference: 'none',
  },
  {
    id: 'assets-state-matrix',
    route: '#/assets',
    seed: 'asset-pack-not-installed-installed-stale-installing-failed',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/configure/react-golden.spec.ts'],
    assertions: ['not installed, installing, verified, stale, unavailable, and failed rows render', 'status/live regions announce progress', 'touch targets meet minimum size'],
    acceptedDifference: 'none',
  },
  {
    id: 'about-page',
    route: '#/about',
    seed: 'onboarded-qaloon-baseline',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'sepia', 'dark'],
    proofOwners: ['tests/e2e/configure/react-golden.spec.ts'],
    assertions: ['About content renders without removed-scope product claims', 'clear-data entry remains reachable and named', 'no horizontal overflow'],
    acceptedDifference: 'none',
  },
  {
    id: 'search-results',
    route: '#/search?q=mercy',
    seed: 'onboarded-search-index-verified',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts'],
    assertions: ['results include Arabic text and metadata source labels', 'keyboard moves through result list', 'offline-ready index state is explicit'],
    acceptedDifference: 'none',
  },
  {
    id: 'search-index-unavailable',
    route: '#/search?q=mercy',
    seed: 'onboarded-search-index-unavailable',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts'],
    assertions: ['unavailable/index-missing state is explicit', 'no silent fallback claim is shown'],
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
    assertions: ['reader progress updates Daily Wird state', 'drawer entry reflects active plan', 'progress status is announced'],
    acceptedDifference: 'none',
  },
  {
    id: 'offline-shell-installed-assets',
    route: '#/s/1',
    seed: 'onboarded-offline-installed-assets',
    viewports: ['desktop'],
    themes: ['light'],
    proofOwners: ['tests/e2e/infra/react-offline.spec.ts'],
    assertions: ['React app shell loads offline from preview build', 'installed text and page assets render', 'uninstalled optional packs show unavailable-offline state'],
    acceptedDifference: 'none',
  },
]
```

Expected: fixtures are named and include route, seed, viewport/theme coverage, proof owners, assertions, and accepted-difference status.

- [ ] **Step 2: Validate proof owner paths**

Run:

```bash
node -e "const { readFileSync, existsSync } = require('fs'); const text=readFileSync('tests/e2e/fixtures/react-golden-routes.ts','utf8'); for (const m of text.matchAll(/'((?:tests|docs)\/[^']+)'/g)) { if (!existsSync(m[1])) console.log(m[1]); }"
```

Expected: prints only files created later in this plan, or existing paths that are absent because the dependency wave has not landed. By the end of Task 7, it prints no output.

- [ ] **Step 3: Create Wave 15 appendix**

Create `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-15-golden-routes-accessibility-gates-appendix.md`:

```markdown
# React Tech Stack Refactor 15 - Golden Routes And Accessibility Gates Appendix

## Status

React remains non-production during this gate. This appendix records app-level proof evidence and accepted Svelte-reference differences for cutover readiness.

## Fixture Source

- React fixture module: `tests/e2e/fixtures/react-golden-routes.ts`
- Svelte reference appendix: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-appendix.md`
- Visual-regression policy: Wave `05` selected strategy

## Accepted Svelte-Reference Differences

Initial accepted differences: none.

| Fixture id | Difference | Product reason | Proof link or command | Approval source |
| --- | --- | --- | --- | --- |

## Gate Evidence Index

| Gate | Command | Expected outcome |
| --- | --- | --- |
| React validation | `pnpm run validate:react` | static, registry/token, unit/component, Storybook, build, e2e, visual, and docs checks pass |
| Golden routes | `pnpm run test:e2e:react -- --grep @golden` | all golden fixtures pass against React preview/dev target |
| Accessibility | `pnpm run test:e2e:react -- --grep @a11y` | axe, keyboard, focus, live-region, and touch-target assertions pass |
| Offline/SW | `PLAYWRIGHT_INCLUDE_OFFLINE=1 PLAYWRIGHT_USE_PREVIEW=1 pnpm run test:e2e:react -- --grep @offline` | React preview build serves app shell and installed assets offline |
| Visual regression | `pnpm run visual:react` | selected provider passes according to Wave `05` policy |
```

Expected: appendix exists and does not claim production readiness.

## Task 3: Accessibility And Keyboard Helpers

**Files:**
- Create: `tests/e2e/fixtures/react-a11y.ts`

- [ ] **Step 1: Add a11y helper module**

Create `tests/e2e/fixtures/react-a11y.ts`:

```ts
import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

export async function expectAxeClean(page: Page, includeSelector = '#react-root') {
  const results = await new AxeBuilder({ page }).include(includeSelector).analyze()
  expect(results.violations).toEqual([])
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
}

export async function expectMinTouchTarget(locator: Locator, minSize = 44) {
  const box = await locator.boundingBox()
  expect(box, 'touch target has a bounding box').not.toBeNull()
  expect(box!.width).toBeGreaterThanOrEqual(minSize)
  expect(box!.height).toBeGreaterThanOrEqual(minSize)
}

export async function expectFocusRestored(page: Page, opener: Locator, action: () => Promise<void>) {
  await opener.focus()
  await action()
  await expect(opener).toBeFocused()
}

export async function expectTabSequence(page: Page, names: string[]) {
  for (const name of names) {
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name }).or(page.getByRole('link', { name })).or(page.getByRole('textbox', { name }))).toBeFocused()
  }
}

export async function expectStatusText(page: Page, pattern: RegExp) {
  await expect(page.getByRole('status').filter({ hasText: pattern }).first()).toBeVisible()
}
```

Expected: helpers use assertions, not fixed sleeps.

- [ ] **Step 2: Add unit or lint coverage for helper exports if the React test harness requires it**

Run:

```bash
pnpm run check:react
```

Expected: helper module typechecks. If `check:react` does not include `tests/e2e/**`, update the React lint/typecheck script and `docs/tech-stack.md` in the same task.

## Task 4: Golden Route Specs

**Files:**
- Create: `tests/e2e/read/react-golden.spec.ts`
- Create: `tests/e2e/configure/react-golden.spec.ts`
- Create: `tests/e2e/navigate/react-golden.spec.ts`
- Create: `tests/e2e/onboard/react-golden.spec.ts`

- [ ] **Step 1: Add read golden spec**

Create `tests/e2e/read/react-golden.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { expectAxeClean, expectMinTouchTarget, expectNoHorizontalOverflow } from '../fixtures/react-a11y'
import { GOLDEN_FIXTURES, GOLDEN_VIEWPORTS } from '../fixtures/react-golden-routes'

const readFixtures = GOLDEN_FIXTURES.filter((fixture) =>
  [
    'reader-surah-start',
    'reader-ayah-deeplink',
    'mushaf-ready',
    'search-results',
    'search-index-unavailable',
    'daily-wird-no-plan',
    'daily-wird-active',
  ].includes(fixture.id),
)

for (const fixture of readFixtures) {
  for (const viewportId of fixture.viewports) {
    test(`@golden @a11y ${fixture.id} ${viewportId}`, async ({ page }) => {
      await page.setViewportSize(GOLDEN_VIEWPORTS[viewportId])
      await page.goto(fixture.route || '/')
      await expect(page.locator('#react-root')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await expectAxeClean(page)
      await expect(page.locator('[data-golden-fixture]').or(page.locator('main'))).toBeVisible()

      if (fixture.id === 'mushaf-ready') {
        await expect(page.getByRole('button', { name: /fit page/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /fit width/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /auto/i })).toBeVisible()
      }

      const firstControl = page.getByRole('button').first()
      if (await firstControl.count()) {
        await expectMinTouchTarget(firstControl)
      }
    })
  }
}
```

Expected: tests fail until React routes expose the expected controls and fixture seed setup is connected. Failure should mention missing React route/control, not Playwright configuration.

- [ ] **Step 2: Add configure golden spec**

Create `tests/e2e/configure/react-golden.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { expectAxeClean, expectNoHorizontalOverflow, expectStatusText } from '../fixtures/react-a11y'
import { GOLDEN_FIXTURES, GOLDEN_VIEWPORTS } from '../fixtures/react-golden-routes'

const configureFixtures = GOLDEN_FIXTURES.filter((fixture) =>
  ['settings-over-reader', 'assets-state-matrix', 'about-page'].includes(fixture.id),
)

for (const fixture of configureFixtures) {
  for (const viewportId of fixture.viewports) {
    test(`@golden @a11y ${fixture.id} ${viewportId}`, async ({ page }) => {
      await page.setViewportSize(GOLDEN_VIEWPORTS[viewportId])
      await page.goto(fixture.route || '/')
      await expect(page.locator('#react-root')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await expectAxeClean(page)

      if (fixture.id === 'settings-over-reader') {
        await expect(page.getByRole('dialog').or(page.getByRole('complementary'))).toBeVisible()
      }

      if (fixture.id === 'assets-state-matrix') {
        await expectStatusText(page, /install|verified|failed|unavailable|storage/i)
      }
    })
  }
}
```

Expected: settings/assets proof runs against React only.

- [ ] **Step 3: Add navigate golden spec**

Create `tests/e2e/navigate/react-golden.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { expectAxeClean, expectNoHorizontalOverflow } from '../fixtures/react-a11y'
import { GOLDEN_FIXTURES, GOLDEN_VIEWPORTS } from '../fixtures/react-golden-routes'

const navigateFixtures = GOLDEN_FIXTURES.filter((fixture) =>
  ['launch-restore-reader', 'surah-directory', 'bookmarks-populated', 'daily-wird-no-plan'].includes(fixture.id),
)

for (const fixture of navigateFixtures) {
  for (const viewportId of fixture.viewports) {
    test(`@golden @a11y ${fixture.id} ${viewportId}`, async ({ page }) => {
      await page.setViewportSize(GOLDEN_VIEWPORTS[viewportId])
      await page.goto('/')
      await expect(page.locator('#react-root')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await expectAxeClean(page)

      if (fixture.id === 'launch-restore-reader') {
        await expect(page).toHaveURL(/#\/s\/|#\/m\//)
      }

      if (fixture.id === 'surah-directory') {
        await expect(page.getByRole('main').or(page.getByRole('navigation'))).toBeVisible()
      }

      if (fixture.id === 'bookmarks-populated') {
        await expect(page.getByRole('main')).toBeVisible()
      }
    })
  }
}
```

Expected: restore assertions validate React route behavior without accepting `#/settings` or `#/assets` as launch restore.

- [ ] **Step 4: Add onboarding golden spec**

Create `tests/e2e/onboard/react-golden.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { expectAxeClean, expectNoHorizontalOverflow } from '../fixtures/react-a11y'
import { GOLDEN_FIXTURES, GOLDEN_VIEWPORTS } from '../fixtures/react-golden-routes'

const onboardFixtures = GOLDEN_FIXTURES.filter((fixture) => fixture.id === 'launch-fresh-onboarding')

for (const fixture of onboardFixtures) {
  for (const viewportId of fixture.viewports) {
    test(`@golden @a11y ${fixture.id} ${viewportId}`, async ({ page }) => {
      await page.setViewportSize(GOLDEN_VIEWPORTS[viewportId])
      await page.goto('/')
      await expect(page.locator('#react-root')).toBeVisible()
      await expect(page).toHaveURL(/#\/onboarding|\/$/)
      await expectNoHorizontalOverflow(page)
      await expectAxeClean(page)
    })
  }
}
```

Expected: first-run route proof remains isolated from onboarded storage state.

## Task 5: Offline And Service-Worker Proof

**Files:**
- Create: `tests/e2e/fixtures/react-offline.ts`
- Create: `tests/e2e/infra/react-offline.spec.ts`
- Modify: `playwright.react.config.js`

- [ ] **Step 1: Add React offline helper**

Create `tests/e2e/fixtures/react-offline.ts`:

```ts
import { expect, type Page } from '@playwright/test'

export async function expectReactServiceWorkerReady(page: Page) {
  const ready = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false
    const registration = await navigator.serviceWorker.ready
    return Boolean(registration.active)
  })
  expect(ready).toBe(true)
}

export async function expectOfflineReaderLoads(page: Page) {
  await page.context().setOffline(true)
  try {
    await page.reload()
    await expect(page.locator('#react-root')).toBeVisible()
    await expect(page.locator('main')).toBeVisible()
  } finally {
    await page.context().setOffline(false)
  }
}
```

Expected: helper uses Playwright offline mode and does not target current Svelte preview config.

- [ ] **Step 2: Add React offline spec**

Create `tests/e2e/infra/react-offline.spec.ts`:

```ts
import { test } from '@playwright/test'
import { expectOfflineReaderLoads, expectReactServiceWorkerReady } from '../fixtures/react-offline'

test('@offline React app shell and installed reader assets survive offline reload', async ({ page }) => {
  await page.goto('#/s/1')
  await expectReactServiceWorkerReady(page)
  await expectOfflineReaderLoads(page)
})
```

Expected: fails if React preview is not serving a production build with React service-worker registration.

- [ ] **Step 3: Wire React offline project**

Modify `playwright.react.config.js` to include a React preview/offline project. Use the repo's existing preview environment naming, adapted to React:

```js
{
  name: 'React Offline (Preview)',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4175',
  },
  grep: /@offline/,
}
```

Expected: React offline project uses `preview:react`/`dist-react/`, not Svelte `dist/`.

## Task 6: Visual Regression Gate

**Files:**
- Modify: Wave 05 selected visual-regression config
- Modify: `package.json`
- Modify: `docs/tech-stack.md`
- Modify: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-15-golden-routes-accessibility-gates-appendix.md`

- [ ] **Step 1: Confirm selected provider is durable**

Run:

```bash
rg -n "Selected Strategy|temporary|local-only|visual:react|privacy|retention" docs/superpowers/specs docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-selection.md
```

Expected: selected provider is durable for cutover, or the implementation stops and completes Wave 05 provider promotion first. A temporary local-only visual gate cannot satisfy Wave 16.

- [ ] **Step 2: Add or tighten `visual:react` script**

Patch `package.json` only if the selected provider has no stable script. Use the provider command selected by Wave 05, for example for Playwright screenshot baselines:

```json
{
  "scripts": {
    "visual:react": "playwright test --config playwright.react.config.js --grep @visual"
  }
}
```

Expected: `pnpm run visual:react` targets React golden/visual proof and cannot pass by testing Svelte.

- [ ] **Step 3: Document visual command and ownership**

Update `docs/tech-stack.md` with a script row:

```markdown
| `pnpm run visual:react` | Run the Wave 05 selected React visual-regression gate against React golden fixtures. Provider artifacts are regression evidence only and do not replace `docs/ui-references/**`. |
```

Expected: tech-stack docs match package script changes.

## Task 7: Scripts, CI Placement, And Docs

**Files:**
- Modify: `package.json`
- Modify: `playwright.react.config.js`
- Modify: `.github/workflows/ci.yml` only if Wave 15 is allowed to add React proof jobs during dual-build
- Modify: `docs/tech-stack.md`
- Modify: `docs/context/style-map.md`
- Modify: repo-local skills only when proof workflow changes

- [ ] **Step 1: Ensure React composite gate includes Wave 15 proof**

Patch `package.json` so `validate:react` includes Wave 15 proof commands. Preserve existing Wave 01-14 checks:

```json
{
  "scripts": {
    "validate:react": "pnpm run check:react && pnpm run test:react && pnpm run build:react && pnpm run test:e2e:react && pnpm run visual:react && pnpm run docs:check"
  }
}
```

Expected: `validate:react` runs React static checks, unit/component tests, build, e2e golden/a11y/offline coverage, visual gate, and docs check. If earlier waves use different React unit or Storybook script names, include those exact existing names and document them in `docs/tech-stack.md`.

- [ ] **Step 2: Add CI React proof job only if the project has already opted into React dual-build CI**

If Wave 01-14 already added React CI jobs, extend them with:

```yaml
  react-validate:
    name: React Validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
      - uses: ./.github/actions/setup
      - run: pnpm run validate:react
```

Expected: CI proves React but deploy still consumes Svelte `dist/`. If React CI jobs do not exist yet, keep CI changes out of this wave and record `validate:react` as the required local/readiness gate in the appendix.

- [ ] **Step 3: Update style-map proof ownership**

For each React golden fixture that becomes durable proof for a component or route, update `docs/context/style-map.md` with the React e2e proof path only if the map has already been expanded for React ownership by earlier waves.

Expected: style-map remains current-state. It must not claim React is production-shipped.

## Task 8: Verification, Commit, And Handoff

**Files:**
- All files touched in Tasks 1-7

- [ ] **Step 1: Run targeted golden route proof**

Run:

```bash
pnpm run test:e2e:react -- --grep @golden
```

Expected: all React golden route fixtures pass.

- [ ] **Step 2: Run accessibility proof**

Run:

```bash
pnpm run test:e2e:react -- --grep @a11y
```

Expected: axe scans, keyboard/focus journeys, touch target checks, and live/status assertions pass.

- [ ] **Step 3: Run offline proof**

Run:

```bash
PLAYWRIGHT_INCLUDE_OFFLINE=1 PLAYWRIGHT_USE_PREVIEW=1 pnpm run test:e2e:react -- --grep @offline
```

Expected: React preview service worker and installed asset proof pass.

- [ ] **Step 4: Run visual gate**

Run:

```bash
pnpm run visual:react
```

Expected: selected Wave 05 provider passes without uploading or retaining inappropriate Quran/Mushaf data beyond the approved policy.

- [ ] **Step 5: Run composite gates**

Run:

```bash
pnpm run validate:react
pnpm run docs:check
git diff --check
```

Expected: React parity proof and docs checks pass. React output remains non-deploy.

- [ ] **Step 6: Commit**

Run:

```bash
git add tests/e2e/fixtures/react-golden-routes.ts tests/e2e/fixtures/react-a11y.ts tests/e2e/fixtures/react-offline.ts tests/e2e/read/react-golden.spec.ts tests/e2e/configure/react-golden.spec.ts tests/e2e/navigate/react-golden.spec.ts tests/e2e/onboard/react-golden.spec.ts tests/e2e/infra/react-offline.spec.ts playwright.react.config.js package.json docs/tech-stack.md docs/context/style-map.md docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-15-golden-routes-accessibility-gates-appendix.md
git commit -m "test: add react golden route and accessibility gates"
```

Expected: commit includes only Wave 15 proof and docs changes. Omit unchanged paths from `git add`.

## Reviewer Checklist

- React golden routes cannot pass against Svelte by accident.
- Every fixture has route, seed state, viewport/theme coverage, proof owner, and accepted-difference status.
- Fixture coverage includes empty-hash launch restore, onboarding, Verse reader, ayah deeplink, Mushaf reader, Surah directory, populated bookmarks, settings overlay, asset management, About page, search results/unavailable states, Daily Wird no-plan/active states, and offline installed-assets proof.
- Accessibility proof includes axe, keyboard traversal, focus restoration, reduced motion where relevant, live/status announcements, no hover-only controls, touch targets, and no keyboard traps.
- Offline proof uses React preview/service-worker behavior.
- Visual proof uses the durable Wave 05 selected strategy; no temporary local-only gate moves to Wave 16.
- Svelte-reference differences are resolved or explicitly accepted as v1 product differences.
- Production entry and deploy routing remain unchanged.
