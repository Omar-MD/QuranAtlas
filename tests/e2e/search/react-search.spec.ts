import { expect, test, type Page } from '@playwright/test'

import { installPageGuards, seedTargetState, targetUrl } from '../fixtures/react-golden-routes'
import { installSearchPackFixture } from '../fixtures/react-search-pack'

test.setTimeout(90_000)

async function expectSearchOverview(page: Page, query: string) {
  await expect(page.getByRole('region', { name: 'Search result workspace' })).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: query })).toBeVisible()
}

async function expectAskPreview(page: Page, query: string) {
  await expectSearchOverview(page, query)
  await expect(page.getByRole('region', { name: 'Evidence basis' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Best evidence' })).toBeVisible()
}

async function openAllMatches(page: Page) {
  await page.getByRole('button', { name: 'Show all matches' }).click()
  await expect(page.getByRole('region', { name: 'All matches' })).toBeVisible()
}

test('Search route supports keyboard flow, saved searches, match inspection, and Open in Read', async ({ page }) => {
  await seedTargetState(page, 'react', 'onboarded-last-surface-reader')
  await page.goto(targetUrl('react', '/#/s/1'))
  await installSearchPackFixture(page)
  await page.goto(targetUrl('react', '/#/search'))
  const guard = installPageGuards(page, 'search route')

  await expect(page.getByRole('main', { name: 'Search' })).toBeVisible()
  await expect(page.getByText('Search data is ready on this device.').last()).toBeVisible()
  await expect(page.getByRole('tab', { name: /Search mode:/ })).toHaveCount(0)

  await page.getByLabel('Search Quran text, translation, or context').fill('Allah')
  await page.getByRole('button', { exact: true, name: 'Search' }).click()

  await expectAskPreview(page, 'Allah')
  await openAllMatches(page)
  await page.getByRole('tab', { name: 'Sources' }).click()
  await expect(page.getByRole('region', { name: 'Sources are summarized on Overview' })).toBeVisible()

  await page.getByLabel('Search Quran text, translation, or context').fill('الله')
  await page.getByRole('button', { exact: true, name: 'Search' }).click()
  await expectAskPreview(page, 'الله')
  await page.getByRole('tab', { name: 'Verses' }).click()
  await expect(page.getByRole('region', { name: 'Verses use All matches for this preview' })).toBeVisible()
  await openAllMatches(page)
  await page.getByRole('tab', { name: 'Sources' }).click()
  await expect(page.getByRole('region', { name: 'Sources are summarized on Overview' })).toBeVisible()

  await page.getByLabel('Search Quran text, translation, or context').fill('بسم الله')
  await page.getByLabel('Search Quran text, translation, or context').press('Enter')
  await expectAskPreview(page, 'بسم الله')
  await expect(page.getByRole('button', { name: /prediction|autocomplete/i })).toHaveCount(0)

  await page.getByRole('button', { name: 'Save search' }).click()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  const savedSearches = page.getByRole('complementary', { name: 'Saved searches' })
  await expect(savedSearches).toBeVisible()
  await expect(savedSearches.getByRole('button', { name: 'Load saved search بسم الله' })).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()

  await page.getByLabel('Search Quran text, translation, or context').fill('Allah')
  await page.getByRole('button', { exact: true, name: 'Search' }).click()
  await expectAskPreview(page, 'Allah')
  await openAllMatches(page)

  const openButton = page.getByRole('article', { name: 'Evidence 2:7' }).getByRole('button', { name: 'Open 2:7 in Reader' })
  await expect(openButton).toBeVisible()
  expect(guard.failures).toEqual([])
  guard.dispose()
  await openButton.click()
  await expect(page).toHaveURL(/#\/s\/\d+\/\d+$/)
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
})

test('@mobile Search Ask preview tabs keep All matches keyboard accessible on phone', async ({ page }) => {
  await seedTargetState(page, 'react', 'onboarded-last-surface-reader')
  await page.goto(targetUrl('react', '/#/s/1'))
  await installSearchPackFixture(page)
  await page.goto(targetUrl('react', '/#/search'))
  await expect(page.getByText('Search data is ready on this device.').last()).toBeVisible()
  await expect(page.getByRole('tab', { name: /Search mode:/ })).toHaveCount(0)
  await page.getByLabel('Search Quran text, translation, or context').fill('الله')
  await page.getByRole('button', { exact: true, name: 'Search' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await expectAskPreview(page, 'الله')
  await page.getByRole('tab', { name: 'Verses' }).click()
  await expect(page.getByRole('region', { name: 'Verses use All matches for this preview' })).toBeVisible()
  const showAllMatches = page.getByRole('button', { name: 'Show all matches' })
  await showAllMatches.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('region', { name: 'All matches' })).toBeVisible()
})
