/**
 * E2E Journey B: Reader & ambient chrome
 *
 * Covers:
 *   B1. Tap to surface chrome (happy path + @reduced-motion variant + @keyboard variant)
 *   B2. Scroll hides dock, scroll-to-top surfaces it
 *   B3. Tap verse number for edge indicator
 *   B4. Non-reader routes → persistent dock, no pill
 *   B5. Font slider live preview
 *   B6. Auto theme follows OS (prefers-color-scheme emulation)
 *   A11y. Axe-core scan of reader surface
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §B
 *   src/nav/ambient-dock.js
 *   src/nav/ambient-pill.js
 *   src/reader/index.js
 *   src/settings/panel.js
 *   src/settings/theme.js
 *   src/settings/font-size.js
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, readSetting } from './fixtures/idb.js'
import { waitForReader, surfaceDock, openSettingsSheet } from './fixtures/chrome.js'
import { scanA11y } from './fixtures/a11y.js'

// ---------------------------------------------------------------------------
// Shared setup: clean IDB + skip onboarding + navigate to reader
// ---------------------------------------------------------------------------

test.describe('Journey B: Reader & ambient chrome', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // -------------------------------------------------------------------------
  // B1. Tap to surface chrome — happy path
  // -------------------------------------------------------------------------

  test('B1: tap reader body surfaces dock and pill; both fade after ~3s', async ({ page }) => {
    const dock = page.locator('#bottom-nav')
    const pill = page.locator('.qa-pill-ref')

    // Tap reader body to trigger AMBIENT_SURFACE
    await page.locator('#main-content').click({ position: { x: 50, y: 50 } })

    // Dock should surface (hidden class removed)
    await expect(dock).not.toHaveClass(/qa-dock--hidden/, { timeout: 3_000 })

    // Pill should surface and show surah:verse reference text
    await expect(pill).not.toHaveClass(/qa-pill-ref--hidden/, { timeout: 3_000 })
    const pillText = page.locator('.qa-pill-ref-text')
    await expect(pillText).toContainText('1:')

    // After ~3s with no further input both should fade out (AUTO_FADE_MS = 2800ms)
    await expect(dock).toHaveClass(/qa-dock--hidden/, { timeout: 6_000 })
    await expect(pill).toHaveClass(/qa-pill-ref--hidden/, { timeout: 6_000 })
  })

  // -------------------------------------------------------------------------
  // B1. @reduced-motion variant — no hang when animations are disabled
  // -------------------------------------------------------------------------

  test('B1: tap-to-surface @reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })

    const dock = page.locator('#bottom-nav')
    const pill = page.locator('.qa-pill-ref')

    await page.locator('#main-content').click({ position: { x: 50, y: 50 } })

    // Chrome surfaces even under reduced-motion
    await expect(dock).not.toHaveClass(/qa-dock--hidden/, { timeout: 3_000 })
    await expect(pill).not.toHaveClass(/qa-pill-ref--hidden/, { timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // B1. @keyboard variant — pill is keyboard-focusable
  // -------------------------------------------------------------------------

  test('B1: ambient pill is keyboard-focusable @keyboard', async ({ page }) => {
    // Surface the pill first via a tap so it exists and is revealed
    await page.locator('#main-content').click({ position: { x: 50, y: 50 } })
    const pill = page.locator('.qa-pill-ref')
    await expect(pill).not.toHaveClass(/qa-pill-ref--hidden/, { timeout: 3_000 })

    // Pill should be keyboard-focusable (tabindex="0", role="button")
    await expect(pill).toHaveAttribute('tabindex', '0')
    await expect(pill).toHaveAttribute('role', 'button')

    // Tab to it and verify focus lands on the pill
    let pillFocused = false
    for (let i = 0; i < 15 && !pillFocused; i++) {
      await page.keyboard.press('Tab')
      pillFocused = await page.evaluate(() =>
        document.activeElement?.classList.contains('qa-pill-ref') ?? false
      )
    }
    expect(pillFocused).toBe(true)
  })

  // -------------------------------------------------------------------------
  // B2. Scroll hides dock, scroll-to-top surfaces it
  // -------------------------------------------------------------------------

  test('B2: scroll down hides dock; scroll near top surfaces dock', async ({ page }) => {
    const dock = page.locator('#bottom-nav')

    // Surface the dock first so we have a known state
    await surfaceDock(page)
    await expect(dock).not.toHaveClass(/qa-dock--hidden/)

    // Scroll down enough to trigger hide (HIDE_DELTA = 40px threshold)
    await page.evaluate(() => {
      const el = document.getElementById('main-content')
      if (el) { el.scrollTo(0, 500); el.dispatchEvent(new Event('scroll')) }
    })
    await expect(dock).toHaveClass(/qa-dock--hidden/, { timeout: 3_000 })

    // Scroll back near the top (< SHOW_NEAR_TOP = 20px)
    await page.evaluate(() => {
      const el = document.getElementById('main-content')
      if (el) { el.scrollTo(0, 0); el.dispatchEvent(new Event('scroll')) }
    })
    await expect(dock).not.toHaveClass(/qa-dock--hidden/, { timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // B3. Tap verse number for edge indicator
  // -------------------------------------------------------------------------

  test('B3: tap verse number shows edge indicators on both sides', async ({ page }) => {
    // Tap the first verse number circle
    const verseNumber = page.locator('.qa-verse-number').first()
    await expect(verseNumber).toBeVisible({ timeout: 5_000 })
    await verseNumber.click()

    // Both edge indicators should appear within ~1.6s
    await expect(page.locator('.qa-edge-indicator--left')).toHaveClass(
      /qa-edge-indicator--visible/,
      { timeout: 3_000 }
    )
    await expect(page.locator('.qa-edge-indicator--right')).toHaveClass(
      /qa-edge-indicator--visible/,
      { timeout: 3_000 }
    )

    // Pill should also surface (showEdges emits AMBIENT_SURFACE)
    await expect(page.locator('.qa-pill-ref')).not.toHaveClass(
      /qa-pill-ref--hidden/,
      { timeout: 3_000 }
    )
  })

  // -------------------------------------------------------------------------
  // B4. Non-reader routes → persistent dock, no pill
  // -------------------------------------------------------------------------

  test('B4: non-reader routes show persistent dock and hidden pill', async ({ page }) => {
    const dock = page.locator('#bottom-nav')
    const pill = page.locator('.qa-pill-ref')

    for (const route of ['#/surahs', '#/review', '#/about']) {
      await page.goto(`/${route}`)

      // Dock must be visible without needing a tap (persistent on non-reader routes)
      await expect(dock).not.toHaveClass(/qa-dock--hidden/, { timeout: 5_000 })

      // Pill must remain hidden on all non-reader routes
      await expect(pill).toHaveClass(/qa-pill-ref--hidden/)
    }
  })

  // -------------------------------------------------------------------------
  // B5. Font slider live preview
  // -------------------------------------------------------------------------

  test('B5: font slider writes settings and updates preview scale', async ({ page }) => {
    await openSettingsSheet(page)

    const slider = page.locator('.qa-font-slider')
    await expect(slider).toBeVisible()

    // Get current index value and increment it (wrapping at max=4 back to 0)
    // Font-size system: 5 steps — xs(0), sm(1), md(2), lg(3), xl(4)
    const current = await slider.inputValue()
    const currentIdx = parseInt(current, 10)
    const nextIdx = currentIdx < 4 ? currentIdx + 1 : 0
    const nextSize = ['xs', 'sm', 'md', 'lg', 'xl'][nextIdx]

    // Drag slider to new position
    await slider.fill(String(nextIdx))
    // Dispatch 'input' event so the listener fires (fill may not trigger it in all browsers)
    await slider.dispatchEvent('input')

    // <html data-font-size> should update to the new size name
    await expect(async () => {
      const attr = await page.evaluate(() =>
        document.documentElement.getAttribute('data-font-size')
      )
      expect(attr).toBe(nextSize)
    }).toPass({ timeout: 3_000 })

    // Font preview line in settings should reflect the change (it shares --qa-font-size-base)
    const preview = page.locator('.qa-font-preview-en')
    await expect(preview).toBeVisible()

    // Verify IDB persisted the new size
    expect(await readSetting(page, 'fontSize')).toBe(nextSize)
  })

  // -------------------------------------------------------------------------
  // B6. Auto theme follows OS (prefers-color-scheme)
  // -------------------------------------------------------------------------

  test('B6: auto theme swatch follows OS color-scheme change', async ({ page }) => {
    await openSettingsSheet(page)

    // Activate the Auto swatch
    const autoSwatch = page.locator('.qa-theme-swatch--auto')
    await expect(autoSwatch).toBeVisible()
    await autoSwatch.click()
    await expect(autoSwatch).toHaveClass(/qa-theme-swatch--active/, { timeout: 3_000 })

    // With Auto active, html[data-theme-pref] should be 'auto'
    await expect(async () => {
      const pref = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme-pref')
      )
      expect(pref).toBe('auto')
    }).toPass({ timeout: 3_000 })

    // Emulate OS switching to dark
    await page.emulateMedia({ colorScheme: 'dark' })

    // The auto listener in theme.js should flip <html data-theme> to 'dark'
    await expect(async () => {
      const theme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      )
      expect(theme).toBe('dark')
    }).toPass({ timeout: 3_000 })

    // Emulate OS switching back to light
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
    // Surface the dock so the full ambient chrome is in the DOM
    await surfaceDock(page)

    const violations = await scanA11y(page)
    expect(violations).toEqual([])
  })
})
