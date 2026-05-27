import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedLastSurface, waitForLastSurface } from '../fixtures/idb.js'
import { waitForReader } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Journey A: launch splash and retired onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
  })

  test('cold launch shows splash then opens reader automatically', async ({ page }) => {
    await page.goto('/')
    const splash = page.getByTestId('launch-splash')
    await expect(splash).toBeVisible()
    await expect(page).toHaveURL(/#\/s\/1$/)
    await expect(splash).toBeHidden()
    await waitForReader(page)
    await expect(page.locator('.qa-verse-arabic').first()).toHaveAttribute('data-riwayah', 'qaloon')
    await expect(page.getByRole('button', { name: /choose riwayah|choose translation/i })).toHaveCount(0)
  })

  test('legacy onboarding hash redirects through launch path without setup choices', async ({ page }) => {
    await page.goto('/?legacy=onboarding#/onboarding')
    const splash = page.getByTestId('launch-splash')
    await expect(splash).toBeVisible()
    await expect(page).toHaveURL(/#\/s\/1$/)
    await expect(splash).toBeHidden()
    await waitForReader(page)
    await expect(page.getByRole('button', { name: /choose riwayah|choose translation/i })).toHaveCount(0)
  })

  test('legacy onboarding hash restores a valid reader last surface', async ({ page }) => {
    await waitForReader(page)
    await waitForLastSurface(page, '#/s/1')
    await markOnboardingComplete(page)
    await seedLastSurface(page, '#/m/5')
    await page.goto('/?legacy=restore#/onboarding')
    const splash = page.getByTestId('launch-splash')
    await expect(splash).toBeVisible()
    await expect(page).toHaveURL(/#\/m\/5$/)
    await expect(splash).toBeHidden()
  })

  test('launch reader remains axe-clean @a11y', async ({ page }) => {
    await page.goto('/')
    await waitForReader(page)

    const violations = await scanA11y(page)
    expect(violations).toEqual([])
  })
})
