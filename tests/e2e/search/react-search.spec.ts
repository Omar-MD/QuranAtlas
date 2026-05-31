import { expect, test } from '@playwright/test'

import { installPageGuards, seedTargetState, targetUrl } from '../fixtures/react-golden-routes'
import { installSearchPackFixture } from '../fixtures/react-search-pack'

test.setTimeout(90_000)

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

  await expect(page.getByLabel('Search results')).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('tab', { name: 'Match' })).toBeVisible()
  await page.getByRole('tab', { name: 'Source' }).click()
  await expect(page.getByText(/Open in Read always uses the verified Reader text/i)).toBeVisible()

  await page.getByLabel('Search Quran text, translation, or context').fill('الله')
  await page.getByRole('tab', { name: 'Search mode: Same root' }).click()
  await expect(page.getByRole('tab', { name: 'Search mode: Same root' })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('button', { exact: true, name: 'Search' }).click()
  await expect(page.getByLabel('Search results')).toBeVisible({ timeout: 30000 })
  await page.getByRole('tab', { name: 'Explore' }).click()
  await expect(page.getByText('Same-root matches are morphological aids.')).toBeVisible()
  await expect(page.getByText('Word-level match not available in Reader text')).toBeVisible()
  await page.getByRole('tab', { name: 'Source' }).click()
  await expect(page.getByText('Hafs source only').first()).toBeVisible()

  await page.getByLabel('Search Quran text, translation, or context').fill('بسم الله')
  await page.getByRole('tab', { name: 'Search mode: Phrase' }).click()
  await page.getByLabel('Search Quran text, translation, or context').press('Enter')
  await expect(page.getByLabel('Search results')).toBeVisible({ timeout: 30000 })
  await page.getByRole('tab', { name: 'Explore' }).click()
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
  await expect(page.getByText(/prediction|autocomplete/i)).toHaveCount(0)

  await page.getByRole('button', { name: 'Save search' }).click()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  const savedSearches = page.getByRole('complementary', { name: 'Saved searches' })
  await expect(savedSearches).toBeVisible()
  await expect(savedSearches.getByRole('button', { name: 'Load saved search بسم الله' })).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()

  const openButton = page.getByRole('button', { name: /Open .* in Read/ }).first()
  if (await openButton.isVisible()) {
    await openButton.click()
    await expect(page).toHaveURL(/#\/s\/\d+\/\d+/)
  }

  guard.dispose()
  expect(guard.failures).toEqual([])
})

test('@mobile Search Explore graph sections stay collapsed and keyboard accessible on phone', async ({ page }) => {
  await seedTargetState(page, 'react', 'onboarded-last-surface-reader')
  await page.goto(targetUrl('react', '/#/s/1'))
  await installSearchPackFixture(page)
  await page.goto(targetUrl('react', '/#/search'))
  await expect(page.getByText('Search data is ready on this device.')).toBeVisible()
  await page.getByLabel('Search Quran text, translation, or context').fill('الله')
  await page.getByRole('tab', { name: 'Search mode: Arabic text' }).click()
  await expect(page.getByRole('tab', { name: 'Search mode: Arabic text' })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('button', { exact: true, name: 'Search' }).click()
  await expect(page.getByLabel('Search results')).toBeVisible({ timeout: 30000 })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('tab', { name: 'Explore' }).click()
  await page.getByRole('button', { name: 'Load Explore sections' }).click()
  const following = page.getByRole('button', { name: 'Attested following wording' })
  await expect(following).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Boundary policy')).toHaveCount(0)
  await following.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Boundary policy')).toBeVisible()
})
