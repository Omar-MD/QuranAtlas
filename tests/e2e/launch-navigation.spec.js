/**
 * E2E Test: Launch and Navigation
 * Critical User Journey: App loads and can navigate between surahs
 */

import { test, expect } from '@playwright/test'

test.describe('Launch and Navigation', () => {
  test('app loads and shows default surah', async ({ page }) => {
    await page.goto('/')

    // Wait for app to initialize
    await expect(page.locator('#app-shell')).toBeVisible()

    // Verify surah content loads (either from deep link or default)
    await expect(page.locator('[data-surah-header]')).toBeVisible({ timeout: 10000 })

    // Verify verses are rendered
    const verses = page.locator('[data-verse]')
    await expect(verses.first()).toBeVisible()
  })

  test('navigate to specific surah via URL hash', async ({ page }) => {
    await page.goto('/#/s/2')

    // Verify surah header shows Al-Baqarah
    await expect(page.locator('[data-surah-header]')).toContainText('Al-Baqarah', { timeout: 10000 })

    // Verify basmala is present for surah 2
    await expect(page.locator('.qa-basmala')).toBeVisible()

    // Verify verses are rendered (first chunk should have verses)
    const verses = page.locator('[data-verse]')
    await expect(verses).toHaveCount(50, { timeout: 5000 })
  })

  test('navigate to specific verse via URL hash', async ({ page }) => {
    await page.goto('/#/s/2/10')

    // Verify surah loads
    await expect(page.locator('[data-surah-header]')).toContainText('Al-Baqarah', { timeout: 10000 })

    // Verify verse 10 is present (in first chunk)
    const verse10 = page.locator('[data-verse="10"]')
    await expect(verse10).toBeVisible()
  })

  test('navigate to verse beyond first chunk loads chunks and scrolls - regression test', async ({ page }) => {
    // This test catches the bug where deep linking to a verse beyond the first chunk
    // (verse 255 in Al-Baqarah) would fail to scroll because chunks weren't loaded
    await page.goto('/#/s/2/255')

    // Verify surah header loads
    await expect(page.locator('[data-surah-header]')).toContainText('Al-Baqarah', { timeout: 10000 })

    // CRITICAL: Verse 255 (Ayat al-Kursi) should be loaded and visible
    // The reader should automatically load chunks until verse 255 is available
    const verse255 = page.locator('[data-verse="255"]')
    await expect(verse255).toBeVisible({ timeout: 10000 })

    // Verify the verse has Arabic text content (Ayat al-Kursi content)
    const arabicText = verse255.locator('.qa-verse-arabic')
    const textContent = await arabicText.textContent()
    // Should contain verse number and Arabic text
    expect(textContent).toContain('255')
    expect(textContent?.length).toBeGreaterThan(50) // Ayat al-Kursi is a long verse

    // Verify we're scrolled near verse 255 (scroll position should be significant)
    const scrollTop = await page.evaluate(() => {
      const mainContent = document.getElementById('main-content')
      return mainContent ? mainContent.scrollTop : 0
    })
    expect(scrollTop).toBeGreaterThan(1000)
  })

  test('navigate to invalid verse shows error and loads surah at verse 1 - regression test', async ({ page }) => {
    // This test catches the bug where invalid verse numbers didn't show error feedback
    await page.goto('/#/s/2/300')

    // Verify surah header loads (Al-Baqarah)
    await expect(page.locator('[data-surah-header]')).toContainText('Al-Baqarah', { timeout: 10000 })

    // CRITICAL: Error message should be displayed for invalid verse
    const errorMessage = page.locator('[data-invalid-verse-error]')
    await expect(errorMessage).toBeVisible({ timeout: 5000 })
    await expect(errorMessage).toContainText('Verse 300 does not exist')
    await expect(errorMessage).toContainText('Al-Baqarah')
    await expect(errorMessage).toContainText('286 verses')

    // Surah should still load at verse 1 (graceful fallback)
    const verse1 = page.locator('[data-verse="1"]')
    await expect(verse1).toBeVisible()

    // Verify error can be dismissed
    const dismissBtn = errorMessage.locator('.qa-error-dismiss')
    await expect(dismissBtn).toBeVisible()
    await dismissBtn.click()
    await expect(errorMessage).not.toBeVisible()
  })

  test('navigate through multiple surahs', async ({ page }) => {
    await page.goto('/#/s/1')

    // Verify Surah 1 (Al-Fatiha)
    await expect(page.locator('[data-surah-header]')).toContainText('Al-Fatiha', { timeout: 10000 })

    // Navigate to Surah 112
    await page.goto('/#/s/112')
    await expect(page.locator('[data-surah-header]')).toContainText('Al-Ikhlas', { timeout: 10000 })

    // Verify basmala is present (surah 112 should have basmala)
    await expect(page.locator('.qa-basmala')).toBeVisible()

    // Verify surah 112 has 4 verses
    const verses = page.locator('[data-verse]')
    await expect(verses).toHaveCount(4, { timeout: 5000 })
  })

  test('surah 9 (At-Tawbah) has no basmala', async ({ page }) => {
    await page.goto('/#/s/9')

    // Verify surah loads
    await expect(page.locator('[data-surah-header]')).toContainText('At-Tawbah', { timeout: 10000 })

    // Verify NO basmala for surah 9
    await expect(page.locator('.qa-basmala')).toHaveCount(0)

    // Verify verses start immediately
    const firstVerse = page.locator('[data-verse="1"]')
    await expect(firstVerse).toBeVisible()
  })
})
