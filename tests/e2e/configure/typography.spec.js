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

test.describe('Journey D: desktop variants', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  test('D1 desktop: typography preview scales when font-size slider moves', async ({ page }) => {
    await openSettingsSheet(page)
    const slider = page.getByLabel('Font size')
    await expect(slider).toBeVisible()

    const getArSize = () => page.locator('.qa-settings-preview .qa-verse-arabic').evaluate(
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

test.describe('Journey D: Typography subview', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  async function openTypography(page) {
    // Post 2026-04-29: sliders are inline in the Reading section — no
    // subview to open. Helper kept so call sites stay readable.
    await openSettingsSheet(page)
    await expect(page.getByTestId('settings-preview')).toBeVisible()
    await expect(page.getByLabel('Font size')).toBeVisible()
    await expect(page.getByLabel('Reading flow')).toBeVisible()
  }

  // D5 subview-structure / reset button-show-and-restore / IDB writes + reload
  // ported to tests/unit/configure/{panel,reading-typography}.test.ts
  // (Phase 2 bucket 1, 2026-04-26). Remaining D5 e2e tests use getComputedStyle
  // on real Riwayah-driven CSS variables and stay here.

  test('D5: reading-flow xl drives a higher line-height on .qa-verse-arabic than xs', async ({ page }) => {
    // The line-height formula: floor + delta(step). Floor is shared 1.92 across
    // riwayat (KFGQPC tashkeel needs ≥1.9 to clear the line above); xl = 2.32,
    // xs = 1.92. Verify xl > xs and the absolute value lands near 2.32.
    await openTypography(page)

    await page.getByLabel('Reading flow').evaluate(el => {
      el.value = '0' // xs
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.keyboard.press('Escape')
    const xsRatio = await page.locator('.qa-verse-arabic').first().evaluate(
      (el) => parseFloat(getComputedStyle(el).lineHeight) /
              parseFloat(getComputedStyle(el).fontSize)
    )

    await openTypography(page)
    await page.getByLabel('Reading flow').evaluate(el => {
      el.value = '4' // xl
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.keyboard.press('Escape')
    const xlRatio = await page.locator('.qa-verse-arabic').first().evaluate(
      (el) => parseFloat(getComputedStyle(el).lineHeight) /
              parseFloat(getComputedStyle(el).fontSize)
    )

    // xl must be strictly larger than xs
    expect(xlRatio).toBeGreaterThan(xsRatio)
    // xl line-height = 2.32 across riwayat; ratio ≈ 2.32 (small tolerance).
    expect(xlRatio).toBeGreaterThan(2.2)
    expect(xlRatio).toBeLessThan(2.5)
  })

  test('D5: reading-flow xs sets word-spacing to 0 on .qa-verse-arabic', async ({ page }) => {
    await openTypography(page)
    await page.getByLabel('Reading flow').evaluate(el => {
      el.value = '0'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.keyboard.press('Escape')
    const ws = await page.locator('.qa-verse-arabic').first().evaluate(
      (el) => getComputedStyle(el).wordSpacing
    )
    expect(ws).toBe('0px')
  })

  test('D5: reading-flow xl narrows #main-content max-width', async ({ page }) => {
    await openTypography(page)
    const beforeWidth = await page.locator('#main-content').evaluate(
      (el) => parseFloat(getComputedStyle(el).maxWidth)
    )
    await page.getByLabel('Reading flow').evaluate(el => {
      el.value = '4'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.keyboard.press('Escape')
    const afterWidth = await page.locator('#main-content').evaluate(
      (el) => parseFloat(getComputedStyle(el).maxWidth)
    )
    expect(afterWidth).toBeLessThan(beforeWidth)
  })

})

// ---------------------------------------------------------------------------
// D6. Night recitation mode (dim+warm overlay; toggle composes with theme)
// ---------------------------------------------------------------------------

test.describe('Journey D: Night mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
  })
})
