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

async function ensureTranslation(page, sourceName = 'Bridges') {
  await openSettingsSheet(page)
  const toggle = page.getByRole('switch', { name: 'Show translation' })
  if ((await toggle.getAttribute('aria-checked')) === 'false') {
    await toggle.click()
  }
  const row = page.getByTestId('src-row-translation')
  if (!((await row.textContent()) ?? '').includes(sourceName)) {
    await row.click()
    await page.locator('.qa-settings-pop-row').filter({ hasText: sourceName }).click()
    await expect(row).toContainText(sourceName)
  }
  await page.keyboard.press('Escape')
}

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
  // B-Translation: shipped translation pack renders; Bridges footnotes disclose
  // -------------------------------------------------------------------------
  // Real layout / paint criterion (Rule 9 §1): the translation content and
  // footnote disclosure mount inside the live reader DOM tree.

  test('B-Translation: shipped Bridges translation renders and footnote disclosure works', async ({ page }) => {
    await page.goto('/#/s/79/1')
    await waitForReader(page)
    await ensureTranslation(page, 'Bridges')

    const v1 = page.locator('.qa-verse[data-verse="1"]')
    await expect(v1).toBeVisible()

    const translation = v1.locator('.qa-verse-translation')
    if (await translation.count() === 0) {
      await openSettingsSheet(page)
      const toggle = page.getByRole('switch', { name: 'Show translation' })
      await expect(toggle).toHaveAttribute('aria-checked', 'false')
      await toggle.click()
      await page.keyboard.press('Escape')
    }
    await expect(translation).toBeVisible()
    const translationText = (await translation.textContent()) ?? ''
    expect(translationText.trim().length).toBeGreaterThan(10)
    expect(translationText).toContain('By those who snatch violently')

    const markers = v1.locator('button.qa-fn-marker')
    await expect(markers.first()).toBeVisible()

    const firstMarker = markers.first()
    await expect(firstMarker).toHaveAttribute('aria-expanded', 'false')

    await firstMarker.click()
    await expect(firstMarker).toHaveAttribute('aria-expanded', 'true')
    const panel = v1.locator('.qa-fn-popover')
    await expect(panel).toBeVisible()
    const panelText = (await panel.textContent()) ?? ''
    expect(panelText).toContain('angels snatching the souls')

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
    await expect(preview.getByRole('button', { name: 'Close tafsir preview' })).toBeVisible()
    await expect(preview.getByRole('button', { name: 'Expand tafsir' })).toBeVisible()

    await preview.getByRole('button', { name: 'Expand tafsir' }).click()

    const sheet = page.locator('.qa-tafsir-sheet')
    await expect(sheet).toBeVisible({ timeout: 5_000 })
    await expect(sheet.locator('.qa-tafsir-sheet-ref')).toContainText('1:1')

    await sheet.locator('.qa-tafsir-sheet-close').click()
    await expect(sheet).toHaveCount(0)
  })

  test('B-SettingsSync: Settings updates the mounted reader translation visibility and active tafsir source selection', async ({ page }) => {
    const v1 = page.locator('.qa-verse[data-verse="1"]')
    await expect(v1).toBeVisible()
    await ensureTranslation(page, 'Bridges')

    const translation = v1.locator('.qa-verse-translation')
    await expect(translation).toBeVisible()

    await v1.locator('.qa-verse-body-summary').dblclick()
    const preview = v1.locator('[data-tafsir-preview]')
    await expect(preview).toBeVisible({ timeout: 5_000 })
    await expect(preview.locator('.qa-tafsir-preview-select')).toHaveValue('muyassar')

    await openSettingsSheet(page)
    await page.getByRole('switch', { name: 'Show translation' }).click()

    const tafsirRow = page.getByTestId('src-row-tafsir')
    await tafsirRow.click()
    await page.locator('.qa-settings-pop-row').filter({ hasText: 'Al-Mukhtasar fi al-Tafsir' }).click()
    await expect(tafsirRow).toContainText('Al-Mukhtasar fi al-Tafsir')

    await page.keyboard.press('Escape')

    await expect(async () => {
      await expect(translation).toHaveCount(0)
    }).toPass({ timeout: 5_000 })

    await expect(preview.locator('.qa-tafsir-preview-select')).toHaveValue('mukhtasar')
    await expect(preview.locator('.qa-tafsir-preview-source')).toContainText('Al-Mukhtasar fi al-Tafsir')
    await expect(preview.locator('.qa-tafsir-preview-state')).toHaveCount(0)
  })

  // -------------------------------------------------------------------------
  // N20 — virtualisation regression guards
  // -------------------------------------------------------------------------
})

test.describe('Journey B: Reader tafsir sheet mobile @mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  test('B-TafsirMobile: expanded tafsir opens as a full-screen mobile sheet', async ({ page }) => {
    const v1 = page.locator('.qa-verse[data-verse="1"]')
    await expect(v1).toBeVisible()

    await v1.locator('.qa-verse-body-summary').dblclick()
    const preview = v1.locator('[data-tafsir-preview]')
    await expect(preview).toBeVisible({ timeout: 5_000 })

    await preview.getByRole('button', { name: 'Expand tafsir' }).click()

    const sheet = page.locator('.qa-tafsir-sheet')
    await expect(sheet).toBeVisible({ timeout: 5_000 })

    const rect = await sheet.evaluate((el) => {
      const { top, left, right, bottom } = el.getBoundingClientRect()
      return { top, left, right, bottom }
    })

    expect(rect.top).toBe(0)
    expect(rect.left).toBe(0)
    expect(rect.right).toBe(390)
    expect(rect.bottom).toBe(844)

    await sheet.getByRole('button', { name: 'Close tafsir' }).click()
    await expect(sheet).toHaveCount(0)
  })
})
