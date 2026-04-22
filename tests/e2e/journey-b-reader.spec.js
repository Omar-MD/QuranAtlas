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
 *   src/nav/AmbientDock.svelte   (desktop left rail, always visible)
 *   src/nav/MarginHeader.svelte  (mobile top header, auto-hide on scroll-down)
 *   src/reader/EdgeIndicator.svelte
 *   src/settings/Panel.svelte
 *   src/settings/theme.ts
 *   src/settings/font-size.ts
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, readSetting } from './fixtures/idb.js'
import { waitForReader, surfaceDock, openSettingsSheet } from './fixtures/chrome.js'
import { scanA11y } from './fixtures/a11y.js'

test.describe('Journey B: Reader & ambient chrome', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // -------------------------------------------------------------------------
  // B1. Primary-nav chrome visible on reader
  // -------------------------------------------------------------------------

  test('B1: primary-nav chrome is visible on reader surface', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)

    if (isDesktop) {
      // Desktop: left rail always visible, no auto-fade
      const rail = page.locator('#bottom-nav .qa-rail-top')
      await expect(rail).toBeVisible()
      const readTab = page.locator('.qa-rail-item[data-tab="read"]')
      await expect(readTab).toBeVisible()
      // Read tab should be active on a reader route
      await expect(readTab).toHaveClass(/qa-rail-item--active/)
    } else {
      // Mobile: MarginHeader top bar visible with crumb + more
      const header = page.locator('header.qa-mh')
      await expect(header).toBeVisible()
      await expect(header).not.toHaveClass(/qa-mh--hidden/)
      await expect(page.locator('.qa-mh-crumb')).toBeVisible()
      await expect(page.locator('.qa-mh-icon[data-tab="more"]')).toBeVisible()
    }
  })

  // -------------------------------------------------------------------------
  // B1. @reduced-motion variant — chrome still reaches steady state
  // -------------------------------------------------------------------------

  test('B1: primary nav visible under @reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await surfaceDock(page)
    await expect(page.locator('[data-tab="more"]:visible').first()).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // B1. @keyboard variant — primary-nav chrome is keyboard-reachable
  // -------------------------------------------------------------------------

  test('B1: primary-nav more button is keyboard-focusable @keyboard', async ({ page }) => {
    const moreBtn = page.locator('[data-tab="more"]:visible').first()
    await expect(moreBtn).toBeVisible()
    // Tab through focusable elements and confirm the More button can receive focus
    let moreFocused = false
    for (let i = 0; i < 20 && !moreFocused; i++) {
      await page.keyboard.press('Tab')
      moreFocused = await page.evaluate(() => {
        const el = document.activeElement
        return !!el && el.matches('[data-tab="more"]')
      })
    }
    expect(moreFocused).toBe(true)
  })

  // -------------------------------------------------------------------------
  // B2. Scroll behavior
  //   Desktop: rail is always visible regardless of scroll
  //   Mobile:  MarginHeader auto-hides on scroll-down, reveals near top
  // -------------------------------------------------------------------------

  test('B2: scroll behavior matches viewport (rail always / header auto-hide)', async ({ page }) => {
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

  // -------------------------------------------------------------------------
  // B4. Non-reader routes keep primary nav visible
  // -------------------------------------------------------------------------

  test('B4: non-reader routes keep primary nav visible', async ({ page }) => {
    for (const route of ['#/surahs', '#/review', '#/about']) {
      await page.goto(`/${route}`)
      const moreBtn = page.locator('[data-tab="more"]:visible').first()
      await expect(moreBtn).toBeVisible({ timeout: 5_000 })
    }
  })

  // -------------------------------------------------------------------------
  // B5. Font slider live preview
  // -------------------------------------------------------------------------

  test('B5: font slider writes settings and updates preview scale', async ({ page }) => {
    await openSettingsSheet(page)

    const slider = page.locator('.qa-font-slider')
    await expect(slider).toBeVisible()

    const current = await slider.inputValue()
    const currentIdx = parseInt(current, 10)
    const nextIdx = currentIdx < 4 ? currentIdx + 1 : 0
    const nextSize = ['xs', 'sm', 'md', 'lg', 'xl'][nextIdx]

    await slider.fill(String(nextIdx))
    await slider.dispatchEvent('input')

    await expect(async () => {
      const attr = await page.evaluate(() =>
        document.documentElement.getAttribute('data-font-size')
      )
      expect(attr).toBe(nextSize)
    }).toPass({ timeout: 3_000 })

    const preview = page.locator('.qa-font-preview-en')
    await expect(preview).toBeVisible()

    expect(await readSetting(page, 'fontSize')).toBe(nextSize)
  })

  // -------------------------------------------------------------------------
  // B6. Auto theme follows OS (prefers-color-scheme)
  // -------------------------------------------------------------------------

  test('B6: auto theme swatch follows OS color-scheme change', async ({ page }) => {
    await openSettingsSheet(page)

    const autoSwatch = page.locator('.qa-theme-swatch--auto')
    await expect(autoSwatch).toBeVisible()
    await autoSwatch.click()
    await expect(autoSwatch).toHaveClass(/qa-theme-swatch--active/, { timeout: 3_000 })

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
  // A11y — Axe-core scan of the reader surface
  // -------------------------------------------------------------------------

  test('B: a11y — no serious/critical axe violations on reader surface @a11y', async ({ page }) => {
    await surfaceDock(page)
    const violations = await scanA11y(page)
    expect(violations).toEqual([])
  })
})
