import { expect, test } from '@playwright/test'

test('react shell visual baseline', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#react-root')).toBeVisible()
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByTestId('verse-1:7')).toBeVisible()
  await expect(page.getByText(/Svelte app remains the shipped default/i)).toHaveCount(0)
  await expect(page).toHaveScreenshot('react-shell.png', {
    fullPage: true,
    animations: 'disabled',
  })
})
