/**
 * E2E Test: Navigation Panel
 * Critical User Journey: Open nav panel, search, and jump to surah
 */

import { test, expect } from '@playwright/test'

test.describe('Navigation Panel', () => {
  test('nav panel opens via hamburger toggle', async ({ page }) => {
    await page.goto('/#/s/1')

    // Wait for app to load
    await expect(page.locator('#app-shell')).toBeVisible({ timeout: 10000 })

    // Find and click hamburger toggle
    const toggleBtn = page.locator('.qa-nav-toggle')
    await expect(toggleBtn).toBeVisible()
    await toggleBtn.click()

    // Verify nav panel is open
    const navPanel = page.locator('#nav-surface')
    await expect(navPanel).toHaveClass(/qa-nav-open/)

    // Verify nav list is visible
    const navList = page.locator('.qa-nav-list')
    await expect(navList).toBeVisible()
  })

  test('nav panel closes via backdrop click', async ({ page }) => {
    await page.goto('/#/s/1')

    // Wait for app to load
    await expect(page.locator('#app-shell')).toBeVisible({ timeout: 10000 })

    // Open nav panel
    await page.locator('.qa-nav-toggle').click()
    await expect(page.locator('#nav-surface')).toHaveClass(/qa-nav-open/)

    // Click backdrop to close
    const backdrop = page.locator('.qa-nav-backdrop')
    await expect(backdrop).toHaveClass(/qa-nav-open/)
    await backdrop.click()

    // Verify nav panel is closed
    await expect(page.locator('#nav-surface')).not.toHaveClass(/qa-nav-open/)
  })

  test('search filters surah list', async ({ page }) => {
    await page.goto('/#/s/1')

    // Open nav panel
    await page.locator('.qa-nav-toggle').click()
    await expect(page.locator('#nav-surface')).toHaveClass(/qa-nav-open/)

    // Find search input
    const searchInput = page.locator('.qa-nav-search')
    await expect(searchInput).toBeVisible()

    // Type search query (search for "Ikh" to find Al-Ikhlas)
    await searchInput.fill('Ikh')

    // Wait for filter to apply - expect fewer items than full list
    await expect(page.locator('.qa-nav-item')).toHaveCount(1)

    // Verify Al-Ikhlas is in the results
    const ikhlasItem = page.locator('.qa-nav-item').filter({ hasText: /Ikhlas/i })
    await expect(ikhlasItem).toBeVisible()
  })

  test('clicking surah in nav navigates to that surah', async ({ page }) => {
    await page.goto('/#/s/1')

    // Wait for app to load
    await expect(page.locator('[data-surah-header]')).toContainText('Al-Fatiha', { timeout: 10000 })

    // Open nav panel
    await page.locator('.qa-nav-toggle').click()
    await expect(page.locator('#nav-surface')).toHaveClass(/qa-nav-open/)

    // Find and click a surah (e.g., Al-Ikhlas / surah 112)
    const surah112 = page.locator('.qa-nav-item').filter({ hasText: 'Al-Ikhlas' }).first()
    await expect(surah112).toBeVisible()
    await surah112.click()

    // Wait for navigation
    await page.waitForTimeout(1000)

    // Verify we're on surah 112
    await expect(page.locator('[data-surah-header]')).toContainText('Al-Ikhlas', { timeout: 10000 })

    // Note: Nav panel auto-closes on mobile only. On desktop/tablet it stays open.
    // Close nav manually to clean up (works on all viewport sizes)
    const isMobile = await page.evaluate(() => window.matchMedia('(max-width: 768px)').matches)
    if (!isMobile) {
      // On desktop, close nav via backdrop
      await page.locator('.qa-nav-backdrop').click()
      await expect(page.locator('#nav-surface')).not.toHaveClass(/qa-nav-open/)
    } else {
      // On mobile, nav should auto-close after navigation
      await expect(page.locator('#nav-surface')).not.toHaveClass(/qa-nav-open/)
    }
  })

  test('current surah is highlighted in nav', async ({ page }) => {
    await page.goto('/#/s/2')

    // Wait for surah to load
    await expect(page.locator('[data-surah-header]')).toContainText('Al-Baqarah', { timeout: 10000 })

    // Open nav panel
    await page.locator('.qa-nav-toggle').click()
    await expect(page.locator('#nav-surface')).toHaveClass(/qa-nav-open/)

    // Find current surah in nav
    const currentItem = page.locator('.qa-nav-current')
    await expect(currentItem).toBeVisible()

    // Verify it shows Al-Baqarah
    await expect(currentItem).toContainText('Al-Baqarah')
  })

  test('nav shows all 114 surahs', async ({ page }) => {
    await page.goto('/#/s/1')

    // Open nav panel
    await page.locator('.qa-nav-toggle').click()
    await expect(page.locator('#nav-surface')).toHaveClass(/qa-nav-open/)

    // Clear search to show all surahs
    const searchInput = page.locator('.qa-nav-search')
    await searchInput.clear()

    // Wait for all 114 surahs to be visible
    await expect(page.locator('.qa-nav-item')).toHaveCount(114)
  })
})
