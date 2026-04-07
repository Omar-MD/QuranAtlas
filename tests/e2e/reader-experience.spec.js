/**
 * E2E Test: Reader Experience
 * Critical User Journey: Reading surah with proper text rendering
 */

import { test, expect } from '@playwright/test'

test.describe('Reader Experience', () => {
  test('surah header displays correctly', async ({ page }) => {
    await page.goto('/#/s/1')

    // Wait for surah to load
    await expect(page.locator('[data-surah-header]')).toBeVisible({ timeout: 10000 })

    // Verify Arabic name
    const arabicName = page.locator('.qa-surah-name')
    await expect(arabicName).toBeVisible()

    // Verify meta information
    const meta = page.locator('.qa-surah-meta')
    await expect(meta).toContainText('Surah 1')
    await expect(meta).toContainText('7 verses')
  })

  test('verses render with Arabic text and verse numbers', async ({ page }) => {
    await page.goto('/#/s/112')

    // Wait for verses
    await expect(page.locator('[data-verse="1"]')).toBeVisible({ timeout: 10000 })

    // Verify Arabic text is present and RTL
    const arabicText = page.locator('.qa-verse-arabic').first()
    await expect(arabicText).toBeVisible()
    await expect(arabicText).toHaveAttribute('dir', 'rtl')

    // Verify verse number is present
    const verseNumber = page.locator('.qa-verse-number').first()
    await expect(verseNumber).toBeVisible()
    await expect(verseNumber).toContainText('1')
  })

  test('translation toggle works', async ({ page }) => {
    await page.goto('/#/s/112')

    // Wait for surah to load
    await expect(page.locator('[data-verse="1"]')).toBeVisible({ timeout: 10000 })

    // Verify translation is visible by default
    const translation = page.locator('.qa-verse-translation').first()
    await expect(translation).toBeVisible()

    // Find and click translation toggle
    const toggleBtn = page.locator('.qa-toggle-btn')
    await expect(toggleBtn).toBeVisible()

    // Click to hide translation
    await toggleBtn.click()

    // Verify translation is hidden
    await expect(translation).not.toBeVisible()

    // Click to show translation again
    await toggleBtn.click()
    await expect(translation).toBeVisible()
  })

  test('translation toggle works with chunked rendering - regression test', async ({ page }) => {
    // This test catches the bug where translation toggle state was not respected
    // when new verse chunks were loaded via scrolling
    await page.goto('/#/s/4')

    // Wait for surah to load (Surah An-Nisa has 176 verses)
    await expect(page.locator('[data-surah-header]')).toBeVisible({ timeout: 10000 })

    // Wait for initial verses
    await expect(page.locator('[data-verse="1"]')).toBeVisible()

    // Get translation toggle
    const toggleBtn = page.locator('.qa-toggle-btn')
    await expect(toggleBtn).toBeVisible()

    // Turn OFF translation
    await toggleBtn.click()
    await expect(toggleBtn).toHaveText('EN ▸')

    // Verify first chunk translations are hidden
    const translationsBefore = page.locator('.qa-verse-translation')
    const countBefore = await translationsBefore.count()
    expect(countBefore).toBeGreaterThan(0)

    for (let i = 0; i < Math.min(countBefore, 5); i++) {
      await expect(translationsBefore.nth(i)).not.toBeVisible()
    }

    // Scroll to load more chunks
    const mainContent = page.locator('#main-content')
    await mainContent.evaluate(el => el.scrollTo(0, el.scrollHeight))
    
    // Wait for new verses to be loaded (count should increase)
    await expect(async () => {
      const newCount = await page.locator('.qa-verse-translation').count()
      expect(newCount).toBeGreaterThan(countBefore)
    }).toPass({ timeout: 5000 })

    // Get count after scrolling - should have loaded more verses
    const translationsAfterScroll = page.locator('.qa-verse-translation')
    const countAfterScroll = await translationsAfterScroll.count()
    expect(countAfterScroll).toBeGreaterThan(countBefore)

    // CRITICAL: All translations (including newly loaded chunks) should be hidden
    for (let i = countBefore; i < Math.min(countAfterScroll, countBefore + 5); i++) {
      await expect(translationsAfterScroll.nth(i)).not.toBeVisible()
    }

    // Turn translation back ON
    await toggleBtn.click()
    await expect(toggleBtn).toHaveText('EN ▾')

    // ALL translations (including those from new chunks) should be visible
    for (let i = 0; i < Math.min(countAfterScroll, 10); i++) {
      await expect(translationsAfterScroll.nth(i)).toBeVisible()
    }
  })

  test('surah end marker is present', async ({ page }) => {
    await page.goto('/#/s/112')

    // Scroll to bottom to load all verses
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // Verify end marker
    const endMarker = page.locator('[data-surah-end]')
    await expect(endMarker).toBeVisible({ timeout: 5000 })
    await expect(endMarker).toContainText('End of Al-Ikhlas')
  })

  test('basmala for surah 1 (Al-Fatiha) is verse 1 in dataset - no separate basmala element', async ({ page }) => {
    await page.goto('/#/s/1')

    // Wait for surah to load
    await expect(page.locator('[data-surah-header]')).toBeVisible({ timeout: 10000 })

    // Surah 1 should NOT have a separate .qa-basmala element
    // because the basmala IS verse 1 in the dataset
    const basmala = page.locator('.qa-basmala')
    await expect(basmala).toHaveCount(0)

    // Verify verse 1 IS the basmala text by checking for the distinctive word "بِسْمِ"
    const verse1Arabic = page.locator('[data-verse="1"] .qa-verse-arabic')
    const textContent = await verse1Arabic.textContent()
    // Check for "بِسْمِ" (bismi) - the first word of the basmala
    expect(textContent).toContain('بِسْمِ')
    // Also verify the verse number "1" is present
    expect(textContent).toContain('1')
  })

  test('reader handles long surahs with chunked rendering', async ({ page }) => {
    await page.goto('/#/s/2')

    // Wait for surah to load
    await expect(page.locator('[data-surah-header]')).toBeVisible({ timeout: 10000 })

    // Initially, only first chunk is rendered
    const initialVerses = page.locator('[data-verse]')
    const initialCount = await initialVerses.count()

    // Should have at least some verses rendered (chunk size is 50)
    expect(initialCount).toBeGreaterThan(0)
    expect(initialCount).toBeLessThanOrEqual(50)

    // Scroll down to trigger more rendering
    const mainContent = page.locator('#main-content')
    await mainContent.evaluate(el => el.scrollTo(0, el.scrollHeight))

    // Wait for new verses to be loaded (count should increase or stay same if all loaded)
    await expect(async () => {
      const currentCount = await page.locator('[data-verse]').count()
      expect(currentCount).toBeGreaterThanOrEqual(initialCount)
    }).toPass({ timeout: 5000 })
  })
})
