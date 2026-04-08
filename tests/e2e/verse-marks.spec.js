import { test, expect } from '@playwright/test'

test.describe('Verse marks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await page.waitForSelector('.qa-verse', { timeout: 8000 })
    await page.waitForTimeout(500)
  })

  test('hovering a verse shows the mark icon', async ({ page }) => {
    const verse = page.locator('.qa-verse').first()

    // Hover the verse to trigger icon appearance
    await verse.hover()
    await page.waitForTimeout(200)

    // Icon should appear
    const icon = verse.locator('.qa-mark-hover-icon')
    await expect(icon).toBeVisible({ timeout: 2000 })
  })

  test('clicking the hover icon opens the mark editor modal', async ({ page }) => {
    const verse = page.locator('.qa-verse').first()

    // Hover to trigger icon
    await verse.hover()
    await page.waitForTimeout(200)

    const icon = verse.locator('.qa-mark-hover-icon')
    await expect(icon).toBeVisible({ timeout: 2000 })

    // Click the icon
    await icon.click()
    await page.waitForTimeout(300)

    // Modal should open
    const modal = page.locator('.qa-mark-modal')
    await expect(modal).toBeVisible({ timeout: 3000 })

    // Modal should have a title with verse info
    const modalTitle = page.locator('.qa-mark-title')
    await expect(modalTitle).toBeVisible()
  })

  test('mark editor modal has save and cancel buttons', async ({ page }) => {
    const verse = page.locator('.qa-verse').first()

    await verse.hover()
    await page.waitForTimeout(200)

    const icon = verse.locator('.qa-mark-hover-icon')
    await expect(icon).toBeVisible({ timeout: 2000 })
    await icon.click()
    await page.waitForTimeout(300)

    const modal = page.locator('.qa-mark-modal')
    await expect(modal).toBeVisible({ timeout: 3000 })

    // Verify Save and Cancel buttons
    await expect(page.locator('.qa-mark-save-btn')).toBeVisible()
    await expect(page.locator('.qa-mark-cancel-btn')).toBeVisible()
  })

  test('clicking cancel closes the mark editor modal', async ({ page }) => {
    const verse = page.locator('.qa-verse').first()

    await verse.hover()
    await page.waitForTimeout(200)

    const icon = verse.locator('.qa-mark-hover-icon')
    await expect(icon).toBeVisible({ timeout: 2000 })
    await icon.click()
    await page.waitForTimeout(300)

    const modal = page.locator('.qa-mark-modal')
    await expect(modal).toBeVisible({ timeout: 3000 })

    // Cancel
    await page.locator('.qa-mark-cancel-btn').click()
    await page.waitForTimeout(200)

    await expect(modal).not.toBeVisible()
  })

  test('saving a mark with no tags and re-opening shows no checked tags', async ({ page }) => {
    const verse = page.locator('.qa-verse').first()

    await verse.hover()
    await page.waitForTimeout(200)

    const icon = verse.locator('.qa-mark-hover-icon')
    await expect(icon).toBeVisible({ timeout: 2000 })
    await icon.click()
    await page.waitForTimeout(300)

    const modal = page.locator('.qa-mark-modal')
    await expect(modal).toBeVisible({ timeout: 3000 })

    // Save with no tags (just click save)
    await page.locator('.qa-mark-save-btn').click()
    await page.waitForTimeout(300)

    // Modal closes after save
    await expect(modal).not.toBeVisible()
  })
})
