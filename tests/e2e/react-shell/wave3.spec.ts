import { expect, test } from '@playwright/test'

test('renders React reader, settings, and search Wave 3 routes', async ({ page }) => {
  await page.goto('/#/s/1/1')
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByTestId('verse-1:1')).toHaveAttribute('data-token-key', '1:1')

  await page.goto('/#/settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByText('Reader assets')).toBeVisible()

  await page.goto('/#/search')
  await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible()
  await page.getByLabel('Search QuranAtlas').fill('Compassionate')
  await expect(page.getByText('Most Compassionate Most Merciful')).toBeVisible()
})
