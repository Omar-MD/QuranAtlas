/**
 * E2E Journey D: Settings & appearance
 *
 * Covers:
 *   D1. Open Settings sheet (happy path, structure check, a11y scan)
 *   D2. Pick a translation + visibility toggle
 *   D3. Theme swap for all 4 themes (light / sepia / dark / auto)
 *   D4. Clear all data → onboarding restart; and Cancel does nothing
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §D
 *   src/configure/panel.js
 *   src/configure/theme.js
 *   src/configure/clear-data.js
 */

import { test, expect } from '@playwright/test'
import { waitForReader, openSettingsSheet } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'

// Reuse the onboarded snapshot captured by `tests/e2e/global-setup.ts`.
// Reuse the onboarded snapshot to skip per-test cold-boot setup. The 5
// nested beforeEach blocks below stay separate (different viewports) but
// no longer carry redundant clearAllData + markOnboardingComplete pairs.
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

test.describe('Journey D: Settings & appearance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // -------------------------------------------------------------------------
  // D1. Open Settings sheet — a11y scan only.
  // Structural / Escape / clear-data-row-absence / theme-swap / Riwayah-swatch
  // / translation-toggle / typography-subview-structure / reset-button checks
  // ported to tests/unit/configure/panel.test.ts (Phase 2 bucket 1, 2026-04-26).
  // -------------------------------------------------------------------------

  test('D6: settings control toggles data-night-mode + overlay opacity', async ({ page }) => {
    await openSettingsSheet(page)
    const nightMode = page.getByRole('group', { name: 'Night mode' })
    const off = nightMode.getByRole('button', { name: 'Off' })
    const on = nightMode.getByRole('button', { name: 'On' })
    await expect(off).toHaveAttribute('aria-pressed', 'true')
    await expect(on).toHaveAttribute('aria-pressed', 'false')

    await on.click()
    await expect(on).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-night-mode'))).toBe('on')
    await expect(async () => {
      const opacity = await page.locator('.qa-night-shift').evaluate(
        (el) => parseFloat(getComputedStyle(el).opacity)
      )
      expect(opacity).toBeGreaterThan(0)
    }).toPass({ timeout: 3_000 })

    await off.click()
    await expect(off).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-night-mode'))).toBe(false)
  })

  // D6 persist-across-reload covered by tests/unit/configure/night-mode.test.ts
  // initNightMode + setNightMode (Phase 2 bucket 1, 2026-04-26).

  test('D6: pressing n on reader toggles night mode @keyboard', async ({ page }) => {
    await page.locator('#main-content').focus()
    await page.keyboard.press('n')
    await expect(async () => {
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-night-mode'))).toBe('on')
    }).toPass({ timeout: 3_000 })

    await page.keyboard.press('n')
    await expect(async () => {
      expect(await page.evaluate(() => document.documentElement.hasAttribute('data-night-mode'))).toBe(false)
    }).toPass({ timeout: 3_000 })
  })
})
