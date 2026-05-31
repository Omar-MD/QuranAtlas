import { expect, test } from '@playwright/test'

import { expectReactProductionPreflight, seedTargetState, targetUrl } from '../fixtures/react-golden-routes'
import { expectReactServiceWorkerReady } from '../fixtures/react-offline'
import { installSearchPackFixture, readSearchPackFixtureState } from '../fixtures/react-search-pack'

test.skip(process.env.PLAYWRIGHT_INCLUDE_OFFLINE !== '1', 'Search offline proof runs only against the preview build.')

test('@offline active Search pack cache and activation record survive offline reload', async ({ page }) => {
  await expectReactProductionPreflight(page)
  await seedTargetState(page, 'react', 'onboarded-offline-installed-assets')
  await page.goto(targetUrl('react', '/#/s/1'))
  await expectReactServiceWorkerReady(page)

  const installed = await installSearchPackFixture(page)
  await page.context().setOffline(true)
  try {
    await page.reload()
    const state = await readSearchPackFixtureState(page)

    expect(state.cacheNames).toContain(installed.cacheName)
    expect(state.activation).toMatchObject({ id: 'current', status: 'active' })
  } finally {
    await page.context().setOffline(false)
  }
})

test('@offline active Search pack supports the Search route without changing Reader continuity', async ({ page }) => {
  await expectReactProductionPreflight(page)
  await seedTargetState(page, 'react', 'onboarded-last-surface-reader')
  await page.goto(targetUrl('react', '/#/s/1'))
  await expectReactServiceWorkerReady(page)
  await installSearchPackFixture(page)

  await page.context().setOffline(true)
  try {
    await page.goto(targetUrl('react', '/#/search'))
    await expect(page.getByRole('main', { name: 'Search' })).toBeVisible()
    await expect(page.getByText('Search data is ready on this device.')).toBeVisible()
    await page.getByLabel('Search Quran text, translation, or context').fill('Allah')
    await page.getByRole('tab', { name: 'Search mode: Translation' }).click()
    await page.getByRole('button', { exact: true, name: 'Search' }).click()
    await expect(page.getByLabel('Search results')).toBeVisible()

    await page.goto(targetUrl('react', '/#/'))
    await expect(page).toHaveURL(/#\/s\/1$/)
  } finally {
    await page.context().setOffline(false)
  }
})
