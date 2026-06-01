import { expect, test, type Page } from '@playwright/test'

import { installPageGuards, seedTargetState, targetUrl } from '../fixtures/react-golden-routes'
import { installSearchPackFixture } from '../fixtures/react-search-pack'

test.setTimeout(90_000)

async function expectSearchResults(page: Page) {
  await expect(page.getByRole('region', { name: 'Search result workspace' })).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('article', { name: /Search result / }).first()).toBeVisible()
}

async function expectSearchOverview(page: Page, query: string) {
  await expect(page.getByRole('region', { name: 'Search result workspace' })).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: query })).toBeVisible()
}

test('Search route supports keyboard flow, saved searches, match inspection, and Open in Read', async ({ page }) => {
  await seedTargetState(page, 'react', 'onboarded-last-surface-reader')
  await page.goto(targetUrl('react', '/#/s/1'))
  await installSearchPackFixture(page)
  await page.goto(targetUrl('react', '/#/search'))
  const guard = installPageGuards(page, 'search route')

  await expect(page.getByRole('main', { name: 'Search' })).toBeVisible()
  await expect(page.getByText('Search data is ready on this device.').last()).toBeVisible()

  await page.getByLabel('Search Quran text, translation, or context').fill('Allah')
  await page.getByRole('tab', { name: 'Search mode: Translation' }).click()
  await page.getByRole('button', { exact: true, name: 'Search' }).click()

  await expectSearchOverview(page, 'Allah')
  await page.getByRole('tab', { name: 'Sources' }).click()
  await expect(page.getByText('Pack id')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Search index' })).toBeVisible()

  await page.getByLabel('Search Quran text, translation, or context').fill('الله')
  await page.getByRole('tab', { name: 'Search mode: Same root' }).click()
  await expect(page.getByRole('tab', { name: 'Search mode: Same root' })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('button', { exact: true, name: 'Search' }).click()
  await expectSearchOverview(page, 'الله')
  await expect(page.getByText('Same-root matches are morphology aids. They do not imply the same interpretation.')).toBeVisible()
  await page.getByRole('tab', { name: 'Verses' }).click()
  await expectSearchResults(page)
  await page.getByRole('button', { name: 'Explore selected result' }).click()
  await expect(page.getByRole('tab', { name: 'Explore' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Selected-token morphology details')).toBeVisible()
  await expect(page.getByText('Word-level match not available in Reader text')).toBeVisible()
  await page.getByRole('tab', { name: 'Sources' }).click()
  await expect(page.getByText('Reader mapping summary')).toBeVisible()

  await page.getByLabel('Search Quran text, translation, or context').fill('بسم الله')
  await page.getByRole('tab', { name: 'Search mode: Phrase' }).click()
  await page.getByLabel('Search Quran text, translation, or context').press('Enter')
  await expectSearchResults(page)
  await expect(page.getByRole('tab', { name: 'Verses' })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('button', { name: 'Explore selected result' }).click()
  await expect(page.getByText('Results show attested wording in the indexed Quran text. They are not generated suggestions, paraphrases, or tafsir.')).toBeVisible()
  await page.getByRole('button', { name: 'Load Explore sections' }).click()
  await expect(page.getByRole('button', { name: 'Attested following wording' })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'Attested following wording' }).click()
  await expect(page.getByText('Attested following wording shows wording observed after this phrase in the indexed text.').first()).toBeVisible()
  await page.getByRole('button', { name: 'Shared wording' }).click()
  await expect(page.getByText('Shared wording shows lexical overlap in the indexed text. It does not mean the verses have the same interpretation, ruling, theme, or sabab.').first()).toBeVisible()
  await page.getByRole('button', { name: 'Repeated phrases' }).click()
  await expect(page.getByRole('button', { name: 'Occurs once in this index' })).toBeVisible()
  await page.getByRole('button', { name: 'Occurs once in this index' }).click()
  await expect(page.getByText('"Occurs once" means once in the current Search index, according to its text and tokenization.').first()).toBeVisible()
  await page.getByRole('button', { name: 'Ayah endings' }).click()
  await page.getByRole('button', { name: 'Counts & patterns' }).click()
  await expect(page.getByText('Boundary policy')).toBeVisible()
  await expect(page.getByRole('button', { name: /prediction|autocomplete/i })).toHaveCount(0)

  await page.getByRole('button', { name: 'Save search' }).click()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  const savedSearches = page.getByRole('complementary', { name: 'Saved searches' })
  await expect(savedSearches).toBeVisible()
  await expect(savedSearches.getByRole('button', { name: 'Load saved search بسم الله' })).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()

  await page.getByLabel('Search Quran text, translation, or context').fill('112:1')
  await page.getByRole('tab', { name: 'Search mode: All' }).click()
  await page.getByRole('button', { exact: true, name: 'Search' }).click()
  await expectSearchResults(page)
  await expect(page.getByRole('tab', { name: 'Verses' })).toHaveAttribute('aria-selected', 'true')
  expect(guard.failures).toEqual([])
  guard.dispose()

  const openButton = page.getByRole('button', { name: 'Open in Read' }).first()
  if (await openButton.isVisible()) {
    await openButton.click()
    await expect(page).toHaveURL(/#\/s\/112\/1/)
  }
})

test('@mobile Search Explore graph sections stay collapsed and keyboard accessible on phone', async ({ page }) => {
  await seedTargetState(page, 'react', 'onboarded-last-surface-reader')
  await page.goto(targetUrl('react', '/#/s/1'))
  await installSearchPackFixture(page)
  await page.goto(targetUrl('react', '/#/search'))
  await expect(page.getByText('Search data is ready on this device.').last()).toBeVisible()
  await page.getByLabel('Search Quran text, translation, or context').fill('الله')
  await page.getByRole('tab', { name: 'Search mode: Arabic text' }).click()
  await expect(page.getByRole('tab', { name: 'Search mode: Arabic text' })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('button', { exact: true, name: 'Search' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await expectSearchOverview(page, 'الله')
  await page.getByRole('tab', { name: 'Verses' }).click()
  await expectSearchResults(page)
  await page.getByRole('button', { name: 'Explore selected result' }).click()
  await page.getByRole('button', { name: 'Load Explore sections' }).click()
  const following = page.getByRole('button', { name: 'Attested following wording' })
  await expect(following).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Boundary policy')).toHaveCount(0)
  await following.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Boundary policy')).toBeVisible()
})
