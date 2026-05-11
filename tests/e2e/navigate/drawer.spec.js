/**
 * E2E Journey F: Navigation (command sheet, surah list, keyboard)
 *
 * Covers:
 *   F1. Command sheet direct verse-ref (2:255) → reader at #/s/2/255 + a11y scan
 *   F2. Arrow-down to "Mark this verse" row → Enter → mark editor opens
 *   F3. Tag search (type "mer") → Tags group shows "mercy" → Enter → #/threads/mercy FVR
 *   F4. Surah directory — 114 rows, search "67" → eyebrow + Al-Mulk row → tap → #/s/67
 *   F5. Continue-reading card — visible at top after visiting a surah; tap navigates
 *   F6. Keyboard navigation — pill→Enter opens sheet; arrow nav; Esc closes; G then S
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §F
 *   src/navigate/command-sheet.js
 *   src/navigate/surahs/list.js
 *   src/navigate/ambient-pill.js
 *   src/navigate/ambient-dock.js
 */

import { test, expect } from '@playwright/test'
import { seedBookmarks, seedMarks, writeSetting } from '../fixtures/idb.js'
import { waitForReader, openCommandSheet } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'

// Reuse the onboarded snapshot captured by `tests/e2e/global-setup.ts`.
// Reuse the onboarded snapshot to skip per-test cold-boot setup.
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })

async function controlPaint(locator) {
  return locator.evaluate((el) => {
    const cs = getComputedStyle(el)
    const box = el.getBoundingClientRect()
    return {
      backgroundColor: cs.backgroundColor,
      borderColor: cs.borderColor,
      color: cs.color,
      height: box.height,
    }
  })
}

async function applyTestTheme(page, theme) {
  await page.evaluate((variant) => {
    document.documentElement.classList.remove('theme-light', 'theme-sepia', 'theme-dark')
    document.documentElement.classList.add(`theme-${variant}`)
    document.documentElement.setAttribute('data-theme', variant)
    document.documentElement.setAttribute('data-theme-pref', variant)
  }, theme)
}

async function captureDrawerVisual(page, testInfo, { width, theme, source }) {
  await page.setViewportSize({ width, height: width === 320 ? 568 : 844 })
  await page.goto('/#/s/18')
  await waitForReader(page)
  await applyTestTheme(page, theme)
  const existingDrawer = page.locator('.qa-nav-drawer')
  if (await existingDrawer.isVisible().catch(() => false)) {
    await page.locator('.qa-nav-drawer-close').click()
    await expect(existingDrawer).toBeHidden()
  }
  await page.locator('.qa-mh-hamburger').click()
  await expect(page.locator('.qa-nav-drawer')).toBeVisible()

  if (source === 'juz') {
    await page.getByTestId('read-source-juz').click()
    await expect(page.locator('.qa-juz-row')).toHaveCount(30)
  } else if (source === 'bookmarks') {
    await page.getByTestId('read-source-bookmarks').click()
    await expect(page.locator('[data-bookmarks-list]')).toBeVisible()
  } else {
    await expect(page.getByTestId('read-source-surah')).toHaveAttribute('aria-selected', 'true')
  }

  const drawer = page.locator('.qa-nav-drawer')
  await drawer.screenshot({
    path: testInfo.outputPath(`navdrawer-${width}-${theme}-${source}.png`),
  })

  return drawer.evaluate((el) => {
    const rows = [
      ...el.querySelectorAll('.qa-nav-drawer-surah-row, .qa-juz-row, .qa-bookmarks-row'),
    ]
    const controls = [
      ...el.querySelectorAll('.qa-nav-drawer-source-tab, .qa-nav-drawer-filter-option, .qa-nav-drawer-close, .qa-nav-drawer-about'),
    ]
    const rowMetrics = rows.map((row) => {
      const box = row.getBoundingClientRect()
      return { width: box.width, height: box.height, text: row.textContent ?? '' }
    })
    const controlMetrics = controls.map((control) => {
      const box = control.getBoundingClientRect()
      return { width: box.width, height: box.height, text: control.textContent ?? '' }
    })
    return {
      drawerOverflow: el.scrollWidth > window.innerWidth,
      bodyOverflow: document.documentElement.scrollWidth > window.innerWidth,
      rowMetrics,
      controlMetrics,
      hasDecorativeSvgInSource: !!el.querySelector('.qa-nav-drawer-source-panel svg'),
      hasDecorativeSvgInRows: !!el.querySelector('.qa-nav-drawer-surah-row svg, .qa-juz-row svg, .qa-bookmarks-row svg'),
    }
  })
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

test.describe('Journey F: Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for app boot to settle before seeding so launch-restore
    // IDB reads cannot race with the seed write.
    await page.goto('/')
    await waitForReader(page)
    await seedMarks(page, [
      { verseKey: '2:255', tags: ['mercy'], note: '' },
    ])
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // ---------------------------------------------------------------------------
  // F1. Command sheet direct verse-ref
  // ---------------------------------------------------------------------------

  test.beforeEach(async ({ page }, testInfo) => {
    const vp = testInfo.project.use.viewport
    if (vp && vp.width >= 1180) {
      testInfo.skip(true, 'mobile-only suite')
    }

    await page.goto('/')
  })

  test('F-mobile-1: hamburger opens drawer with Read tab + Surahs sub-tab default and current-surah highlighted', async ({ page }) => {
    await page.goto('/#/s/18')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    const drawer = page.locator('.qa-nav-drawer')
    await expect(drawer).toBeVisible()

    // Read tab is on by default; Surah source is on by default
    await expect(page.locator('.qa-nav-drawer-tab--on')).toHaveText(/Read/i)
    await expect(page.getByTestId('read-source-surah')).toHaveAttribute('aria-selected', 'true')

    // Current surah (18 — Al-Kahf) is highlighted
    const currentRow = page.locator('.qa-nav-drawer-surah-row--current')
    await expect(currentRow).toHaveAttribute('data-surah', '18')

    // Wordmark is a button (About entry)
    await expect(page.locator('.qa-nav-drawer-wordmark')).toBeVisible()
  })

  test('F-mobile-1b: first drawer open keeps Browse controls mounted and the Surah list scrollable @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/s/18')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    await expect(page.getByTestId('read-source-surah')).toBeVisible()
    await expect(page.getByTestId('read-source-juz')).toBeVisible()
    await expect(page.getByTestId('read-source-bookmarks')).toBeVisible()
    await expect(page.locator('.qa-nav-drawer-search-input')).toBeVisible()
    await expect(page.locator('.qa-nav-drawer-surah-row')).toHaveCount(114)

    const firstRowMetrics = await page.locator('.qa-nav-drawer-surah-row').first().evaluate((el) => {
      const box = el.getBoundingClientRect()
      return {
        height: box.height,
        radius: getComputedStyle(el).borderRadius,
      }
    })
    expect(firstRowMetrics.height).toBeGreaterThanOrEqual(48)
    expect(firstRowMetrics.radius).not.toBe('0px')

    const list = page.locator('.qa-nav-drawer-surah-list')
    await expect(list).toBeVisible()
    await list.evaluate((el) => { el.scrollTop = 0 })
    await list.hover()
    await page.mouse.wheel(0, 600)
    await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
  })

  test('F-mobile-1c: source rail fits and keeps selected contrast across themes @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/#/s/18')
    await waitForReader(page)
    await page.locator('.qa-mh-hamburger').click()

    for (const theme of ['light', 'sepia', 'dark']) {
      await applyTestTheme(page, theme)
      const rail = page.locator('.qa-nav-drawer-source-tabs')
      await expect(rail).toBeVisible()

      const metrics = await rail.evaluate((el) => {
        const root = document.querySelector('.qa-nav-drawer')
        const tabs = [...el.querySelectorAll('.qa-nav-drawer-source-tab')]
        const selected = el.querySelector('.qa-nav-drawer-source-tab--on')
        const inactive = el.querySelector('.qa-nav-drawer-source-tab:not(.qa-nav-drawer-source-tab--on)')
        const railStyle = getComputedStyle(el)
        const selectedStyle = selected ? getComputedStyle(selected) : null
        const inactiveStyle = inactive ? getComputedStyle(inactive) : null
        const tabBoxes = tabs.map((tab) => tab.getBoundingClientRect())
        const railBox = el.getBoundingClientRect()

        return {
          railHeight: railBox.height,
          rootOverflow: root ? root.scrollWidth > window.innerWidth : true,
          railOverflow: el.scrollWidth > el.clientWidth,
          tabCount: tabs.length,
          sameRow: tabBoxes.every((box) => Math.abs(box.top - railBox.top) < 8),
          borderColor: railStyle.borderColor,
          railBackground: railStyle.backgroundColor,
          selectedBackground: selectedStyle?.backgroundColor ?? '',
          inactiveBackground: inactiveStyle?.backgroundColor ?? '',
          selectedColor: selectedStyle?.color ?? '',
          inactiveColor: inactiveStyle?.color ?? '',
        }
      })

      expect(metrics.tabCount).toBe(3)
      expect(metrics.sameRow).toBe(true)
      expect(metrics.rootOverflow).toBe(false)
      expect(metrics.railOverflow).toBe(false)
      expect(metrics.railHeight).toBeGreaterThanOrEqual(40)
      expect(metrics.railHeight).toBeLessThanOrEqual(62)
      expect(metrics.borderColor).not.toBe('rgba(0, 0, 0, 0)')
      expect(metrics.railBackground).not.toBe('rgba(0, 0, 0, 0)')
      expect(metrics.selectedBackground).not.toBe(metrics.inactiveBackground)
      expect(metrics.selectedColor).not.toBe(metrics.inactiveColor)
    }
  })

  test('F-mobile-2: tapping layer row in Study tab routes to #/review?layer=<name>', async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
    await page.locator('.qa-mh-hamburger').click()
    await page.locator('.qa-nav-drawer-tab', { hasText: 'Study' }).click()
    await page.locator('.qa-nav-drawer-layer-row[data-layer="people"]').click()
    await expect(page).toHaveURL(/#\/review\?layer=people$/)
  })

  test('F-mobile-3: wordmark in drawer routes to #/about', async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    await page.locator('.qa-nav-drawer-wordmark').click()
    await expect(page).toHaveURL(/#\/about$/)
  })

  test('F-mobile-4: typing #/surahs on mobile redirects + opens drawer', async ({ page }) => {
    await page.goto('/#/s/18')
    await waitForReader(page)

    await page.evaluate(() => { window.location.hash = '#/surahs' })
    await expect(page.locator('.qa-nav-drawer')).toBeVisible({ timeout: 4_000 })
    // Hash should be replaced (not on #/surahs)
    await page.waitForFunction(() => !window.location.hash.startsWith('#/surahs'), { timeout: 4_000 })
  })

  test('F-mobile-5: reader drawer top bar and Daily Wird card fit on a 320px phone @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/#/s/18')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    const drawer = page.locator('.qa-nav-drawer')
    await expect(drawer).toBeVisible()
    await expect(page.locator('[data-testid="wird-card"]')).toBeVisible()

    const overflow = await page.evaluate(() => {
      const root = document.querySelector('.qa-nav-drawer')
      const header = document.querySelector('.qa-nav-drawer-hdr')
      const wordmark = document.querySelector('.qa-nav-drawer-wordmark-text')
      const card = document.querySelector('[data-testid="wird-card"]')
      if (!root || !header || !wordmark || !card) { return true }
      return header.scrollWidth > root.clientWidth
        || root.scrollWidth > window.innerWidth
        || wordmark.scrollWidth > wordmark.clientWidth
        || card.scrollWidth > card.clientWidth
    })
    expect(overflow).toBe(false)

    const closeBox = await page.locator('.qa-nav-drawer-close').boundingBox()
    const tabBox = await page.locator('.qa-nav-drawer-hdr .qa-nav-drawer-tabs').boundingBox()
    expect(closeBox.width).toBeGreaterThanOrEqual(44)
    expect(closeBox.height).toBeGreaterThanOrEqual(44)
    expect(tabBox.height).toBeGreaterThanOrEqual(36)
    expect(tabBox.height).toBeLessThanOrEqual(40)

    await expect(page.locator('.qa-nav-drawer-surah-row, .qa-juz-row').first()).toBeVisible()
  })

  test('F-mobile-5b: Read source switch is compact and keeps Surah controls source-owned @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/#/s/18')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    const surah = page.getByTestId('read-source-surah')
    const juz = page.getByTestId('read-source-juz')
    const bookmarks = page.getByTestId('read-source-bookmarks')
    await expect(surah).toHaveAttribute('aria-selected', 'true')
    await expect(juz).toHaveAttribute('aria-selected', 'false')
    await expect(bookmarks).toHaveAttribute('aria-selected', 'false')
    await expect(page.locator('.qa-nav-drawer-source-filter')).toBeVisible()

    const browseOn = await controlPaint(surah)
    const bookmarksOff = await controlPaint(bookmarks)
    expect(browseOn.height).toBeLessThanOrEqual(46)
    expect(bookmarksOff.height).toBeLessThanOrEqual(46)
    expect(browseOn.backgroundColor).not.toBe(bookmarksOff.backgroundColor)
    expect(browseOn.color).not.toBe(bookmarksOff.color)

    await juz.click()
    await expect(juz).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.qa-nav-drawer-search-input')).toHaveCount(0)
    await expect(page.locator('.qa-nav-drawer-source-filter')).toHaveCount(0)
    const surahOff = await controlPaint(surah)
    const juzOn = await controlPaint(juz)
    expect(juzOn.backgroundColor).not.toBe(surahOff.backgroundColor)
    expect(juzOn.color).not.toBe(surahOff.color)
  })

  test('F-mobile-Mushaf: drawer mode switch opens Mushaf and returns to Verse @mobile', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    test.skip(isDesktop, 'mobile drawer switch')

    await page.goto('/#/s/2/255')
    await waitForReader(page)
    await page.locator('.qa-mh-hamburger').click()
    await expect(page.getByTestId('reader-mode-switch')).toBeVisible()

    await page.getByTestId('reader-mode-mushaf').click()
    await expect(page).toHaveURL(/#\/m\/\d+$/)
    await expect(page.locator('.qa-mushaf-page-img')).toBeVisible({ timeout: 10_000 })

    await page.locator('.qa-mh-hamburger').click()
    await expect(page.getByTestId('mushaf-drawer-page')).toContainText(/Page/)
    await page.getByTestId('reader-mode-verse').click()
    await expect(page).toHaveURL(/#\/s\/\d+\/\d+$/)
    await waitForReader(page)
  })

  test('F-mobile-visual: drawer redesign captures theme screenshots without overflow @mobile', async ({ page }, testInfo) => {
    await writeSetting(page, 'wirdPlan', {
      id: 'wird-visual',
      startRef: { surah: 2, verse: 1 },
      endRef: { surah: 2, verse: 20 },
      targetDays: 2,
      targetEndOn: '2026-05-05',
      startedOn: '2026-05-04',
      unit: 'verse',
      reminder: { enabled: true, time: '08:00', browserNotifications: 'default' },
      progress: {
        lastReadRef: { surah: 2, verse: 1 },
        nextRef: { surah: 2, verse: 8 },
        dayKey: '2026-05-04',
        todayStartRef: { surah: 2, verse: 1 },
        todayEndRef: { surah: 2, verse: 10 },
        completedThroughRef: { surah: 2, verse: 7 },
      },
      history: [],
    })
    await seedBookmarks(page, [
      { verseKey: '2:255', riwayah: 'qaloon' },
      { verseKey: '2:286', riwayah: 'qaloon' },
      { verseKey: '67:1', riwayah: 'qaloon' },
    ])

    for (const width of [320, 390]) {
      for (const theme of ['light', 'sepia', 'dark']) {
        for (const source of ['surah', 'juz', 'bookmarks']) {
          const metrics = await captureDrawerVisual(page, testInfo, { width, theme, source })
          expect(metrics.drawerOverflow, `${width}/${theme}/${source} drawer overflow`).toBe(false)
          expect(metrics.bodyOverflow, `${width}/${theme}/${source} body overflow`).toBe(false)
          expect(metrics.hasDecorativeSvgInSource).toBe(false)
          expect(metrics.hasDecorativeSvgInRows).toBe(false)
          for (const row of metrics.rowMetrics.slice(0, 4)) {
            expect(row.width).toBeLessThanOrEqual(width)
            expect(row.height).toBeGreaterThanOrEqual(44)
          }
          for (const control of metrics.controlMetrics) {
            expect(control.height).toBeGreaterThanOrEqual(34)
          }
        }
      }
    }
  })

  test('F-mobile-5c: Wird creator uses Settings-style selected and unselected controls @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/s/18')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    await page.getByTestId('wird-card').click()
    await expect(page.getByTestId('wird-detail-title')).toBeVisible()

    const setup = page.locator('.qa-wird-setup')
    await expect(setup).toBeVisible()
    const setupPaint = await setup.evaluate((el) => {
      const cs = getComputedStyle(el)
      return {
        backgroundColor: cs.backgroundColor,
        borderColor: cs.borderColor,
        radius: cs.borderRadius,
      }
    })
    expect(setupPaint.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(setupPaint.borderColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(parseFloat(setupPaint.radius)).toBeGreaterThanOrEqual(8)

    const thirtyDays = page.getByTestId('wird-target-30')
    const ninetyDays = page.getByTestId('wird-target-90')
    await thirtyDays.click()
    await expect(thirtyDays).toHaveAttribute('aria-pressed', 'true')
    await expect(ninetyDays).toHaveAttribute('aria-pressed', 'false')
    const thirtyOn = await controlPaint(thirtyDays)
    const ninetyOff = await controlPaint(ninetyDays)
    expect(thirtyOn.backgroundColor).not.toBe(ninetyOff.backgroundColor)
    expect(thirtyOn.borderColor).not.toBe(ninetyOff.borderColor)

    const currentStart = page.locator('.qa-wird-start button', { hasText: 'Current position' })
    const beginningStart = page.locator('.qa-wird-start button', { hasText: 'Beginning' })
    await expect(currentStart).toHaveAttribute('aria-pressed', 'true')
    await expect(beginningStart).toHaveAttribute('aria-pressed', 'false')
    const currentOn = await controlPaint(currentStart)
    const beginningOff = await controlPaint(beginningStart)
    expect(currentOn.backgroundColor).not.toBe(beginningOff.backgroundColor)
    expect(currentOn.borderColor).not.toBe(beginningOff.borderColor)
  })

  test('F-mobile-6: Browse switches between Surah and Juz, and Juz navigation lands in reader @mobile', async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    await page.getByTestId('read-source-juz').click()
    await expect(page.locator('.qa-juz-row')).toHaveCount(30)
    await page.locator('[data-juz="2"] .qa-juz-row-btn').click()

    await expect(page).toHaveURL(/#\/s\/2\/142$/)
    await waitForReader(page)
  })

  test('F-mobile-7: seeded Daily Wird opens detail and Continue routes to nextRef @mobile', async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
    await writeSetting(page, 'wirdPlan', {
      id: 'wird-e2e',
      startRef: { surah: 2, verse: 1 },
      endRef: { surah: 2, verse: 20 },
      targetDays: 2,
      targetEndOn: '2026-05-05',
      startedOn: '2026-05-04',
      unit: 'verse',
      reminder: { enabled: true, time: '08:00', browserNotifications: 'default' },
      progress: {
        lastReadRef: { surah: 2, verse: 1 },
        nextRef: { surah: 2, verse: 8 },
        dayKey: '2026-05-04',
        todayStartRef: { surah: 2, verse: 1 },
        todayEndRef: { surah: 2, verse: 10 },
        completedThroughRef: { surah: 2, verse: 7 },
      },
      history: [],
    })

    await page.reload()
    await waitForReader(page)
    await page.locator('.qa-mh-hamburger').click()
    await page.getByTestId('wird-card').click()
    await expect(page.getByTestId('wird-detail-title')).toBeVisible()
    await page.getByTestId('wird-continue').click()

    await expect(page).toHaveURL(/#\/s\/2\/8$/)
    await waitForReader(page)
  })
})
