import { expect, test } from '@playwright/test'

test('renders the isolated React shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('#react-root')).toBeVisible()
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByText(/Legacy app remains the shipped default/i)).toHaveCount(0)
})
