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
    const violations = await scanA11y(page, { include: ['.qa-settings-shell'] })
    expect(violations).toEqual([])
  })

  test('D1b: mobile Verse Settings exposes Manage Assets without horizontal overflow @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/s/1')
    await waitForReader(page)

    await page.getByLabel('Open settings').click()
    await expect(page.getByRole('dialog', { name: 'Verse Settings' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Manage Assets' })).toBeVisible()
    await expect.poll(() => page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )).toBe(true)
  })

  test('D1b-short: short mobile Verse Settings keeps theme and night controls contained at 320x568 @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/#/s/1')
    await waitForReader(page)

    await page.getByLabel('Open settings').click()
    await expect(page.getByRole('dialog', { name: 'Verse Settings' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Theme' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Night Mode' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Manage Assets' })).toBeVisible()
    await expect.poll(() => page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )).toBe(true)
  })

  test('D1c: mobile Mushaf Settings opens from Mushaf mode without horizontal overflow @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/m/1')
    await expect(page.getByLabel('Open settings')).toBeVisible({ timeout: 10_000 })

    await page.getByLabel('Open settings').click()
    await expect(page.getByRole('dialog', { name: 'Mushaf Settings' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Manage Assets' })).toBeVisible()
    await expect.poll(() => page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )).toBe(true)
  })

  test('D1d: Verse Settings removes source pickers but keeps translation toggle reachable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/s/1')
    await waitForReader(page)

    const opener = page.getByLabel('Open settings')
    await opener.click()
    const settings = page.getByRole('dialog', { name: 'Verse Settings' })
    await expect(settings).toBeVisible()
    for (const label of ['Active Riwayah', 'Quran Text Style', 'Translation Source', 'Tafsir Source', 'Mushaf Edition']) {
      await expect(settings.getByText(label, { exact: true })).toHaveCount(0)
    }

    const translationSwitch = settings.getByRole('switch', { name: 'Show translation' })
    await expect(translationSwitch).toBeVisible()
    await translationSwitch.focus()
    await expect.poll(() => translationSwitch.evaluate((node) => document.activeElement === node)).toBe(true)

    await page.keyboard.press('Escape')
    await expect(settings).toHaveCount(0)
    await expect.poll(() => opener.evaluate((node) => document.activeElement === node)).toBe(true)
  })

  test('D2: translation visibility toggle keeps Bridges as the fixed source', async ({ page }) => {
    await openSettingsSheet(page)

    const settings = page.getByRole('dialog', { name: 'Verse Settings' })
    await expect(settings.getByText('Bridges Translation')).toBeVisible()
    await expect(settings.getByText('Reader line')).toBeVisible()
    await settings.getByRole('switch', { name: 'Show translation' }).click()
    await expect(settings.getByRole('switch', { name: 'Show translation' })).toHaveAttribute('aria-checked', 'false')
    await expect(settings.getByText('Bridges Translation')).toBeVisible()
  })

  // D3-bg: <html> background matches <body> background under every theme so
  // that mobile-landscape safe-area gutters do not leak the UA default white.
  // <meta name="theme-color"> tracks --qa-surface-app so PWA chrome retints.
  for (const theme of ['light', 'sepia', 'dark']) {
    test(`D3-bg: ${theme} → html bg + theme-color meta match --qa-surface-app`, async ({ page }) => {
      await openSettingsSheet(page)
      await page.getByRole('group', { name: 'Theme' }).getByRole('button', {
        name: theme[0].toUpperCase() + theme.slice(1),
      }).click()
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

  test('D4: Clear data → type DELETE → confirm → page reloads → default reader restarts', async ({ page }) => {
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

    await expect(page.getByTestId('launch-splash')).toBeVisible({ timeout: 10_000 })
    await waitForReader(page)
    await expect(page).toHaveURL(/#\/s\/1/)
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

    // Two activations well within the 300ms double-tap window. Dispatching
    // from the element keeps the assertion focused on MarginHeader's tap
    // classifier instead of Mobile Chrome's synthetic mouse timing.
    await gear.evaluate((node) => {
      node.click()
      node.click()
    })

    await expect.poll(async () => page.evaluate(() =>
      document.documentElement.getAttribute('data-theme-pref') ?? 'light'
    ), { timeout: 3_000 }).not.toBe(before)

    // Settings sheet must NOT have opened.
    await expect(page.locator('.qa-settings-shell')).toHaveCount(0)
  })

  test('D7: single tap on gear opens settings (does not cycle theme)', async ({ page }) => {
    const gear = page.locator('.qa-mh-settings')
    const before = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme-pref') ?? 'light'
    )
    await gear.click()
    await expect(page.locator('.qa-settings-shell')).toBeVisible({ timeout: 3_000 })
    const after = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme-pref') ?? 'light'
    )
    expect(after).toBe(before)
  })
})

test.describe('Journey D: Asset Management route', () => {
  test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    test(`D8: assets route renders read-only default assets without overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/#/assets')

      const assets = page.getByRole('main', { name: /asset management/i })
      await expect(assets.getByRole('heading', { name: 'Asset Management' })).toBeVisible()
      await expect(assets.getByRole('link', { name: 'Back to Reader' })).toHaveAttribute('href', '#/s/1')
      await expect(page.locator('.qa-assets-status')).toContainText('Default assets ready.')
      for (const heading of ['Qaloon Text + Font', 'Qaloon Mushaf', 'Bridges Translation']) {
        await expect(assets.getByRole('heading', { name: heading, exact: true })).toBeVisible()
      }
      for (const role of ['button', 'link', 'menuitem', 'combobox', 'radio', 'listbox']) {
        await expect(assets.getByRole(role, { name: /install|delete|verify|set active|retry|clear cache/i })).toHaveCount(0)
      }
      await expect.poll(() => page.evaluate(() =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )).toBe(true)
    })
  }

  test('D8: Manage Assets routes from settings and browser Back returns to reader', async ({ page }) => {
    await page.goto('/#/assets')
    await expect(page.getByRole('link', { name: 'Back to Reader' })).toHaveAttribute('href', '#/s/1')

    await page.goto('/#/s/1')
    await waitForReader(page)
    await openSettingsSheet(page)
    await expect(page.getByRole('dialog', { name: 'Verse Settings' })).toBeVisible()
    await page.getByRole('button', { name: 'Manage Assets' }).click()

    await expect(page.getByRole('dialog', { name: 'Verse Settings' })).toHaveCount(0)
    await expect(page).toHaveURL(/#\/assets$/)
    await expect.poll(() => page.evaluate(() =>
      document.activeElement?.matches('h1, [data-testid="assets-back"]') ?? false
    )).toBe(true)

    await page.goBack()
    await expect(page).toHaveURL(/#\/s\/1$/)
    await waitForReader(page)
  })
})
