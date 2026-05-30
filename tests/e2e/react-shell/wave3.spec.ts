import { expect, test } from '@playwright/test'

test('renders React reader and settings while search stays unsupported', async ({ page }) => {
  await page.goto('/#/s/1/1')
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByTestId('verse-1:1')).toHaveAttribute('data-token-key', '1:1')

  await page.goto('/#/settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Included assets' })).toBeVisible()
  await page.getByRole('button', { name: 'Close settings', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0)

  await page.goto('/#/search?q=Compassionate')
  await expect(page.getByRole('main', { name: /unsupported route/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /route unavailable/i })).toBeVisible()
  await expect(page.getByText('Most Compassionate Most Merciful')).toHaveCount(0)
})
