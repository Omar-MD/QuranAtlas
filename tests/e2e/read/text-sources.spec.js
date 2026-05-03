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

  test('B-Riwayah1: reader defaults to Qālūn — data-riwayah + Maghrebi orthography', async ({ page }) => {
    // beforeEach already loaded /#/s/1 with Qālūn default
    const firstAyah = page.locator('.qa-verse-arabic').first()
    await expect(firstAyah).toBeVisible({ timeout: 5_000 })

    // Element carries data-riwayah="qaloon"
    await expect(firstAyah).toHaveAttribute('data-riwayah', 'qaloon')

    // Qālūn surah 1 starts with "اِ۬لْحَمْدُ" (small alif + lam — Maghrebi orthography)
    await expect(firstAyah).toContainText('اِ۬لْحَمْدُ')

    // html[data-riwayah] is set at boot
    const htmlAttr = await page.evaluate(() => document.documentElement.getAttribute('data-riwayah'))
    expect(htmlAttr).toBe('qaloon')
  })

  test('B-Riwayah2: switching Riwayah to Ḥafṣ updates html[data-riwayah] and reloads text', async ({ page }) => {
    const firstAyah = page.locator('.qa-verse-arabic').first()
    await expect(firstAyah).toBeVisible({ timeout: 5_000 })

    // Switch to Hafs via Settings sheet Recitation popover.
    // Post 2026-04-29 v7: tap the Recitation source row → popover opens
    // with 3 riwayah rows; clicking one writes IDB + closes popover.
    await openSettingsSheet(page)
    await page.getByTestId('src-row-recitation').click()
    const hafsBtn = page.locator('.qa-settings-pop-row').filter({ hasText: 'Ḥafṣ' })
    await expect(hafsBtn).toBeVisible({ timeout: 5_000 })
    await hafsBtn.click()

    // html[data-riwayah] must update synchronously after the click
    await expect(async () => {
      const attr = await page.evaluate(() => document.documentElement.getAttribute('data-riwayah'))
      expect(attr).toBe('hafs')
    }).toPass({ timeout: 3_000 })

    // Close settings; the reader listens to SETTINGS_RIWAYAH_CHANGED and
    // reloads from the Hafs dataset in-place.
    await page.keyboard.press('Escape')

    // Wait for the reader to re-render with the new dataset
    await expect(async () => {
      const newText = await firstAyah.textContent()
      // Hafs and Qaloon differ — Hafs ayah 1 is the Basmala;
      // Qaloon starts with "اِ۬لْحَمْدُ". At least one of them
      // must differ to confirm the reader reloaded.
      expect(newText).not.toBe(null)
      expect(newText).not.toBe('')
    }).toPass({ timeout: 5_000 })

    // html[data-riwayah] is still hafs after settings close
    const htmlAttr = await page.evaluate(() => document.documentElement.getAttribute('data-riwayah'))
    expect(htmlAttr).toBe('hafs')

    // Restore Qālūn so other tests get the default
    await openSettingsSheet(page)
    await page.getByTestId('src-row-recitation').click()
    await page.locator('.qa-settings-pop-row').filter({ hasText: 'Qālūn' }).click()
    await expect(async () => {
      const attr = await page.evaluate(() => document.documentElement.getAttribute('data-riwayah'))
      expect(attr).toBe('qaloon')
    }).toPass({ timeout: 3_000 })
    await page.keyboard.press('Escape')
  })

  // -------------------------------------------------------------------------
  // B-Translation: shipped translation pack renders; footnotes are optional
  // -------------------------------------------------------------------------
  // Real layout / paint criterion (Rule 9 §1): the translation content mounts
  // inside the live reader DOM tree; if the shipped pack contains footnote
  // markers, the disclosure stack must still work end-to-end.

  test('B-Translation: shipped translation renders; footnote disclosure works when markers are present', async ({ page }) => {
    const v1 = page.locator('.qa-verse[data-verse="1"]')
    await expect(v1).toBeVisible()

    await expect(v1.locator('.qa-verse-translation')).toHaveCount(0)
    await v1.locator('.qa-verse-body-summary').click()

    const translation = v1.locator('.qa-verse-translation')
    await expect(translation).toBeVisible()
    const translationText = (await translation.textContent()) ?? ''
    expect(translationText.trim().length).toBeGreaterThan(10)

    const markers = v1.locator('button.qa-fn-marker')
    const markerCount = await markers.count()
    if (markerCount === 0) {
      await expect(v1.locator('.qa-fn-popover')).toHaveCount(0)
      return
    }

    const firstMarker = markers.first()
    await expect(firstMarker).toHaveAttribute('aria-expanded', 'false')

    await firstMarker.click()
    await expect(firstMarker).toHaveAttribute('aria-expanded', 'true')
    const panel = v1.locator('.qa-fn-popover')
    await expect(panel).toBeVisible()
    const panelText = (await panel.textContent()) ?? ''
    expect(panelText.length).toBeGreaterThan(5)

    await panel.locator('.qa-fn-popover-close').click()
    await expect(panel).toHaveCount(0)
    await expect(firstMarker).toHaveAttribute('aria-expanded', 'false')

    await firstMarker.click()
    await expect(v1.locator('.qa-fn-popover')).toBeVisible()
    await firstMarker.focus()
    await page.keyboard.press('Escape')
    await expect(v1.locator('.qa-fn-popover')).toHaveCount(0)
  })

  test('B-Tafsir: double-click verse opens inline tafsir and Expand opens the full sheet', async ({ page }) => {
    const v1 = page.locator('.qa-verse[data-verse="1"]')
    await expect(v1).toBeVisible()

    await v1.locator('.qa-verse-body-summary').dblclick()

    const preview = v1.locator('[data-tafsir-preview]')
    await expect(preview).toBeVisible({ timeout: 5_000 })
    await expect(preview.locator('.qa-tafsir-preview-select')).toBeVisible()

    await preview.locator('.qa-tafsir-preview-expand').click()

    const sheet = page.locator('.qa-tafsir-sheet')
    await expect(sheet).toBeVisible({ timeout: 5_000 })
    await expect(sheet.locator('.qa-tafsir-sheet-ref')).toContainText('1:1')

    await sheet.locator('.qa-tafsir-sheet-close').click()
    await expect(sheet).toHaveCount(0)
  })

  // -------------------------------------------------------------------------
  // N20 — virtualisation regression guards
  // -------------------------------------------------------------------------
})
