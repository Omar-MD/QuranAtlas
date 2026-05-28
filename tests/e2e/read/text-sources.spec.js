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
    await page.getByRole('dialog', { name: 'Choose Translation Source' })
      .getByRole('button', { name: new RegExp(sourceName) })
      .click()
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

  test('B-Riwayah2: single-profile MVP reader does not expose alternate riwayah choices', async ({ page }) => {
    const firstAyah = page.locator('.qa-verse-arabic').first()
    await expect(firstAyah).toBeVisible({ timeout: 5_000 })

    await openSettingsSheet(page)
    await expect(page.getByTestId('src-row-recitation')).toHaveCount(0)
    await expect(page.getByRole('dialog', { name: /Choose Active Riwayah/i })).toHaveCount(0)
    await expect(page.getByText(/Ḥafṣ|Warsh/)).toHaveCount(0)

    await page.keyboard.press('Escape')

    const htmlAttr = await page.evaluate(() => document.documentElement.getAttribute('data-riwayah'))
    expect(htmlAttr).toBe('qaloon')
    await expect(page.locator('.qa-riwayah-install-prompt')).toHaveCount(0)
    await expect(page.locator('.qa-verse-arabic').first()).toHaveAttribute('data-riwayah', 'qaloon')
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

  test('B-NoTafsir: reader gestures and shortcut do not reveal tafsir UI', async ({ page }) => {
    const v1 = page.locator('.qa-verse[data-verse="1"]')
    await expect(v1).toBeVisible()

    await v1.locator('.qa-verse-body-summary').dblclick()
    await expect(v1.locator('[data-tafsir-preview]')).toHaveCount(0)
    await expect(page.locator('.qa-tafsir-sheet')).toHaveCount(0)
    await expect(page.getByText(/tafsir/i)).toHaveCount(0)

    await v1.locator('.qa-verse-body-summary').click({ button: 'right' })
    await expect(v1.locator('[data-tafsir-preview]')).toHaveCount(0)
    await expect(page.locator('.qa-tafsir-sheet')).toHaveCount(0)
    await expect(page.getByText(/tafsir/i)).toHaveCount(0)

    await page.keyboard.press('m')
    await expect(v1.locator('[data-tafsir-preview]')).toHaveCount(0)
    await expect(page.locator('.qa-tafsir-sheet')).toHaveCount(0)
    await expect(page.getByText(/tafsir/i)).toHaveCount(0)
  })

  test('B-SettingsSync: Settings updates the mounted reader translation visibility without tafsir source UI', async ({ page }) => {
    const v1 = page.locator('.qa-verse[data-verse="1"]')
    await expect(v1).toBeVisible()
    await ensureTranslation(page, 'Bridges')

    const translation = v1.locator('.qa-verse-translation')
    await expect(translation).toBeVisible()

    await openSettingsSheet(page)
    await page.getByRole('switch', { name: 'Show translation' }).click()

    await expect(page.getByTestId('src-row-tafsir')).toHaveCount(0)
    await expect(page.getByRole('dialog', { name: /Choose Tafsir Source/i })).toHaveCount(0)
    await expect(page.getByText(/tafsir/i)).toHaveCount(0)

    await page.keyboard.press('Escape')

    await expect(async () => {
      await expect(translation).toHaveCount(0)
    }).toPass({ timeout: 5_000 })
    await expect(page.getByText(/tafsir/i)).toHaveCount(0)
  })

  // -------------------------------------------------------------------------
  // N20 — virtualisation regression guards
  // -------------------------------------------------------------------------
})

test.describe('Journey B: No reader tafsir sheet mobile @mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  test('B-NoTafsirMobile: mobile reader does not open tafsir sheet', async ({ page }) => {
    const v1 = page.locator('.qa-verse[data-verse="1"]')
    await expect(v1).toBeVisible()

    await v1.locator('.qa-verse-body-summary').dblclick()
    await expect(v1.locator('[data-tafsir-preview]')).toHaveCount(0)
    await expect(page.locator('.qa-tafsir-sheet')).toHaveCount(0)
    await expect(page.getByText(/tafsir/i)).toHaveCount(0)
  })
})
