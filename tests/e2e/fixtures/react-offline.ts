import { expect, type Page } from '@playwright/test'

export async function expectReactServiceWorkerReady(page: Page) {
  const ready = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 5_000)),
    ])
    return Boolean(registration.active)
  })
  expect(ready).toBe(true)
}

export async function expectOfflineReaderLoads(page: Page) {
  await page.context().setOffline(true)
  try {
    await page.reload()
    await expect(page.locator('#react-root')).toBeVisible()
    await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  } finally {
    await page.context().setOffline(false)
  }
}
