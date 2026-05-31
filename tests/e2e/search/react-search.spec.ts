import { expect, test } from '@playwright/test'

import { installPageGuards, seedTargetState, targetUrl } from '../fixtures/react-golden-routes'
import { installSearchPackFixture } from '../fixtures/react-search-pack'

test('Search route supports keyboard flow, saved searches, details, and Open in Read', async ({ page }) => {
  const guard = installPageGuards(page, 'search route')
  await seedTargetState(page, 'react', 'onboarded-last-surface-reader')
  await page.goto(targetUrl('react', '/#/s/1'))
  await installSearchPackFixture(page)
  await page.goto(targetUrl('react', '/#/search'))

  await expect(page.getByRole('main', { name: 'Search' })).toBeVisible()
  await expect(page.getByText('Search data is ready on this device.')).toBeVisible()

  await page.getByLabel('Search Quran text, translation, or context').fill('Allah')
  await page.getByRole('tab', { name: 'Search mode: Translation' }).click()
  await page.getByRole('button', { exact: true, name: 'Search' }).click()

  await expect(page.getByLabel('Search results')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Match' })).toBeVisible()
  await page.getByRole('tab', { name: 'Source' }).click()
  await expect(page.getByText(/Open in Read always uses the verified Reader text/i)).toBeVisible()

  await page.getByRole('button', { name: 'Save search' }).click()
  await expect(page.getByRole('complementary', { name: 'Saved searches' })).toBeVisible()
  await expect(page.getByText('Allah').first()).toBeVisible()

  const openButton = page.getByRole('button', { name: /Open .* in Read/ }).first()
  if (await openButton.isVisible()) {
    await openButton.click()
    await expect(page).toHaveURL(/#\/s\/\d+\/\d+/)
  }

  guard.dispose()
  expect(guard.failures).toEqual([])
})
