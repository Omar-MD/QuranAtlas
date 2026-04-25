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

    // Typography section: nav row that opens the Typography subview
    await expect(settings.getByText('Size, spacing & margins')).toBeVisible()

    // Reading section: switch for translation visibility
    await expect(settings.locator('.qa-settings-switch')).toBeVisible()
  })

  test('D1: a11y — no serious/critical axe violations on open Settings sheet @a11y', async ({ page }) => {
    await openSettingsSheet(page)
    const violations = await scanA11y(page, { include: ['.qa-sheet--settings'] })
    expect(violations).toEqual([])
  })

  test('D: Clear-data row is no longer in Settings sheet (post-redesign)', async ({ page }) => {
    await openSettingsSheet(page)
    await expect(page.locator('.qa-sheet--settings .qa-sheet-row--danger')).toHaveCount(0)
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

    // Scope to the Reading section's toggle row (Typography section above also
    // uses the same toggle-body pattern post-2026-04-25 redesign).
    const readingRow = page.locator('.qa-settings-toggle-row').filter({
      has: page.locator('.qa-settings-switch'),
    })
    const toggleBody = readingRow.locator('.qa-settings-toggle-body')
    await expect(toggleBody).toBeVisible()

    // Subtitle names the translation actually bundled with the dataset
    // (Bridges' Translation is the only translation in public/dataset today).
    await expect(readingRow.locator('.qa-settings-toggle-sub')).toContainText("Bridges", { timeout: 3_000 })

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

  test('D4: Cancel clear data → dialog closes, nothing changes', async ({ page }) => {
    await page.goto('/#/about')
    await expect(page.locator('.qa-about-heading')).toBeVisible({ timeout: 5_000 })
    const clearRow = page.locator('.qa-about-clear-data')
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

  test('D4: Escape closes clear data dialog without clearing', async ({ page }) => {
    await page.goto('/#/about')
    await expect(page.locator('.qa-about-heading')).toBeVisible({ timeout: 5_000 })
    const clearRow = page.locator('.qa-about-clear-data')
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
    await page.goto('/#/about')
    await expect(page.locator('.qa-about-heading')).toBeVisible({ timeout: 5_000 })
    const clearRow = page.locator('.qa-about-clear-data')
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

  test('D1 desktop: typography preview scales when font-size slider moves', async ({ page }) => {
    await openSettingsSheet(page)
    await page.getByText('Size, spacing & margins').click()
    const slider = page.getByLabel('Font size')
    await expect(slider).toBeVisible()

    const getArSize = () => page.locator('.qa-typography-preview .qa-verse-arabic').evaluate(
      el => parseFloat(getComputedStyle(el).fontSize)
    )

    const flushOneFrame = () =>
      page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))

    await slider.evaluate(el => {
      el.value = '0' // xs
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await flushOneFrame()
    const xsSize = await getArSize()

    await slider.evaluate(el => {
      el.value = '4' // xl
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await flushOneFrame()
    const xlSize = await getArSize()

    expect(xlSize).toBeGreaterThan(xsSize * 1.5)
  })
})

// ---------------------------------------------------------------------------
// D5. Typography subview (line spacing, word spacing, reader margins)
// ---------------------------------------------------------------------------

test.describe('Journey D: Typography subview @desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  async function openTypography(page) {
    await openSettingsSheet(page)
    await page.getByText('Size, spacing & margins').click()
    await expect(page.getByTestId('typography-preview')).toBeVisible()
  }

  test('D5: opens subview and exposes 4 sliders', async ({ page }) => {
    await openTypography(page)
    await expect(page.getByLabel('Font size')).toBeVisible()
    await expect(page.getByLabel('Line spacing')).toBeVisible()
    await expect(page.getByLabel('Word spacing')).toBeVisible()
    await expect(page.getByLabel('Reader margins')).toBeVisible()
  })

  test('D5: line-spacing xl applies line-height ≈ 2.85 to .qa-verse-arabic', async ({ page }) => {
    await openTypography(page)
    await page.getByLabel('Line spacing').evaluate(el => {
      el.value = '4'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.keyboard.press('Escape')
    const ratio = await page.locator('.qa-verse-arabic').first().evaluate(
      (el) => parseFloat(getComputedStyle(el).lineHeight) /
              parseFloat(getComputedStyle(el).fontSize)
    )
    expect(ratio).toBeGreaterThan(2.8)
    expect(ratio).toBeLessThan(2.9)
  })

  test('D5: word-spacing xs sets word-spacing to 0 on .qa-verse-arabic', async ({ page }) => {
    await openTypography(page)
    await page.getByLabel('Word spacing').evaluate(el => {
      el.value = '0'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.keyboard.press('Escape')
    const ws = await page.locator('.qa-verse-arabic').first().evaluate(
      (el) => getComputedStyle(el).wordSpacing
    )
    expect(ws).toBe('0px')
  })

  test('D5: reader-margins xl narrows #main-content max-width', async ({ page }) => {
    await openSettingsSheet(page)
    await page.getByText('Size, spacing & margins').click()
    const beforeWidth = await page.locator('#main-content').evaluate(
      (el) => parseFloat(getComputedStyle(el).maxWidth)
    )
    await page.getByLabel('Reader margins').evaluate(el => {
      el.value = '4'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.keyboard.press('Escape')
    const afterWidth = await page.locator('#main-content').evaluate(
      (el) => parseFloat(getComputedStyle(el).maxWidth)
    )
    expect(afterWidth).toBeLessThan(beforeWidth)
  })

  test('D5: settings persist across reload', async ({ page }) => {
    await openTypography(page)
    await page.getByLabel('Line spacing').evaluate(el => {
      el.value = '4'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.getByLabel('Word spacing').evaluate(el => {
      el.value = '0'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(await readSetting(page, 'lineSpacing')).toBe('xl')
    expect(await readSetting(page, 'wordSpacing')).toBe('xs')

    await page.reload()
    await waitForReader(page)
    expect(await page.evaluate(() => document.documentElement.dataset.lineSpacing)).toBe('xl')
    expect(await page.evaluate(() => document.documentElement.dataset.wordSpacing)).toBe('xs')
  })

  test('D5: reset button hidden by default, appears on change, restores defaults', async ({ page }) => {
    await openTypography(page)
    await expect(page.getByTestId('typography-reset')).toHaveCount(0)
    await page.getByLabel('Line spacing').evaluate(el => {
      el.value = '4'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await expect(page.getByTestId('typography-reset')).toBeVisible()
    await page.getByTestId('typography-reset').click()
    await expect(page.getByTestId('typography-reset')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.dataset.lineSpacing)).toBe('md')
  })
})

// ---------------------------------------------------------------------------
// D6. Night recitation mode (dim+warm overlay; toggle composes with theme)
// ---------------------------------------------------------------------------

test.describe('Journey D: Night mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  test('D6: settings switch toggles data-night-mode + overlay opacity', async ({ page }) => {
    await openSettingsSheet(page)
    const sw = page.getByTestId('night-mode-switch')
    await expect(sw).toBeVisible()
    await expect(sw).toHaveAttribute('aria-checked', 'false')

    await sw.click()
    await expect(sw).toHaveAttribute('aria-checked', 'true')
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-night-mode'))).toBe('on')
    await expect(async () => {
      const opacity = await page.locator('.qa-night-shift').evaluate(
        (el) => parseFloat(getComputedStyle(el).opacity)
      )
      expect(opacity).toBeGreaterThan(0)
    }).toPass({ timeout: 3_000 })

    await sw.click()
    await expect(sw).toHaveAttribute('aria-checked', 'false')
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-night-mode'))).toBe(false)
  })

  test('D6: night mode persists across reload', async ({ page }) => {
    await openSettingsSheet(page)
    await page.getByTestId('night-mode-switch').click()
    expect(await readSetting(page, 'nightMode')).toBe(true)

    await page.reload()
    await waitForReader(page)
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-night-mode'))).toBe('on')
  })

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
