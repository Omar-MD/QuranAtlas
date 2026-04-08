import { test, expect } from '@playwright/test'

test.describe('Translation visibility persistence', () => {
  test('hides translation and state persists across surah navigation', async ({ page }) => {
    // Load surah 1
    await page.goto('/#/s/1')
    await page.waitForSelector('.qa-verse', { timeout: 8000 })
    await page.waitForTimeout(500)

    // Verify translations are visible initially
    const transEls = page.locator('.qa-verse-translation:not(.qa-hide-translation)')
    await expect(transEls.first()).toBeVisible()

    // Click "Hide translation" toggle
    const toggleBtn = page.locator('.qa-toggle-btn')
    await expect(toggleBtn).toBeVisible()
    // Aria-label should be "Hide translation" when translations are visible
    await expect(toggleBtn).toHaveAttribute('aria-label', 'Hide translation')
    await toggleBtn.click()
    await page.waitForTimeout(300)

    // Now translations should be hidden (have qa-hide-translation class)
    await expect(toggleBtn).toHaveAttribute('aria-label', 'Show translation')
    const hiddenEls = page.locator('.qa-verse-translation.qa-hide-translation')
    await expect(hiddenEls.first()).toBeAttached()

    // Navigate to a different surah
    await page.goto('/#/s/2')
    await page.waitForSelector('.qa-verse', { timeout: 8000 })
    await page.waitForTimeout(500)

    // Toggle button should still say "Show translation" (translations are hidden)
    const toggleBtn2 = page.locator('.qa-toggle-btn')
    await expect(toggleBtn2).toHaveAttribute('aria-label', 'Show translation')

    // Translation elements should still be hidden
    const hiddenEls2 = page.locator('.qa-verse-translation.qa-hide-translation')
    await expect(hiddenEls2.first()).toBeAttached()
  })

  test('shows translation and state persists across surah navigation', async ({ page }) => {
    // Load surah 1 and make sure we start fresh (translations visible by default)
    await page.goto('/#/s/1')
    await page.waitForSelector('.qa-verse', { timeout: 8000 })
    await page.waitForTimeout(500)

    const toggleBtn = page.locator('.qa-toggle-btn')

    // If translations are hidden from a previous test, show them first
    const label = await toggleBtn.getAttribute('aria-label')
    if (label === 'Show translation') {
      await toggleBtn.click()
      await page.waitForTimeout(300)
    }

    // Now translations should be visible
    await expect(toggleBtn).toHaveAttribute('aria-label', 'Hide translation')
    const visibleEls = page.locator('.qa-verse-translation:not(.qa-hide-translation)')
    await expect(visibleEls.first()).toBeVisible()

    // Navigate to a different surah
    await page.goto('/#/s/3')
    await page.waitForSelector('.qa-verse', { timeout: 8000 })
    await page.waitForTimeout(500)

    // Toggle button should still say "Hide translation" (translations are visible)
    const toggleBtn2 = page.locator('.qa-toggle-btn')
    await expect(toggleBtn2).toHaveAttribute('aria-label', 'Hide translation')

    // Translation elements should be visible
    const visibleEls2 = page.locator('.qa-verse-translation:not(.qa-hide-translation)')
    await expect(visibleEls2.first()).toBeVisible()
  })
})
