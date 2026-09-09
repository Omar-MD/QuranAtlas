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
  // S-P4: opening settings from a ChromeFrame base (search) preserves that base
  // instead of teleporting to the reader.
  await expect(page).toHaveURL(/#\/search(?:\?.*)?$/)
  await expect(page.getByRole('heading', { name: 'Verse settings' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Included reading assets' })).toBeVisible()
  await page.getByRole('button', { name: 'Close settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Verse settings' })).toHaveCount(0)

  // Defect-inventory §9: after leaving #/search the URL must stay on the
  // destination — a stale async search write may never reclaim it. The settle
  // window re-assertion is the durable tripwire; the race itself is verified
  // by a manual probe (browser-timing-dependent).
  await page.goto('/#/search')
  await expect(page.getByRole('status').filter({ hasText: 'Search data is ready' })).toBeVisible()
  await page.getByLabel('Search Quran text, translation, or context').fill('mercy')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/search\?q=mercy$/)
  await page.getByRole('button', { name: 'Show all matches' }).click()
  await page.getByRole('button', { name: 'Open 1:3 in Reader' }).first().click()
  await expect(page).toHaveURL(/#\/s\/1\/2$/)
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await page.waitForTimeout(1_200)
  await expect(page).toHaveURL(/#\/s\/1\/2$/)
})
