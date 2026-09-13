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
  await expect(page.getByRole('region', { name: 'Texts and editions' })).toBeVisible()
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

test('settings use plain-language copy for controls and inventory', async ({ page }) => {
  await seedOnboardedReader(page)

  await page.goto('/#/settings')
  await expect(page.getByRole('heading', { name: 'Verse settings' })).toBeVisible()
  await expect(page.getByText('Read-only inventory for the active reading profile.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Close settings', exact: true }).click()

  await page.goto('/#/m/1')
  await page.getByRole('button', { name: 'Open settings' }).click()
  await expect(page.getByRole('heading', { name: 'Mushaf settings' })).toBeVisible()
  // The framing row itself needs a v2 (external-image) edition pack, which the
  // shipped dev dataset lacks; the offline suite's synthetic v2 edition covers
  // the rendered "Text area N%" copy. Here the retired jargon is the tripwire.
  await expect(page.getByText(/% reviewed frame width/)).toHaveCount(0)
})

test('reader never shows internal Hafs-keyed continuation vocabulary', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByText(/Hafs-keyed/)).toHaveCount(0)
  await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()
})

test('verse spacing offers three plain-language options', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/settings')
  await expect(page.getByRole('heading', { name: 'Verse settings' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Reading flow' }).click()
  await expect(page.getByRole('option', { name: 'Compact' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Comfortable' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Spacious' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Tight' })).toHaveCount(0)
  await expect(page.getByRole('option', { name: 'Standard' })).toHaveCount(0)
  await expect(page.getByRole('option', { name: 'Wide' })).toHaveCount(0)
})

test('about separates sources from build credits and offers a report route', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/about')
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Built with' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Report an issue' })).toBeVisible()
})

test('reader chrome exposes search and a surah selector without the drawer', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await expect(page.getByRole('button', { name: 'Search Quran' })).toBeVisible()
  await page.getByRole('button', { name: 'Search Quran' }).click()
  await expect(page).toHaveURL(/#\/search/)
  await page.goto('/#/s/2')
  await page.getByRole('button', { name: 'Choose surah' }).click()
  await expect(page.getByRole('dialog', { name: /navigation/i })).toBeVisible()
})

test('bookmarks is a standalone destination in the navigation drawer', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('button', { name: 'Bookmarks', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Bookmarks', exact: true }).click()
  await expect(page.getByRole('region', { name: /bookmarks/i })).toBeVisible()
})

test('theme offers a system-following option and night dimming is named by effect', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/settings')
  await expect(page.getByRole('radio', { name: 'Theme: System' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Theme: Auto' })).toHaveCount(0)
  await expect(page.getByText('Dims Mushaf page images in low light.')).toBeVisible()
})

test('surah start offers no backward navigation and titles appear once', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Previous surah/i })).toHaveCount(0)
  await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()
  await page.goto('/#/s/2')
  await expect(page.getByRole('button', { name: /Previous surah/i })).toBeVisible()
})

test('search defers tabs and save until a query returns results', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/search')
  await expect(page.getByText('Search the Quran')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Save search' })).toHaveCount(0)

  await page.getByLabel('Search Quran text, translation, or context').fill('mercy')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Show all matches' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Verses' })).toBeVisible()
})

test('about documents reference numbering and identifies editions', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/about')
  await expect(page.getByRole('heading', { name: 'Reference numbering' })).toBeVisible()
  await expect(page.getByText(/QuranAtlas reads in the Qalūn narration/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Editions' })).toBeVisible()
  await expect(page.getByText('Qalun Quran.ws')).toBeVisible()
  await expect(page.getByText('Qalun Furatiyyah 2023')).toBeVisible()
})
