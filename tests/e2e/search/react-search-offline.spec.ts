import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

import { expectReactProductionPreflight, seedTargetState, targetUrl } from '../fixtures/react-golden-routes'
import { expectReactServiceWorkerReady } from '../fixtures/react-offline'
import { installSearchPackFixture, readSearchPackFixtureState } from '../fixtures/react-search-pack'

test.skip(process.env.PLAYWRIGHT_INCLUDE_OFFLINE !== '1', 'Search offline proof runs only against the preview build.')

async function expectSearchOverview(page: Page, query: string) {
  await expect(page.getByRole('region', { name: 'Search result workspace' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: query })).toBeVisible()
}

function searchWorkerAssetUrl(): string {
  const asset = readdirSync(join(process.cwd(), 'dist', 'assets'))
    .find((name) => /^search\.worker-.*\.js$/.test(name))
  if (!asset) throw new Error('Built Search worker asset not found in dist/assets')
  return `/assets/${asset}`
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

test('@offline missing graph shard keeps Ask preview evidence-bounded', async ({ page }) => {
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
    await expectSearchOverview(page, 'بسم الله')
    await expect(page.getByText(/unsupported answer/i)).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Evidence basis' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Best evidence' })).toBeVisible()
    await page.getByRole('tab', { name: 'Explore' }).click()
    await expect(page.getByRole('region', { name: 'Explore is not loaded for this preview' })).toBeVisible()
    await expect(page.getByText(/Missing graph feature:/)).toHaveCount(0)

    const workerProof = await page.evaluate(async (workerUrl) => {
      const queryAst = {
        astVersion: 1,
        filters: { sourceLane: ['arabic-text'] },
        mode: 'phrase',
        normalizedText: 'بسم الله',
        rawText: 'بسم الله',
        tokens: ['بسم', 'الله'],
      }
      const worker = new Worker(workerUrl, { type: 'module' })
      const post = <TResponse,>(message: Record<string, unknown>) => new Promise<TResponse>((resolve, reject) => {
        const requestId = String(message.requestId)
        const timeout = window.setTimeout(() => {
          worker.removeEventListener('message', onMessage)
          reject(new Error(`Search worker request ${requestId} timed out`))
        }, 15_000)
        function onMessage(event: MessageEvent) {
          if (event.data?.requestId !== requestId) return
          window.clearTimeout(timeout)
          worker.removeEventListener('message', onMessage)
          resolve(event.data as TResponse)
        }
        worker.addEventListener('message', onMessage)
        worker.postMessage(message)
      })

      try {
        await post({
          packId: 'qa-search-core-hafs-v1',
          requestId: 'init',
          type: 'init',
        })
        const query = await post<{
          type: 'ok'
          payload: {
            kind: 'query-window'
            window: { results: unknown[] }
          }
        }>({
          limit: 1,
          query: queryAst,
          requestId: 'query',
          sort: 'relevance',
          type: 'query',
        })
        if (query.type !== 'ok' || query.payload.kind !== 'query-window') {
          throw new Error('Expected Search worker query-window response')
        }
        const result = query.payload.window.results[0]
        if (!result) throw new Error('Expected at least one Search worker result')

        const explore = await post<{
          type: 'ok'
          payload: {
            kind: 'explore-sections'
            sections: Array<{
              id: string
              unavailable?: { reason: string; retryable: boolean }
            }>
          }
        }>({
          limit: 8,
          query: queryAst,
          requestId: 'explore',
          result,
          type: 'explore',
        })
        if (explore.type !== 'ok' || explore.payload.kind !== 'explore-sections') {
          throw new Error('Expected Search worker explore-sections response')
        }
        return explore.payload.sections.find((section) => section.id === 'following-wording') ?? null
      } finally {
        worker.terminate()
      }
    }, searchWorkerAssetUrl())

    expect(workerProof).toMatchObject({
      id: 'following-wording',
      unavailable: {
        retryable: true,
      },
    })
    expect(workerProof?.unavailable?.reason).toMatch(/missing|offline|not cached/i)
  } finally {
    await page.context().setOffline(false)
  }
})
