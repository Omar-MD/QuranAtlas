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
import { waitForReader, openSettingsSheet } from './fixtures/chrome.js'
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
  // D1. Open Settings sheet — a11y scan only.
  // Structural / Escape / clear-data-row-absence / theme-swap / Riwayah-swatch
  // / translation-toggle / typography-subview-structure / reset-button checks
  // ported to tests/unit/settings/panel.test.ts (Phase 2 bucket 1, 2026-04-26).
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
    test(`D3-bg: ${theme} → html bg + theme-color meta match --qa-surface-app @chromium-only`, async ({ page }) => {
      await openSettingsSheet(page)
      await page.locator(`.qa-theme-swatch--${theme}`).click()
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

  test('D4: Clear data → type DELETE → confirm → page reloads → onboarding restarts @chromium-only', async ({ page }) => {
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
  // tests/unit/settings/clear-data-confirm.test.ts (Phase 2 bucket 1, 2026-04-26).
  // The reload→onboarding leg of D4 happy path stays e2e (real reload).
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
    // Post 2026-04-29: sliders are inline in the Reading section — no
    // subview to open. Helper kept so call sites stay readable.
    await openSettingsSheet(page)
    await expect(page.getByTestId('settings-preview')).toBeVisible()
    await expect(page.getByLabel('Font size')).toBeVisible()
    await expect(page.getByLabel('Reading flow')).toBeVisible()
  }

  // D5 subview-structure / reset button-show-and-restore / IDB writes + reload
  // ported to tests/unit/settings/{panel,reading-typography}.test.ts
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
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  test('D6: settings switch toggles data-night-mode + overlay opacity @chromium-only', async ({ page }) => {
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

  // D6 persist-across-reload covered by tests/unit/settings/night-mode.test.ts
  // initNightMode + setNightMode (Phase 2 bucket 1, 2026-04-26).

  test('D6: pressing n on reader toggles night mode @keyboard @chromium-only', async ({ page }) => {
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

// ---------------------------------------------------------------------------
// D7. Mobile gear double-tap → cycleTheme (replaced long-press 2026-04-26).
//
// Single tap → settings sheet. Double-tap (two clicks within 300ms) →
// cycle theme. The single-tap commit is debounced for the same 300ms window
// so the second tap can suppress the sheet open and rewrite the action to
// cycleTheme without the sheet flashing.
// ---------------------------------------------------------------------------

test.describe('Journey D: Mobile gear double-tap', () => {
  // Gear is mobile-only chrome (hidden ≥1180px). Force a phone viewport so
  // this suite is meaningful in the chromium project too.
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
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
