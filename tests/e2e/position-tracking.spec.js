/**
 * E2E Test: Position Tracking
 * Critical User Journey: Scroll to verse, reload, restore position
 */

import { test, expect } from '@playwright/test'

test.describe('Position Tracking', () => {
  test('position is saved when scrolling', async ({ page }) => {
    await page.goto('/#/s/2')

    // Wait for surah to load
    await expect(page.locator('[data-surah-header]')).toBeVisible({ timeout: 10000 })

    // Wait for verses to render
    await expect(page.locator('[data-verse="50"]')).toBeVisible({ timeout: 5000 })

    // Scroll to verse 50
    const verse50 = page.locator('[data-verse="50"]')
    await verse50.scrollIntoViewIfNeeded()

    // Wait a bit for scroll tracking
    await page.waitForTimeout(1000)

    // Trigger visibility change event to save position
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // Wait for position save
    await page.waitForTimeout(500)

    // Verify position was saved (check IndexedDB via page.evaluate)
    const position = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('quran-atlas', 1)
        request.onsuccess = (event) => {
          const db = event.target.result
          const tx = db.transaction('positions', 'readonly')
          const store = tx.objectStore('positions')
          const getReq = store.get('s2')
          getReq.onsuccess = () => resolve(getReq.result)
          getReq.onerror = () => resolve(null)
        }
        request.onerror = () => resolve(null)
      })
    })

    // Position should be around verse 50 (give or take a few verses)
    expect(position).not.toBeNull()
    expect(position.surah).toBe(2)
    // Position should be within reasonable range of verse 50
    expect(position.verse).toBeGreaterThanOrEqual(40)
    expect(position.verse).toBeLessThanOrEqual(60)
  })

  test('position is restored on reload', async ({ page }) => {
    // First, navigate and scroll to set a position
    await page.goto('/#/s/2')
    await expect(page.locator('[data-surah-header]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-verse="50"]')).toBeVisible({ timeout: 5000 })

    // Scroll to verse 50
    const verse50 = page.locator('[data-verse="50"]')
    await verse50.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1000)

    // Trigger save
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(500)

    // Reload the page
    await page.reload()

    // Wait for surah to reload
    await expect(page.locator('[data-surah-header]')).toBeVisible({ timeout: 10000 })

    // Wait for position restoration
    await page.waitForTimeout(1000)

    // Check if we scrolled to near verse 50
    // This is approximate - we're checking if the scroll position is not at the top
    const scrollTop = await page.evaluate(() => {
      const mainContent = document.getElementById('main-content')
      return mainContent ? mainContent.scrollTop : 0
    })

    // Should have scrolled down (not at top)
    expect(scrollTop).toBeGreaterThan(0)
  })

  test('resume indicator appears when position is saved', async ({ page }) => {
    await page.goto('/#/s/2')

    // Wait for surah to load
    await expect(page.locator('[data-surah-header]')).toBeVisible({ timeout: 10000 })

    // Scroll down to save position
    await expect(page.locator('[data-verse="50"]')).toBeVisible({ timeout: 5000 })
    const verse50 = page.locator('[data-verse="50"]')
    await verse50.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1000)

    // Trigger save
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(500)

    // Navigate away and back
    await page.goto('/#/s/1')
    await expect(page.locator('[data-surah-header]')).toContainText('Al-Fatiha', { timeout: 10000 })

    // Navigate back to surah 2
    await page.goto('/#/s/2')
    await expect(page.locator('[data-surah-header]')).toContainText('Al-Baqarah', { timeout: 10000 })

    // Resume indicator should appear
    const resumeIndicator = page.locator('[data-resume-indicator]')
    await expect(resumeIndicator).toBeVisible({ timeout: 5000 })
  })

  test('jump button in resume indicator scrolls to position', async ({ page }) => {
    await page.goto('/#/s/2')

    // Wait for surah to load
    await expect(page.locator('[data-surah-header]')).toBeVisible({ timeout: 10000 })

    // Scroll to verse 50
    await expect(page.locator('[data-verse="50"]')).toBeVisible({ timeout: 5000 })
    const verse50 = page.locator('[data-verse="50"]')
    await verse50.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1000)

    // Trigger save
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(500)

    // Navigate away and back
    await page.goto('/#/s/1')
    await page.goto('/#/s/2')

    // Wait for resume indicator
    const resumeIndicator = page.locator('[data-resume-indicator]')
    await expect(resumeIndicator).toBeVisible({ timeout: 10000 })

    // Click jump button
    const jumpBtn = page.locator('.qa-resume-jump')
    await jumpBtn.click()

    // Wait for scroll
    await page.waitForTimeout(1000)

    // Resume indicator should be gone after jump
    await expect(resumeIndicator).not.toBeVisible()
  })

  test('dismiss button removes resume indicator', async ({ page }) => {
    await page.goto('/#/s/2')

    // Wait for surah to load
    await expect(page.locator('[data-surah-header]')).toBeVisible({ timeout: 10000 })

    // Scroll and save position
    await expect(page.locator('[data-verse="50"]')).toBeVisible({ timeout: 5000 })
    await page.locator('[data-verse="50"]').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1000)
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(500)

    // Navigate away and back
    await page.goto('/#/s/1')
    await page.goto('/#/s/2')

    // Wait for resume indicator
    const resumeIndicator = page.locator('[data-resume-indicator]')
    await expect(resumeIndicator).toBeVisible({ timeout: 10000 })

    // Click dismiss button
    const dismissBtn = page.locator('.qa-resume-dismiss')
    await dismissBtn.click()

    // Resume indicator should be gone
    await expect(resumeIndicator).not.toBeVisible()
  })
})
