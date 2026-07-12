import { expect, test } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

import { expectReactProductionPreflight, seedTargetState, targetUrl } from '../fixtures/react-golden-routes'
import { expectOfflineReaderLoads, expectReactServiceWorkerReady } from '../fixtures/react-offline'

test.skip(process.env.PLAYWRIGHT_INCLUDE_OFFLINE !== '1', 'React offline proof runs only against the preview build.')

test('@offline React app shell and installed reader assets survive offline reload', async ({ context, page }) => {
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

  const availabilityIndex = await page.evaluate(async () => {
    const url = '/dataset/indexes/mushaf-assets.json'
    const cache = await caches.open('quran-atlas-runtime-mushaf-index-v1')
    await cache.put(url, new Response(JSON.stringify({
      assets: [{ label: 'Stale private availability', mushafEditionId: 'qalun-furatiyyah-2023-v1' }],
    }), { headers: { 'content-type': 'application/json' } }))
    const online = await (await fetch(url, { cache: 'no-store' })).json() as { assets?: Array<{ mushafEditionId?: string }> }
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('quran-atlas')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const tx = db.transaction('settings', 'readwrite')
    tx.objectStore('settings').put({ key: 'mushafEditionSetupVersion', value: 1 })
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    return { online }
  })
  expect(availabilityIndex.online.assets?.some((asset) => asset.mushafEditionId === 'qalun-quran-ws-v1')).toBe(true)
  await expect.poll(async () => page.evaluate(async () => {
    const cached = await (await caches.open('quran-atlas-runtime-mushaf-index-v1')).match('/dataset/indexes/mushaf-assets.json')
    const index = cached ? await cached.json() as { assets?: Array<{ mushafEditionId?: string }> } : {}
    return {
      hasPrivate: index.assets?.some((asset) => asset.mushafEditionId === 'qalun-furatiyyah-2023-v1') ?? false,
      hasQuranWs: index.assets?.some((asset) => asset.mushafEditionId === 'qalun-quran-ws-v1') ?? false,
    }
  })).toEqual({ hasPrivate: false, hasQuranWs: true })

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  const offlineAvailability = await page.evaluate(async () => {
    const response = await fetch('/dataset/indexes/mushaf-assets.json')
    return response.json() as Promise<{ assets?: Array<{ mushafEditionId?: string }> }>
  })
  expect(offlineAvailability.assets?.some((asset) => asset.mushafEditionId === 'qalun-quran-ws-v1')).toBe(true)
})
