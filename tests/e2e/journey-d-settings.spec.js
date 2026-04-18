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
 *   src/settings/panel.js
 *   src/settings/theme.js
 *   src/settings/clear-data.js
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete } from './fixtures/idb.js'
import { waitForReader, surfaceDock, openMoreSheet, openSettingsSheet } from './fixtures/chrome.js'
import { scanA11y } from './fixtures/a11y.js'

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

test.describe('Journey D: Settings & appearance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // -------------------------------------------------------------------------
  // D1. Open Settings sheet — happy path + a11y scan
  // -------------------------------------------------------------------------

  test('D1: open Settings sheet via More sheet → correct structure', async ({ page }) => {
    // Step 1: open ambient dock → tap ⋯ → More sheet opens
    await openMoreSheet(page)
    await expect(page.getByRole('dialog', { name: 'More' })).toBeVisible()

    // Step 2: tap Settings → More sheet closes → Settings sheet opens
    await page.locator('button.qa-sheet-row:not(.qa-sheet-row--danger)').filter({ hasText: 'Settings' }).click()
    const settings = page.locator('.qa-sheet--settings')
    await expect(settings).toBeVisible({ timeout: 5_000 })

    // More sheet should no longer be visible
    await expect(page.getByRole('dialog', { name: 'More' })).not.toBeVisible({ timeout: 3_000 })

    // Theme section: at least one active swatch
    const activeSwatch = settings.locator('.qa-theme-swatch--active')
    await expect(activeSwatch).toBeVisible()

    // All 4 theme swatches are present
    for (const theme of ['light', 'sepia', 'dark', 'auto']) {
      await expect(settings.locator(`.qa-theme-swatch--${theme}`)).toBeVisible()
    }

    // Font section: slider + preview
    await expect(settings.locator('.qa-font-slider')).toBeVisible()
    await expect(settings.locator('.qa-font-preview')).toBeVisible()

    // Reading section: toggle row with switch
    await expect(settings.locator('.qa-settings-toggle-row')).toBeVisible()
    await expect(settings.locator('.qa-settings-switch')).toBeVisible()
  })

  test('D1: a11y — no serious/critical axe violations on open Settings sheet', async ({ page }) => {
    await openSettingsSheet(page)
    const violations = await scanA11y(page, { include: ['.qa-sheet--settings'] })
    expect(violations).toEqual([])
  })

  test('D1: Escape closes the Settings sheet', async ({ page }) => {
    await openSettingsSheet(page)
    await expect(page.locator('.qa-sheet--settings')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.qa-sheet--settings')).not.toBeVisible({ timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // D2. Pick a translation + visibility toggle
  // -------------------------------------------------------------------------

  test('D2: tap Show translation row → translation picker sub-view with 4 options', async ({ page }) => {
    await openSettingsSheet(page)

    // Tap the "Show translation" row body to open the picker
    const toggleBody = page.locator('.qa-settings-toggle-body')
    await expect(toggleBody).toBeVisible()
    await toggleBody.click()

    // Sheet should now show the translation picker sub-view
    // Back button appears in the header
    const backBtn = page.locator('.qa-sheet-back')
    await expect(backBtn).toBeVisible({ timeout: 3_000 })

    // All 4 translation options are listed
    const choices = page.locator('.qa-settings-trans-choice')
    await expect(choices).toHaveCount(4, { timeout: 3_000 })

    // Verify name labels for the 4 options
    const names = page.locator('.qa-settings-trans-name')
    await expect(names.filter({ hasText: 'Saheeh International' })).toBeVisible()
    await expect(names.filter({ hasText: 'Pickthall' })).toBeVisible()
    await expect(names.filter({ hasText: 'Yusuf Ali' })).toBeVisible()
    await expect(names.filter({ hasText: /Khattab/ })).toBeVisible()
  })

  test('D2: tap Pickthall → writes settings.translationId → returns to main view with updated subtitle', async ({ page }) => {
    await openSettingsSheet(page)

    // Open translation picker
    await page.locator('.qa-settings-toggle-body').click()
    await expect(page.locator('.qa-sheet-back')).toBeVisible({ timeout: 3_000 })

    // Tap Pickthall
    const pickthall = page.locator('.qa-settings-trans-choice').filter({ hasText: 'Pickthall' })
    await expect(pickthall).toBeVisible()
    await pickthall.click()

    // Should return to main settings view (back button gone)
    await expect(page.locator('.qa-sheet-back')).not.toBeVisible({ timeout: 3_000 })
    await expect(page.locator('.qa-sheet--settings')).toBeVisible()

    // Subtitle in the toggle row should now reflect Pickthall
    const sub = page.locator('.qa-settings-toggle-sub')
    await expect(sub).toContainText('Pickthall', { timeout: 3_000 })

    // Verify IDB write: settings.translationId = 'pickthall'
    const stored = await page.evaluate(() => new Promise((resolve, reject) => {
      const open = indexedDB.open('quran-atlas')
      open.onsuccess = () => {
        const db = open.result
        if (!db.objectStoreNames.contains('settings')) { resolve(null); db.close(); return }
        const tx = db.transaction('settings', 'readonly')
        const req = tx.objectStore('settings').get('translationId')
        req.onsuccess = () => { resolve(req.result?.value ?? null); db.close() }
        req.onerror = () => { resolve(null); db.close() }
      }
      open.onerror = () => reject(open.error)
    }))
    expect(stored).toBe('pickthall')
  })

  test('D2: tap back button in picker → returns to main Settings view', async ({ page }) => {
    await openSettingsSheet(page)

    // Open picker
    await page.locator('.qa-settings-toggle-body').click()
    await expect(page.locator('.qa-sheet-back')).toBeVisible({ timeout: 3_000 })

    // Tap back
    await page.locator('.qa-sheet-back').click()

    // Main view restored: theme swatches visible again, back button gone
    await expect(page.locator('.qa-sheet-back')).not.toBeVisible({ timeout: 3_000 })
    await expect(page.locator('.qa-theme-swatch').first()).toBeVisible()
  })

  test('D2: toggle translation-visibility switch → switch state flips → IDB writes → DOM hides translations', async ({ page }) => {
    // Close settings sheet and go directly to reader to seed translation elements
    await openSettingsSheet(page)

    // The switch is initially on (translationVisible = true by default)
    const sw = page.locator('.qa-settings-switch')
    await expect(sw).toBeVisible()

    const isOn = await sw.evaluate(el => el.classList.contains('qa-settings-switch--on'))

    // Toggle the switch
    await sw.click()

    // Switch class should have flipped
    if (isOn) {
      await expect(sw).not.toHaveClass(/qa-settings-switch--on/, { timeout: 3_000 })
    } else {
      await expect(sw).toHaveClass(/qa-settings-switch--on/, { timeout: 3_000 })
    }

    // aria-checked attribute on the switch should reflect the new state
    const expectedChecked = String(!isOn)
    await expect(sw).toHaveAttribute('aria-checked', expectedChecked, { timeout: 3_000 })

    // Verify IDB write for translationVisible
    const storedVisible = await page.evaluate(() => new Promise((resolve, reject) => {
      const open = indexedDB.open('quran-atlas')
      open.onsuccess = () => {
        const db = open.result
        if (!db.objectStoreNames.contains('settings')) { resolve(null); db.close(); return }
        const tx = db.transaction('settings', 'readonly')
        const req = tx.objectStore('settings').get('translationVisible')
        req.onsuccess = () => { resolve(req.result?.value ?? null); db.close() }
        req.onerror = () => { resolve(null); db.close() }
      }
      open.onerror = () => reject(open.error)
    }))

    // If switch was on (visible=true), toggling makes visible=false, and vice-versa
    expect(storedVisible).toBe(!isOn)

    // DOM effect: translation elements should gain/lose .qa-hide-translation
    // (applyTranslationToDOM runs synchronously after the toggle)
    const translationEls = page.locator('[data-translation]')
    const translationCount = await translationEls.count()
    if (translationCount > 0) {
      if (isOn) {
        // Was visible, now hidden — first translation el should have qa-hide-translation
        await expect(translationEls.first()).toHaveClass(/qa-hide-translation/, { timeout: 3_000 })
      } else {
        // Was hidden, now visible — class should be removed
        await expect(translationEls.first()).not.toHaveClass(/qa-hide-translation/, { timeout: 3_000 })
      }
    }
  })

  // -------------------------------------------------------------------------
  // D3. Theme swap — all 4 themes
  // -------------------------------------------------------------------------

  for (const theme of ['light', 'sepia', 'dark', 'auto']) {
    test(`D3: theme swap → ${theme} writes data-theme-pref and activates swatch`, async ({ page }) => {
      await openSettingsSheet(page)

      const swatch = page.locator(`.qa-theme-swatch--${theme}`)
      await expect(swatch).toBeVisible()
      await swatch.click()

      // data-theme-pref reflects the stored preference ('light'|'sepia'|'dark'|'auto')
      await expect(async () => {
        const pref = await page.evaluate(() =>
          document.documentElement.getAttribute('data-theme-pref')
        )
        expect(pref).toBe(theme)
      }).toPass({ timeout: 3_000 })

      // data-theme reflects the applied variant:
      // for 'auto' it resolves to 'light' or 'dark' depending on OS; just check it's set
      const applied = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      )
      expect(['light', 'sepia', 'dark']).toContain(applied)

      // The tapped swatch should now carry the --active class
      await expect(swatch).toHaveClass(/qa-theme-swatch--active/, { timeout: 3_000 })

      // All other swatches should not have --active
      for (const other of ['light', 'sepia', 'dark', 'auto'].filter(t => t !== theme)) {
        const otherSwatch = page.locator(`.qa-theme-swatch--${other}`)
        await expect(otherSwatch).not.toHaveClass(/qa-theme-swatch--active/)
      }
    })
  }

  // -------------------------------------------------------------------------
  // D4. Clear all data
  // -------------------------------------------------------------------------

  test('D4: Clear data → type DELETE → confirm → page reloads → onboarding restarts', async ({ page }) => {
    // Open More sheet and tap "Clear data"
    await openMoreSheet(page)
    const clearRow = page.locator('.qa-sheet-row--danger')
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
    const confirmBtn = modal.locator('.qa-btn-danger')
    await expect(confirmBtn).toBeDisabled()

    // Cancel button is visible
    const cancelVisible = modal.locator('.qa-btn-secondary')
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

  test('D4: Cancel clear data → dialog closes, nothing changes', async ({ page }) => {
    await openMoreSheet(page)
    const clearRow = page.locator('.qa-sheet-row--danger')
    await expect(clearRow).toBeVisible({ timeout: 5_000 })
    await clearRow.click()

    // Confirmation dialog appears
    const backdrop = page.locator('.qa-modal-backdrop')
    await expect(backdrop).toBeVisible({ timeout: 5_000 })

    // Click Cancel
    const cancelBtn = backdrop.locator('.qa-btn-secondary')
    await cancelBtn.click()

    // Dialog closes
    await expect(backdrop).not.toBeVisible({ timeout: 3_000 })

    // URL has not changed to onboarding
    expect(page.url()).not.toContain('onboarding')

    // Reader is still accessible (onboarding did NOT restart)
    await expect(page.locator('.qa-onboarding')).toHaveCount(0)
  })

  test('D4: Escape closes clear data dialog without clearing', async ({ page }) => {
    await openMoreSheet(page)
    const clearRow = page.locator('.qa-sheet-row--danger')
    await expect(clearRow).toBeVisible({ timeout: 5_000 })
    await clearRow.click()

    const backdrop = page.locator('.qa-modal-backdrop')
    await expect(backdrop).toBeVisible({ timeout: 5_000 })

    // Press Escape
    await page.keyboard.press('Escape')

    // Dialog closes
    await expect(backdrop).not.toBeVisible({ timeout: 3_000 })

    // Onboarding did not restart
    await expect(page.locator('.qa-onboarding')).toHaveCount(0)
  })

  test('D4: clear data confirm button stays disabled when input is not exactly DELETE', async ({ page }) => {
    await openMoreSheet(page)
    const clearRow = page.locator('.qa-sheet-row--danger')
    await expect(clearRow).toBeVisible({ timeout: 5_000 })
    await clearRow.click()

    const backdrop = page.locator('.qa-modal-backdrop')
    await expect(backdrop).toBeVisible({ timeout: 5_000 })

    const modal = backdrop.locator('.qa-modal')
    const confirmBtn = modal.locator('.qa-btn-danger')
    const confirmInput = modal.locator('.qa-input-confirm')

    // Type lowercase 'delete' — confirm must remain disabled (case-sensitive)
    await confirmInput.fill('delete')
    await expect(confirmBtn).toBeDisabled()

    // Type partial 'DELET' — still disabled
    await confirmInput.fill('DELET')
    await expect(confirmBtn).toBeDisabled()

    // Correct 'DELETE' — enables
    await confirmInput.fill('DELETE')
    await expect(confirmBtn).toBeEnabled({ timeout: 3_000 })

    // Cancel so we don't reload
    await modal.locator('.qa-btn-secondary').click()
    await expect(backdrop).not.toBeVisible({ timeout: 3_000 })
  })
})
