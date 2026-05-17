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
import { readSetting, writeSetting } from '../fixtures/idb.js'

// Reuse the onboarded snapshot captured by `tests/e2e/global-setup.ts`.
// Reuse the onboarded snapshot to skip per-test cold-boot setup. The 5
// nested beforeEach blocks below stay separate (different viewports) but
// no longer carry redundant clearAllData + markOnboardingComplete pairs.
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })

async function routeRiwayahPackages(page, { hafsAvailable = false } = {}) {
  await page.route('**/dataset/indexes/riwayah-packages.json', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        version: 1,
        defaultRiwayah: 'qaloon',
        packages: [
          {
            riwayah: 'qaloon',
            optional: false,
            available: true,
            text: { urls: ['/dataset/riwayat/qaloon/001.json'], totalBytes: 128, available: true },
            pages: {
              manifestUrl: '/dataset/mushaf-pages/qaloon/manifest.json',
              urls: ['/dataset/mushaf-pages/qaloon/pages/001.svg'],
              totalBytes: 256,
              available: true,
            },
            totalBytes: 384,
          },
          {
            riwayah: 'hafs',
            optional: true,
            available: hafsAvailable,
            text: { urls: hafsAvailable ? ['/dataset/riwayat/hafs/001.json'] : [], totalBytes: hafsAvailable ? 128 : 0, available: hafsAvailable },
            pages: {
              manifestUrl: '/dataset/mushaf-pages/hafs/manifest.json',
              urls: hafsAvailable ? ['/dataset/mushaf-pages/hafs/pages/001.svg'] : [],
              totalBytes: hafsAvailable ? 256 : 0,
              available: hafsAvailable,
            },
            totalBytes: hafsAvailable ? 384 : 0,
          },
          {
            riwayah: 'warsh',
            optional: true,
            available: false,
            text: { urls: [], totalBytes: 0, available: false },
            pages: { manifestUrl: '/dataset/mushaf-pages/warsh/manifest.json', urls: [], totalBytes: 0, available: false },
            totalBytes: 0,
          },
        ],
      }),
    })
  })
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

test.describe('Journey D: Settings & appearance', () => {
  test.beforeEach(async ({ page }) => {
    await page.reload({ waitUntil: 'domcontentloaded' })
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

  test('D2: Tafsir source row opens picker and updates the selected label', async ({ page }) => {
    await openSettingsSheet(page)

    const tafsirRow = page.getByTestId('src-row-tafsir')
    await expect(tafsirRow).toBeVisible()
    await tafsirRow.click()

    const picker = page.getByTestId('settings-pop')
    await expect(picker).toBeVisible({ timeout: 5_000 })
    await expect(picker).toHaveAttribute('aria-label', 'Choose Tafsir')

    const mukhtasar = picker.locator('.qa-settings-pop-row').filter({ hasText: 'Al-Mukhtasar fi al-Tafsir' })
    await expect(mukhtasar).toBeVisible()
    await mukhtasar.click()

    await expect(picker).toHaveCount(0)
    await expect(tafsirRow).toContainText('Al-Mukhtasar fi al-Tafsir')
  })

  test.describe('D2-riwayah package mocks', () => {
    test.use({ serviceWorkers: 'block' })

    test('D2-riwayah: unavailable optional package cannot change the active recitation', async ({ page }) => {
      await routeRiwayahPackages(page, { hafsAvailable: false })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.goto('/#/s/1')
      await waitForReader(page)
      await openSettingsSheet(page)
      await page.getByTestId('src-row-recitation').click()

      const picker = page.getByTestId('settings-pop')
      const hafs = picker.getByTestId('riwayah-row-hafs')
      await expect(hafs).toContainText('Unavailable')
      await expect(hafs).toBeDisabled()
      await expect.poll(() => readSetting(page, 'riwayah')).not.toBe('hafs')
    })

    test('D2-riwayah: failed install keeps Qalun active and exposes retry state', async ({ page }) => {
      await routeRiwayahPackages(page, { hafsAvailable: true })
      await page.route('**/dataset/riwayat/hafs/001.json', route => route.fulfill({ status: 503, body: 'unavailable' }))
      await writeSetting(page, 'riwayah', 'qaloon')
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.goto('/#/s/1')
      await waitForReader(page)

      await openSettingsSheet(page)
      await page.getByTestId('src-row-recitation').click()
      const picker = page.getByTestId('settings-pop')
      const hafs = picker.getByTestId('riwayah-row-hafs')
      await expect(hafs).toContainText('Install')
      await hafs.click()

      await expect(hafs).toContainText('Retry', { timeout: 10_000 })
      await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-riwayah'))).toBe('qaloon')
      await expect(page.getByTestId('src-row-recitation')).toContainText('Qalun')
    })
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
    await expect(modal).toContainText('This will permanently delete saved reading positions, bookmarks, offline downloads, settings, and any older local QuranAtlas data still stored on this device. This action cannot be undone.')

    // Confirm button starts disabled
    const confirmBtn = modal.locator('.qa-modal-btn--danger')
    await expect(confirmBtn).toBeDisabled()

    // Cancel button is visible
    const cancelVisible = modal.locator('.qa-modal-btn--ghost')
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
