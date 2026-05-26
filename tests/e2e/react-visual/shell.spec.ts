import { expect, test } from '@playwright/test'

test('react shell visual baseline', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'QuranAtlas' })).toBeVisible()
  await expect(page).toHaveScreenshot('react-shell.png', {
    fullPage: true,
    animations: 'disabled',
  })
})
