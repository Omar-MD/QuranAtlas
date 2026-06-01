import { expect, test, type Page } from '@playwright/test'

import { expectReactProductionPreflight, seedTargetState, targetUrl } from '../fixtures/react-golden-routes'
import { expectReactServiceWorkerReady } from '../fixtures/react-offline'
import { installSearchPackFixture, readSearchPackFixtureState } from '../fixtures/react-search-pack'

test.skip(process.env.PLAYWRIGHT_INCLUDE_OFFLINE !== '1', 'Search offline proof runs only against the preview build.')

async function expectSearchResults(page: Page) {
  await expect(page.getByRole('region', { name: 'Search result workspace' })).toBeVisible()
  await expect(page.getByRole('article', { name: /Search result / }).first()).toBeVisible()
}

async function expectSearchOverview(page: Page, query: string) {
  await expect(page.getByRole('region', { name: 'Search result workspace' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: query })).toBeVisible()
}

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
    await expect(page.getByText('Search data is ready on this device.').last()).toBeVisible()
    await page.getByLabel('Search Quran text, translation, or context').fill('Allah')
    await page.getByRole('tab', { name: 'Search mode: Translation' }).click()
    await page.getByRole('button', { exact: true, name: 'Search' }).click()
    await expectSearchOverview(page, 'Allah')

    await page.goto(targetUrl('react', '/#/'))
    await expect(page).toHaveURL(/#\/s\/1$/)
  } finally {
    await page.context().setOffline(false)
  }
})

test('@offline missing graph shard degrades only the Explore panel', async ({ page }) => {
  await expectReactProductionPreflight(page)
  await seedTargetState(page, 'react', 'onboarded-last-surface-reader')
  await page.goto(targetUrl('react', '/#/s/1'))
  await expectReactServiceWorkerReady(page)
  await installSearchPackFixture(page)
  await page.evaluate(async () => {
    const registry = await fetch('/search-packs/registry.json').then((response) => response.json())
    const entry = registry.packs[0]
    const manifest = await fetch(entry.manifestUrl).then((response) => response.json())
    const cache = await caches.open(`quran-atlas-search-pack-${entry.contentHash}`)
    const graphShard = manifest.shards.find((shard) => shard.featureId === 'following-wording')
    if (graphShard) await cache.delete(graphShard.url)
  })

  await page.context().setOffline(true)
  try {
    await page.goto(targetUrl('react', '/#/search'))
    await expect(page.getByText('Search data is ready on this device.').last()).toBeVisible()
    await page.getByLabel('Search Quran text, translation, or context').fill('بسم الله')
    await page.getByRole('tab', { name: 'Search mode: Phrase' }).click()
    await page.getByRole('button', { exact: true, name: 'Search' }).click()
    await expectSearchResults(page)
    await page.getByRole('button', { name: 'Explore selected result' }).click()
    await page.getByRole('button', { name: 'Load Explore sections' }).click()
    await page.getByRole('button', { name: 'Attested following wording' }).click()
    await expect(page.getByText(/Missing graph feature:/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Shared wording' })).toBeVisible()
  } finally {
    await page.context().setOffline(false)
  }
})
