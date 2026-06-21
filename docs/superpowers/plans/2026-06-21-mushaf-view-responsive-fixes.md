# Mushaf View Responsive Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the current Reader Mode Mushaf view so Single/Scroll navigation, Fit width, chrome, metadata, touch, wheel, keyboard, and settings behavior work cleanly across mobile, tablet, desktop, and landscape viewports.

**Architecture:** Treat the browser bug review as the behavior source of truth, not older docs/specs. Normalize Mushaf layout state into explicit display contracts, move scroll/page-turn ownership into `MushafPageViewer`, keep route/data loading in `MushafRoute`, and make CSS reserve predictable space for chrome instead of overlaying the page. Browser-only behavior gets Playwright coverage; unit tests cover state normalization and settings persistence.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4 semantic tokens, IndexedDB/Dexie settings, Vitest/Testing Library for React unit coverage, Playwright for viewport and gesture coverage.

---

## Source Evidence

Use this review as the issue source:

- `.scratch/mushaf-view-bug-review.md`
- `.scratch/mushaf-review/measurements.json`
- `.scratch/mushaf-review/*.png`

Do not use older product docs or specs as the standard for what Mushaf view should do. After implementation, update current-state docs only to reflect the working behavior.

## Files And Responsibilities

- Modify: `src/components/reader/MushafPageViewer.tsx`
  - Owns stage structure, page cells, edge/center hit zones, keyboard/wheel/pointer behavior, scroll-mode stack, bookmark/counter/surah chrome, and overlay-safe event gating.
- Modify: `src/app/routes/read/MushafRoute.tsx`
  - Owns settings load/subscription, adjacent page loading, Arabic Surah label selection, route updates, and passing normalized props into the viewer.
- Modify: `src/components/reader/MushafModeControl.tsx`
  - Owns Single/Scroll control values and removes hidden `fit-width` as a primary mode.
- Modify: `src/components/settings/MushafSettings.tsx`
  - Owns settings labels and grouping for Navigation mode and Fit width.
- Modify: `src/components/settings/useSettingsForm.ts`
  - Owns persisted Mushaf preference normalization when Fit width and Navigation mode change.
- Modify: `src/storage/settings-writer.ts`
  - Owns backward-compatible reading of legacy `mushafViewMode='fit-width'` while normalizing new writes.
- Modify: `src/components/ui/form-controls.tsx`
  - Replace setting-choice tab semantics with radio/toggle semantics, or add a dedicated non-tab segmented control variant and migrate settings to it.
- Modify: `src/design-system/index.css`
  - Owns Mushaf page layout, chrome safe areas, scroll containers, page counter/bookmark/surah placement, hit-zone sizes, responsive constraints, and touch target sizing.
- Modify: `tests/unit/react-read/reader-wave3.test.tsx`
  - Unit coverage for page-cell rendering, visible metadata content, chrome toggle semantics, and non-browser state behavior.
- Modify: `tests/unit/react-shell/settings-route.test.tsx`
  - Unit coverage for settings persistence and normalized mode/fit-width state.
- Modify or create under `tests/e2e/read/`
  - Browser coverage for mobile/tablet/desktop Mushaf view matrix, overflow, scroll, touch/wheel/key behavior, Settings overlay gating, and chrome overlap.
- Read before e2e edits: `tests/e2e/AGENTS.md`
- Modify after behavior is final: `docs/context/surfaces/read.md` and `docs/context/style-map.md` only if current-state behavior or proof ownership changes.

## Target Behavior Contract

- `Single + Fit width off`: the whole page fits within available viewport space after reserving visible top/bottom chrome areas. No horizontal or vertical document scroll should be required for the complete page in portrait or landscape.
- `Single + Fit width on`: the current page fills available width and may scroll vertically if the page height exceeds available space, but must never expose hidden adjacent pages or create horizontal document scroll.
- `Scroll + Fit width off`: vertical flow shows previous/current/next pages stacked, with the current page initially positioned predictably. Wheel/touch scroll moves through page content and adjacent pages; route updates when the dominant page changes.
- `Scroll + Fit width on`: same as Scroll mode, but pages fill available width and the vertical scroll container remains usable with touch, wheel, and keyboard.
- Horizontal edge page-turn zones apply only in Single mode. Scroll mode uses vertical scroll and optional keyboard boundary navigation, not invisible horizontal edge turns.
- Center chrome toggle hides and reveals all non-page chrome consistently, including top reader chrome, page counter, Surah label, and bookmark control.
- Keyboard page-turn handlers do not fire while Settings or navigation overlays are open.
- Page number shows only the current page number at bottom center.
- Arabic Surah name appears separately near the top edge, aligned right for RTL.
- Bookmark control does not overlap page number, Surah label, or page content, and has a comfortable touch target.
- Settings choices use accessible setting-control semantics, not fake tab panels.

---

## Task 1: Add Browser Regression Coverage For Current Failures

**Files:**
- Read: `tests/e2e/AGENTS.md`
- Create: `tests/e2e/read/mushaf-responsive.spec.ts`

- [ ] **Step 1: Read e2e test instructions**

Run:

```bash
sed -n '1,220p' tests/e2e/AGENTS.md
```

Expected: instructions for placing and running read-surface Playwright specs are visible.

- [ ] **Step 2: Create a focused e2e spec with deterministic storage seeding**

Create `tests/e2e/read/mushaf-responsive.spec.ts` with this structure:

```ts
import { expect, test, type Page } from '@playwright/test'

const BASE_URL = process.env.REACT_BASE_URL ?? 'http://127.0.0.1:5173'
const DB_NAME = 'quran-atlas'
const DB_VERSION = 8

type MushafPrefs = {
  mushafFitWidth: boolean
  mushafViewMode: 'auto' | 'fit-page' | 'fit-width' | 'continuous'
}

async function seedMushaf(page: Page, prefs: MushafPrefs) {
  await page.goto(`${BASE_URL}/favicon.ico`)
  await page.evaluate(async ({ dbName }) => {
    localStorage.clear()
    sessionStorage.clear()
    if ('caches' in window) {
      await Promise.all((await caches.keys()).map((name) => caches.delete(name)))
    }
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(dbName)
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
      request.onblocked = () => resolve()
    })
  }, { dbName: DB_NAME })

  await page.evaluate(
    ({ dbName, dbVersion, prefs }) => new Promise<void>((resolve, reject) => {
      const open = indexedDB.open(dbName, dbVersion)
      open.onupgradeneeded = () => {
        const db = open.result
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' })
        if (!db.objectStoreNames.contains('activationState')) db.createObjectStore('activationState', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('datasetMeta')) db.createObjectStore('datasetMeta', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bookmarks = db.createObjectStore('bookmarks', { keyPath: ['riwayah', 'verseKey'] })
          bookmarks.createIndex('riwayah_surah', ['riwayah', 'surah'], { unique: false })
          bookmarks.createIndex('riwayah', 'riwayah', { unique: false })
        }
        if (!db.objectStoreNames.contains('savedSearches')) db.createObjectStore('savedSearches', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('searchPackActivations')) db.createObjectStore('searchPackActivations', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('searchPackStaging')) db.createObjectStore('searchPackStaging', { keyPath: 'id' })
      }
      open.onerror = () => reject(open.error)
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction('settings', 'readwrite')
        const settings = tx.objectStore('settings')
        const rows = [
          { key: 'onboardingComplete', value: true },
          { key: 'mvpAssetContractId', value: 'mvp-default-assets-qaloon-bridges-v1' },
          { key: 'riwayah', value: 'qaloon' },
          { key: 'quranTextStyleId', value: 'uthmani-kfgqpc-v1' },
          { key: 'mushafEditionId', value: 'qalun-quran-ws-v1' },
          { key: 'translationId', value: 'bridges' },
          { key: 'translationVisible', value: true },
          { key: 'theme', value: 'light' },
          { key: 'nightMode', value: 'off' },
          { key: 'wirdReaderStatusVisible', value: false },
          { key: 'mushafViewMode', value: prefs.mushafViewMode },
          { key: 'mushafFitWidth', value: prefs.mushafFitWidth },
        ]
        for (const row of rows) settings.put(row)
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
      }
    }),
    { dbName: DB_NAME, dbVersion: DB_VERSION, prefs },
  )
}

async function openMushaf(page: Page, prefs: MushafPrefs, pageNo = 42) {
  await seedMushaf(page, prefs)
  await page.goto(`${BASE_URL}/#/m/${pageNo}`)
  await expect(page.getByRole('main', { name: 'Mushaf reader' })).toBeVisible()
  await expect(page.getByRole('img', { name: /Mushaf page/i })).toBeVisible()
}

async function layoutMetrics(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      }
    }
    const root = document.scrollingElement ?? document.documentElement
    const stage = document.querySelector<HTMLElement>('.qar-react-mushaf-page-stage')
    return {
      bookmark: box('.qar-react-mushaf-bookmark-toggle'),
      counter: box('.qar-react-mushaf-page-counter'),
      documentClientHeight: root.clientHeight,
      documentClientWidth: root.clientWidth,
      documentScrollHeight: root.scrollHeight,
      documentScrollWidth: root.scrollWidth,
      nav: box('nav[aria-label="Primary navigation"]'),
      page: box('[data-mushaf-cell="current"] svg'),
      stage: box('.qar-react-mushaf-page-stage'),
      stageClientHeight: stage?.clientHeight ?? 0,
      stageScrollHeight: stage?.scrollHeight ?? 0,
      stageScrollTop: stage?.scrollTop ?? 0,
      surah: box('.qar-react-mushaf-page-surah'),
    }
  })
}

function overlaps(a: NonNullable<Awaited<ReturnType<typeof layoutMetrics>>['counter']>, b: NonNullable<Awaited<ReturnType<typeof layoutMetrics>>['bookmark']>) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

test.describe('Mushaf responsive controls', () => {
  test('Single + Fit width does not create horizontal document overflow', async ({ page }) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 768, height: 1024 },
      { width: 1180, height: 820 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport)
      await openMushaf(page, { mushafFitWidth: true, mushafViewMode: 'fit-page' })
      const metrics = await layoutMetrics(page)
      expect(metrics.documentScrollWidth, `${viewport.width}x${viewport.height}`).toBe(metrics.documentClientWidth)
    }
  })

  test('Scroll + Fit width scrolls current page before route changes', async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 820 })
    await openMushaf(page, { mushafFitWidth: true, mushafViewMode: 'continuous' })
    const before = await layoutMetrics(page)
    expect(before.stageScrollHeight).toBeGreaterThan(before.stageClientHeight)
    await page.mouse.wheel(0, 500)
    await expect.poll(() => page.evaluate(() => document.querySelector<HTMLElement>('.qar-react-mushaf-page-stage')?.scrollTop ?? 0)).toBeGreaterThan(0)
    await expect(page).toHaveURL(/#\/m\/42$/)
  })

  test('Settings overlay blocks Mushaf page-turn keys', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, { mushafFitWidth: false, mushafViewMode: 'fit-page' })
    await page.getByRole('button', { name: 'Open settings' }).click()
    await expect(page.getByText('Settings')).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(page).toHaveURL(/#\/m\/42$/)
  })

  test('Mushaf chrome avoids page and control overlap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, { mushafFitWidth: false, mushafViewMode: 'fit-page' })
    const metrics = await layoutMetrics(page)
    expect(metrics.counter).not.toBeNull()
    expect(metrics.bookmark).not.toBeNull()
    expect(metrics.page).not.toBeNull()
    expect(overlaps(metrics.counter!, metrics.bookmark!)).toBe(false)
    expect(metrics.nav!.bottom).toBeLessThanOrEqual(metrics.page!.top)
    expect(metrics.counter!.top).toBeGreaterThanOrEqual(metrics.page!.bottom)
  })
})
```

- [ ] **Step 3: Run the new spec against the current implementation**

Run:

```bash
pnpm exec playwright test tests/e2e/read/mushaf-responsive.spec.ts --project=chromium
```

Expected before fixes: at least the horizontal overflow, scrollability, Settings key gating, and chrome-overlap tests fail.

- [ ] **Step 4: Keep the failing spec uncommitted until implementation starts**

Run:

```bash
git diff -- tests/e2e/read/mushaf-responsive.spec.ts
```

Expected: only the new spec appears in this task's diff.

---

## Task 2: Normalize Mushaf View State

**Files:**
- Modify: `src/components/reader/MushafModeControl.tsx`
- Modify: `src/components/settings/MushafSettings.tsx`
- Modify: `src/components/settings/useSettingsForm.ts`
- Modify: `src/storage/settings-writer.ts`
- Test: `tests/unit/react-shell/settings-route.test.tsx`
- Test: `tests/unit/react-storage/db-schema.test.ts`

- [ ] **Step 1: Update the mode type and keep legacy read support**

In `src/storage/settings-writer.ts`, keep reading legacy `fit-width` but normalize the returned mode:

```ts
export type ReactMushafViewMode = 'auto' | 'fit-page' | 'fit-width' | 'continuous'
export type NormalizedReactMushafViewMode = 'auto' | 'fit-page' | 'continuous'

function normalizeMushafViewMode(value: unknown): NormalizedReactMushafViewMode | null {
  if (value === 'auto' || value === 'fit-page' || value === 'continuous') return value
  if (value === 'fit-width') return 'fit-page'
  return null
}
```

Then update `reactReaderPreferencesFromRecords`:

```ts
const rawMushafViewMode = values.mushafViewMode
const normalizedMushafViewMode = normalizeMushafViewMode(rawMushafViewMode) ?? DEFAULT_REACT_READER_PREFERENCES.mushafViewMode

return {
  fontSize: asStep(values.fontSize) ?? DEFAULT_REACT_READER_PREFERENCES.fontSize,
  lineSpacing: asStep(values.lineSpacing) ?? DEFAULT_REACT_READER_PREFERENCES.lineSpacing,
  mushafFitWidth: typeof values.mushafFitWidth === 'boolean'
    ? values.mushafFitWidth
    : rawMushafViewMode === 'fit-width'
      ? true
      : DEFAULT_REACT_READER_PREFERENCES.mushafFitWidth,
  mushafViewMode: normalizedMushafViewMode,
  nightMode: asNightMode(values.nightMode) ?? DEFAULT_REACT_READER_PREFERENCES.nightMode,
  readerMargin: asStep(values.readerMargin) ?? DEFAULT_REACT_READER_PREFERENCES.readerMargin,
  theme: asTheme(values.theme) ?? DEFAULT_REACT_READER_PREFERENCES.theme,
  translationVisible: typeof values.translationVisible === 'boolean'
    ? values.translationVisible
    : DEFAULT_REACT_READER_PREFERENCES.translationVisible,
  verseSpacing: asStep(values.verseSpacing) ?? DEFAULT_REACT_READER_PREFERENCES.verseSpacing,
  wordSpacing: asStep(values.wordSpacing) ?? DEFAULT_REACT_READER_PREFERENCES.wordSpacing,
  wirdReaderStatusVisible: typeof values.wirdReaderStatusVisible === 'boolean'
    ? values.wirdReaderStatusVisible
    : DEFAULT_REACT_READER_PREFERENCES.wirdReaderStatusVisible,
}
```

- [ ] **Step 2: Stop writing `fit-width` as a mode**

In `src/components/settings/useSettingsForm.ts`, change `setMushafFitWidth` to update only the boolean:

```ts
setMushafFitWidth: (mushafFitWidth) => updatePreferences((current) => ({
  ...current,
  mushafFitWidth,
})),
```

Keep `setMushafViewMode` as the mode-only write:

```ts
setMushafViewMode: (mushafViewMode) => updatePreferences((current) => ({
  ...current,
  mushafViewMode,
})),
```

- [ ] **Step 3: Narrow the UI mode control type**

In `src/components/reader/MushafModeControl.tsx`, remove the hidden `fit-width` UI value:

```ts
import { SegmentedControl } from '../ui'

export type MushafNavigationMode = 'auto' | 'fit-page' | 'continuous'
export type MushafViewMode = MushafNavigationMode | 'fit-width'

export function MushafModeControl({
  mode = 'auto',
  onModeChange,
}: {
  mode?: MushafViewMode
  onModeChange?: (mode: MushafNavigationMode) => void
}) {
  const navigationMode: MushafNavigationMode = mode === 'continuous' ? 'continuous' : 'fit-page'

  return (
    <SegmentedControl
      label="Navigation mode"
      onValueChange={(value) => onModeChange?.(value as MushafNavigationMode)}
      options={[{ label: 'Single', value: 'fit-page' }, { label: 'Scroll', value: 'continuous' }]}
      value={navigationMode}
    />
  )
}
```

- [ ] **Step 4: Update settings copy to match the planned behavior**

In `src/components/settings/MushafSettings.tsx`, replace the navigation helper copy:

```tsx
<span className="qar-react-settings-row-control">Single page or vertical page scroll</span>
```

Keep the Fit width helper:

```tsx
<span className="qar-react-settings-row-control">Fill available screen width</span>
```

- [ ] **Step 5: Update unit tests for normalized settings**

In `tests/unit/react-shell/settings-route.test.tsx`, add assertions after toggling Fit width:

```ts
it('keeps Navigation mode and Fit width as separate Mushaf settings', async () => {
  await resetReactDb()
  render(<SettingsRoute mode="mushaf" onClose={vi.fn()} previousHash="#/m/1" />)

  const dialog = await screen.findByText('Settings')
  fireEvent.click(screen.getByRole('switch', { name: 'Fit width' }))

  await waitFor(async () => {
    const db = await openReactDb()
    await expect(db.settings.get('mushafFitWidth')).resolves.toEqual({ key: 'mushafFitWidth', value: true })
    await expect(db.settings.get('mushafViewMode')).resolves.toEqual({ key: 'mushafViewMode', value: 'auto' })
  })

  expect(dialog).toBeInTheDocument()
})
```

In `tests/unit/react-storage/db-schema.test.ts`, add legacy normalization coverage:

```ts
it('normalizes legacy fit-width mode into fit-page with fit width enabled', async () => {
  const db = await openReactDb()
  await db.settings.bulkPut([
    { key: 'mushafViewMode', value: 'fit-width' },
  ])

  await expect(readReactReaderPreferences(db)).resolves.toMatchObject({
    mushafFitWidth: true,
    mushafViewMode: 'fit-page',
  })
})
```

- [ ] **Step 6: Run targeted settings/storage tests**

Run:

```bash
pnpm run test:react -- tests/unit/react-shell/settings-route.test.tsx tests/unit/react-storage/db-schema.test.ts
```

Expected: tests pass after implementation.

---

## Task 3: Rebuild Mushaf Layout Containers To Prevent Overflow

**Files:**
- Modify: `src/components/reader/MushafPageViewer.tsx`
- Modify: `src/design-system/index.css`
- Test: `tests/unit/react-read/reader-wave3.test.tsx`
- Test: `tests/e2e/read/mushaf-responsive.spec.ts`

- [ ] **Step 1: Add explicit layout state attributes**

In `MushafPageViewer`, derive booleans before `return`:

```ts
const isScrollMode = viewMode === 'continuous'
const isFitWidth = fitWidth
```

Update the section attributes:

```tsx
data-mushaf-layout-mode={isScrollMode ? 'scroll' : 'single'}
data-mushaf-fit-width={isFitWidth ? 'true' : 'false'}
```

- [ ] **Step 2: Keep single mode clipped even when Fit width is on**

In `src/design-system/index.css`, replace the fit-width frame overflow rule:

```css
[data-mushaf-fit-width='true'] .qar-react-mushaf-page-frame {
  overflow: hidden;
}
```

Add an explicit single fit-width stage rule:

```css
[data-mushaf-layout-mode='single'][data-mushaf-fit-width='true'] .qar-react-mushaf-page-stage {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  aspect-ratio: var(--qa-react-mushaf-page-ratio);
}
```

- [ ] **Step 3: Replace width-forced mobile fit-page sizing**

Replace the current `@media (max-width: 767px)` Mushaf rule with:

```css
@media (max-width: 767px) {
  [data-mushaf-layout-mode='single'][data-mushaf-fit-width='false'] .qar-react-mushaf-page-stage {
    width: min(100%, calc(var(--qa-react-mushaf-available-height, 100dvh) * var(--qa-react-mushaf-page-ratio)));
  }

  [data-mushaf-layout-mode='single'][data-mushaf-fit-width='true'] .qar-react-mushaf-page-stage,
  [data-mushaf-layout-mode='scroll'][data-mushaf-fit-width='true'] .qar-react-mushaf-page-stage {
    width: 100%;
  }
}
```

- [ ] **Step 4: Reserve chrome-aware page space**

Add CSS variables on `.qar-react-mushaf-page-surface`:

```css
.qar-react-mushaf-page-surface {
  --qa-react-mushaf-top-chrome: 56px;
  --qa-react-mushaf-bottom-chrome: 52px;
  --qa-react-mushaf-available-height: calc(100dvh - var(--qa-react-mushaf-top-chrome) - var(--qa-react-mushaf-bottom-chrome) - 1rem);
  padding:
    calc(max(0.5rem, env(safe-area-inset-top)) + var(--qa-react-mushaf-top-chrome))
    clamp(0.625rem, 2.8vw, 1.5rem)
    calc(max(0.5rem, env(safe-area-inset-bottom)) + var(--qa-react-mushaf-bottom-chrome));
}
```

When chrome is hidden:

```css
.qar-react-mushaf-page-surface[data-mushaf-chrome-visible='false'] {
  --qa-react-mushaf-top-chrome: 0px;
  --qa-react-mushaf-bottom-chrome: 0px;
}
```

- [ ] **Step 5: Constrain fit-page by available height**

Update default and fit-page stage sizing:

```css
.qar-react-mushaf-page-stage,
[data-mushaf-view-mode='fit-page'] .qar-react-mushaf-page-stage,
[data-mushaf-view-mode='auto'] .qar-react-mushaf-page-stage {
  width: min(100%, calc(var(--qa-react-mushaf-available-height) * var(--qa-react-mushaf-page-ratio)));
  aspect-ratio: var(--qa-react-mushaf-page-ratio);
}
```

- [ ] **Step 6: Update unit coverage for single-mode cells**

In `tests/unit/react-read/reader-wave3.test.tsx`, add a behavior assertion:

```ts
it('keeps adjacent cells clipped in Single Fit width mode', () => {
  const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg)
  const resolved = {
    assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/042.svg',
    firstVerse: { surah: 2, verse: 251 },
    manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
    mushafEditionId: 'qalun-quran-ws-v1',
    page: 42,
    pageCount: 604,
    riwayah: 'qaloon' as const,
    riwayahLabel: 'Qalun',
  }

  render(
    <MushafPageViewer
      adjacentPages={{
        next: { inlineSvg, resolved: { ...resolved, page: 43 } },
        previous: { inlineSvg, resolved: { ...resolved, page: 41 } },
      }}
      fitWidth
      inlineSvg={inlineSvg}
      resolved={resolved}
      viewMode="fit-page"
    />,
  )

  expect(document.querySelector('[data-mushaf-layout-mode="single"]')).toBeInTheDocument()
  expect(document.querySelector('[data-mushaf-cell="previous"]')).toHaveAttribute('aria-hidden', 'true')
  expect(document.querySelector('[data-mushaf-cell="next"]')).toHaveAttribute('aria-hidden', 'true')
})
```

- [ ] **Step 7: Run targeted tests and the overflow e2e**

Run:

```bash
pnpm run test:react -- tests/unit/react-read/reader-wave3.test.tsx
pnpm exec playwright test tests/e2e/read/mushaf-responsive.spec.ts --project=chromium -g "Single \\+ Fit width"
```

Expected: unit tests pass; Single + Fit width e2e passes with `documentScrollWidth === documentClientWidth`.

---

## Task 4: Implement Real Scroll Mode

**Files:**
- Modify: `src/components/reader/MushafPageViewer.tsx`
- Modify: `src/app/routes/read/MushafRoute.tsx`
- Modify: `src/design-system/index.css`
- Test: `tests/unit/react-read/reader-wave3.test.tsx`
- Test: `tests/e2e/read/mushaf-responsive.spec.ts`

- [ ] **Step 1: Render previous/current/next cells in scroll mode**

Replace the current continuous branch:

```tsx
{isScrollMode ? (
  <div className="qar-react-mushaf-continuous-stack">
    <MushafPageCell page={adjacentPages?.previous ?? null} position="previous" />
    <MushafPageCell page={{ inlineSvg, resolved }} position="current" />
    <MushafPageCell page={adjacentPages?.next ?? null} position="next" />
  </div>
) : (
  <div className="qar-react-mushaf-page-strip" style={stripStyle}>
    <MushafPageCell page={adjacentPages?.previous ?? null} position="previous" />
    <MushafPageCell page={{ inlineSvg, resolved }} position="current" />
    <MushafPageCell page={adjacentPages?.next ?? null} position="next" />
  </div>
)}
```

For scroll mode, remove `aria-hidden` from previous/next cells only when those cells are visible in the scroll stack:

```tsx
aria-hidden={position === 'current' ? undefined : undefined}
```

Implement that by passing a `hidden` prop into `MushafPageCell`:

```tsx
<MushafPageCell hidden={!isScrollMode && position !== 'current'} ... />
```

- [ ] **Step 2: Make the stage the only scroll container in Scroll mode**

In CSS:

```css
[data-mushaf-layout-mode='scroll'] .qar-react-mushaf-page-stage {
  width: min(100%, calc(var(--qa-react-mushaf-available-height) * var(--qa-react-mushaf-page-ratio)));
  height: var(--qa-react-mushaf-available-height);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  aspect-ratio: auto;
}

[data-mushaf-layout-mode='scroll'][data-mushaf-fit-width='true'] .qar-react-mushaf-page-stage {
  width: 100%;
}

[data-mushaf-layout-mode='scroll'] .qar-react-mushaf-page-frame {
  height: auto;
  overflow: visible;
  animation: none;
}

[data-mushaf-layout-mode='scroll'] .qar-react-mushaf-continuous-stack {
  display: grid;
  gap: 1rem;
  align-items: start;
}

[data-mushaf-layout-mode='scroll'] .qar-react-mushaf-page-cell {
  aspect-ratio: var(--qa-react-mushaf-page-ratio);
  overflow: hidden;
}
```

- [ ] **Step 3: Position the current page after adjacent pages load**

In `MushafPageViewer`, create refs:

```ts
const stageRef = useRef<HTMLDivElement | null>(null)
const currentCellRef = useRef<HTMLDivElement | null>(null)
const hasPositionedScrollPageRef = useRef<number | null>(null)
```

Attach stage ref:

```tsx
<div className="qar-react-mushaf-page-stage" ref={stageRef} ...>
```

Pass current ref to the cell:

```tsx
<MushafPageCell cellRef={currentCellRef} page={{ inlineSvg, resolved }} position="current" hidden={false} />
```

Add effect:

```ts
useEffect(() => {
  if (!isScrollMode) {
    hasPositionedScrollPageRef.current = null
    return
  }
  if (hasPositionedScrollPageRef.current === resolved.page) return
  window.requestAnimationFrame(() => {
    const stage = stageRef.current
    const currentCell = currentCellRef.current
    if (!stage || !currentCell) return
    stage.scrollTop = currentCell.offsetTop
    hasPositionedScrollPageRef.current = resolved.page
  })
}, [isScrollMode, resolved.page, adjacentPages?.previous?.resolved.page, adjacentPages?.next?.resolved.page])
```

- [ ] **Step 4: Convert scroll boundaries into route updates**

Add a scroll handler:

```ts
const scrollRouteCooldownRef = useRef(0)

function handleScrollModeScroll() {
  if (!isScrollMode) return
  const stage = stageRef.current
  if (!stage) return
  const now = Date.now()
  if (now - scrollRouteCooldownRef.current < SCROLL_COOLDOWN_MS) return

  const currentCell = currentCellRef.current
  if (!currentCell) return
  const currentMid = currentCell.offsetTop + currentCell.offsetHeight / 2
  const viewportMid = stage.scrollTop + stage.clientHeight / 2

  if (viewportMid > currentMid + currentCell.offsetHeight * 0.65 && adjacentPages?.next) {
    scrollRouteCooldownRef.current = now
    advance()
  } else if (viewportMid < currentMid - currentCell.offsetHeight * 0.65 && adjacentPages?.previous) {
    scrollRouteCooldownRef.current = now
    returnPrevious()
  }
}
```

Attach it:

```tsx
onScroll={handleScrollModeScroll}
```

- [ ] **Step 5: Remove wheel page-turn interception while scroll range remains**

Change wheel handler to scroll the stage first:

```ts
function onWheel(event: WheelEvent) {
  if (!isScrollMode) return
  const stage = stageRef.current
  if (!stage) return

  const atBottom = stage.scrollTop + stage.clientHeight >= stage.scrollHeight - 2
  const atTop = stage.scrollTop <= 2

  if ((event.deltaY > 0 && !atBottom) || (event.deltaY < 0 && !atTop)) {
    return
  }

  const now = Date.now()
  if (now - wheelCooldownRef.current < SCROLL_COOLDOWN_MS) return
  wheelAccumRef.current += event.deltaY

  if (wheelAccumRef.current >= WHEEL_THRESHOLD) {
    wheelAccumRef.current = 0
    wheelCooldownRef.current = now
    advance()
  } else if (wheelAccumRef.current <= -WHEEL_THRESHOLD) {
    wheelAccumRef.current = 0
    wheelCooldownRef.current = now
    returnPrevious()
  }
}
```

Make sure the effect dependency includes `isScrollMode`:

```ts
}, [advance, isScrollMode, returnPrevious])
```

- [ ] **Step 6: Remove pointer `preventDefault()` for scrollable movement**

In `handlePointerMove`, change the continuous branch:

```ts
if (isScrollMode) {
  if (!drag.dragging) {
    if (Math.abs(deltaY) < 5) return
    if (Math.abs(deltaY) < Math.abs(deltaX) * 1.15) return
    drag.dragging = true
  }
  return
}
```

In `handlePointerEnd`, do not page-turn from a vertical drag when the stage can scroll:

```ts
if (isScrollMode) {
  setDragState({ active: false, deltaX: 0 })
  return
}
```

- [ ] **Step 7: Update unit test that currently locks in one-page scroll mode**

Replace `renders only current page in continuous Mushaf scroll mode` with:

```ts
it('renders previous current and next page cells in continuous Mushaf scroll mode when adjacent pages are available', () => {
  const inlineSvg = prepareReactInlineMushafSvg(realMushafSvg)
  const resolved = {
    assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/042.svg',
    firstVerse: { surah: 2, verse: 251 },
    manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
    mushafEditionId: 'qalun-quran-ws-v1',
    page: 42,
    pageCount: 604,
    riwayah: 'qaloon' as const,
    riwayahLabel: 'Qalun',
  }

  render(
    <MushafPageViewer
      adjacentPages={{
        next: { inlineSvg, resolved: { ...resolved, page: 43 } },
        previous: { inlineSvg, resolved: { ...resolved, page: 41 } },
      }}
      inlineSvg={inlineSvg}
      resolved={resolved}
      viewMode="continuous"
    />,
  )

  expect(document.querySelector('[data-mushaf-layout-mode="scroll"]')).toBeInTheDocument()
  expect(document.querySelector('[data-mushaf-cell="previous"]')).toHaveAttribute('data-mushaf-cell-page', '41')
  expect(document.querySelector('[data-mushaf-cell="current"]')).toHaveAttribute('data-mushaf-cell-page', '42')
  expect(document.querySelector('[data-mushaf-cell="next"]')).toHaveAttribute('data-mushaf-cell-page', '43')
})
```

- [ ] **Step 8: Run targeted scroll tests**

Run:

```bash
pnpm run test:react -- tests/unit/react-read/reader-wave3.test.tsx
pnpm exec playwright test tests/e2e/read/mushaf-responsive.spec.ts --project=chromium -g "Scroll \\+ Fit width"
```

Expected: scroll mode unit test passes; `Scroll + Fit width scrolls current page before route changes` passes.

---

## Task 5: Gate Input Handlers And Resize Hit Zones

**Files:**
- Modify: `src/components/reader/MushafPageViewer.tsx`
- Modify: `src/design-system/index.css`
- Test: `tests/e2e/read/mushaf-responsive.spec.ts`
- Test: `tests/unit/react-read/reader-wave3.test.tsx`

- [ ] **Step 1: Add overlay detection helper**

In `MushafPageViewer.tsx`, add:

```ts
function readerOverlayOpen(): boolean {
  return Boolean(
    document.querySelector('[role="dialog"][aria-modal="true"], .qar-react-settings-shell, .qar-react-nav-drawer'),
  )
}
```

- [ ] **Step 2: Gate global keyboard and wheel handlers**

In `onKeyDown`:

```ts
if (readerOverlayOpen()) return
```

In `onWheel`:

```ts
if (readerOverlayOpen()) return
```

- [ ] **Step 3: Restrict horizontal edge zones to Single mode**

In JSX:

```tsx
{!isScrollMode ? (
  <>
    <Button
      aria-label="Advance Mushaf page from left edge"
      className="qar-react-mushaf-edge qar-react-mushaf-edge--left"
      disabled={resolved.page >= resolved.pageCount}
      onClick={handleZoneClick(advance)}
      size="sm"
      tabIndex={-1}
      type="button"
      variant="ghost"
    >
      <span className="qar:sr-only">Next page</span>
    </Button>
    <Button
      aria-label="Return to previous Mushaf page from right edge"
      className="qar-react-mushaf-edge qar-react-mushaf-edge--right"
      disabled={resolved.page <= 1}
      onClick={handleZoneClick(returnPrevious)}
      size="sm"
      tabIndex={-1}
      type="button"
      variant="ghost"
    >
      <span className="qar:sr-only">Previous page</span>
    </Button>
  </>
) : null}
```

- [ ] **Step 4: Reduce desktop/tablet edge zone width**

In CSS:

```css
.qar-react-mushaf-edge {
  width: clamp(3rem, 12vw, 9rem);
}

.qar-react-mushaf-center-toggle {
  inset: 0 clamp(3rem, 12vw, 9rem);
}

@media (max-width: 767px) {
  .qar-react-mushaf-edge {
    width: clamp(4.25rem, 24vw, 7rem);
  }

  .qar-react-mushaf-center-toggle {
    inset: 0 clamp(4.25rem, 24vw, 7rem);
  }
}
```

- [ ] **Step 5: Add keyboard recovery for hidden chrome**

In `onKeyDown`, add:

```ts
if (event.key === 'Escape' && !chromeVisible) {
  event.preventDefault()
  onToggleChrome?.(true)
  return
}
```

Also reveal chrome when focus enters the reader surface:

```tsx
onFocus={() => {
  if (!chromeVisible) onToggleChrome?.(true)
}}
```

- [ ] **Step 6: Extend e2e for overlay key gating and scroll-mode edge zones**

Add to `tests/e2e/read/mushaf-responsive.spec.ts`:

```ts
test('Scroll mode does not keep horizontal edge tap page turns', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await openMushaf(page, { mushafFitWidth: false, mushafViewMode: 'continuous' })
  await page.mouse.click(20, 500)
  await expect(page).toHaveURL(/#\/m\/42$/)
})

test('Escape reveals hidden Mushaf chrome after page navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openMushaf(page, { mushafFitWidth: false, mushafViewMode: 'fit-page' })
  await page.getByRole('button', { name: 'Advance Mushaf page from left edge' }).click({ force: true })
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveAttribute('data-visible', 'false')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveAttribute('data-visible', 'true')
})
```

- [ ] **Step 7: Run targeted e2e**

Run:

```bash
pnpm exec playwright test tests/e2e/read/mushaf-responsive.spec.ts --project=chromium -g "Settings overlay|Scroll mode does not|Escape reveals"
```

Expected: overlay, edge-zone, and keyboard recovery tests pass.

---

## Task 6: Redesign Mushaf Metadata And Bottom Controls

**Files:**
- Modify: `src/app/routes/read/MushafRoute.tsx`
- Modify: `src/components/reader/MushafPageViewer.tsx`
- Modify: `src/design-system/index.css`
- Test: `tests/unit/react-read/reader-wave3.test.tsx`
- Test: `tests/e2e/read/mushaf-responsive.spec.ts`

- [ ] **Step 1: Use Arabic Surah labels**

In `MushafRoute.tsx`, change:

```ts
return surahIndex.find((row) => row.n === surah)?.name ?? `Surah ${surah}`
```

to:

```ts
return surahIndex.find((row) => row.n === surah)?.name_ar ?? `سورة ${surah}`
```

- [ ] **Step 2: Separate Surah label from page counter**

In `MushafPageViewer.tsx`, replace the counter block:

```tsx
{surahLabel ? (
  <div className="qar-react-mushaf-page-surah" dir="rtl" lang="ar">
    {surahLabel}
  </div>
) : null}
<div className="qar-react-mushaf-page-counter" aria-label={`Mushaf page ${resolved.page}`}>
  {resolved.page}
</div>
```

Remove `{resolved.pageCount}` from visible page counter.

- [ ] **Step 3: Make bottom controls non-overlapping**

In CSS:

```css
.qar-react-mushaf-page-surah {
  position: fixed;
  top: calc(max(0.75rem, env(safe-area-inset-top)) + var(--qa-react-mushaf-top-chrome));
  right: clamp(0.75rem, 3vw, 1.5rem);
  z-index: 6;
  max-width: min(50vw, 18rem);
  overflow: hidden;
  color: var(--qa-react-text);
  font-family: var(--qa-react-font-arabic);
  font-size: clamp(0.95rem, 2.4vw, 1.25rem);
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
}

.qar-react-mushaf-page-counter {
  min-width: 2.5rem;
  min-height: 2.5rem;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: var(--qa-react-mushaf-ink);
  font-family: var(--qa-react-font-arabic);
  font-size: 1rem;
  backdrop-filter: none;
}

.qar-react-mushaf-bookmark-toggle {
  left: auto;
  right: max(0.75rem, calc(env(safe-area-inset-right) + 0.75rem));
  inline-size: 2.75rem;
  block-size: 2.75rem;
  min-width: 2.75rem !important;
  min-height: 2.75rem !important;
  transform: none;
}
```

- [ ] **Step 4: Hide all Mushaf chrome when chrome is hidden**

In CSS:

```css
.qar-react-mushaf-page-surface[data-mushaf-chrome-visible='false'] .qar-react-mushaf-page-counter,
.qar-react-mushaf-page-surface[data-mushaf-chrome-visible='false'] .qar-react-mushaf-page-surah,
.qar-react-mushaf-page-surface[data-mushaf-chrome-visible='false'] .qar-react-mushaf-bookmark-toggle {
  opacity: 0;
  pointer-events: none;
}
```

- [ ] **Step 5: Update unit test expectations**

In `tests/unit/react-read/reader-wave3.test.tsx`, update the page counter test:

```ts
expect(screen.getByLabelText('Mushaf page 42')).toHaveTextContent('42')
expect(screen.queryByText('42 / 604')).not.toBeInTheDocument()
expect(screen.getByText('البَقَرَة')).toHaveAttribute('dir', 'rtl')
```

- [ ] **Step 6: Extend e2e no-overlap assertions**

In `tests/e2e/read/mushaf-responsive.spec.ts`, keep `Mushaf chrome avoids page and control overlap` and assert:

```ts
expect(metrics.counter!.top).toBeGreaterThanOrEqual(metrics.page!.bottom)
expect(metrics.bookmark!.left).toBeGreaterThan(metrics.counter!.right)
expect(metrics.surah!.right).toBeLessThanOrEqual(metrics.documentClientWidth)
```

- [ ] **Step 7: Run targeted tests**

Run:

```bash
pnpm run test:react -- tests/unit/react-read/reader-wave3.test.tsx
pnpm exec playwright test tests/e2e/read/mushaf-responsive.spec.ts --project=chromium -g "chrome avoids"
```

Expected: metadata and no-overlap tests pass.

---

## Task 7: Fix Settings Control Semantics And Touch Targets

**Files:**
- Modify: `src/components/ui/form-controls.tsx`
- Modify: `src/design-system/index.css`
- Test: `tests/unit/react-components/ui-components.test.tsx`
- Test: `tests/unit/react-shell/settings-route.test.tsx`

- [ ] **Step 1: Replace tab semantics in SegmentedControl**

In `src/components/ui/form-controls.tsx`, change the root and buttons:

```tsx
return (
  <div aria-label={label} className="qar:inline-flex qar:rounded-control qar:border qar:border-border qar:bg-surface qar:p-1" role="radiogroup">
    {options.map((option) => {
      const selected = option.value === selectedValue
      return (
        <button
          aria-checked={selected}
          aria-label={`${label}: ${option.label}`}
          className={cn(
            'qar:min-h-11 qar:rounded-control qar:px-3 qar:text-sm qar:text-muted qar:focus-visible:outline qar:focus-visible:outline-2 qar:focus-visible:outline-offset-2 qar:focus-visible:outline-focus',
            selected && 'qar:bg-accent qar:text-surface',
          )}
          disabled={option.disabled}
          key={option.value}
          onClick={() => selectOption(option.value)}
          role="radio"
          type="button"
        >
          {option.shortLabel ?? option.label}
        </button>
      )
    })}
  </div>
)
```

- [ ] **Step 2: Increase switch touch area without changing visual thumb size**

In the `Switch` component, wrap or adjust root classes to include `min-h-11 min-w-11` while preserving the visual track:

```tsx
<SwitchPrimitive.Root
  aria-label={label}
  className={cn(
    'qar:relative qar:inline-flex qar:min-h-11 qar:min-w-11 qar:items-center qar:justify-center',
    className,
  )}
  {...props}
>
  <span className="qar:inline-flex qar:h-6 qar:w-11 qar:items-center qar:rounded-control qar:bg-muted qar:p-0.5 data-[state=checked]:qar:bg-accent">
    <SwitchPrimitive.Thumb className="qar:block qar:size-5 qar:rounded-control qar:bg-surface qar:shadow-sm qar:transition-transform data-[state=checked]:qar:translate-x-5" />
  </span>
</SwitchPrimitive.Root>
```

- [ ] **Step 3: Update tests that query tabs**

In `tests/unit/react-shell/settings-route.test.tsx`, replace tab queries:

```ts
fireEvent.click(within(dialog).getByRole('radio', { name: 'Navigation mode: Scroll' }))
expect(within(dialog).getByRole('radio', { name: 'Navigation mode: Scroll' })).toHaveAttribute('aria-checked', 'true')
```

Update reader mode queries similarly:

```ts
expect(shell.getByRole('radio', { name: 'Reader mode: Mushaf' })).toHaveAttribute('aria-checked', 'true')
```

- [ ] **Step 4: Run settings and UI primitive tests**

Run:

```bash
pnpm run test:react -- tests/unit/react-components/ui-components.test.tsx tests/unit/react-shell/settings-route.test.tsx
```

Expected: updated accessibility semantics pass.

---

## Task 8: Update Current-State Docs After Behavior Is Proven

**Files:**
- Modify: `docs/context/surfaces/read.md`
- Modify: `docs/context/style-map.md` if proof ownership changes

- [ ] **Step 1: Update `read.md` Mushaf behavior paragraph**

In `docs/context/surfaces/read.md`, update only the current-state Mushaf paragraph to describe:

- Single mode page fit and fit-width behavior.
- Scroll mode previous/current/next vertical stack.
- Arabic Surah label placement.
- Page-only bottom counter.
- Overlay-safe keyboard handling.

Use current-state prose only. Do not include dates, progress notes, or references to this plan.

- [ ] **Step 2: Update proof ownership if new e2e file was added**

In `docs/context/style-map.md`, update the Mushaf row proof surface:

```md
`tests/e2e/read/react-golden.spec.ts`, `tests/e2e/read/mushaf-responsive.spec.ts`
```

- [ ] **Step 3: Run docs check**

Run:

```bash
pnpm run docs:check
git diff --check
```

Expected: both pass.

---

## Task 9: Full Verification Pass

**Files:**
- No new source files. Run verification against all changed source, test, and docs files.

- [ ] **Step 1: Run focused unit lanes**

Run:

```bash
pnpm run test:react -- tests/unit/react-read/reader-wave3.test.tsx tests/unit/react-shell/settings-route.test.tsx tests/unit/react-components/ui-components.test.tsx tests/unit/react-storage/db-schema.test.ts
```

Expected: all targeted React tests pass.

- [ ] **Step 2: Run focused browser lane**

Run:

```bash
pnpm exec playwright test tests/e2e/read/mushaf-responsive.spec.ts --project=chromium
```

Expected: all Mushaf responsive tests pass.

- [ ] **Step 3: Run static repo gate**

Run:

```bash
pnpm run check
```

Expected: typecheck, lint, design, registry, UI-pattern, Mushaf asset, feature-state, and UI-reference checks pass.

- [ ] **Step 4: Run broader read golden check if touched chrome/layout affects existing journeys**

Run:

```bash
pnpm run test:e2e:preview -- tests/e2e/read/react-golden.spec.ts --project=chromium
```

Expected: existing read golden coverage passes.

- [ ] **Step 5: Inspect final git diff**

Run:

```bash
git diff --stat
git diff --check
```

Expected: no whitespace errors; changed files match this plan's file list plus generated docs if `pnpm run docs` was required.

## Risk Notes

- Existing dirty worktree includes requested skill removals. Do not revert those changes while implementing this plan.
- Browser scroll and gesture behavior is real-browser behavior; do not replace the e2e checks with jsdom tests.
- Avoid tests that assert CSS class internals. Use visible behavior, route stability, scroll metrics, bounding boxes, accessible roles/names, and persisted settings.
- If the continuous stack route-update logic feels unstable during implementation, prefer a simpler first shipment: scroll through previous/current/next and route only at explicit boundary wheel/keyboard. Keep the e2e expectations aligned with the behavior actually shipped.

## Execution Options

1. **Subagent-Driven (recommended)**: split Tasks 1-9 across focused agents with review checkpoints after each task.
2. **Inline Execution**: execute this plan in the current session with checkpoints after Tasks 1, 4, 7, and 9.
