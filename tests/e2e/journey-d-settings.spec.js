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
import { clearAllData, markOnboardingComplete, readSetting } from './fixtures/idb.js'
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

  test('D1: open Settings sheet → correct structure', async ({ page }) => {
    // Post-2026-04-25 redesign: gear icon (mobile) or #/settings route (desktop).
    await openSettingsSheet(page)
    const settings = page.locator('.qa-sheet--settings')
    await expect(settings).toBeVisible({ timeout: 5_000 })

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

  test('D1: a11y — no serious/critical axe violations on open Settings sheet @a11y', async ({ page }) => {
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

  test('D2: Show translation row subtitle reflects the shipped translation; picker is hidden when only one ships', async ({ page }) => {
    await openSettingsSheet(page)

    const toggleBody = page.locator('.qa-settings-toggle-body')
    await expect(toggleBody).toBeVisible()

    // Subtitle names the translation actually bundled with the dataset
    // (Bridges' Translation is the only translation in public/dataset today).
    const sub = page.locator('.qa-settings-toggle-sub')
    await expect(sub).toContainText("Bridges", { timeout: 3_000 })

    // With only one translation available, the row body is not a button
    // and tapping it must not navigate to a picker sub-view.
    await toggleBody.click()
    await expect(page.locator('.qa-sheet-back')).toHaveCount(0)

    // And translationId persisted in IDB matches the bundled id.
    expect(await readSetting(page, 'translationId')).toBe('bridges')
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

    // Verify IDB write for translationVisible.
    // If switch was on (visible=true), toggling makes visible=false, and vice-versa.
    expect(await readSetting(page, 'translationVisible')).toBe(!isOn)

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

  test.fixme('D4: Clear data → type DELETE → confirm → page reloads → onboarding restarts', async ({ page }) => {
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

  test.fixme('D4: Cancel clear data → dialog closes, nothing changes', async ({ page }) => {
    await openMoreSheet(page)
    const clearRow = page.locator('.qa-sheet-row--danger')
    await expect(clearRow).toBeVisible({ timeout: 5_000 })
    await clearRow.click()

    // Confirmation dialog appears
    const backdrop = page.locator('.qa-modal-backdrop')
    await expect(backdrop).toBeVisible({ timeout: 5_000 })

    // Click Cancel
    const cancelBtn = backdrop.locator('.qa-mark-btn--ghost')
    await cancelBtn.click()

    // Dialog closes
    await expect(backdrop).not.toBeVisible({ timeout: 3_000 })

    // URL has not changed to onboarding
    expect(page.url()).not.toContain('onboarding')

    // Reader is still accessible (onboarding did NOT restart)
    await expect(page.locator('.qa-onboarding')).toHaveCount(0)
  })

  test.fixme('D4: Escape closes clear data dialog without clearing', async ({ page }) => {
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

  test.fixme('D4: clear data confirm button stays disabled when input is not exactly DELETE', async ({ page }) => {
    await openMoreSheet(page)
    const clearRow = page.locator('.qa-sheet-row--danger')
    await expect(clearRow).toBeVisible({ timeout: 5_000 })
    await clearRow.click()

    const backdrop = page.locator('.qa-modal-backdrop')
    await expect(backdrop).toBeVisible({ timeout: 5_000 })

    const modal = backdrop.locator('.qa-modal')
    const confirmBtn = modal.locator('.qa-mark-btn--danger-primary')
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
    await modal.locator('.qa-mark-btn--ghost').click()
    await expect(backdrop).not.toBeVisible({ timeout: 3_000 })
  })
})

// ---------------------------------------------------------------------------
// Journey D — desktop variants (≥1180px viewport)
//
// Font preview is bound to the font-size tokens and lays out English left,
// Arabic right at the desktop breakpoint.
// ---------------------------------------------------------------------------

test.describe('Journey D: desktop variants @desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  test('D1 desktop: font preview scales when slider moves', async ({ page }) => {
    await openSettingsSheet(page)
    await expect(page.locator('.qa-font-slider')).toBeVisible()

    const getArSize = () => page.locator('.qa-font-preview-ar').evaluate(
      el => parseFloat(getComputedStyle(el).fontSize)
    )

    // After dispatching the input event, wait one paint cycle (double-rAF) so
    // the CSS custom-property update has flushed through style-recalc.  This
    // replaces a fixed-duration waitForTimeout(200) with a deterministic signal.
    const flushOneFrame = () =>
      page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))

    await page.locator('.qa-font-slider').evaluate(el => {
      el.value = '0' // xs
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await flushOneFrame()
    const xsSize = await getArSize()

    await page.locator('.qa-font-slider').evaluate(el => {
      el.value = '4' // xl
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await flushOneFrame()
    const xlSize = await getArSize()

    // xl should be noticeably larger than xs (ratio ~1.73 since 1.3 / 0.75)
    expect(xlSize).toBeGreaterThan(xsSize * 1.5)
  })

  test('D1 desktop: font preview renders English left, Arabic right', async ({ page }) => {
    await openSettingsSheet(page)
    await expect(page.locator('.qa-font-preview')).toBeVisible()

    const order = await page.locator('.qa-font-preview').evaluate(
      el => Array.from(el.children).map(c =>
        Array.from(c.classList).find(cn => cn.startsWith('qa-font-preview-')) ?? c.className
      )
    )
    expect(order).toEqual(['qa-font-preview-en', 'qa-font-preview-ar'])
  })
})
