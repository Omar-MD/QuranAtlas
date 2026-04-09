/**
 * E2E Test: Navigation Panel
 * Critical User Journey: Open nav panel, search, and jump to surah
 */

import { test, expect } from '@playwright/test'

async function usesCollapsedNav(page) {
  return page.locator('.qa-nav-toggle').isVisible()
}

async function expectPersistentNavLayout(page) {
  await expect(page.locator('.qa-nav-toggle')).toBeHidden()
  await expect(page.locator('.qa-nav-backdrop')).toBeHidden()
  await expect(page.locator('#nav-surface')).toBeVisible()
}

async function openNavForCurrentLayout(page) {
  const navPanel = page.locator('#nav-surface')
  const navList = page.locator('.qa-nav-list')

  if (await usesCollapsedNav(page)) {
    await page.locator('.qa-nav-toggle').click()
    await expect(navPanel).toHaveClass(/qa-nav-open/)
  } else {
    await expectPersistentNavLayout(page)
  }

  await expect(navList).toBeVisible()
}

test.describe('Navigation Panel', () => {
  test('navigation surface is accessible in the current layout @tablet', async ({ page }) => {
    await page.goto('/#/s/1')

    // Wait for app to load
    await expect(page.locator('#app-shell')).toBeVisible({ timeout: 10000 })

    await openNavForCurrentLayout(page)
  })

  test('nav panel closes via backdrop click', async ({ page }) => {
    await page.goto('/#/s/1')

    // Wait for app to load
    await expect(page.locator('#app-shell')).toBeVisible({ timeout: 10000 })

    if (!(await usesCollapsedNav(page))) {
      await expectPersistentNavLayout(page)
      return
    }

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

  test('search filters surah list @tablet', async ({ page }) => {
    await page.goto('/#/s/1')

    await expect(page.locator('#app-shell')).toBeVisible({ timeout: 10000 })
    await openNavForCurrentLayout(page)

    // Find search input
    const searchInput = page.locator('.qa-nav-search')
    await expect(searchInput).toBeVisible()

    // Type search query (search for "Ikh" to find Al-Ikhlas)
    await searchInput.fill('Ikh')

    // Wait for filter to apply - expect fewer items than full list
    await expect(page.locator('.qa-nav-item:not([hidden])')).toHaveCount(1)

    // Verify Al-Ikhlas is in the results
    const ikhlasItem = page.locator('.qa-nav-item').filter({ hasText: /Ikhlas/i })
    await expect(ikhlasItem).toBeVisible()
  })

  test('clicking surah in nav navigates to that surah @tablet', async ({ page }) => {
    await page.goto('/#/s/1')

    // Wait for app to load
    await expect(page.locator('[data-surah-header]')).toContainText('Al-Fatiha', { timeout: 10000 })

    const isCollapsed = await usesCollapsedNav(page)
    await openNavForCurrentLayout(page)

    // Find and click a surah (e.g., Al-Ikhlas / surah 112)
    const surah112 = page.locator('.qa-nav-item').filter({ hasText: 'Al-Ikhlas' }).first()
    await expect(surah112).toBeVisible()
    await surah112.click()

    // Verify we're on surah 112
    await expect(page.locator('[data-surah-header]')).toContainText('Al-Ikhlas', { timeout: 10000 })

    if (isCollapsed) {
      // Overlay layouts auto-close after a selection.
      await expect(page.locator('#nav-surface')).not.toHaveClass(/qa-nav-open/)
    } else {
      await expectPersistentNavLayout(page)
    }
  })

  test('current surah is highlighted in nav @tablet', async ({ page }) => {
    await page.goto('/#/s/2')

    // Wait for surah to load
    await expect(page.locator('[data-surah-header]')).toContainText('Al-Baqarah', { timeout: 10000 })

    await openNavForCurrentLayout(page)

    // Find current surah in nav
    const currentItem = page.locator('.qa-nav-current')
    await expect(currentItem).toBeVisible()

    // Verify it shows Al-Baqarah
    await expect(currentItem).toContainText('Al-Baqarah')
  })

  test('nav shows all 114 surahs @tablet', async ({ page }) => {
    await page.goto('/#/s/1')

    await expect(page.locator('#app-shell')).toBeVisible({ timeout: 10000 })
    await openNavForCurrentLayout(page)

    // Clear search to show all surahs
    const searchInput = page.locator('.qa-nav-search')
    await searchInput.clear()

    // Wait for all 114 surahs to be visible
    await expect(page.locator('.qa-nav-item')).toHaveCount(114)
  })
})
