import { expect, type Page } from '@playwright/test'

import { expectNoGuardFailures, installPageGuards } from './react-golden-routes'

export async function expectReactServiceWorkerReady(page: Page) {
  await expect(async () => {
    const ready = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 5_000)),
      ])
      return Boolean(registration?.active)
    })
    expect(ready).toBe(true)
  }).toPass({ timeout: 12_000 })
}

export async function expectOfflineReaderLoads(page: Page) {
  const guard = installPageGuards(page, 'react offline reload')
  await page.context().setOffline(true)
  try {
    await page.reload()
    await expect(page.locator('#react-root')).toBeVisible()
    await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
    await expect(page.getByText(/Verse text unavailable/i), 'RPA-010: offline proof must render cached dataset content, not preview fallback copy.').toHaveCount(0)
    await expectNoGuardFailures(guard)
  } finally {
    guard.dispose()
    await page.context().setOffline(false)
  }
}

export async function expectOfflinePrivateMushafRendition(
  page: Page,
  { cachedPage }: { cachedPage: number },
) {
  const guard = installPageGuards(page, 'react private Mushaf offline reload', [/\/pages\/\d+-\d+\.webp$/])
  await page.context().setOffline(true)
  try {
    await page.reload()
    await expect(page.getByRole('main', { name: /mushaf reader/i })).toBeVisible()
    await expect(page.getByRole('img', { name: new RegExp(`Mushaf page ${cachedPage},`, 'i') })).toBeVisible()
    await expectNoGuardFailures(guard)
  } finally {
    guard.dispose()
    await page.context().setOffline(false)
  }
}

export async function expectUnfetchedPrivateMushafFailure(page: Page, pageNo: number) {
  const indexUrl = '/dataset/indexes/mushaf-assets.json'
  const manifestUrl = '/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/manifest.json'
  const assetPaths = [1280, 2136].map((width) => `/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/pages/${String(pageNo).padStart(3, '0')}-${width}.webp`)
  const indexBody = await page.evaluate(async (url) => (await fetch(url)).text(), indexUrl)
  const manifestBody = await page.evaluate(async (url) => (await fetch(url)).text(), manifestUrl)
  await page.evaluate(async (urls) => {
    const names = await caches.keys()
    await Promise.all(names.map(async (name) => {
      const cache = await caches.open(name)
      await Promise.all(urls.map((url) => cache.delete(url)))
    }))
  }, assetPaths)
  const session = await page.context().newCDPSession(page)
  let failedAssetRequest = false
  try {
    await session.send('Network.enable')
    await session.send('Network.clearBrowserCache')
    await session.send('Network.setCacheDisabled', { cacheDisabled: true })
    await page.route(`**${indexUrl}`, (route) => route.fulfill({ body: indexBody, contentType: 'application/json' }))
    await page.route(`**${manifestUrl}`, (route) => route.fulfill({ body: manifestBody, contentType: 'application/json' }))
    await Promise.all(assetPaths.map((assetPath) => page.route(`**${assetPath}`, (route) => {
      failedAssetRequest = true
      return route.abort('internetdisconnected')
    })))
    await session.send('Network.setBypassServiceWorker', { bypass: true })
    await page.context().setOffline(true)
    await page.evaluate((nextPage) => { window.location.hash = `#/m/${nextPage}` }, pageNo)
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
    expect(failedAssetRequest).toBe(true)
  } finally {
    await page.context().setOffline(false)
    await session.send('Network.setCacheDisabled', { cacheDisabled: false })
    await session.send('Network.setBypassServiceWorker', { bypass: false })
    await page.unroute(`**${indexUrl}`)
    await page.unroute(`**${manifestUrl}`)
    await Promise.all(assetPaths.map((assetPath) => page.unroute(`**${assetPath}`)))
    await session.detach()
  }
}
