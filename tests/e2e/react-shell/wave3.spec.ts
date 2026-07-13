import { expect, test } from '@playwright/test'

import { seedTargetState } from '../fixtures/react-golden-routes'

test('renders React reader, settings, and the shipped Search route', async ({ page }) => {
  await seedTargetState(page, 'react', 'onboarded-last-surface-reader')
  await page.goto('/#/s/1/1')
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()

  await page.goto('/#/settings')
  await expect(page.getByRole('heading', { name: 'Verse settings' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Included reading assets' })).toBeVisible()
  await page.getByRole('button', { name: 'Close settings', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Verse settings' })).toHaveCount(0)

  await page.goto('/#/search?q=Compassionate')
  await expect(page.getByRole('main', { name: 'Search' })).toBeVisible()
  await expect(page.getByLabel('Search Quran text, translation, or context')).toBeVisible()
  await expect(page.getByText('Most Compassionate Most Merciful')).toHaveCount(0)
})
