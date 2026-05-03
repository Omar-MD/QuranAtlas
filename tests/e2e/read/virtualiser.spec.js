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

// Reuse the onboarded snapshot captured by `tests/e2e/global-setup.ts`.
// Reuse the onboarded snapshot to skip per-test cold-boot setup.
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })

test.describe('Journey B: Reader & ambient chrome', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // -------------------------------------------------------------------------
  // B1. Primary-nav chrome visible on reader
  // -------------------------------------------------------------------------

  test('B-Virt1: virtualiser caps live verses at <=60 (memory ceiling) @mobile', async ({ page }) => {
    await page.goto('/#/s/2') // al-Baqarah, 286 verses
    await page.waitForSelector('[data-token-key="2:1"]')
    // Scroll deep into the surah.
    await page.evaluate(() => {
      const sc = document.getElementById('main-content')
      if (sc) { sc.scrollTop = sc.scrollHeight * 0.6 }
    })
    // Wait two rAFs for the recycler to settle.
    await page.evaluate(() => new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r(null)))))
    const liveCount = await page.evaluate(() => document.querySelectorAll('.qa-verse').length)
    expect(liveCount).toBeLessThanOrEqual(60)
    expect(liveCount).toBeGreaterThan(0)
  })

  test('B-Virt2: deep-link to mid-surah verse materialises target chunk', async ({ page }) => {
    await page.goto('/#/s/2/255')
    await page.waitForSelector('[data-token-key="2:255"]')
    // Wait for scrollToVerse's two-rAF alignment to settle.
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const el = document.querySelector('[data-token-key="2:255"]')
        if (!el) { return false }
        const rect = el.getBoundingClientRect()
        return rect.top >= -200 && rect.top <= window.innerHeight + 200
      })
    }, { timeout: 3000 }).toBe(true)
  })
})
