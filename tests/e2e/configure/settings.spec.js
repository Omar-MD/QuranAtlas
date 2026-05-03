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

  test('D1: a11y — no serious/critical axe violations on open Settings sheet @a11y', async ({ page }) => {
    await openSettingsSheet(page)
    const violations = await scanA11y(page, { include: ['.qa-sheet--settings'] })
    expect(violations).toEqual([])
  })

  // D3-bg: <html> background matches <body> background under every theme so
  // that mobile-landscape safe-area gutters do not leak the UA default white.
  // <meta name="theme-color"> tracks --qa-surface-app so PWA chrome retints.
  for (const theme of ['light', 'sepia', 'dark']) {
    test(`D3-bg: ${theme} → html bg + theme-color meta match --qa-surface-app`, async ({ page }) => {
      await openSettingsSheet(page)
      await page.locator(`.qa-settings-tf-dot--${theme}`).click()
      await expect(async () => {
        const pref = await page.evaluate(() =>
          document.documentElement.getAttribute('data-theme')
        )
        expect(pref).toBe(theme)
      }).toPass({ timeout: 3_000 })

      let snapshot
      await expect(async () => {
        snapshot = await page.evaluate(() => {
          const root = document.documentElement
          const surface = getComputedStyle(root).getPropertyValue('--qa-surface-app').trim()
          return {
            surface,
            htmlBg: getComputedStyle(root).backgroundColor,
            bodyBg: getComputedStyle(document.body).backgroundColor,
            metaThemeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null,
          }
        })
        expect(snapshot.htmlBg).toBe(snapshot.bodyBg)
      }).toPass({ timeout: 3_000 })

      expect(snapshot.htmlBg).not.toBe('rgba(0, 0, 0, 0)')
      expect(snapshot.metaThemeColor).toBe(snapshot.surface)
    })
  }

  // -------------------------------------------------------------------------
  // D4. Clear all data
  // -------------------------------------------------------------------------

  test('D4: Clear data → type DELETE → confirm → page reloads → onboarding restarts', async ({ page }) => {
    // Post-2026-04-25: Clear-data lives on About page footer.
    await page.goto('/#/about')
    await expect(page.locator('.qa-about-heading')).toBeVisible({ timeout: 5_000 })
    const clearRow = page.locator('.qa-about-clear-data')
    await expect(clearRow).toBeVisible({ timeout: 5_000 })
    await clearRow.click()

    // Confirmation dialog appears: .qa-modal-backdrop with role="dialog"
    const backdrop = page.locator('.qa-modal-backdrop')
    await expect(backdrop).toBeVisible({ timeout: 5_000 })

    // Modal body is visible
    const modal = backdrop.locator('.qa-modal')
    await expect(modal).toBeVisible()

    // Title reads "Clear All Data?"
    await expect(modal.locator('h2')).toHaveText('Clear All Data?')

    // Confirm button starts disabled
    const confirmBtn = modal.locator('.qa-mark-btn--danger-primary')
    await expect(confirmBtn).toBeDisabled()

    // Cancel button is visible
    const cancelVisible = modal.locator('.qa-mark-btn--ghost')
    await expect(cancelVisible).toBeVisible()

    // Type DELETE in the confirmation input
    const confirmInput = modal.locator('.qa-input-confirm')
    await expect(confirmInput).toBeVisible()
    await confirmInput.fill('DELETE')

    // Confirm button should now be enabled
    await expect(confirmBtn).toBeEnabled({ timeout: 3_000 })

    // Click confirm and wait for the page reload
    const reloadPromise = page.waitForEvent('load')
    await confirmBtn.click()
    await reloadPromise

    // After reload, first-run onboarding (A1) should start fresh
    await expect(page.locator('.qa-onboarding')).toBeVisible({ timeout: 10_000 })
  })

  // D4 cancel / Escape / disabled-until-DELETE ported to
  // tests/unit/configure/clear-data-confirm.test.ts (Phase 2 bucket 1, 2026-04-26).
  // The reload→onboarding leg of D4 happy path stays e2e (real reload).
})

// ---------------------------------------------------------------------------
// D7. Mobile gear double-tap → cycleTheme (replaced long-press 2026-04-26).
// ---------------------------------------------------------------------------

test.describe('Journey D: Mobile gear double-tap @mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  test('D7: double-tap gear cycles theme; settings sheet stays closed', async ({ page }) => {
    const gear = page.locator('.qa-mh-settings')
    await expect(gear).toBeVisible({ timeout: 5_000 })

    const before = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme-pref') ?? 'light'
    )

    // Two clicks well within the 300ms double-tap window.
    const box = await gear.boundingBox()
    if (!box) { throw new Error('gear not measurable') }
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    await page.mouse.click(cx, cy, { delay: 0 })
    await page.mouse.click(cx, cy, { delay: 0 })

    await expect.poll(async () => page.evaluate(() =>
      document.documentElement.getAttribute('data-theme-pref') ?? 'light'
    ), { timeout: 3_000 }).not.toBe(before)

    // Settings sheet must NOT have opened.
    await expect(page.locator('.qa-sheet--settings')).toHaveCount(0)
  })

  test('D7: single tap on gear opens settings (does not cycle theme)', async ({ page }) => {
    const gear = page.locator('.qa-mh-settings')
    const before = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme-pref') ?? 'light'
    )
    await gear.click()
    await expect(page.locator('.qa-sheet--settings')).toBeVisible({ timeout: 3_000 })
    const after = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme-pref') ?? 'light'
    )
    expect(after).toBe(before)
  })
})
