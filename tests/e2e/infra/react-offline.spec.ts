import { expect, test } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

import { expectReactProductionPreflight, seedTargetState, targetUrl } from '../fixtures/react-golden-routes'
import { expectOfflineReaderLoads, expectReactServiceWorkerReady } from '../fixtures/react-offline'

test.skip(process.env.PLAYWRIGHT_INCLUDE_OFFLINE !== '1', 'React offline proof runs only against the preview build.')

test('@offline React app shell and installed reader assets survive offline reload', async ({ page }) => {
  await expectReactProductionPreflight(page)
  await seedTargetState(page, 'react', 'onboarded-offline-installed-assets')
  await page.goto(targetUrl('react', '/#/s/1'))
  await expectReactServiceWorkerReady(page)
  await page.reload()
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByTestId('verse-1:7')).toBeVisible()
  await expect(page.getByText(/Failed to load reader text|Verse text unavailable/i)).toHaveCount(0)
  const serviceWorkerProof = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    return {
      cacheNames: await caches.keys(),
      scope: registration.scope,
      scriptURL: registration.active?.scriptURL ?? '',
    }
  })
  expect(serviceWorkerProof.scriptURL).toMatch(/\/sw\.js$/)
  expect(serviceWorkerProof.cacheNames.some((name) => name.startsWith('quranatlas-precache'))).toBe(true)
  expect(readdirSync(join(process.cwd(), 'dist')).some((name) => /^workbox-.+\.js$/.test(name))).toBe(true)
  await expectOfflineReaderLoads(page)
})
