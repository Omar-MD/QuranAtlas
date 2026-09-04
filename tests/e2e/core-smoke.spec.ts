import { expect, test } from '@playwright/test'

import { seedOnboardedReader } from './fixtures/app'

test('boots the reader and reaches primary reader, search, and settings surfaces', async ({ page }) => {
  await seedOnboardedReader(page)

  await page.goto('/#/s/1')
  await expect(page).toHaveURL(/#\/s\/1$/)
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()

  await page.goto('/#/search')
  await expect(page).toHaveURL(/#\/search(?:\?.*)?$/)
  await expect(page.getByRole('main', { name: 'Search' })).toBeVisible()
  await expect(page.getByLabel('Search Quran text, translation, or context')).toBeVisible()

  await page.goto('/#/settings')
  await expect(page).toHaveURL(/#\/s\/1$/)
  await expect(page.getByRole('heading', { name: 'Verse settings' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Included reading assets' })).toBeVisible()
  await page.getByRole('button', { name: 'Close settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Verse settings' })).toHaveCount(0)
})
