/**
 * E2E Journey B: Reader & ambient chrome
 *
 * Covers:
 *   B1. Primary-nav chrome visible on reader (desktop rail / mobile header)
 *   B2. Scroll hides mobile header; scroll near top reveals it (desktop: rail always visible)
 *   B3. Tap verse number → edge indicators appear on both sides
 *   B4. Non-reader routes keep primary nav visible
 *   B5. Font slider live preview
 *   B6. Auto theme follows OS (prefers-color-scheme emulation)
 *   A11y. Axe-core scan of reader surface
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §B
 *   src/navigate/AmbientDock.svelte   (desktop left rail, always visible)
 *   src/navigate/MarginHeader.svelte  (mobile top header, auto-hide on scroll-down)
 *   src/read/EdgeIndicator.svelte
 *   src/configure/Panel.svelte
 *   src/configure/theme.ts
 *   src/configure/font-size.ts
 */

import { test, expect } from '@playwright/test'
import { waitForReader, surfaceDock, openSettingsSheet } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'
import { readSetting, writeSetting } from '../fixtures/idb.js'

// Reuse the onboarded snapshot captured by `tests/e2e/global-setup.ts`.
// Reuse the onboarded snapshot to skip per-test cold-boot setup.
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })

async function mushafLayoutMetrics(page) {
  return page.evaluate(() => {
    const main = document.getElementById('main-content')
    const figure = document.querySelector('.qa-mushaf-page-figure')
    const svg = document.querySelector('.qa-mushaf-svg')
    const controls = document.querySelector('.qa-mushaf-controls')
    if (!main || !figure || !svg || !controls) return null

    const mainRect = main.getBoundingClientRect()
    const figureRect = figure.getBoundingClientRect()
    const header = document.querySelector('.qa-mh')?.getBoundingClientRect()
    const headerOverlap = header && header.bottom > mainRect.top && header.top < mainRect.bottom && window.innerWidth < 1180
      ? Math.max(0, Math.min(header.bottom, mainRect.bottom) - mainRect.top)
      : 0
    const viewBox = svg.getAttribute('viewBox')?.trim().split(/\s+/).map(Number) ?? []
    const margin = 0
    const available = {
      width: Math.max(0, mainRect.width - margin * 2),
      height: Math.max(0, mainRect.height - headerOverlap - margin * 2),
    }
    const resolvedMode = window.innerWidth < 768 || (window.innerWidth < 1180 && window.innerHeight >= window.innerWidth)
      ? 'fit-width'
      : 'fit-page'
    const controlsClearance = resolvedMode === 'fit-page' ? 56 : 0
    const layoutAvailable = {
      width: available.width,
      height: Math.max(0, available.height - controlsClearance),
    }
    const scale = resolvedMode === 'fit-width'
      ? layoutAvailable.width / viewBox[2]
      : Math.min(layoutAvailable.width / viewBox[2], layoutAvailable.height / viewBox[3])
    const expectedWidth = viewBox[2] * scale
    const expectedHeight = viewBox[3] * scale
    const expected = {
      width: expectedWidth,
      height: expectedHeight,
      x: mainRect.left + margin + (resolvedMode === 'fit-width' ? 0 : ((available.width - expectedWidth) / 2)),
      y: mainRect.top + headerOverlap + margin,
    }
    const ancestorFrames = []
    let node = figure
    while (node && node !== document.body) {
      const style = getComputedStyle(node)
      ancestorFrames.push({
        boxShadow: style.boxShadow,
        borderTopWidth: style.borderTopWidth,
      })
      if (node.classList?.contains('qa-mushaf-reader')) break
      node = node.parentElement
    }
    return {
      actual: {
        width: figureRect.width,
        height: figureRect.height,
        x: figureRect.left,
        y: figureRect.top,
        bottom: figureRect.bottom,
      },
      expected,
      available,
      controlsClearance,
      resolvedMode,
      mainBottom: mainRect.bottom,
      mainScrollHeight: main.scrollHeight,
      mainClientHeight: main.clientHeight,
      controlsPosition: getComputedStyle(controls).position,
      ancestorFrames,
    }
  })
}

test.describe('Journey B: Reader & ambient chrome', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // -------------------------------------------------------------------------
  // B1. Primary-nav chrome visible on reader
  // -------------------------------------------------------------------------

  test('B1: primary-nav chrome is visible on reader surface @mobile', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)

    if (isDesktop) {
      // Desktop: left rail always visible, no auto-fade
      const rail = page.locator('#bottom-nav .qa-rail-top')
      await expect(rail).toBeVisible()
      const verseTab = page.locator('.qa-rail-item[data-tab="verse"]')
      const mushafTab = page.locator('.qa-rail-item[data-tab="mushaf"]')
      await expect(verseTab).toBeVisible()
      await expect(mushafTab).toBeVisible()
      // Verse tab should be active on a verse-reader route.
      await expect(verseTab).toHaveClass(/qa-rail-item--active/)
    } else {
      // Mobile: MarginHeader single-row layout.
      const header = page.locator('header.qa-mh')
      await expect(header).toBeVisible()
      await expect(header).not.toHaveClass(/qa-mh--hidden/)
      await expect(page.locator('.qa-mh-hamburger')).toBeVisible()
      await expect(page.locator('.qa-mh-label')).toBeVisible()
      await expect(page.locator('.qa-mh-settings')).toBeVisible()
    }
  })

  test('B1: mobile margin header is a single row, <= 60 px tall @mobile', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    test.skip(isDesktop, 'desktop uses ambient rail, not margin header')

    const header = page.locator('header.qa-mh')
    await expect(header).toBeVisible()

    // Row 2 tabs gone, fast-tag dot gone, old kebab gone
    await expect(page.locator('.qa-mh-tabs')).toHaveCount(0)
    await expect(page.locator('.qa-mh-tag')).toHaveCount(0)
    await expect(page.locator('.qa-mh-icon[data-tab="more"]')).toHaveCount(0)

    const height = await header.evaluate(el => el.getBoundingClientRect().height)
    expect(height).toBeLessThanOrEqual(60)
    expect(height).toBeGreaterThan(40)
  })

  // -------------------------------------------------------------------------
  // B1. @reduced-motion variant — chrome still reaches steady state
  // -------------------------------------------------------------------------

  test('B1: primary nav visible under @reduced-motion @mobile', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await surfaceDock(page)
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    if (isDesktop) {
      await expect(page.locator('[data-tab="more"]:visible').first()).toBeVisible()
    } else {
      await expect(page.locator('.qa-mh-hamburger')).toBeVisible()
    }
  })

  // -------------------------------------------------------------------------
  // B1. @keyboard variant — primary-nav chrome is keyboard-reachable
  // -------------------------------------------------------------------------

  test('B1: primary-nav is keyboard-focusable @keyboard @mobile', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    if (isDesktop) {
      const moreBtn = page.locator('[data-tab="more"]:visible').first()
      await expect(moreBtn).toBeVisible()
      let focused = false
      for (let i = 0; i < 20 && !focused; i++) {
        await page.keyboard.press('Tab')
        focused = await page.evaluate(() => {
          const el = document.activeElement
          return !!el && el.matches('[data-tab="more"]')
        })
      }
      expect(focused).toBe(true)
    } else {
      const hamburger = page.locator('.qa-mh-hamburger')
      await expect(hamburger).toBeVisible()
      let focused = false
      for (let i = 0; i < 20 && !focused; i++) {
        await page.keyboard.press('Tab')
        focused = await page.evaluate(() => {
          const el = document.activeElement
          return !!el && el.classList.contains('qa-mh-hamburger')
        })
      }
      expect(focused).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // B2. Scroll behavior
  //   Desktop: rail is always visible regardless of scroll
  //   Mobile:  MarginHeader auto-hides on scroll-down, reveals near top
  // -------------------------------------------------------------------------

  test('B2: scroll behavior matches viewport (rail always / header auto-hide) @mobile', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)

    if (isDesktop) {
      const rail = page.locator('#bottom-nav .qa-rail-top')
      await expect(rail).toBeVisible()
      // Scroll far down
      await page.evaluate(() => {
        const el = document.getElementById('main-content')
        if (el) { el.scrollTo(0, 1200); el.dispatchEvent(new Event('scroll')) }
      })
      // Rail still visible
      await expect(rail).toBeVisible()
    } else {
      const header = page.locator('header.qa-mh')
      await expect(header).not.toHaveClass(/qa-mh--hidden/)

      // Scroll down past HIDE_DELTA threshold
      await page.evaluate(() => {
        const el = document.getElementById('main-content')
        if (el) { el.scrollTo(0, 500); el.dispatchEvent(new Event('scroll')) }
      })
      await expect(header).toHaveClass(/qa-mh--hidden/, { timeout: 3_000 })

      // Scroll back near the top
      await page.evaluate(() => {
        const el = document.getElementById('main-content')
        if (el) { el.scrollTo(0, 0); el.dispatchEvent(new Event('scroll')) }
      })
      await expect(header).not.toHaveClass(/qa-mh--hidden/, { timeout: 3_000 })
    }
  })

  // -------------------------------------------------------------------------
  // B3. Tap verse number for edge indicator
  // -------------------------------------------------------------------------

  test('B3: tap verse number shows edge indicators on both sides', async ({ page }) => {
    const verseNumber = page.locator('.qa-verse-number').first()
    await expect(verseNumber).toBeVisible({ timeout: 5_000 })
    await verseNumber.click()

    await expect(page.locator('.qa-edge-indicator--left')).toHaveClass(
      /qa-edge-indicator--visible/,
      { timeout: 3_000 }
    )
    await expect(page.locator('.qa-edge-indicator--right')).toHaveClass(
      /qa-edge-indicator--visible/,
      { timeout: 3_000 }
    )
  })

  test('B3: translation stays visible while meaning and theme stay collapsed until the verse is opened', async ({ page }) => {
    await page.goto('/#/s/2/255')
    await waitForReader(page)

    const verse = page.locator('.qa-verse[data-token-key="2:255"]')
    await expect(verse).toBeVisible({ timeout: 5_000 })

    await expect(verse.locator('.qa-verse-translation')).toHaveText(/.+/)
    await expect(verse.locator('.qa-verse-knowledge')).toHaveCount(0)

    await verse.locator('.qa-verse-body-summary').click()

    await expect(verse.locator('.qa-verse-translation')).toHaveText(/.+/)
    await expect(verse.locator('.qa-verse-knowledge')).toBeVisible({ timeout: 10_000 })
    await expect(verse.locator('.qa-verse-themes')).toContainText('tawhid')
    await expect(verse.locator('.qa-verse-context')).toContainText(
      "Allah's oneness, authority, and all-encompassing knowledge"
    )
  })

  // -------------------------------------------------------------------------
  // B4. Non-reader routes keep primary nav visible
  // -------------------------------------------------------------------------

  test('B4: non-reader routes keep primary nav visible @mobile', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    for (const route of ['#/surahs', '#/bookmarks', '#/about']) {
      await page.goto(`/${route}`)
      if (isDesktop) {
        const moreBtn = page.locator('[data-tab="more"]:visible').first()
        await expect(moreBtn).toBeVisible({ timeout: 5_000 })
      } else {
        await expect(page.locator('.qa-mh-hamburger')).toBeVisible({ timeout: 5_000 })
      }
    }
  })

  // -------------------------------------------------------------------------
  // B5. Font slider live preview
  // -------------------------------------------------------------------------

  // B5 font slider → IDB + data-font-size ported to
  // tests/unit/configure/panel.test.ts (Phase 3, 2026-04-26).

  // -------------------------------------------------------------------------
  // B6. Auto theme follows OS (prefers-color-scheme)
  // -------------------------------------------------------------------------

  test('B6: auto theme swatch follows OS color-scheme change', async ({ page }) => {
    await openSettingsSheet(page)

    const autoSwatch = page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Auto' })
    await expect(autoSwatch).toBeVisible()
    await autoSwatch.click()
    await expect(autoSwatch).toHaveAttribute('aria-pressed', 'true', { timeout: 3_000 })

    await expect(async () => {
      const pref = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme-pref')
      )
      expect(pref).toBe('auto')
    }).toPass({ timeout: 3_000 })

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(async () => {
      const theme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      )
      expect(theme).toBe('dark')
    }).toPass({ timeout: 3_000 })

    await page.emulateMedia({ colorScheme: 'light' })
    await expect(async () => {
      const theme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      )
      expect(theme).toBe('light')
    }).toPass({ timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // B7. Scroll position survives warm-resume (iOS lock/unlock regression)
  //
  // Repro of 2026-04 bug: user deep in a surah, screen locks, screen unlocks
  // → reader snaps back to verse 1.  Root cause was the `DB_VISIBILITY_VISIBLE`
  // handler unconditionally scroll-restoring from IDB (which could be stale
  // mid hide-time save) even when the browser had already preserved scroll.
  // -------------------------------------------------------------------------

  test('B7: warm-resume (visibilitychange hidden→visible) preserves scroll position', async ({ page }) => {
    await page.goto('/#/s/2')
    await waitForReader(page)

    // Scroll deep into the surah and let the debounce settle so the tracker
    // has a non-null `lastTrackedVerse`.
    await page.evaluate(() => {
      const el = document.getElementById('main-content')
      if (el) { el.scrollTo(0, 6000); el.dispatchEvent(new Event('scroll')) }
    })
    // Poll until the scroll-tracker debounce fires and writes the deep
    // position to IDB, signalling lastTrackedVerse is populated.
    await expect.poll(async () => page.evaluate(() => new Promise((resolve) => {
      const open = indexedDB.open('quran-atlas')
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction('settings', 'readonly')
        const req = tx.objectStore('settings').get('currentPosition')
        req.onsuccess = () => { resolve(req.result?.value?.verse ?? 0); db.close() }
        req.onerror = () => { resolve(0); db.close() }
      }
      open.onerror = () => resolve(0)
    })), { timeout: 5_000 }).toBeGreaterThan(1)

    const before = await page.evaluate(() => {
      const el = document.getElementById('main-content')
      return el?.scrollTop ?? 0
    })
    expect(before).toBeGreaterThan(1000)

    // Simulate iOS lock (hidden).  Playwright cannot flip `document.hidden`
    // natively, so override the getters and fire `visibilitychange` manually.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // Simulate the race that made the original bug observable: IDB holds a
    // STALE early verse (e.g. a prior write that the hide-time save never
    // replaced before the tab was suspended) while the browser has
    // preserved scroll. Write the global currentPosition record AFTER the
    // hide-time save has already run so persistOnExit doesn't overwrite
    // the stale value back.
    await page.evaluate(async () => {
      const dbReq = indexedDB.open('quran-atlas')
      await new Promise((resolve) => {
        dbReq.onsuccess = () => {
          const db = dbReq.result
          const tx = db.transaction('settings', 'readwrite')
          tx.objectStore('settings').put({ key: 'currentPosition', value: { surah: 2, verse: 1 } })
          tx.oncomplete = () => resolve(undefined)
          tx.onerror = () => resolve(undefined)
        }
        dbReq.onerror = () => resolve(undefined)
      })
    })

    // Unlock.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // Scroll must not be reset toward the top (buggy warm-resume handler
    // would have called `scrollToVerse(1)` via stale IDB and driven scrollTop
    // back near 0). Poll over the warm-resume window — buggy code would
    // converge to ~0; correct code keeps scrollTop > 1000 throughout.
    await expect.poll(async () => page.evaluate(() => {
      const el = document.getElementById('main-content')
      return el?.scrollTop ?? 0
    }), { timeout: 2_500, intervals: [200, 400, 600, 800] }).toBeGreaterThan(1000)
  })

  // -------------------------------------------------------------------------
  // B-Mushaf. Page-image reader mode
  // -------------------------------------------------------------------------

  test('B-Mushaf: desktop rail switches between Verse and Mushaf modes @desktop', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    test.skip(!isDesktop, 'desktop rail only')

    await page.goto('/#/s/2/255')
    await waitForReader(page)
    await page.locator('.qa-rail-item[data-tab="mushaf"]').click()
    await expect(page).toHaveURL(/#\/m\/\d+$/)
    await expect(page.locator('.qa-mushaf-page-figure')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.qa-rail-item[data-tab="mushaf"]')).toHaveClass(/qa-rail-item--active/)

    await page.locator('.qa-rail-item[data-tab="verse"]').click()
    await expect(page).toHaveURL(/#\/s\//)
    await waitForReader(page)
  })

  test('B-Mushaf: page controls update hash and boundaries hold', async ({ page }) => {
    await page.goto('/#/m/1')
    await expect(page.locator('.qa-mushaf-page-figure')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Return to previous Mushaf page' })).toBeDisabled()
    await expect(page.locator('.qa-mushaf-scrubber')).toHaveCount(0)

    await page.getByRole('button', { name: 'Advance Mushaf page' }).click()
    await expect(page).toHaveURL(/#\/m\/2$/)

    await page.getByRole('button', { name: /Jump from Mushaf page 2/ }).click()
    await page.getByRole('spinbutton', { name: 'Mushaf page number' }).fill('42')
    await page.getByRole('spinbutton', { name: 'Mushaf page number' }).press('Enter')
    await expect(page).toHaveURL(/#\/m\/42$/)
    await expect(page.locator('.qa-mushaf-page-figure[data-page="42"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('spinbutton', { name: 'Mushaf page number' })).toHaveCount(0)

    await page.keyboard.press('ArrowLeft')
    await expect(page).toHaveURL(/#\/m\/43$/)
    await expect(page.locator('.qa-mushaf-page-figure[data-page="43"]')).toBeVisible({ timeout: 10_000 })
    await page.keyboard.press('ArrowRight')
    await expect(page).toHaveURL(/#\/m\/42$/)
  })

  test('B-Mushaf: invalid page route clamps to the manifest boundary', async ({ page }) => {
    await page.goto('/#/m/999')
    await expect(page.locator('.qa-mushaf-page-figure')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/#\/m\/604$/)
  })

  test('B-Mushaf: unavailable active riwayah shows install prompt instead of fallback page @desktop', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    test.skip(!isDesktop, 'desktop settings prompt check')

    await writeSetting(page, 'riwayah', 'hafs')
    await page.goto('/#/m/42')
    await page.reload()
    await expect(page).toHaveURL(/#\/m\/42$/)
    await expect(page.getByRole('button', { name: 'Install text and pages' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Stay on current usable riwayah' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
    await expect(page.locator('.qa-mushaf-page-figure')).toHaveCount(0)

    await page.getByRole('button', { name: 'Stay on current usable riwayah' }).click()
    await expect.poll(() => readSetting(page, 'riwayah')).toBe('qaloon')
  })

  test('B-Mushaf: measured page layout is unframed across mobile and desktop viewports', async ({ page }) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
      await page.setViewportSize(viewport)
      await expect.poll(() => page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))).toEqual(viewport)
      await page.goto('/#/m/1')
      await expect(page.locator('.qa-mushaf-page-figure')).toBeVisible({ timeout: 10_000 })

      await expect.poll(async () => {
        const metrics = await mushafLayoutMetrics(page)
        if (!metrics) return Number.POSITIVE_INFINITY
        return Math.max(
          Math.abs(metrics.actual.width - metrics.expected.width),
          Math.abs(metrics.actual.height - metrics.expected.height),
          Math.abs(metrics.actual.x - metrics.expected.x),
          Math.abs(metrics.actual.y - metrics.expected.y),
        )
      }).toBeLessThanOrEqual(2)

      const metrics = await mushafLayoutMetrics(page)
      expect(metrics).not.toBeNull()
      expect(metrics.actual.width).toBeGreaterThanOrEqual(metrics.expected.width - 2)
      expect(metrics.controlsPosition).toBe('fixed')
      if (metrics.resolvedMode === 'fit-width') {
        expect(metrics.actual.width).toBeGreaterThanOrEqual(metrics.available.width - 2)
        if (metrics.expected.height > metrics.available.height + 2) {
          expect(metrics.actual.bottom).toBeGreaterThan(metrics.mainBottom)
          expect(metrics.mainScrollHeight).toBeGreaterThan(metrics.mainClientHeight)
        }
      } else {
        expect(metrics.actual.bottom).toBeLessThanOrEqual(metrics.mainBottom - metrics.controlsClearance + 2)
        expect(metrics.mainScrollHeight).toBeLessThanOrEqual(metrics.mainClientHeight + 2)
      }
      for (const frame of metrics.ancestorFrames) {
        expect(frame.boxShadow).toBe('none')
        expect(Number.parseFloat(frame.borderTopWidth)).toBe(0)
      }
    }
  })

  test('B-Mushaf: mobile page fits below the margin header without overlap @mobile', async ({ page }, testInfo) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    test.skip(isDesktop, 'mobile header overlap check')

    await page.goto('/#/m/42')
    await expect(page.locator('.qa-mushaf-page-figure')).toBeVisible({ timeout: 10_000 })

    const metrics = await page.evaluate(() => {
      const header = document.querySelector('.qa-mh')?.getBoundingClientRect()
      const figure = document.querySelector('.qa-mushaf-page-figure')?.getBoundingClientRect()
      const chip = document.querySelector('.qa-mushaf-page-chip')?.getBoundingClientRect()
      if (!header || !figure || !chip) {
        return null
      }
      return {
        headerBottom: header.bottom,
        figureTop: figure.top,
        figureBottom: figure.bottom,
        chipTop: chip.top,
        chipBottom: chip.bottom,
        viewportHeight: window.innerHeight,
        bodyOverflow: document.documentElement.scrollWidth > window.innerWidth,
      }
    })
    expect(metrics).not.toBeNull()
    expect(metrics.figureTop).toBeGreaterThanOrEqual(metrics.headerBottom - 1)
    expect(metrics.chipBottom).toBeLessThanOrEqual(metrics.viewportHeight)
    expect(metrics.bodyOverflow).toBe(false)

    await page.screenshot({ path: testInfo.outputPath('mushaf-mobile-page.png'), fullPage: true })
  })

  test('B-Mushaf: inline SVG themes and controls stay accessible @a11y', async ({ page }, testInfo) => {
    await page.goto('/#/m/294')
    await expect(page.locator('.qa-mushaf-page-figure')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.qa-mushaf-page-img')).toHaveCount(0)

    const tokenSamples = []
    for (const theme of ['light', 'sepia', 'dark']) {
      await page.evaluate((nextTheme) => {
        document.documentElement.setAttribute('data-theme', nextTheme)
      }, theme)
      await page.screenshot({ path: testInfo.outputPath(`mushaf-${theme}.png`), fullPage: true })
      tokenSamples.push(await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement)
        const svg = document.querySelector('.qa-mushaf-svg')
        const groundPath = document.querySelector('.qa-mushaf-svg [fill="var(--qa-mushaf-ground)"]')
        const inkPath = document.querySelector('.qa-mushaf-svg [fill="var(--qa-mushaf-ink)"]')
        const svgStyle = svg ? getComputedStyle(svg) : null
        const readerStyle = getComputedStyle(document.querySelector('.qa-mushaf-reader'))
        const figureStyle = getComputedStyle(document.querySelector('.qa-mushaf-page-figure'))
        return {
          appSurface: root.getPropertyValue('--qa-surface-app').trim(),
          ground: getComputedStyle(groundPath).fill,
          ink: getComputedStyle(inkPath).fill,
          ornament: root.getPropertyValue('--qa-mushaf-ornament').trim(),
          accent: root.getPropertyValue('--qa-mushaf-accent').trim(),
          readerBackground: readerStyle.backgroundColor,
          figureBackground: figureStyle.backgroundColor,
          filter: svgStyle?.filter,
          imageRendering: svgStyle?.imageRendering,
        }
      }))
    }

    expect(new Set(tokenSamples.map(sample => sample.ground)).size).toBe(3)
    expect(new Set(tokenSamples.map(sample => sample.ink)).size).toBe(3)
    expect(new Set(tokenSamples.map(sample => sample.ornament)).size).toBe(3)
    for (const sample of tokenSamples) {
      expect(sample.ground).toBe(sample.readerBackground)
      expect(sample.ground).toBe(sample.figureBackground)
      expect(sample.filter).toBe('none')
      expect(sample.imageRendering).not.toBe('pixelated')
    }

    const violations = await scanA11y(page)
    expect(violations).toEqual([])

    const labels = []
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab')
      labels.push(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? ''))
    }
    expect(labels).toContain('Advance Mushaf page')
    expect(labels).toContain('Return to previous Mushaf page')
    expect(labels.some(label => label.startsWith('Jump from Mushaf page'))).toBe(true)

    await page.getByRole('button', { name: /Jump from Mushaf page/ }).press('Enter')
    await expect(page.getByRole('spinbutton', { name: 'Mushaf page number' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: /Jump from Mushaf page/ })).toBeFocused()
  })

  // -------------------------------------------------------------------------
  // B-Cross: Cross-surah infinite scroll (2026-04-25)
  //
  // Reader is single-surah; scrolling past the end of N or top of N swaps
  // the mounted surah to N+1 / N-1 with wrap (114 ↔ 1). Continue links
  // provide an explicit affordance; overscroll triggers the same swap.
  // -------------------------------------------------------------------------

  test('B: a11y — no serious/critical axe violations on reader surface @a11y', async ({ page }) => {
    await surfaceDock(page)
    const violations = await scanA11y(page)
    expect(violations).toEqual([])
  })

  // -------------------------------------------------------------------------
  // B-Riwayah. Riwayah rendering (KFGQPC rewire)
  //   Default is Qālūn — Maghrebi orthography with small alif before lam.
  //   Switching via Settings swatches re-renders with Ḥafṣ orthography.
  // -------------------------------------------------------------------------
})
