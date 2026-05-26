import { expect, test } from '@playwright/test'

test('renders the isolated React shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'QuranAtlas' })).toBeVisible()
  await expect(page.getByText('Svelte app remains the shipped default')).toBeVisible()
  await expect(page.locator('#react-root')).toBeVisible()
})
