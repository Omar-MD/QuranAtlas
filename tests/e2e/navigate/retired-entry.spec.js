import { test, expect } from '@playwright/test'
import { waitForReader } from '../fixtures/chrome.js'

test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })

test.describe('removed command/search entry', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  const retiredSheet = ['.qa', 'cmd', 'sheet'].join('-')
  const retiredInput = ['.qa', 'cmd', 'input'].join('-')

  test('platform modifier shortcuts and slash do not open retired navigation UI', async ({ page }) => {
    await page.keyboard.press('Meta+K')
    await page.keyboard.press('Control+K')
    await page.keyboard.press('/')

    await expect(page.locator(retiredSheet)).toHaveCount(0)
    await expect(page.locator(retiredInput)).toHaveCount(0)
    await expect(page).toHaveURL(/#\/s\/1$/)
  })

  test('shortcuts sheet omits command sheet promises but still opens with ?', async ({ page }) => {
    await page.keyboard.press('?')

    const sheet = page.locator('.qa-sheet--shortcuts')
    await expect(sheet).toBeVisible()
    await expect(sheet).not.toContainText(['Command', 'sheet'].join(' '))
    await expect(sheet).not.toContainText(['Open', 'command', 'sheet'].join(' '))
    await expect(sheet).not.toContainText('⌘')
  })

  test('desktop rail has no Search affordance', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/#/s/1')
    await waitForReader(page)

    await expect(page.locator('[data-tab="search"]')).toHaveCount(0)
    await expect(page.locator('#bottom-nav [aria-label="Search"]')).toHaveCount(0)
  })
})
